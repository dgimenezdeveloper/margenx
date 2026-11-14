/**
 * Reglas de la carga masiva de insumos por planilla.
 *
 * Replica en el navegador las validaciones de `POST /api/ingredients/bulk` (docs/api.md) para
 * que la vista previa muestre lo mismo que va a hacer el servidor: mismas unidades, mismo tope
 * de filas y de importe, y la misma detección de repetidos (nombre sin distinguir mayúsculas).
 * El servidor vuelve a validar todo: esta capa solo evita sorpresas.
 *
 * Los costos viajan como texto decimal normalizado ("1234.56") y nunca pasan por aritmética de
 * punto flotante (ADR-004); el backend los convierte a Prisma.Decimal.
 */
import { formatMoney } from '@/lib/format'
import { parseNumeroAR } from '@/lib/numericFormat'
import type { SheetMatrix, SheetRow } from '@/lib/spreadsheet'
import type { BulkUploadResponse, BulkUploadRowInput } from '@/services/ingredientService'

/** Mismo tope que BULK_MAX_ROWS del backend. */
export const BULK_MAX_ROWS = 500
/** Una planilla de 500 insumos pesa unos pocos KB: 2 MB deja margen sin congelar el navegador. */
export const BULK_MAX_FILE_BYTES = 2 * 1024 * 1024
export const BULK_ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const
export const BULK_TEMPLATE_FILENAME = 'plantilla-insumos-margenx.xlsx'

const MIN_NAME_LENGTH = 2
/** $99.999.999,99: tope de Decimal(10,2) en la base. */
const MAX_COST_INTEGER_DIGITS = 8

export type BulkUnit = BulkUploadRowInput['unit']

export const BULK_UNIT_LABELS: Record<BulkUnit, string> = {
  kg: 'kg',
  l: 'litro',
  u: 'unidad',
}

type Column = 'name' | 'unit' | 'cost'

export const BULK_COLUMN_LABELS: Record<Column, string> = {
  name: 'Nombre',
  unit: 'Unidad',
  cost: 'Costo',
}

const COLUMN_ALIASES: Record<Column, readonly string[]> = {
  name: ['nombre', 'name', 'insumo', 'descripcion', 'producto', 'materia prima', 'item', 'articulo'],
  unit: ['unidad', 'unit', 'medida', 'u m', 'um', 'unidad de medida'],
  cost: ['costo', 'cost', 'precio', 'currentcost', 'costo actual', 'precio unitario', 'costo unitario', 'importe'],
}

const UNIT_ALIASES: Record<BulkUnit, readonly string[]> = {
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
  l: ['l', 'lt', 'lts', 'litro', 'litros'],
  u: ['u', 'un', 'und', 'unid', 'unidad', 'unidades'],
}

export interface ValidIngredientRow {
  rowNumber: number
  name: string
  unit: BulkUnit
  /** Decimal normalizado con punto y hasta 2 decimales, por ejemplo "1234.56". */
  cost: string
  costFormatted: string
}

export interface DuplicateIngredientRow extends ValidIngredientRow {
  reason: string
}

export interface ErrorIngredientRow {
  rowNumber: number
  name: string
  rawUnit: string
  rawCost: string
  reason: string
}

export interface ClassifiedIngredientBatch {
  valid: ValidIngredientRow[]
  duplicates: DuplicateIngredientRow[]
  errors: ErrorIngredientRow[]
  totalRows: number
}

export type BatchProblem =
  | { kind: 'empty' }
  | { kind: 'missing-columns'; missing: string[] }
  | { kind: 'too-many-rows'; count: number }

export type BatchAnalysis =
  | { ok: true; batch: ClassifiedIngredientBatch }
  | { ok: false; problem: BatchProblem }

export type CostResult = { ok: true; cost: string } | { ok: false; error: string }

/** Minúsculas, sin tildes y sin signos: "Unidad de Medida" y "unidad_de_medida" valen lo mismo. */
function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cellText(value: unknown): string {
  return String(value ?? '').trim()
}

/** Misma clave que usa el backend para detectar repetidos. */
function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function normalizeUnit(rawUnit: unknown): BulkUnit | null {
  const unit = normalizeText(rawUnit)
  if (!unit) return null
  const match = (Object.keys(UNIT_ALIASES) as BulkUnit[]).find((key) => UNIT_ALIASES[key].includes(unit))
  return match ?? null
}

