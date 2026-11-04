import * as XLSX from 'xlsx'
import { parseNumeroAR, formatNumeroAR } from '@/lib/numericFormat'

export type ValidUnit = 'kg' | 'l' | 'u'

export interface ValidIngredientRow {
  rowNumber: number
  name: string
  unit: ValidUnit
  cost: number
  costFormatted: string
}

export interface DuplicateIngredientRow {
  rowNumber: number
  name: string
  unit: ValidUnit
  cost: number
  costFormatted: string
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

const HEADER_ALIASES = {
  name: ['nombre', 'name', 'insumo', 'descripcion', 'producto', 'materia prima', 'item'],
  unit: ['unidad', 'unit', 'medida', 'u.m.', 'um', 'u m', 'unidad de medida'],
  cost: ['costo', 'cost', 'precio', 'currentcost', 'costo actual', 'precio unitario', 'costo unitario', 'importe'],
}

function normalizeHeaderString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
}

function findColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeHeaderString(key)
    if (aliases.includes(normalizedKey)) {
      return row[key]
    }
  }
  return undefined
}

export function normalizeUnit(rawUnit: unknown): ValidUnit | null {
  if (rawUnit === undefined || rawUnit === null) return null
  const u = normalizeHeaderString(String(rawUnit))
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(u)) return 'kg'
  if (['l', 'lt', 'litro', 'litros'].includes(u)) return 'l'
  if (['u', 'un', 'und', 'unidad', 'unidades', 'unit'].includes(u)) return 'u'
  return null
}

export function parseRowCost(rawCost: unknown): { cost: number; error?: string } {
  if (rawCost === undefined || rawCost === null || String(rawCost).trim() === '') {
    return { cost: 0, error: 'El costo es obligatorio.' }
  }

  let parsedStr: string
  if (typeof rawCost === 'number') {
    if (!Number.isFinite(rawCost) || isNaN(rawCost)) {
      return { cost: 0, error: 'El costo debe ser un número válido.' }
    }
    parsedStr = String(rawCost)
  } else {
    parsedStr = parseNumeroAR(String(rawCost).trim())
  }

  if (!parsedStr) {
    return { cost: 0, error: 'El costo debe ser un valor decimal válido.' }
  }

  const num = Number(parsedStr)
  if (isNaN(num) || !Number.isFinite(num) || num <= 0) {
    return { cost: 0, error: 'El costo debe ser mayor a 0.' }
  }

  if (num > 99_999_999.99) {
    return { cost: 0, error: 'El costo no puede superar $99.999.999,99.' }
  }

  const parts = parsedStr.split('.')
  if (parts[1] && parts[1].length > 2) {
    return { cost: 0, error: 'El costo no puede tener más de 2 decimales.' }
  }

  return { cost: num }
}

