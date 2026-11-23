import { describe, expect, it } from 'vitest'

import { bulkUploadNotice } from '@/lib/bulkUploadNotice'

describe('bulkUploadNotice: aviso al terminar la planilla de insumos (#433)', () => {
  it('Escenario "Aviso de planilla": 3 filas válidas → "Se cargaron 3 insumos."', () => {
    expect(bulkUploadNotice({ created: 3, skipped: 0, errors: [] })).toBe('Se cargaron 3 insumos.')
  })

  it('suma los repetidos y los errores cuando los hay, en singular o plural', () => {
    expect(bulkUploadNotice({ created: 12, skipped: 2, errors: [{ row: 5, reason: 'Costo inválido' }] })).toBe(
      'Se cargaron 12 insumos. 2 repetidos y 1 con error.'
    )
    expect(bulkUploadNotice({ created: 1, skipped: 1, errors: [] })).toBe('Se cargó 1 insumo. 1 repetido.')
    expect(bulkUploadNotice({ created: 4, skipped: 0, errors: [{ row: 2, reason: 'x' }, { row: 3, reason: 'y' }] })).toBe(
      'Se cargaron 4 insumos. 2 con error.'
    )
  })

  it('si no se cargó ninguno, lo dice', () => {
    expect(bulkUploadNotice({ created: 0, skipped: 3, errors: [] })).toBe('No se cargó ningún insumo. 3 repetidos.')
  })
})
