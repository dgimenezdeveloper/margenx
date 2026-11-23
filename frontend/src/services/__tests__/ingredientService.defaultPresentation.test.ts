import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, fetchApi } from '@/services/api'
import { defaultPresentationMismatch, ingredientService } from '@/services/ingredientService'

const getToken = vi.fn().mockResolvedValue('test-token')

// 409 que devuelve PUT /api/ingredients/:id cuando el costo manual contradice la presentación predeterminada (#427).
const CONFLICTO = {
  error: 'El insumo tiene una presentación predeterminada con otro costo. Elegí si actualizás el precio de esa presentación o si dejás de usarla como predeterminada.',
  code: 'DEFAULT_PRESENTATION_MISMATCH',
  defaultPresentation: {
    id: 'si-molinera',
    supplierId: 'sup-molinera',
    supplierName: 'Distribuidora Mayorista Molinera',
    packageSize: '25',
    packageUnit: 'kg',
    packagePrice: '22500.00',
    unitCost: '900.00',
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ApiError conserva el cuerpo de la respuesta (#427)', () => {
  it('un 409 con JSON llega con su mensaje y con el cuerpo completo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(CONFLICTO), { status: 409, headers: { 'Content-Type': 'application/json' } })))

    const error = await fetchApi('/ingredients/ing-harina', getToken, { method: 'PUT', body: '{}' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).message).toBe(CONFLICTO.error)
    expect((error as ApiError).body).toEqual(CONFLICTO)
  })
})

describe('Presentación predeterminada en la edición del insumo (#427)', () => {
  it('update manda la acción elegida en el cuerpo del PUT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ingredient: { id: 'ing-harina', name: 'Harina 000 Olavarriense', unit: 'kg', currentCost: '950.00' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    await ingredientService.update(getToken, 'ing-harina', {
      name: 'Harina 000 Olavarriense',
      unit: 'kg',
      currentCost: 950,
      defaultPresentationAction: 'update-presentation',
    })

    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Harina 000 Olavarriense',
      unit: 'kg',
      currentCost: 950,
      defaultPresentationAction: 'update-presentation',
    })
  })

  it('defaultPresentationMismatch reconoce el 409 y devuelve la presentación con números', () => {
    const resultado = defaultPresentationMismatch(new ApiError(CONFLICTO.error, 409, CONFLICTO))

    expect(resultado).toEqual({
      id: 'si-molinera',
      supplierName: 'Distribuidora Mayorista Molinera',
      packageSize: 25,
      packageUnit: 'kg',
      packagePrice: 22500,
      unitCost: 900,
    })
  })

  it('cualquier otro error no es el de la presentación predeterminada', () => {
    expect(defaultPresentationMismatch(new ApiError('Ya existe un insumo con ese nombre.', 409, { error: 'Ya existe un insumo con ese nombre.' }))).toBeNull()
    expect(defaultPresentationMismatch(new ApiError('Fallo temporal', 500))).toBeNull()
    expect(defaultPresentationMismatch(new Error('red'))).toBeNull()
  })
})
