import { describe, it, expect } from 'vitest'
import {
  normalizeUnit,
  parseRowCost,
  classifyIngredientRows,
  generateTemplateWorkbook,
  parseSpreadsheet,
} from '../bulkIngredients'

describe('bulkIngredients utility', () => {
  describe('normalizeUnit', () => {
    it('normaliza correctamente kilogramos y sus variantes a kg', () => {
      expect(normalizeUnit('kg')).toBe('kg')
      expect(normalizeUnit('KILOS')).toBe('kg')
      expect(normalizeUnit('kilogramo')).toBe('kg')
      expect(normalizeUnit('kilo')).toBe('kg')
    })

    it('normaliza correctamente litros y sus variantes a l', () => {
      expect(normalizeUnit('l')).toBe('l')
      expect(normalizeUnit('litro')).toBe('l')
      expect(normalizeUnit('LITROS')).toBe('l')
      expect(normalizeUnit('lt')).toBe('l')
    })

    it('normaliza correctamente unidades y sus variantes a u', () => {
      expect(normalizeUnit('u')).toBe('u')
      expect(normalizeUnit('unidad')).toBe('u')
      expect(normalizeUnit('UNIDADES')).toBe('u')
      expect(normalizeUnit('un')).toBe('u')
    })

    it('devuelve null ante unidades desconocidas o nulas', () => {
      expect(normalizeUnit('toneladas')).toBeNull()
      expect(normalizeUnit('gramos')).toBeNull()
      expect(normalizeUnit(null)).toBeNull()
      expect(normalizeUnit('')).toBeNull()
    })
  })

  describe('parseRowCost', () => {
    it('interpreta importes en formato argentino estándar y flotante', () => {
      expect(parseRowCost('1.234,56')).toEqual({ cost: 1234.56 })
      expect(parseRowCost('736,25')).toEqual({ cost: 736.25 })
      expect(parseRowCost('1500')).toEqual({ cost: 1500 })
      expect(parseRowCost(1715.5)).toEqual({ cost: 1715.5 })
    })

    it('falla con mensaje descriptivo si el costo no es numérico', () => {
      expect(parseRowCost('abc')).toEqual({
        cost: 0,
        error: 'El costo debe ser un valor decimal válido.',
      })
      expect(parseRowCost('')).toEqual({
        cost: 0,
        error: 'El costo es obligatorio.',
      })
    })

    it('falla si el costo es menor o igual a cero', () => {
      expect(parseRowCost('0')).toEqual({
        cost: 0,
        error: 'El costo debe ser mayor a 0.',
      })
      expect(parseRowCost('-50')).toEqual({
        cost: 0,
        error: 'El costo debe ser mayor a 0.',
      })
    })

    it('falla si supera el límite de base de datos de $99.999.999,99', () => {
      expect(parseRowCost('100000000')).toEqual({
        cost: 0,
        error: 'El costo no puede superar $99.999.999,99.',
      })
    })

    it('falla si tiene más de 2 decimales', () => {
      // En formato es-AR, la coma representa los decimales ('12,345' son 3 decimales)
      expect(parseRowCost('12,345')).toEqual({
        cost: 0,
        error: 'El costo no puede tener más de 2 decimales.',
      })
      // Número flotante nativo de JavaScript con 3 decimales
      expect(parseRowCost(12.345)).toEqual({
        cost: 0,
        error: 'El costo no puede tener más de 2 decimales.',
      })
      // Con punto en un número que no encaja en el patrón de miles
      expect(parseRowCost('1234.567')).toEqual({
        cost: 0,
        error: 'El costo no puede tener más de 2 decimales.',
      })
    })
  })

  describe('classifyIngredientRows', () => {
    it('Escenario Gherkin: Planilla válida con 20 insumos -> 20 filas válidas listas para confirmar', () => {
      const rawRows = Array.from({ length: 20 }, (_, idx) => ({
        Nombre: `Insumo Piloto ${idx + 1}`,
        Unidad: idx % 2 === 0 ? 'kg' : 'l',
        Costo: `${100 + idx},50`,
      }))

      const result = classifyIngredientRows(rawRows, [])

      expect(result.valid).toHaveLength(20)
      expect(result.errors).toHaveLength(0)
      expect(result.duplicates).toHaveLength(0)
      expect(result.totalRows).toBe(20)
    })

    it('Escenario Gherkin: Filas con error (costo "abc") no impiden clasificar las válidas', () => {
      const rawRows = [
        { Nombre: 'Harina 000', Unidad: 'kg', Costo: '736,25' },
        { Nombre: 'Levadura con error', Unidad: 'kg', Costo: 'abc' },
        { Nombre: 'Leche entera', Unidad: 'litro', Costo: '1715,00' },
      ]

      const result = classifyIngredientRows(rawRows, [])

      expect(result.valid).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        rowNumber: 3,
        name: 'Levadura con error',
        reason: 'El costo debe ser un valor decimal válido.',
      })
    })

    it('clasifica nombres repetidos contra la despensa existente y dentro de la planilla', () => {
      const existing = [{ name: 'Harina 000 Olavarriense' }]
      const rawRows = [
        { Nombre: 'harina 000 olavarriense', Unidad: 'kg', Costo: '750' },
        { Nombre: 'Azúcar común', Unidad: 'kg', Costo: '1100' },
        { Nombre: 'azúcar común', Unidad: 'kg', Costo: '1150' },
      ]

      const result = classifyIngredientRows(rawRows, existing)

      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].name).toBe('Azúcar común')
      expect(result.duplicates).toHaveLength(2)
      expect(result.duplicates[0].reason).toContain('despensa')
      expect(result.duplicates[1].reason).toContain('planilla')
    })
  })

  describe('generateTemplateWorkbook & parseSpreadsheet', () => {
    it('Escenario Gherkin: Genera plantilla con las columnas Nombre, Unidad y Costo', () => {
      const wb = generateTemplateWorkbook()
      expect(wb.SheetNames).toContain('Insumos')

      const ws = wb.Sheets['Insumos']
      expect(ws).toBeDefined()

      // Verifica los encabezados de las celdas A1, B1 y C1
      expect(ws?.['A1']?.v).toBe('Nombre')
      expect(ws?.['B1']?.v).toBe('Unidad')
      expect(ws?.['C1']?.v).toBe('Costo')
    })

    it('lee correctamente buffers de hojas de cálculo con parseSpreadsheet', () => {
      const csvContent = 'Nombre,Unidad,Costo\nHarina de trigo 000,kg,736.25\nLeche entera,l,1715.00\n'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(csvContent).buffer

      const rows = parseSpreadsheet(buffer)
      expect(rows.length).toBe(2)
      expect(rows[0]).toHaveProperty('Nombre')
      expect(rows[0]).toHaveProperty('Unidad')
      expect(rows[0]).toHaveProperty('Costo')
    })
  })
})