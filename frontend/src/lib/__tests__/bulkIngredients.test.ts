import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import {
  BULK_MAX_FILE_BYTES,
  BULK_MAX_ROWS,
  analyzeIngredientSheet,
  buildBulkPayload,
  buildTemplateWorkbook,
  describeBatchProblem,
  mapServerErrorsToSheetRows,
  normalizeUnit,
  parseRowCost,
  validateSpreadsheetFile,
  type BatchAnalysis,
  type ClassifiedIngredientBatch,
} from '../bulkIngredients'
import { readSpreadsheet, type SheetMatrix } from '../spreadsheet'

const HEADER = ['Nombre', 'Unidad', 'Costo']

/** Arma la matriz como la devuelve readSpreadsheet: encabezado en la fila 1 y datos desde la 2. */
const sheet = (...dataRows: unknown[][]): SheetMatrix => ({
  rows: [HEADER, ...dataRows].map((cells, index) => ({ rowNumber: index + 1, cells })),
})

const batchOf = (analysis: BatchAnalysis): ClassifiedIngredientBatch => {
  if (!analysis.ok) throw new Error(`Se esperaba una planilla válida: ${analysis.problem.kind}`)
  return analysis.batch
}

describe('normalizeUnit', () => {
  it.each([
    ['kg', 'kg'],
    ['KILOS', 'kg'],
    ['Kilogramo', 'kg'],
    ['l', 'l'],
    ['Lts.', 'l'],
    ['litro', 'l'],
    ['u', 'u'],
    ['Unidades', 'u'],
    ['un', 'u'],
  ])('reconoce "%s" como %s', (raw, expected) => {
    expect(normalizeUnit(raw)).toBe(expected)
  })

  it.each(['toneladas', 'gramos', '', null, undefined])('rechaza "%s"', (raw) => {
    expect(normalizeUnit(raw)).toBeNull()
  })
})

describe('parseRowCost', () => {
  it.each([
    ['1.234,56', '1234.56'],
    ['736,25', '736.25'],
    ['$ 1.715,00', '1715.00'],
    ['1500', '1500'],
    ['1.500.000', '1500000'],
    ['99.999.999,99', '99999999.99'],
    ['0,50', '0.50'],
  ])('interpreta el texto "%s" en formato argentino como %s', (raw, expected) => {
    expect(parseRowCost(raw)).toEqual({ ok: true, cost: expected })
  })

  it('acepta los números que guarda Excel sin pasar por redondeos', () => {
    expect(parseRowCost(736.25)).toEqual({ ok: true, cost: '736.25' })
    expect(parseRowCost(1715)).toEqual({ ok: true, cost: '1715' })
  })

  it.each([
    ['', 'El costo es obligatorio.'],
    [null, 'El costo es obligatorio.'],
    ['abc', 'El costo no es un número válido. Escribilo como 1.234,56.'],
    ['12,34,56', 'El costo no es un número válido. Escribilo como 1.234,56.'],
    [1e-7, 'El costo no es un número válido. Escribilo como 1.234,56.'],
    [Number.NaN, 'El costo no es un número válido. Escribilo como 1.234,56.'],
    ['0', 'El costo debe ser mayor a 0.'],
    ['0,00', 'El costo debe ser mayor a 0.'],
    ['-50', 'El costo debe ser mayor a 0.'],
    [-50, 'El costo debe ser mayor a 0.'],
    ['12,345', 'El costo no puede tener más de 2 decimales.'],
    [12.345, 'El costo no puede tener más de 2 decimales.'],
    ['100.000.000', 'El costo no puede superar $99.999.999,99.'],
  ])('rechaza %s con "%s"', (raw, error) => {
    expect(parseRowCost(raw)).toEqual({ ok: false, error })
  })
})

