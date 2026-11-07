import { afterEach, describe, expect, it, vi } from 'vitest'

import { isStandaloneMode, type DisplayModeWindow } from '../displayMode'

function fakeWindow(options: { standaloneMedia?: boolean; iosStandalone?: boolean; noMatchMedia?: boolean }): DisplayModeWindow {
  return {
    matchMedia: options.noMatchMedia
      ? undefined
      : (query: string) => ({ matches: query === '(display-mode: standalone)' && Boolean(options.standaloneMedia) }),
    navigator: options.iosStandalone === undefined ? {} : { standalone: options.iosStandalone },
  }
}

describe('isStandaloneMode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detecta la PWA instalada en Android y escritorio por display-mode', () => {
    expect(isStandaloneMode(fakeWindow({ standaloneMedia: true }))).toBe(true)
  })

  it('detecta la PWA instalada en iOS por navigator.standalone', () => {
    expect(isStandaloneMode(fakeWindow({ standaloneMedia: false, iosStandalone: true }))).toBe(true)
  })

  it('devuelve false en una pestaña común del navegador', () => {
    expect(isStandaloneMode(fakeWindow({ standaloneMedia: false, iosStandalone: false }))).toBe(false)
    expect(isStandaloneMode(fakeWindow({ standaloneMedia: false }))).toBe(false)
  })

  it('devuelve false si el navegador no expone matchMedia', () => {
    expect(isStandaloneMode(fakeWindow({ noMatchMedia: true }))).toBe(false)
  })

  it('devuelve false si no hay ventana (por ejemplo, fuera del navegador)', () => {
    // Pasar undefined no alcanza: activa el valor por defecto y usa el window de jsdom.
    vi.stubGlobal('window', undefined)
    expect(isStandaloneMode()).toBe(false)
  })
})