function costFromNumberCell(value: number): string {
  // Excel guarda los importes como número; "1e-7" o "1e+21" no son importes razonables.
  const text = Number.isFinite(value) ? String(value) : ''
  return /e/i.test(text) ? '' : text
}

export function parseRowCost(rawCost: unknown): CostResult {
  const text = cellText(rawCost)
  if (!text) return { ok: false, error: 'El costo es obligatorio.' }

  const normalized =
    typeof rawCost === 'number' ? costFromNumberCell(rawCost) : parseNumeroAR(text.replace(/^\$\s*/, ''))

  if (!normalized) {
    return { ok: false, error: 'El costo no es un número válido. Escribilo como 1.234,56.' }
  }
  if (normalized.startsWith('-')) {
    return { ok: false, error: 'El costo debe ser mayor a 0.' }
  }

  const [integerPart = '', fraction = ''] = normalized.split('.')
  if (fraction.length > 2) {
    return { ok: false, error: 'El costo no puede tener más de 2 decimales.' }
  }

  const integer = integerPart.replace(/^0+(?=\d)/, '')
  if (/^0*$/.test(integer) && /^0*$/.test(fraction)) {
    return { ok: false, error: 'El costo debe ser mayor a 0.' }
  }
  if (integer.length > MAX_COST_INTEGER_DIGITS) {
    return { ok: false, error: 'El costo no puede superar $99.999.999,99.' }
  }

  return { ok: true, cost: fraction ? `${integer}.${fraction}` : integer }
}

function resolveColumns(headerCells: unknown[]): Partial<Record<Column, number>> {
  const normalizedHeaders = headerCells.map(normalizeText)
  const columns: Partial<Record<Column, number>> = {}
  for (const column of Object.keys(COLUMN_ALIASES) as Column[]) {
    const index = normalizedHeaders.findIndex((header) => COLUMN_ALIASES[column].includes(header))
    if (index >= 0) columns[column] = index
  }
  return columns
}

function hasCellsBeyondHeader(row: SheetRow, headerLength: number): boolean {
  return row.cells.slice(headerLength).some((cell) => cellText(cell) !== '')
}

function classifyRows(
  dataRows: SheetRow[],
  columns: Record<Column, number>,
  headerLength: number,
  existingSupplies: ReadonlyArray<{ name: string }>
): ClassifiedIngredientBatch {
  const batch: ClassifiedIngredientBatch = { valid: [], duplicates: [], errors: [], totalRows: dataRows.length }
  const existingNames = new Set(existingSupplies.map((supply) => nameKey(supply.name)))
  const seenInBatch = new Set<string>()

  for (const row of dataRows) {
    const name = cellText(row.cells[columns.name])
    const rawUnit = row.cells[columns.unit]
    const rawCost = row.cells[columns.cost]
    const unit = normalizeUnit(rawUnit)
    const cost = parseRowCost(rawCost)

    const reasons: string[] = []
    if (hasCellsBeyondHeader(row, headerLength)) {
      reasons.push(
        'La fila tiene más columnas que el encabezado. Si el costo lleva coma decimal, guardá el CSV separado por punto y coma (;).'
      )
    }
    if (!name) reasons.push('El nombre es obligatorio.')
    else if (name.length < MIN_NAME_LENGTH) reasons.push('El nombre debe tener al menos 2 caracteres.')
    if (!unit) reasons.push('La unidad debe ser kg, l (litro) o u (unidad).')
    if (!cost.ok) reasons.push(cost.error)

    // `!unit` y `!cost.ok` ya sumaron su motivo; se repiten para que TypeScript acote los tipos.
    if (reasons.length > 0 || !unit || !cost.ok) {
      batch.errors.push({
        rowNumber: row.rowNumber,
        name: name || '(sin nombre)',
        rawUnit: cellText(rawUnit),
        rawCost: cellText(rawCost),
        reason: reasons.join(' '),
      })
      continue
    }

    const parsed: ValidIngredientRow = {
      rowNumber: row.rowNumber,
      name,
      unit,
      cost: cost.cost,
      // Solo para mostrar: el valor que se envía sigue siendo el texto decimal (`cost`).
      costFormatted: formatMoney(cost.cost),
    }
    const key = nameKey(name)

    if (existingNames.has(key)) {
      batch.duplicates.push({ ...parsed, reason: 'Ya está en tu despensa: se omite para no cambiar su costo.' })
    } else if (seenInBatch.has(key)) {
      batch.duplicates.push({ ...parsed, reason: 'Aparece más de una vez en la planilla: se carga solo la primera.' })
    } else {
      seenInBatch.add(key)
      batch.valid.push(parsed)
    }
  }

  return batch
}

