import { describe, expect, it } from 'vitest'

import { isNavLinkActive, isNavLinkVisible } from '../navigation'

const admin = { isAdmin: true, isCollaborator: false }
const collaborator = { isAdmin: false, isCollaborator: true }
const unknownRole = { isAdmin: false, isCollaborator: false }

describe('isNavLinkVisible', () => {
  it('muestra Proveedores solo al administrador, ni siquiera mientras carga el rol', () => {
    expect(isNavLinkVisible('/proveedores', admin)).toBe(true)
    expect(isNavLinkVisible('/proveedores', collaborator)).toBe(false)
    expect(isNavLinkVisible('/proveedores', unknownRole)).toBe(false)
  })

  it('mantiene la regla vigente de Insumos: se oculta al colaborador', () => {
    expect(isNavLinkVisible('/insumos', admin)).toBe(true)
    expect(isNavLinkVisible('/insumos', collaborator)).toBe(false)
    expect(isNavLinkVisible('/insumos', unknownRole)).toBe(true)
  })

  it('el resto de los enlaces lo ve cualquier rol', () => {
    expect(isNavLinkVisible('/productos', collaborator)).toBe(true)
    expect(isNavLinkVisible('/perfil', unknownRole)).toBe(true)
  })
})

describe('isNavLinkActive', () => {
  it('marca la sección exacta y sus subrutas', () => {
    expect(isNavLinkActive('/proveedores', '/proveedores')).toBe(true)
    expect(isNavLinkActive('/proveedores/cuarentena', '/proveedores')).toBe(true)
    expect(isNavLinkActive('/productos/abc-123', '/productos')).toBe(true)
  })

  it('no confunde rutas que solo comparten el comienzo', () => {
    expect(isNavLinkActive('/productosx', '/productos')).toBe(false)
    expect(isNavLinkActive('/proveedores', '/insumos')).toBe(false)
    expect(isNavLinkActive(null, '/dashboard')).toBe(false)
  })
})
