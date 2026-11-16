import { describe, expect, it } from 'vitest'

import { formatPackage, formatPackagePrice, supplierContact } from '../supplierDisplay'

describe('formatPackage', () => {
  it('muestra el bulto con su unidad y decimales en es-AR', () => {
    expect(formatPackage('50', 'kg')).toBe('50 kg')
    expect(formatPackage(5, 'l')).toBe('5 l')
    expect(formatPackage('25.500', 'kg')).toBe('25,5 kg')
    expect(formatPackage('1500', 'u')).toBe('1.500 u')
  })

  it('no inventa un cero cuando el tamaño no es un número', () => {
    expect(formatPackage('', 'kg')).toBe('—')
  })
})

describe('formatPackagePrice', () => {
  it('formatea el precio del bulto como peso argentino aunque llegue como texto', () => {
    expect(formatPackagePrice('35000')).toBe('$35.000,00')
    expect(formatPackagePrice('35000.50')).toBe('$35.000,50')
    expect(formatPackagePrice(1234.56)).toBe('$1.234,56')
  })

  it('devuelve un guion si el precio no es legible', () => {
    expect(formatPackagePrice('abc')).toBe('—')
  })
})

describe('supplierContact', () => {
  it('prioriza el teléfono y suma el email como dato secundario', () => {
    expect(
      supplierContact({ contactPhone: '+54 9 2284 41-5566', email: 'ventas@molino.com.ar', address: null })
    ).toEqual({ primary: '+54 9 2284 41-5566', secondary: 'ventas@molino.com.ar' })
  })

  it('usa el email o la dirección cuando no hay teléfono', () => {
    expect(supplierContact({ contactPhone: null, email: 'ventas@molino.com.ar', address: 'Ruta 226 km 300' })).toEqual({
      primary: 'ventas@molino.com.ar',
      secondary: 'Ruta 226 km 300',
    })
    expect(supplierContact({ contactPhone: '  ', email: null, address: 'Ruta 226 km 300' })).toEqual({
      primary: 'Ruta 226 km 300',
      secondary: null,
    })
  })

  it('avisa cuando el proveedor no tiene ningún dato de contacto', () => {
    expect(supplierContact({})).toEqual({ primary: null, secondary: null })
  })
})