/**
 * Valida la planilla completa: primero lo que impide leerla (sin filas, sin columnas, demasiadas
 * filas) y después fila por fila, sin que una fila con error bloquee al resto.
 */
export function analyzeIngredientSheet(
  matrix: SheetMatrix,
  existingSupplies: ReadonlyArray<{ name: string }> = []
): BatchAnalysis {
  const [header, ...dataRows] = matrix.rows
  if (!header) return { ok: false, problem: { kind: 'empty' } }

  const columns = resolveColumns(header.cells)
  const missing = (Object.keys(BULK_COLUMN_LABELS) as Column[])
    .filter((column) => columns[column] === undefined)
    .map((column) => BULK_COLUMN_LABELS[column])
  if (missing.length > 0) return { ok: false, problem: { kind: 'missing-columns', missing } }

  if (dataRows.length === 0) return { ok: false, problem: { kind: 'empty' } }
  if (dataRows.length > BULK_MAX_ROWS) {
    return { ok: false, problem: { kind: 'too-many-rows', count: dataRows.length } }
  }

  return {
    ok: true,
    batch: classifyRows(dataRows, columns as Record<Column, number>, header.cells.length, existingSupplies),
  }
}

export function describeBatchProblem(problem: BatchProblem): string {
  switch (problem.kind) {
    case 'empty':
      return 'La planilla no tiene insumos cargados debajo del encabezado.'
    case 'missing-columns':
      return `No encontramos la columna ${problem.missing.join(', ')} en la primera fila. Usá la plantilla o renombrá las columnas a Nombre, Unidad y Costo.`
    case 'too-many-rows':
      return `La planilla tiene ${problem.count} filas y el máximo por carga es ${BULK_MAX_ROWS}. Dividila en varios archivos.`
  }
}

/** Revisa extensión y tamaño antes de leer el archivo. Devuelve el motivo del rechazo o null. */
export function validateSpreadsheetFile(file: Pick<File, 'name' | 'size'>): string | null {
  const lowerName = file.name.toLowerCase()
  if (!BULK_ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return 'Elegí un archivo de Excel (.xlsx o .xls) o un CSV.'
  }
  if (file.size > BULK_MAX_FILE_BYTES) {
    return 'El archivo pesa más de 2 MB. Dejá solo la hoja con los insumos y volvé a intentarlo.'
  }
  return null
}

export function buildBulkPayload(validRows: ReadonlyArray<ValidIngredientRow>): BulkUploadRowInput[] {
  return validRows.map(({ name, unit, cost }) => ({ name, unit, cost }))
}

/**
 * El servidor numera los errores por posición en el lote enviado (1, 2, 3…), que solo tiene las
 * filas válidas. Se traducen al número de fila de la planilla para que el usuario la encuentre.
 */
export function mapServerErrorsToSheetRows(
  errors: BulkUploadResponse['errors'],
  sentRows: ReadonlyArray<ValidIngredientRow>
): Array<{ rowNumber: number | null; name: string | null; reason: string }> {
  return errors.map((error) => {
    const sent = sentRows[error.row - 1]
    return { rowNumber: sent?.rowNumber ?? null, name: sent?.name ?? null, reason: error.reason }
  })
}

const TEMPLATE_EXAMPLES: ReadonlyArray<[string, BulkUnit, number]> = [
  ['Harina de trigo 000 Olavarriense', 'kg', 736.25],
  ['Leche entera larga vida Silvia', 'l', 1715],
  ['Huevo grande', 'u', 193.33],
  ['Pasta suavi', 'kg', 15400],
  ['Soda', 'l', 2300],
]

