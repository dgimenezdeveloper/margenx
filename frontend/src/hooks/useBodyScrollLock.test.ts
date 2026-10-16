import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useBodyScrollLock } from './useBodyScrollLock'

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    vi.stubGlobal('scrollTo', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('no aplica estilos si isLocked es false', () => {
    renderHook(() => useBodyScrollLock(false))

    expect(document.body.style.position).toBe('')
    expect(document.body.style.top).toBe('')
    expect(document.body.style.overflow).toBe('')
  })

  it('aplica position: fixed, top negativo y overflow: hidden al bloquear', () => {
    Object.defineProperty(window, 'scrollY', { value: 120, writable: true, configurable: true })

    renderHook(() => useBodyScrollLock(true))

    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-120px')
    expect(document.body.style.width).toBe('100%')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaura los estilos y la posición original de scroll al desbloquear', () => {
    Object.defineProperty(window, 'scrollY', { value: 250, writable: true, configurable: true })
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy

    const { rerender } = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    })

    expect(document.body.style.position).toBe('fixed')

    rerender({ locked: false })

    expect(document.body.style.position).toBe('')
    expect(document.body.style.top).toBe('')
    expect(document.body.style.overflow).toBe('')
    expect(scrollToSpy).toHaveBeenCalledWith(0, 250)
  })

  it('coordina múltiples locks concurrentes sin pisar el scroll original ni desbloquear prematuramente', () => {
    Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true })
    const scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy

    // 1er lock se activa
    const hook1 = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    })

    expect(document.body.style.top).toBe('-300px')

    // Ahora que el body es fixed, scrollY pasa a ser 0
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })

    // 2do lock se activa (ej: modal secundario abierto sobre el primero)
    const hook2 = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    })

    // NO debe pisar el top con -0px
    expect(document.body.style.top).toBe('-300px')

    // Se cierra el 2do modal
    hook2.rerender({ locked: false })

    // El body debe seguir bloqueado porque el 1er modal sigue abierto
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-300px')
    expect(scrollToSpy).not.toHaveBeenCalled()

    // Se cierra el 1er modal
    hook1.rerender({ locked: false })

    // Ahora que activeLocks llega a 0, se desbloquea y se restaura el scroll original
    expect(document.body.style.position).toBe('')
    expect(document.body.style.top).toBe('')
    expect(scrollToSpy).toHaveBeenCalledWith(0, 300)
  })

  it('compensa el ancho de la barra de scroll en desktop para evitar salto horizontal', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true, configurable: true })
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1185, writable: true, configurable: true })

    const { unmount } = renderHook(() => useBodyScrollLock(true))

    expect(document.body.style.paddingRight).toBe('15px')

    unmount()

    expect(document.body.style.paddingRight).toBe('')
  })
})