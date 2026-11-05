import { describe, it, expect } from 'vitest'
import { supplierPresentationSchema } from '../supplierPresentationSchema'

describe('supplierPresentationSchema', () => {
  it('valida una presentación correcta', () => {
    const valid = {
      supplierCode: 'HAR188',
      rawDescription: 'Harina 000 bolsa 50kg',
      packageSize: 50,
      packagePrice: 35000,
      isDefault: true,
    }
    const result = supplierPresentationSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('permite código y descripción vacíos u omitidos', () => {
    const validNoMeta = {
      supplierCode: '',
      rawDescription: '',
      packageSize: '25',
      packagePrice: '18406.25',
      isDefault: false,
    }
    const result = supplierPresentationSchema.safeParse(validNoMeta)
    expect(result.success).toBe(true)
  })

  it('rechaza código mayor a 64 caracteres y descripción mayor a 500', () => {
    const invalid = {
      supplierCode: 'A'.repeat(65),
      rawDescription: 'B'.repeat(501),
      packageSize: 10,
      packagePrice: 1000,
    }
    const result = supplierPresentationSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('supplierCode'))).toBe(true)
      expect(result.error.issues.some((i) => i.path.includes('rawDescription'))).toBe(true)
    }
  })

  it('rechaza cantidades y precios no positivos o desbordantes', () => {
    expect(
      supplierPresentationSchema.safeParse({
        packageSize: 0,
        packagePrice: 100,
      }).success
    ).toBe(false)

    expect(
      supplierPresentationSchema.safeParse({
        packageSize: 10_000_000,
        packagePrice: 100,
      }).success
    ).toBe(false)

    expect(
      supplierPresentationSchema.safeParse({
        packageSize: 10,
        packagePrice: 100_000_000,
      }).success
    ).toBe(false)
  })
})