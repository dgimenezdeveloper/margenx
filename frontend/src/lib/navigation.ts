import type { FeatureFlags } from '@/services/authService'

interface RoleFlags {
  isAdmin: boolean
  isCollaborator: boolean
}

const NO_FEATURES: FeatureFlags = { sales: false }

/**
 * Qué enlaces del menú ve cada rol (docs/manual-usuario/02-rutas-y-roles.md).
 * Proveedores y Compras exigen el rol ADMIN confirmado: no aparecen mientras el rol se está cargando.
 * Ventas aparece para los dos roles solo con el módulo prendido en la cuenta (ADR-010).
 */
export function isNavLinkVisible(href: string, role: RoleFlags, features: FeatureFlags = NO_FEATURES): boolean {
  if (href === '/ventas') return features.sales
  if (href === '/proveedores' || href === '/compras') return role.isAdmin
  if (href === '/insumos') return !role.isCollaborator
  return true
}

/** La sección queda marcada en su ruta y en las que cuelgan de ella (`/proveedores/cuarentena`). */
export function isNavLinkActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Orden de las pestañas del menú inferior: primero lo de todos los días (#437). */
const MOBILE_TAB_PRIORITY = ['/dashboard', '/productos', '/insumos', '/ventas', '/proveedores', '/compras', '/perfil']

/** A 360 px entran 5 lugares con el rótulo completo: con más destinos, 4 pestañas fijas y "Más". */
const MAX_MOBILE_TABS = 4

/**
 * Reparte los destinos visibles entre las pestañas fijas del menú inferior y el panel de "Más" (#437).
 * Con 4 destinos o menos (el colaborador) entran todos y no hace falta "Más".
 */
export function splitMobileNav(visibleHrefs: string[]): { tabs: string[]; more: string[] } {
  const ordered = [...visibleHrefs].sort((a, b) => MOBILE_TAB_PRIORITY.indexOf(a) - MOBILE_TAB_PRIORITY.indexOf(b))
  if (ordered.length <= MAX_MOBILE_TABS) return { tabs: ordered, more: [] }
  return { tabs: ordered.slice(0, MAX_MOBILE_TABS), more: ordered.slice(MAX_MOBILE_TABS) }
}
