'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Drawer } from '@base-ui/react/drawer'
import { Building2, LogOut, Moon, X, type LucideIcon } from 'lucide-react'
import { LogoutDialog } from '@/components/logout-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useSignOut } from '@/hooks/useSignOut'
import { MOBILE_VIEWPORT_QUERY, useSwipeToOpen } from '@/hooks/useSwipeToOpen'
import { useTheme } from '@/hooks/useTheme'
import { useUserRole } from '@/hooks/useUserRole'
import { isNavLinkActive } from '@/lib/navigation'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { cn } from '@/lib/utils'

export type MobileMenuGroup = 'negocio' | 'compras' | 'cuenta'

export interface MobileMenuLink {
  href: string
  label: string
  icon: LucideIcon
  group: MobileMenuGroup
}

const GROUP_TITLES: Record<MobileMenuGroup, string> = {
  negocio: 'Tu negocio',
  compras: 'Compras',
  cuenta: 'Cuenta',
}

/** Ancho del panel si todavía no se puede medir (296 px: el 82 % de una pantalla de 360 px). */
const FALLBACK_PANEL_WIDTH = 296
/** Al soltar, queda abierto si el dedo recorrió el 35 % del panel o más (algo más de un tercio) o lo lanzó rápido. */
const OPEN_DISTANCE_RATIO = 0.35
const OPEN_VELOCITY_PX_PER_MS = 0.5

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Todos los destinos que el rol puede ver, en el orden del panel. */
  links: MobileMenuLink[]
  pathname: string | null | undefined
}

/**
 * Panel del menú en el celular (#437): se desliza de izquierda a derecha con todas las pantallas del rol,
 * el modo oscuro y Salir. Se abre con "Más" o arrastrando el dedo hacia la derecha desde cualquier
 * punto de la pantalla, y mientras el dedo sigue apoyado el panel lo acompaña. Se cierra con la X, con
 * Escape, tocando afuera, arrastrándolo hacia la izquierda o al elegir una pantalla.
 *
 * Usa el Drawer de Base UI: foco atrapado, devolución del foco y arrastre para cerrar. El scroll del fondo
 * lo bloquea useBodyScrollLock, como en `Dialog` (frontend/README.md, "Diálogos").
 */