describe('analyzeIngredientSheet', () => {
  it('Escenario Gherkin "Planilla válida": 20 insumos válidos se ven como 20 filas listas para confirmar', () => {
    const rows = Array.from({ length: 20 }, (_, index) => [
      `Insumo de panadería ${index + 1}`,
      index % 2 === 0 ? 'kg' : 'l',
      `${1000 + index},50`,
    ])

    const batch = batchOf(analyzeIngredientSheet(sheet(...rows)))

    expect(batch.valid).toHaveLength(20)
    expect(batch.errors).toHaveLength(0)
    expect(batch.duplicates).toHaveLength(0)
    expect(batch.totalRows).toBe(20)
    expect(batch.valid[0]).toEqual({
      rowNumber: 2,
      name: 'Insumo de panadería 1',
      unit: 'kg',
      cost: '1000.50',
      costFormatted: '$1.000,50',
    })
  })

  it('Escenario Gherkin "Filas con error": el costo "abc" se informa con su fila y motivo sin bloquear al resto', () => {
    const batch = batchOf(
      analyzeIngredientSheet(
        sheet(
          ['Harina de trigo 000 Olavarriense', 'kg', '736,25'],
          ['Levadura fresca La Cordobesa', 'kg', 'abc'],
          ['Leche entera larga vida Silvia', 'litro', '1.715,00']
        )
      )
    )

    expect(batch.valid.map((row) => row.name)).toEqual([
      'Harina de trigo 000 Olavarriense',
      'Leche entera larga vida Silvia',
    ])
    expect(batch.errors).toEqual([
      {
        rowNumber: 3,
        name: 'Levadura fresca La Cordobesa',
        rawUnit: 'kg',
        rawCost: 'abc',
        reason: 'El costo no es un número válido. Escribilo como 1.234,56.',
      },
    ])
  })

  it('junta todos los problemas de una fila en un único motivo', () => {
    const batch = batchOf(analyzeIngredientSheet(sheet(['', 'toneladas', '-3'])))

    expect(batch.errors[0]).toMatchObject({
      rowNumber: 2,
      name: '(sin nombre)',
      reason: 'El nombre es obligatorio. La unidad debe ser kg, l (litro) o u (unidad). El costo debe ser mayor a 0.',
    })
  })

  it('rechaza nombres de una sola letra como el alta manual', () => {
    const batch = batchOf(analyzeIngredientSheet(sheet(['H', 'kg', '100'])))

    expect(batch.errors[0]?.reason).toBe('El nombre debe tener al menos 2 caracteres.')
  })

  it('marca como repetidos los nombres que ya están en la despensa o se repiten en la planilla, sin distinguir mayúsculas', () => {
    const batch = batchOf(
      analyzeIngredientSheet(
        sheet(
          ['harina de trigo 000 olavarriense', 'kg', '750'],
          ['Azúcar común tipo A', 'kg', '1150'],
          ['AZÚCAR COMÚN TIPO A ', 'kg', '1140']
        ),
        [{ name: 'Harina de trigo 000 Olavarriense' }]
      )
    )

    expect(batch.valid.map((row) => row.rowNumber)).toEqual([3])
    expect(batch.duplicates.map((row) => [row.rowNumber, row.reason])).toEqual([
      [2, 'Ya está en tu despensa: se omite para no cambiar su costo.'],
      [4, 'Aparece más de una vez en la planilla: se carga solo la primera.'],
    ])
  })

  it('una fila con error no ocupa el nombre: la siguiente con el mismo nombre se carga', () => {
    const batch = batchOf(analyzeIngredientSheet(sheet(['Etoxilado', 'kg', 'abc'], ['Etoxilado', 'kg', '4928'])))

    expect(batch.errors).toHaveLength(1)
    expect(batch.valid.map((row) => row.rowNumber)).toEqual([3])
  })

  it('encuentra las columnas aunque cambien de orden, de mayúsculas o tengan tildes', () => {
    const matrix: SheetMatrix = {
      rows: [
        { rowNumber: 1, cells: ['Precio unitario', 'Descripción', 'UNIDAD DE MEDIDA'] },
        { rowNumber: 2, cells: ['6.930,00', 'Sulfonico', 'l'] },
      ],
    }

    expect(batchOf(analyzeIngredientSheet(matrix)).valid[0]).toMatchObject({ name: 'Sulfonico', unit: 'l', cost: '6930.00' })
  })

  it('detecta un CSV separado por comas con coma decimal sin comillas en vez de cargar un costo truncado', async () => {
    const matrix = await readSpreadsheet(new TextEncoder().encode('Nombre,Unidad,Costo\nRicota Castelmar,kg,4615,00\n').buffer as ArrayBuffer)

    const batch = batchOf(analyzeIngredientSheet(matrix))

    expect(batch.valid).toHaveLength(0)
    expect(batch.errors[0]?.reason).toContain('separado por punto y coma')
  })

  it('informa las columnas que faltan en el encabezado', () => {
    const analysis = analyzeIngredientSheet({ rows: [{ rowNumber: 1, cells: ['Nombre', 'Precio'] }] })

    expect(analysis).toEqual({ ok: false, problem: { kind: 'missing-columns', missing: ['Unidad'] } })
  })

  it('informa que la planilla está vacía si no tiene filas o solo tiene encabezado', () => {
    expect(analyzeIngredientSheet({ rows: [] })).toEqual({ ok: false, problem: { kind: 'empty' } })
    expect(analyzeIngredientSheet(sheet())).toEqual({ ok: false, problem: { kind: 'empty' } })
  })

  it(`rechaza más de ${BULK_MAX_ROWS} filas, el mismo tope que el servidor`, () => {
    const rows = Array.from({ length: BULK_MAX_ROWS + 1 }, (_, index) => [`Insumo ${index}`, 'kg', '100'])

    expect(analyzeIngredientSheet(sheet(...rows))).toEqual({
      ok: false,
      problem: { kind: 'too-many-rows', count: BULK_MAX_ROWS + 1 },
    })
    expect(batchOf(analyzeIngredientSheet(sheet(...rows.slice(0, BULK_MAX_ROWS)))).valid).toHaveLength(BULK_MAX_ROWS)
  })

  it('Estrategia de QA: un .xlsx real con costos "1.234,56" se clasifica de punta a punta', async () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([HEADER, ['Manteca en bloque mayorista', 'kg', '12.090,00'], ['Huevo grande', 'u', 193.33]]),
      'Insumos'
    )
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    const batch = batchOf(analyzeIngredientSheet(await readSpreadsheet(buffer)))

    expect(buildBulkPayload(batch.valid)).toEqual([
      { name: 'Manteca en bloque mayorista', unit: 'kg', cost: '12090.00' },
      { name: 'Huevo grande', unit: 'u', cost: '193.33' },
    ])
  })

  it('Estrategia de QA: un .csv real de Excel en español con costos "1.234,56" se clasifica de punta a punta', async () => {
    const csv = 'Nombre;Unidad;Costo\r\nGrasa bovina refinada La Cordobesa;kg;5.990,00\r\nPasta suavi;kg;15.400\r\n'

    const batch = batchOf(analyzeIngredientSheet(await readSpreadsheet(new TextEncoder().encode(csv).buffer as ArrayBuffer)))

    expect(buildBulkPayload(batch.valid)).toEqual([
      { name: 'Grasa bovina refinada La Cordobesa', unit: 'kg', cost: '5990.00' },
      { name: 'Pasta suavi', unit: 'kg', cost: '15400' },
    ])
  })
})

