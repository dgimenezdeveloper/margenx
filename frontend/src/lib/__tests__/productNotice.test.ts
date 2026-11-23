import { describe, expect, it } from 'vitest'

import { isProductNoticeState, productNoticeState } from '@/lib/productNotice'

describe('productNotice: aviso que viaja a la lista de productos (#432)', () => {
  it('arma el estado de la navegación con el aviso y su tipo', () => {
    expect(productNoticeState('Producto eliminado correctamente.')).toEqual({
      productNotice: { title: 'Producto eliminado correctamente.', type: 'success' },
    })
    expect(productNoticeState('Producto guardado en estado Borrador (sin receta).', 'info').productNotice.type).toBe('info')
  })

  it('reconoce solo un estado con un aviso válido', () => {
    expect(isProductNoticeState(productNoticeState('Producto creado exitosamente con receta vinculada.'))).toBe(true)
    expect(isProductNoticeState(null)).toBe(false)
    expect(isProductNoticeState({ adminOnlyFrom: '/insumos' })).toBe(false)
    expect(isProductNoticeState({ productNotice: { title: 42 } })).toBe(false)
    expect(isProductNoticeState({ productNotice: { title: 'Hola', type: 'peligro' } })).toBe(false)
  })
})
