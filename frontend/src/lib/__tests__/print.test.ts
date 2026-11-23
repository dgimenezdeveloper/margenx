import { describe, expect, it } from 'vitest'

import { PRINT_CSS, PRINT_FORMATS } from '../print'

/*
  Formatos de impresión del ticket y del cierre de caja ([RV458-I1] y [RV462-I2]).
  `size` en `@page` acepta `auto`, un tamaño con nombre (con orientación opcional) o una o dos
  longitudes. Una longitud con `auto` ("58mm auto") no es válida: el navegador descarta la regla
  y la hoja queda en carta o A4.
*/
const VALID_PAGE_SIZE = /^(auto|(a3|a4|a5|letter|legal)( (portrait|landscape))?|\d+(\.\d+)?mm( \d+(\.\d+)?mm)?)$/i

function pageSize(css: string): string | null {
  const page = css.match(/@page\s*\{([^}]*)\}/)
  if (!page) throw new Error(`Falta la regla @page en "${css}"`)
  const size = page[1]!.match(/(?:^|;)\s*size:\s*([^;]+)/)
  return size ? size[1]!.trim() : null
}

describe('Formatos de impresión (lib/print.ts)', () => {
  it('ningún formato usa un tamaño de hoja que el navegador descarta', () => {
    for (const { value } of PRINT_FORMATS) {
      const size = pageSize(PRINT_CSS[value])
      if (size !== null) expect(size, `formato ${value}`).toMatch(VALID_PAGE_SIZE)
    }
  })

  it('el control rechaza la regla vieja de la ticketera', () => {
    expect('58mm auto').not.toMatch(VALID_PAGE_SIZE)
    expect('80mm auto').not.toMatch(VALID_PAGE_SIZE)
    expect('58mm 200mm').toMatch(VALID_PAGE_SIZE)
  })

  it('en la ticketera el papel es el rollo de la impresora: la regla lleva el margen y el ancho del ticket', () => {
    expect(pageSize(PRINT_CSS['58'])).toBeNull()
    expect(PRINT_CSS['58']).toContain('@page { margin: 2mm; }')
    expect(PRINT_CSS['58']).toContain('.mx-ticket { width: 54mm;')
    expect(pageSize(PRINT_CSS['80'])).toBeNull()
    expect(PRINT_CSS['80']).toContain('@page { margin: 3mm; }')
    expect(PRINT_CSS['80']).toContain('.mx-ticket { width: 74mm;')
  })

  it('en A4 la hoja es A4', () => {
    expect(pageSize(PRINT_CSS.A4)).toBe('A4')
  })
})
