/**
 * Lectura de planillas (.xlsx, .xls y .csv) en el navegador.
 *
 * El archivo nunca sale del dispositivo: se convierte en una matriz de celdas que conserva el
 * número de fila real de la planilla, para que los mensajes de error coincidan con lo que el
 * usuario ve en Excel aunque haya filas en blanco en el medio.
 *
 * SheetJS se carga bajo demanda (import dinámico) para no sumar su peso al resto de la app:
 * un CSV se lee sin descargarlo.
 */

export interface SheetRow {
  /** Número de fila tal como lo muestra la planilla (la primera es la 1). */
  rowNumber: number
  cells: unknown[]
}

export interface SheetMatrix {
  rows: SheetRow[]
}

const CSV_DELIMITERS = [';', ',', '\t'] as const

function isBinarySpreadsheet(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer, 0, 4)
  // .xlsx es un ZIP: "PK\x03\x04"
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  // .xls (Excel 97-2004) es un Compound File Binary: D0 CF 11 E0
  const isCfb = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
  return isZip || isCfb
}

/** Excel en español guarda los CSV en Windows-1252; si no es UTF-8 válido, se relee así. */
function decodeText(buffer: ArrayBuffer): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer)
  }
  return text.replace(/^\uFEFF/, '')
}

function isBlankRow(cells: unknown[]): boolean {
  return cells.every((cell) => String(cell ?? '').trim() === '')
}

/** El separador es el que más aparece en la primera línea, fuera de comillas. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const unquoted = firstLine.replace(/"[^"]*"/g, '')
  let best: string = CSV_DELIMITERS[0]
  let bestCount = -1
  for (const delimiter of CSV_DELIMITERS) {
    const count = unquoted.split(delimiter).length - 1
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }
  return best
}

/** CSV según RFC 4180: comillas dobles, comillas escapadas ("") y saltos de línea dentro de una celda. */
export function parseCsv(text: string): SheetMatrix {
  const delimiter = detectDelimiter(text)
  const rows: SheetRow[] = []

  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1
  let rowStartLine = 1

  const pushRow = () => {
    cells.push(cell.trim())
    if (!isBlankRow(cells)) rows.push({ rowNumber: rowStartLine, cells })
    cells = []
    cell = ''
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        if (char === '\n') line++
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      cells.push(cell.trim())
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      pushRow()
      line++
      rowStartLine = line
    } else {
      cell += char
    }
  }
  pushRow()

  return { rows }
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<SheetMatrix> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', cellFormula: false, cellHTML: false })
  const firstSheet = workbook.SheetNames[0]
  const worksheet = firstSheet ? workbook.Sheets[firstSheet] : undefined
  if (!worksheet?.['!ref']) return { rows: [] }

  const firstRowIndex = XLSX.utils.decode_range(worksheet['!ref']).s.r
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: true,
  })

  const rows = matrix
    .map((cells, index) => ({ rowNumber: firstRowIndex + index + 1, cells }))
    .filter((row) => !isBlankRow(row.cells))

  return { rows }
}

export async function readSpreadsheet(buffer: ArrayBuffer): Promise<SheetMatrix> {
  if (isBinarySpreadsheet(buffer)) return parseWorkbook(buffer)
  return parseCsv(decodeText(buffer))
}
