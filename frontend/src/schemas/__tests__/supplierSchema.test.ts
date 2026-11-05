import { describe, expect, it } from 'vitest'

import { supplierSchema, toSupplierPayload } from '../supplierSchema'

const base = {
  name: 'Molino Olavarriense',
  contactPhone: '',
  email: '',
  address: '',
  isActive: true,
}

const firstError = (input: Record<string, unknown>, field: string) => {
  const result = supplierSchema.safeParse({ ...base, ...input })
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe('supplierSchema', () => {
  it('acepta un proveedor con solo el nombre', () => {
    expect(supplierSchema.safeParse(base).success).toBe(true)
  })

  it('acepta un proveedor con todos los datos de contacto', () => {
    const result = supplierSchema.safeParse({
      ...base,
      contactPhone: '+54 9 2284 41-5566',
      email: 'ventas@molinoolavarriense.com.ar',
      address: 'Av. Pringles 1450, Olavarría',
    })
    expect(result.success).toBe(true)
  })

  it('exige el nombre y lo recorta antes de validar', () => {
    expect(firstError({ name: '' }, 'name')).toBe('Escribí el nombre del proveedor.')
    expect(firstError({ name: '   ' }, 'name')).toBe('Escribí el nombre del proveedor.')
    expect(firstError({ name: 'M' }, 'name')).toBe('El nombre debe tener al menos 2 caracteres.')
  })

  it('limita el largo del nombre', () => {
    expect(firstError({ name: 'A'.repeat(121) }, 'name')).toBe('El nombre no puede superar los 120 caracteres.')
    expect(firstError({ name: 'A'.repeat(120) }, 'name')).toBeUndefined()
  })

  it('rechaza un email mal escrito con un ejemplo de cómo corregirlo', () => {
    expect(firstError({ email: 'ventas@molino' }, 'email')).toBe(
      'Revisá el email: tiene que ser como ventas@proveedor.com.ar.'
    )
  })

  it('rechaza un teléfono con letras o con menos de 6 dígitos', () => {
    const message = 'Revisá el teléfono: usá solo números, espacios, guiones, paréntesis o +, con al menos 6 dígitos.'
    expect(firstError({ contactPhone: 'llamar a Juan' }, 'contactPhone')).toBe(message)
    expect(firstError({ contactPhone: '12-34' }, 'contactPhone')).toBe(message)
    expect(firstError({ contactPhone: '(0221) 455-1020' }, 'contactPhone')).toBeUndefined()
  })

  it('limita el largo de la dirección', () => {
    expect(firstError({ address: 'x'.repeat(201) }, 'address')).toBe(
      'La dirección no puede superar los 200 caracteres.'
    )
  })
})

describe('toSupplierPayload', () => {
  it('recorta los textos y manda null en los campos vacíos para poder borrarlos al editar', () => {
    expect(
      toSupplierPayload({
        name: '  Distribuidora Química del Sur  ',
        contactPhone: '   ',
        email: ' compras@quimicadelsur.com.ar ',
        address: '',
        isActive: false,
      })
    ).toEqual({
      name: 'Distribuidora Química del Sur',
      contactPhone: null,
      email: 'compras@quimicadelsur.com.ar',
      address: null,
      isActive: false,
    })
  })
})
