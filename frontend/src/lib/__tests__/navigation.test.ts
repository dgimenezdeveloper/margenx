import { describe, expect, it } from 'vitest'

import { isNavLinkActive, isNavLinkVisible, splitMobileNav } from '../navigation'

const admin = { isAdmin: true, isCollaborator: false }
const collaborator = { isAdmin: false, isCollaborator: true }
const unknownRole = { isAdmin: false, isCollaborator: false }

describe('isNavLinkVisible', () => {
  it('muestra Proveedores solo al administrador, ni siquiera mientras carga el rol', () => {
    expect(isNavLinkVisible('/proveedores', admin)).toBe(true)
    expect(isNavLinkVisible('/proveedores', collaborator)).toBe(false)
    expect(isNavLinkVisible('/proveedores', unknownRole)).toBe(false)
  })

  it('muestra Compras solo al administrador', () => {
    expect(isNavLinkVisible('/compras', admin)).toBe(true)
    expect(isNavLinkVisible('/compras', collaborator)).toBe(false)
    expect(isNavLinkVisible('/compras', unknownRole)).toBe(false)
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

describe('isNavLinkVisible: Ventas depende del módulo de la cuenta (ADR-010, #448)', () => {
  it('se muestra a los dos roles solo con el módulo de ventas prendido', () => {
    expect(isNavLinkVisible('/ventas', admin, { sales: true })).toBe(true)
    expect(isNavLinkVisible('/ventas', collaborator, { sales: true })).toBe(true)
    expect(isNavLinkVisible('/ventas', admin, { sales: false })).toBe(false)
  })

  it('sin módulos informados (mientras carga /me) queda oculto', () => {
    expect(isNavLinkVisible('/ventas', admin)).toBe(false)
  })
})

describe('isNavLinkActive', () => {
  it('marca la sección exacta y sus subrutas', () => {
    expect(isNavLinkActive('/proveedores', '/proveedores')).toBe(true)
    expect(isNavLinkActive('/proveedores/cuarentena', '/proveedores')).toBe(true)
    expect(isNavLinkActive('/productos/abc-123', '/productos')).toBe(true)
    expect(isNavLinkActive('/compras', '/compras')).toBe(true)
  })

  it('no confunde rutas que solo comparten el comienzo', () => {
    expect(isNavLinkActive('/productosx', '/productos')).toBe(false)
    expect(isNavLinkActive('/proveedores', '/insumos')).toBe(false)
    expect(isNavLinkActive('/compras-antiguas', '/compras')).toBe(false)
    expect(isNavLinkActive(null, '/dashboard')).toBe(false)
  })
})

describe('splitMobileNav: pestañas fijas del menú inferior y "Más" (#437)', () => {
  it('el ADMIN con el módulo de ventas tiene 4 pestañas fijas y el resto va a "Más"', () => {
    const visibles = ['/dashboard', '/insumos', '/productos', '/ventas', '/proveedores', '/compras', '/perfil']
    expect(splitMobileNav(visibles)).toEqual({
      tabs: ['/dashboard', '/productos', '/insumos', '/ventas'],
      more: ['/proveedores', '/compras', '/perfil'],
    })
  })

  it('sin el módulo de ventas, la cuarta pestaña es Proveedores', () => {
    const visibles = ['/dashboard', '/insumos', '/productos', '/proveedores', '/compras', '/perfil']
    expect(splitMobileNav(visibles)).toEqual({
      tabs: ['/dashboard', '/productos', '/insumos', '/proveedores'],
      more: ['/compras', '/perfil'],
    })
  })

  it('con 4 destinos o menos (el colaborador) entran todos y no hace falta "Más"', () => {
    expect(splitMobileNav(['/dashboard', '/productos', '/ventas', '/perfil'])).toEqual({
      tabs: ['/dashboard', '/productos', '/ventas', '/perfil'],
      more: [],
    })
    expect(splitMobileNav(['/dashboard', '/productos', '/perfil'])).toEqual({
      tabs: ['/dashboard', '/productos', '/perfil'],
      more: [],
    })
  })
})
