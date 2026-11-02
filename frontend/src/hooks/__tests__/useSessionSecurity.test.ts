import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionSecurity } from '../useSessionSecurity'

const signOut = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const displayMode = vi.hoisted(() => ({ standalone: false }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  useClerk: () => ({ signOut }),
}))
vi.mock('@/lib/displayMode', () => ({ isStandaloneMode: () => displayMode.standalone }))

const TREINTA_Y_UN_MINUTOS = 31 * 60 * 1000

describe('useSessionSecurity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    signOut.mockClear()
    localStorage.clear()
    sessionStorage.clear()
    // Última actividad de ayer a la noche: el dueño toca "Ajustar" en el mail a la mañana.
    localStorage.setItem('margenx_last_active', String(Date.now() - TREINTA_Y_UN_MINUTOS))
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('navegador común: cierra la sesión tras 30 minutos de inactividad', () => {
    displayMode.standalone = false

    renderHook(() => useSessionSecurity())
    vi.advanceTimersByTime(2000)

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('app instalada: no aplica el cierre propio por inactividad (manda Clerk)', () => {
    displayMode.standalone = true

    renderHook(() => useSessionSecurity())
    vi.advanceTimersByTime(2000)

    expect(signOut).not.toHaveBeenCalled()
  })
})