describe('describeBatchProblem', () => {
  it('explica cada problema en español y con la salida', () => {
    expect(describeBatchProblem({ kind: 'empty' })).toMatch(/no tiene insumos/)
    expect(describeBatchProblem({ kind: 'missing-columns', missing: ['Unidad', 'Costo'] })).toMatch(
      /columna Unidad, Costo.*Usá la plantilla/
    )
    expect(describeBatchProblem({ kind: 'too-many-rows', count: 620 })).toMatch(/620 filas.*máximo por carga es 500/)
  })
})

describe('validateSpreadsheetFile', () => {
  it.each(['insumos.xlsx', 'INSUMOS.XLS', 'lista.csv'])('acepta %s', (name) => {
    expect(validateSpreadsheetFile({ name, size: 2048 })).toBeNull()
  })

  it('rechaza otros formatos', () => {
    expect(validateSpreadsheetFile({ name: 'lista.pdf', size: 2048 })).toMatch(/Excel/)
  })

  it('rechaza archivos de más de 2 MB antes de leerlos', () => {
    expect(validateSpreadsheetFile({ name: 'lista.xlsx', size: BULK_MAX_FILE_BYTES + 1 })).toMatch(/2 MB/)
  })
})

describe('mapServerErrorsToSheetRows', () => {
  it('traduce la posición en el lote enviado al número de fila de la planilla', () => {
    const sent = batchOf(analyzeIngredientSheet(sheet(['Sal', 'kg', 'abc'], ['Sal fina Aurora', 'kg', '472,26'], ['Soda', 'l', '2300']))).valid

    expect(mapServerErrorsToSheetRows([{ row: 2, reason: 'Rechazada' }, { row: 9, reason: 'Fuera de rango' }], sent)).toEqual([
      { rowNumber: 4, name: 'Soda', reason: 'Rechazada' },
      { rowNumber: null, name: null, reason: 'Fuera de rango' },
    ])
  })
})

describe('buildTemplateWorkbook', () => {
  it('Escenario Gherkin "Plantilla": la hoja Insumos trae las columnas Nombre, Unidad y Costo', () => {
    const workbook = buildTemplateWorkbook(XLSX)
    const insumos = workbook.Sheets.Insumos

    expect(workbook.SheetNames).toEqual(['Insumos', 'Instrucciones'])
    expect([insumos?.A1?.v, insumos?.B1?.v, insumos?.C1?.v]).toEqual(['Nombre', 'Unidad', 'Costo'])
  })

  it('los ejemplos son válidos y el costo es numérico con formato de moneda', async () => {
    const workbook = buildTemplateWorkbook(XLSX)
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    expect(workbook.Sheets.Insumos?.C2).toMatchObject({ t: 'n', v: 736.25, z: '#,##0.00' })
    const batch = batchOf(analyzeIngredientSheet(await readSpreadsheet(buffer)))
    expect(batch.errors).toHaveLength(0)
    expect(batch.valid.length).toBeGreaterThan(0)
  })
})