/** Colores de marca de MargenX (índigo de la app) en ARGB, como los pide Excel. */
const BRAND = {
  primary: 'FF4338CA',
  dark: 'FF1E1B4B',
  soft: 'FFEEF2FF',
  muted: 'FF6B7280',
  white: 'FFFFFFFF',
} as const

/** Filas con validación y formato listas para completar (además de los ejemplos). */
const TEMPLATE_INPUT_ROWS = BULK_MAX_ROWS
const COST_NUMBER_FORMAT = '"$" #,##0.00'

const TEMPLATE_STEPS: ReadonlyArray<string> = [
  'Una fila por insumo en la hoja "Insumos". No cambies ni muevas los títulos de la primera fila.',
  'Nombre: cómo lo reconocés vos (al menos 2 letras). Si ya está en tu despensa, se omite y no cambia su costo.',
  'Unidad: elegila de la lista (kg, l o u). Es la unidad en la que pagás el costo.',
  'Costo: lo que te cuesta 1 kg, 1 litro o 1 unidad, mayor a 0 y con hasta 2 decimales. Escribilo como lo ves: 1.234,56.',
  `Hasta ${BULK_MAX_ROWS} insumos por archivo. Borrá las filas de ejemplo antes de subirla.`,
  'Guardala como .xlsx (o .csv) y subila desde Insumos → Cargar desde planilla. Antes de guardar, MargenX te muestra qué filas entran.',
]

const TEMPLATE_UNITS: ReadonlyArray<[BulkUnit, string, string]> = [
  ['kg', 'Kilo', 'Harina, azúcar, fiambre: costo de 1 kg'],
  ['l', 'Litro', 'Leche, aceite, soda: costo de 1 litro'],
  ['u', 'Unidad', 'Huevos, panes, envases: costo de 1 unidad'],
]

type ExcelJSModule = typeof import('exceljs')
type Workbook = InstanceType<ExcelJSModule['Workbook']>

function todayAR(): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
}

function addInsumosSheet(workbook: Workbook) {
  const sheet = workbook.addWorksheet('Insumos', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: BRAND.primary } },
  })
  sheet.columns = [
    { header: BULK_COLUMN_LABELS.name, key: 'name', width: 42 },
    { header: BULK_COLUMN_LABELS.unit, key: 'unit', width: 12 },
    { header: BULK_COLUMN_LABELS.cost, key: 'cost', width: 18 },
  ]

  const header = sheet.getRow(1)
  header.height = 24
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND.white }, size: 12 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primary } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  })
  sheet.getCell('A1').note = 'Cómo reconocés el insumo (al menos 2 letras).'
  sheet.getCell('B1').note = 'kg (kilo), l (litro) o u (unidad).'
  sheet.getCell('C1').note = 'Costo de 1 kg, 1 litro o 1 unidad, en pesos. Ejemplo: 1.234,56'

  TEMPLATE_EXAMPLES.forEach(([name, unit, cost]) => {
    const row = sheet.addRow([name, unit, cost])
    row.font = { italic: true, color: { argb: BRAND.muted } }
  })

  const lastRow = TEMPLATE_INPUT_ROWS + 1
  for (let r = 2; r <= lastRow; r++) {
    sheet.getCell(r, 2).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"kg,l,u"'],
      showErrorMessage: true,
      errorTitle: 'Unidad no válida',
      error: 'Elegí kg, l o u de la lista.',
    }
    const costCell = sheet.getCell(r, 3)
    costCell.numFmt = COST_NUMBER_FORMAT
    costCell.dataValidation = {
      type: 'decimal',
      operator: 'between',
      allowBlank: true,
      formulae: [0.01, 99_999_999.99],
      showErrorMessage: true,
      errorTitle: 'Costo no válido',
      error: 'El costo debe ser mayor a 0 y menor a $99.999.999,99.',
    }
  }
  sheet.autoFilter = { from: 'A1', to: 'C1' }
}