export function MobileMenu({ open, onOpenChange, links, pathname }: MobileMenuProps) {
  const { businessName } = useCurrentUser()
  const role = useUserRole()
  const { isDark, toggleTheme } = useTheme()
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)

  const popupRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  /** Píxeles que avanzó el dedo mientras arrastra para abrir; `null` si no hay arrastre. */
  const dragRef = useRef<number | null>(null)

  useBodyScrollLock(open)

  // [RV491-I2] Desde 768 px el panel y su fondo están ocultos (md:hidden). Si la pantalla pasa ese ancho con el
  // panel abierto (por ejemplo, al girar el celular), se cierra: si no, la página queda bloqueada y sin foco.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function') return
    const mobileViewport = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    const closeOutsideMobile = (event: MediaQueryListEvent) => {
      if (!event.matches) onOpenChange(false)
    }
    mobileViewport.addEventListener('change', closeOutsideMobile)
    return () => mobileViewport.removeEventListener('change', closeOutsideMobile)
  }, [open, onOpenChange])

  const panelWidth = () => popupRef.current?.offsetWidth || FALLBACK_PANEL_WIDTH

  // El panel sigue al dedo: se corre a la izquierda lo que falta para abrirse y el fondo se oscurece de a poco.
  const applyDrag = useCallback(() => {
    const dragX = dragRef.current
    if (dragX === null) return
    const popup = popupRef.current
    const width = popup?.offsetWidth || FALLBACK_PANEL_WIDTH
    if (popup) {
      popup.style.setProperty('--menu-drag-x', `${Math.min(0, dragX - width)}px`)
      popup.style.transition = 'none'
    }
    const backdrop = backdropRef.current
    if (backdrop) {
      backdrop.style.setProperty('--menu-drag-progress', `${Math.min(1, dragX / width)}`)
      backdrop.style.transition = 'none'
    }
  }, [])

  // Base UI monta el panel y el fondo un render después de abrir: el arrastre se aplica apenas aparecen,
  // para que no se vean abrirse solos antes de seguir al dedo.
  const setPopupNode = useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node
      applyDrag()
    },
    [applyDrag]
  )
  const setBackdropNode = useCallback(
    (node: HTMLDivElement | null) => {
      backdropRef.current = node
      applyDrag()
    },
    [applyDrag]
  )
  useLayoutEffect(applyDrag)

  const releaseDrag = (keepOpen: boolean) => {
    dragRef.current = null
    const popup = popupRef.current
    const backdrop = backdropRef.current
    // Se devuelven las transiciones para que termine de abrirse o de cerrarse desde donde lo dejó el dedo.
    if (popup) popup.style.transition = ''
    if (backdrop) backdrop.style.transition = ''
    if (keepOpen) {
      popup?.style.removeProperty('--menu-drag-x')
      backdrop?.style.removeProperty('--menu-drag-progress')
    } else {
      onOpenChange(false)
    }
  }

  useSwipeToOpen({
    canStart: () => !open && !isLogoutOpen,
    onStart: () => {
      dragRef.current = 0
      onOpenChange(true)
    },
    onMove: (deltaX) => {
      dragRef.current = deltaX
      applyDrag()
    },
    onEnd: ({ deltaX, velocityX }) => {
      releaseDrag(deltaX >= panelWidth() * OPEN_DISTANCE_RATIO || velocityX >= OPEN_VELOCITY_PX_PER_MS)
    },
  })

  const roleLabel = role.isAdmin ? 'Administrador' : role.isCollaborator ? 'Colaborador' : null
  const groups = (Object.keys(GROUP_TITLES) as MobileMenuGroup[])
    .map((group) => ({ group, items: links.filter((link) => link.group === group) }))
    .filter(({ group, items }) => items.length > 0 || group === 'cuenta')

  const openLogout = () => {
    onOpenChange(false)
    setIsLogoutOpen(true)
  }

  const itemClasses = cn(
    'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
    CANONICAL_FOCUS_CLASSES
  )

  return (
    <>
      <Drawer.Root open={open} onOpenChange={(next) => onOpenChange(next)} swipeDirection="left" modal="trap-focus">
        <Drawer.Portal>
          <Drawer.Backdrop
            ref={setBackdropNode}
            className="fixed inset-0 z-50 bg-black/50 opacity-[calc(var(--menu-drag-progress,1)*(1-var(--drawer-swipe-progress,0)))] transition-opacity duration-300 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none md:hidden"
          />
          <Drawer.Viewport className="fixed inset-0 z-50 flex justify-start md:hidden">
            <Drawer.Popup
              ref={setPopupNode}
              className="flex h-full w-[min(18.5rem,85vw)] flex-col overflow-y-auto overscroll-contain rounded-r-3xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-gray-700 shadow-2xl outline-none [transform:translateX(calc(var(--menu-drag-x,0px)+var(--drawer-swipe-movement-x,0px)))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)] data-swiping:duration-0 data-swiping:select-none motion-reduce:transition-none dark:bg-gray-900 dark:text-gray-200"
            >
              <Drawer.Content className="flex flex-1 flex-col px-3">
                <div className="flex items-center gap-2 px-1 pb-3">
                  <img src="/logo-icon.png" alt="" className="size-8 object-contain dark:brightness-0 dark:invert" />
                  <span className="flex-1 text-base font-bold text-gray-900 dark:text-white">MargenX</span>
                  <Drawer.Close
                    aria-label="Cerrar menú"
                    className={cn(
                      'flex size-11 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
                      CANONICAL_FOCUS_CLASSES
                    )}
                  >
                    <X className="size-5" aria-hidden="true" />
                  </Drawer.Close>
                </div>
                <Drawer.Title className="sr-only">Menú</Drawer.Title>
                <Drawer.Description className="sr-only">
                  Todas las pantallas de MargenX, el modo oscuro y la salida.
                </Drawer.Description>

                <div className="mb-1 flex flex-wrap items-center gap-2 border-b border-gray-100 px-1 pb-3 dark:border-gray-800">
                  {businessName && (
                    <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                      <Building2 className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{businessName}</span>
                    </span>
                  )}
                  {roleLabel && <span className="text-xs text-gray-600 dark:text-gray-400">{roleLabel}</span>}
                </div>

                {groups.map(({ group, items }) => (
                  <section key={group} aria-labelledby={`menu-grupo-${group}`} className="mt-2">
                    <h2
                      id={`menu-grupo-${group}`}
                      className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {GROUP_TITLES[group]}
                    </h2>
                    <ul className="space-y-0.5">
                      {items.map(({ href, label, icon: Icon }) => {
                        const active = isNavLinkActive(pathname, href)
                        return (
                          <li key={href}>
                            <Link
                              href={href}
                              onClick={() => onOpenChange(false)}
                              aria-current={active ? 'page' : undefined}
                              data-testid={`menu-${href.replace('/', '')}`}
                              className={cn(
                                itemClasses,
                                active
                                  ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                              )}
                            >
                              <Icon className="size-5 shrink-0" aria-hidden="true" />
                              {label}
                            </Link>
                          </li>
                        )
                      })}
                      {group === 'cuenta' && (
                        <>
                          <li>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isDark}
                              onClick={toggleTheme}
                              className={cn(itemClasses, 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800')}
                            >
                              <Moon className="size-5 shrink-0" aria-hidden="true" />
                              Modo oscuro
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors',
                                  isDark ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                )}
                              >
                                <span
                                  className={cn(
                                    'absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]',
                                    isDark ? 'left-[1.125rem]' : 'left-0.5'
                                  )}
                                />
                              </span>
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={openLogout}
                              className={cn(
                                itemClasses,
                                'cursor-pointer text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40'
                              )}
                            >
                              <LogOut className="size-5 shrink-0" aria-hidden="true" />
                              Salir
                            </button>
                          </li>
                        </>
                      )}
                    </ul>
                  </section>
                ))}
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>

      {isLogoutOpen && <MenuLogoutConfirm onCancel={() => setIsLogoutOpen(false)} />}
    </>
  )
}

/** Confirmación de "Salir": se monta recién al tocarla, así el menú no depende de Clerk hasta ese momento. */
function MenuLogoutConfirm({ onCancel }: { onCancel: () => void }) {
  const signOut = useSignOut()
  return <LogoutDialog open onConfirm={signOut} onCancel={onCancel} />
}
