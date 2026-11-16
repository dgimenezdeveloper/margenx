import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchApi } from '@/services/api'
import { supplierService } from '@/services/supplierService'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return { ...actual, fetchApi: vi.fn() }
})

const getToken = vi.fn().mockResolvedValue('token')

// Respuesta real de GET /api/suppliers/quarantine (docs/api.md §7): Prisma serializa los Decimal como texto.
const harinaEnCuarentena = {
  id: 'q-harina',
  ingredientId: 'ing-harina',
  supplierId: 'sup-centro',
  supplierCode: 'HAR-000-25',
  packageUnit: 'kg',
  packageSize: '25.000',
  packagePrice: '18406.25',
  pendingPackagePrice: '50000.00',
  currentPrice: '18406.25',
  proposedPrice: '50000.00',
  variationPercent: '171.64',
  quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
  isDefault: true,
  isQuarantined: true,
  ingredient: { id: 'ing-harina', name: 'Harina de trigo 000 Olavarriense', currentCost: '736.25' },
  supplier: { id: 'sup-centro', name: 'Distribuidora del Centro' },
}

describe('supplierService: contrato de la bandeja de cuarentena', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset()
  })

  it('getQuarantine convierte a número los importes que la API envía como texto', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ quarantined: [harinaEnCuarentena] })

    const [item] = await supplierService.getQuarantine(getToken)

    expect(item.packageSize).toBe(25)
    expect(item.packagePrice).toBe(18406.25)
    expect(item.currentPrice).toBe(18406.25)
    expect(item.proposedPrice).toBe(50000)
    expect(item.variationPercent).toBe(171.64)
    expect(item.ingredient.currentCost).toBe(736.25)
    expect(item.ingredient.name).toBe('Harina de trigo 000 Olavarriense')
    expect(item.supplier.name).toBe('Distribuidora del Centro')
  })

  it('getQuarantine devuelve una lista vacía si la API no trae "quarantined"', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({})

    await expect(supplierService.getQuarantine(getToken)).resolves.toEqual([])
  })

  it('releaseQuarantine convierte a número el costo unitario y los importes de la presentación', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      supplierIngredient: { ...harinaEnCuarentena, packagePrice: '50000.00', pendingPackagePrice: null, isQuarantined: false },
      unitCost: '2000.00',
      affectedProductsCount: 2,
      affectedProducts: [],
      criticalProducts: [],
    })

    const res = await supplierService.releaseQuarantine(getToken, 'q-harina')

    expect(res.unitCost).toBe(2000)
    expect(res.supplierIngredient.packagePrice).toBe(50000)
    expect(res.supplierIngredient.packageSize).toBe(25)
    expect(res.affectedProductsCount).toBe(2)
    expect(fetchApi).toHaveBeenCalledWith('/suppliers/quarantine/q-harina/release', getToken, { method: 'POST' })
  })
})
