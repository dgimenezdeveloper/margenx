// Detección de la app instalada (PWA en modo standalone). Ver docs/adr/0006-sesion-persistente-pwa.md.

export interface DisplayModeWindow {
  matchMedia?: (query: string) => { matches: boolean }
  navigator: object
}

// Safari de iOS no implementa display-mode en todas sus versiones; expone navigator.standalone.
type IosNavigator = { standalone?: boolean }

export function isStandaloneMode(win: DisplayModeWindow | undefined = typeof window !== 'undefined' ? window : undefined): boolean {
  if (!win) return false
  if ((win.navigator as IosNavigator).standalone === true) return true
  return typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches
}