function addInstructionsSheet(workbook: Workbook) {
  const sheet = workbook.addWorksheet('Instrucciones', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: BRAND.dark } },
  })
  sheet.columns = [{ width: 4 }, { width: 14 }, { width: 18 }, { width: 70 }]

  sheet.mergeCells('A1:D1')
  const title = sheet.getCell('A1')
  title.value = 'MargenX · Plantilla de carga de insumos'
  title.font = { bold: true, size: 18, color: { argb: BRAND.white } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primary } }
  title.alignment = { vertical: 'middle', indent: 1 }
  sheet.getRow(1).height = 36

  sheet.mergeCells('A2:D2')
  const subtitle = sheet.getCell('A2')
  subtitle.value = `Cargá tu despensa de una sola vez. Plantilla generada el ${todayAR()}.`
  subtitle.font = { italic: true, color: { argb: BRAND.dark } }
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.soft } }
  subtitle.alignment = { indent: 1 }

  const section = (rowNumber: number, text: string) => {
    sheet.mergeCells(`A${rowNumber}:D${rowNumber}`)
    const cell = sheet.getCell(`A${rowNumber}`)
    cell.value = text
    cell.font = { bold: true, size: 13, color: { argb: BRAND.primary } }
    cell.border = { bottom: { style: 'medium', color: { argb: BRAND.primary } } }
  }

  section(4, 'Cómo completarla')
  TEMPLATE_STEPS.forEach((step, index) => {
    const row = sheet.getRow(5 + index)
    row.getCell(1).value = index + 1
    row.getCell(1).font = { bold: true, color: { argb: BRAND.primary } }
    row.getCell(1).alignment = { vertical: 'top', horizontal: 'center' }
    sheet.mergeCells(5 + index, 2, 5 + index, 4)
    row.getCell(2).value = step
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.height = 30
  })

  const unitsStart = 6 + TEMPLATE_STEPS.length
  section(unitsStart, 'Unidades que acepta MargenX')
  const unitsHeader = sheet.getRow(unitsStart + 1)
  ;['Escribí', 'Significa', 'Ejemplos'].forEach((label, index) => {
    const cell = unitsHeader.getCell(index + 2)
    cell.value = label
    cell.font = { bold: true, color: { argb: BRAND.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.dark } }
  })
  TEMPLATE_UNITS.forEach(([code, meaning, example], index) => {
    const row = sheet.getRow(unitsStart + 2 + index)
    row.getCell(2).value = code
    row.getCell(2).font = { bold: true }
    row.getCell(3).value = meaning
    row.getCell(4).value = example
    if (index % 2 === 0) {
      ;[2, 3, 4].forEach((c) => {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.soft } }
      })
    }
  })

  const notesStart = unitsStart + 3 + TEMPLATE_UNITS.length
  section(notesStart, 'Qué pasa al subirla')
  const notes = [
    'Ves una vista previa con las filas válidas, las repetidas y las que tienen errores (con el número de fila de esta planilla).',
    'Solo se guardan las válidas. Los insumos que ya existen no cambian su costo: actualizalo desde Insumos o desde el proveedor.',
    'El archivo no sale de tu dispositivo hasta que confirmás la carga.',
  ]
  notes.forEach((note, index) => {
    const rowNumber = notesStart + 1 + index
    sheet.mergeCells(rowNumber, 2, rowNumber, 4)
    const cell = sheet.getCell(rowNumber, 2)
    cell.value = `• ${note}`
    cell.alignment = { wrapText: true, vertical: 'top' }
    sheet.getRow(rowNumber).height = 30
  })
}

/** Recibe ExcelJS por parámetro para poder probarla sin el import dinámico. */
export function buildTemplateWorkbook(ExcelJS: ExcelJSModule): Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'MargenX'
  workbook.title = 'Plantilla de carga de insumos'
  // La hoja de insumos va primera: es la que lee la importación.
  addInsumosSheet(workbook)
  addInstructionsSheet(workbook)
  return workbook
}

export async function buildTemplateBuffer(ExcelJS: ExcelJSModule): Promise<ArrayBuffer> {
  const data = await buildTemplateWorkbook(ExcelJS).xlsx.writeBuffer()
  return data instanceof ArrayBuffer ? data : new Uint8Array(data as ArrayLike<number>).buffer
}

export async function downloadTemplateFile(): Promise<void> {
  const ExcelJS = await import('exceljs')
  const buffer = await buildTemplateBuffer(ExcelJS.default ?? ExcelJS)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = BULK_TEMPLATE_FILENAME
  link.click()
  URL.revokeObjectURL(url)
}
