import { describe, expect, it } from 'vitest'

import {
  HEALTH_BUCKET_META,
  SURPLUS_MARGIN_THRESHOLD,
  classifyHealthBucket,
  resolveProductHealthBucket,
} from '@/lib/healthBucket'
import type { Product } from '@/services/productService'

const receta = [{ ingredientId: 'harina-000', quantity: 0.5 }]

function producto(overrides: Partial<Product>): Product {
  return {
    id: 'medialuna',
    name: 'Medialuna de manteca',
    salePrice: 900,
    minMarginPercent: 35,
    marginPercent: 40,
    ingredients: receta,
    ...overrides,
  }
}

describe('classifyHealthBucket (misma regla que GET /api/dashboard/metrics)', () => {
  it('un producto sin receta es borrador aunque tenga margen cargado', () => {
    expect(classifyHealthBucket(producto({ ingredients: [], marginPercent: 80 }))).toBe('draft')
  })

  it('margen negativo es pérdida: precio $13 con costo $3.854', () => {
    expect(classifyHealthBucket(producto({ salePrice: 13, marginPercent: -29546.15 }))).toBe('loss')
  })

  it('usa el margen mínimo propio de cada producto, no un 30 % fijo', () => {
    expect(classifyHealthBucket(producto({ marginPercent: 32, minMarginPercent: 35 }))).toBe('risk')
    expect(classifyHealthBucket(producto({ marginPercent: 32, minMarginPercent: 25 }))).toBe('target')
  })

  it('0 % con mínimo positivo es riesgo y no pérdida', () => {
    expect(classifyHealthBucket(producto({ marginPercent: 0 }))).toBe('risk')
  })

  it('el margen igual al mínimo ya está en objetivo', () => {
    expect(classifyHealthBucket(producto({ marginPercent: 35, minMarginPercent: 35 }))).toBe('target')
  })

  it('60 % justo sigue en objetivo y más de 60 % es superávit', () => {
    expect(SURPLUS_MARGIN_THRESHOLD).toBe(60)
    expect(classifyHealthBucket(producto({ marginPercent: 60 }))).toBe('target')
    expect(classifyHealthBucket(producto({ marginPercent: 60.01 }))).toBe('surplus')
  })

  it('con un mínimo mayor a 60 %, un margen de 65 % por debajo de ese mínimo es riesgo', () => {
    expect(classifyHealthBucket(producto({ marginPercent: 65, minMarginPercent: 70 }))).toBe('risk')
  })

  it('sin margen ni mínimo (datos ocultos) usa 0, igual que el servidor', () => {
    expect(classifyHealthBucket(producto({ marginPercent: undefined, minMarginPercent: undefined }))).toBe('target')
  })
})

describe('HEALTH_BUCKET_META y resolveProductHealthBucket (#358)', () => {
  it('define los cinco estados oficiales con nombres únicos y descripciones accesibles', () => {
    expect(HEALTH_BUCKET_META.draft.label).toBe('Borrador')
    expect(HEALTH_BUCKET_META.loss.label).toBe('Pérdida')
    expect(HEALTH_BUCKET_META.risk.label).toBe('En riesgo')
    expect(HEALTH_BUCKET_META.target.label).toBe('En objetivo')
    expect(HEALTH_BUCKET_META.surplus.label).toBe('Superávit')

    Object.values(HEALTH_BUCKET_META).forEach((meta) => {
      expect(meta.description.trim().length).toBeGreaterThan(0)
      expect(meta.badgeClassName.trim().length).toBeGreaterThan(0)
      expect(meta.chartBarClassName.trim().length).toBeGreaterThan(0)
    })
  })

  it('resolveProductHealthBucket clasifica según hasRecipe, ingredientsCount y márgenes', () => {
    expect(resolveProductHealthBucket({ hasRecipe: false, marginPercent: 50, minMarginPercent: 30 })).toBe('draft')
    expect(resolveProductHealthBucket({ ingredientsCount: 0, marginPercent: 50, minMarginPercent: 30 })).toBe('draft')
    expect(resolveProductHealthBucket({ hasRecipe: true, marginPercent: -15, minMarginPercent: 30 })).toBe('loss')
    expect(resolveProductHealthBucket({ hasRecipe: true, marginPercent: 20, minMarginPercent: 30 })).toBe('risk')
    expect(resolveProductHealthBucket({ hasRecipe: true, marginPercent: 45, minMarginPercent: 30 })).toBe('target')
    expect(resolveProductHealthBucket({ hasRecipe: true, marginPercent: 75, minMarginPercent: 30 })).toBe('surplus')
  })
})