export function classifyIngredientRows(
  rows: Record<string, unknown>[],
  existingSupplies: Array<{ name: string }> = []
): ClassifiedIngredientBatch {
  const valid: ValidIngredientRow[] = []
  const duplicates: DuplicateIngredientRow[] = []
  const errors: ErrorIngredientRow[] = []

  const existingNames = new Set(existingSupplies.map((s) => s.name.trim().toLowerCase()))
  const seenInBatch = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? {}
    const rowNumber = i + 2 // Fila 1 es el encabezado de la planilla

    const rawName = findColumnValue(row, HEADER_ALIASES.name)
    const rawUnit = findColumnValue(row, HEADER_ALIASES.unit)
    const rawCost = findColumnValue(row, HEADER_ALIASES.cost)

    const nameStr = rawName !== undefined && rawName !== null ? String(rawName).trim() : ''
    const unitStr = rawUnit !== undefined && rawUnit !== null ? String(rawUnit).trim() : ''
    const costStr = rawCost !== undefined && rawCost !== null ? String(rawCost).trim() : ''

    // Validación de Nombre
    if (!nameStr) {
      errors.push({
        rowNumber,
        name: '(vacío)',
        rawUnit: unitStr,
        rawCost: costStr,
        reason: 'El nombre es obligatorio.',
      })
      continue
    }

    if (nameStr.length < 2) {
      errors.push({
        rowNumber,
        name: nameStr,
        rawUnit: unitStr,
        rawCost: costStr,
        reason: 'El nombre debe tener al menos 2 caracteres.',
      })
      continue
    }

    // Validación de Unidad
    const normalizedUnit = normalizeUnit(rawUnit)
    if (!normalizedUnit) {
      errors.push({
        rowNumber,
        name: nameStr,
        rawUnit: unitStr,
        rawCost: costStr,
        reason: 'Unidad inválida. Debe ser kg, l o u.',
      })
      continue
    }

    // Validación de Costo
    const costResult = parseRowCost(rawCost)
    if (costResult.error) {
      errors.push({
        rowNumber,
        name: nameStr,
        rawUnit: unitStr,
        rawCost: costStr,
        reason: costResult.error,
      })
      continue
    }

    const cost = costResult.cost
    const costFormatted = `$${formatNumeroAR(cost)}`
    const lowerName = nameStr.toLowerCase()

    // Clasificación de duplicados
    if (existingNames.has(lowerName)) {
      duplicates.push({
        rowNumber,
        name: nameStr,
        unit: normalizedUnit,
        cost,
        costFormatted,
        reason: 'Ya existe en la despensa (se omitirá)',
      })
      continue
    }

    if (seenInBatch.has(lowerName)) {
      duplicates.push({
        rowNumber,
        name: nameStr,
        unit: normalizedUnit,
        cost,
        costFormatted,
        reason: 'Nombre repetido en la planilla (se omitirá)',
      })
      continue
    }

    seenInBatch.add(lowerName)
    valid.push({
      rowNumber,
      name: nameStr,
      unit: normalizedUnit,
      cost,
      costFormatted,
    })
  }

  return {
    valid,
    duplicates,
    errors,
    totalRows: rows.length,
  }
}

function isExcelBinaryBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer, 0, 8)
  // ZIP magic bytes (XLSX): 0x50 0x4B 0x03 0x04 ("PK\x03\x04")
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  // Compound File Binary format (XLS 97-2004): 0xD0 0xCF 0x11 0xE0
  const isCfb = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
  return isZip || isCfb
}

function decodeTextBuffer(buffer: ArrayBuffer): string {
  let text = new TextDecoder('utf-8').decode(buffer)
  // Si contiene el caracter de reemplazo unicode, se guardó con codificación Windows-1252 / ISO-8859-1
  if (text.includes('\uFFFD')) {
    try {
      text = new TextDecoder('windows-1252').decode(buffer)
    } catch {
      text = new TextDecoder('iso-8859-1').decode(buffer)
    }
  }
  return text.replace(/^\uFEFF/, '') // Quita el BOM de UTF-8 si existe
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []

  const firstLine = lines[0] ?? ''
  const count = (ch: string) => (firstLine.match(new RegExp(ch === '\t' ? '\t' : '\\' + ch, 'g')) || []).length
  const delimiter = [';', ',', '\t'].sort((a, b) => count(b) - count(a))[0] || ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        cell += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim())
      cell = ''
      if (row.some((v) => v !== '')) {
        rows.push(row)
      }
      row = []
    } else {
      cell += c
    }
  }
  row.push(cell.trim())
  if (row.some((v) => v !== '')) {
    rows.push(row)
  }

  if (rows.length === 0) return []

  const header = (rows.shift() || []).map((h) => h.trim())
  const out: Record<string, unknown>[] = []

  for (const r of rows) {
    const obj: Record<string, unknown> = {}
    header.forEach((h, idx) => {
      if (h) {
        obj[h] = r[idx] ?? ''
      }
    })
    out.push(obj)
  }

  return out
}

export function parseSpreadsheet(data: ArrayBuffer): Record<string, unknown>[] {
  if (!isExcelBinaryBuffer(data)) {
    const text = decodeTextBuffer(data)
    return parseCsv(text)
  }

  const workbook = XLSX.read(data, { type: 'array', codepage: 65001 })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: true })
}

export function generateTemplateWorkbook(): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'Unidad', 'Costo'],
    ['Harina de trigo 000 Olavarriense', 'kg', '736,25'],
    ['Leche entera larga vida Silvia', 'l', '1715,00'],
    ['Huevo grande', 'u', '193,33'],
    ['Pasta suavi', 'kg', '15400,00'],
    ['Soda cáustica', 'l', '2300,00'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Insumos')
  return wb
}

export function downloadTemplateFile(): void {
  const wb = generateTemplateWorkbook()
  XLSX.writeFile(wb, 'plantilla-insumos-margenx.xlsx')
}