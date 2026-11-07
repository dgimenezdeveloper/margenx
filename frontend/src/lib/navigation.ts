interface RoleFlags {
  isAdmin: boolean
  isCollaborator: boolean
}

/**
 * Qué enlaces del menú ve cada rol (docs/manual-usuario/02-rutas-y-roles.md).
 * Proveedores exige el rol ADMIN confirmado: no aparece mientras el rol se está cargando.
 */
export function isNavLinkVisible(href: string, role: RoleFlags): boolean {
  if (href === '/proveedores') return role.isAdmin
  if (href === '/insumos') return !role.isCollaborator
  return true
}

/** La sección queda marcada en su ruta y en las que cuelgan de ella (`/proveedores/cuarentena`). */
export function isNavLinkActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
