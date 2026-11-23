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
