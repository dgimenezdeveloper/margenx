import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { parseCsv, readSpreadsheet } from '../spreadsheet'

const toBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

const utf8 = (text: string) => toBuffer(new TextEncoder().encode(text))

const xlsxBuffer = (rows: unknown[][]): ArrayBuffer => {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Insumos')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseCsv', () => {
  it('detecta el punto y coma que usa Excel en español y conserva la coma decimal', () => {
    const { rows } = parseCsv('Nombre;Unidad;Costo\nHarina de trigo 000 Olavarriense;kg;1.234,56\n')

    expect(rows).toEqual([
      { rowNumber: 1, cells: ['Nombre', 'Unidad', 'Costo'] },
      { rowNumber: 2, cells: ['Harina de trigo 000 Olavarriense', 'kg', '1.234,56'] },
    ])
  })

  it('detecta coma y tabulación como separador', () => {
    expect(parseCsv('Nombre,Unidad,Costo\nSoda,l,2300').rows[1]?.cells).toEqual(['Soda', 'l', '2300'])
    expect(parseCsv('Nombre\tUnidad\tCosto\nSoda\tl\t2300').rows[1]?.cells).toEqual(['Soda', 'l', '2300'])
  })

  it('respeta comillas, comillas escapadas y separadores dentro de una celda', () => {
    const { rows } = parseCsv('Nombre,Unidad,Costo\n"Manteca ""La Serenísima"", bloque",kg,"12.090,00"')

    expect(rows[1]?.cells).toEqual(['Manteca "La Serenísima", bloque', 'kg', '12.090,00'])
  })

  it('informa el número de fila real aunque haya filas en blanco, CRLF o saltos dentro de comillas', () => {
    const { rows } = parseCsv('Nombre;Unidad;Costo\r\n\r\nHuevo grande;u;193,33\r\n"Ricota\nCastelmar";kg;4615\r\nSal fina Aurora;kg;472,26')

    expect(rows.map((row) => row.rowNumber)).toEqual([1, 3, 4, 6])
    expect(rows[2]?.cells[0]).toBe('Ricota\nCastelmar')
  })

  it('devuelve una matriz vacía si el archivo solo tiene líneas en blanco', () => {
    expect(parseCsv('\n \n;;\n').rows).toEqual([])
  })
})

describe('readSpreadsheet', () => {
  it('lee un CSV en UTF-8 con BOM', async () => {
    const { rows } = await readSpreadsheet(utf8('\uFEFFNombre;Unidad;Costo\nAzúcar común tipo A;kg;1.150,00'))

    expect(rows[0]?.cells[0]).toBe('Nombre')
    expect(rows[1]?.cells).toEqual(['Azúcar común tipo A', 'kg', '1.150,00'])
  })

  it('lee un CSV guardado por Excel en Windows-1252 sin romper las tildes', async () => {
    // "Azúcar" en Windows-1252: la "ú" es el byte 0xFA, que no es UTF-8 válido.
    const header = new TextEncoder().encode('Nombre;Unidad;Costo\nAz')
    const tail = new TextEncoder().encode('car;kg;1150')
    const bytes = new Uint8Array([...header, 0xfa, ...tail])

    const { rows } = await readSpreadsheet(toBuffer(bytes))

    expect(rows[1]?.cells[0]).toBe('Azúcar')
  })

  it('lee un .xlsx real con números en las celdas y la fila real de cada insumo', async () => {
    const buffer = xlsxBuffer([
      ['Nombre', 'Unidad', 'Costo'],
      ['Harina de trigo 000 Olavarriense', 'kg', 736.25],
      [],
      ['Leche entera larga vida Silvia', 'l', 1715],
    ])

    const { rows } = await readSpreadsheet(buffer)

    expect(rows).toEqual([
      { rowNumber: 1, cells: ['Nombre', 'Unidad', 'Costo'] },
      { rowNumber: 2, cells: ['Harina de trigo 000 Olavarriense', 'kg', 736.25] },
      { rowNumber: 4, cells: ['Leche entera larga vida Silvia', 'l', 1715] },
    ])
  })

  it('devuelve una matriz vacía para un .xlsx sin celdas', async () => {
    expect((await readSpreadsheet(xlsxBuffer([]))).rows).toEqual([])
  })

  it('falla si el archivo parece un Excel pero está dañado', async () => {
    const corrupt = toBuffer(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02]))

    await expect(readSpreadsheet(corrupt)).rejects.toThrow()
  })
})
