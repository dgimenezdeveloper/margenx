import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PUBLIC_SESSION_TIMEOUT_MS, usePublicSession } from '../usePublicSession'

const clerk = vi.hoisted(() => ({ isLoaded: false, isSignedIn: false as boolean | undefined }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: clerk.isLoaded, isSignedIn: clerk.isSignedIn }),
}))

describe('usePublicSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clerk.isLoaded = false
    clerk.isSignedIn = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('informa "checking" mientras Clerk todavía no cargó la sesión', () => {
    const { result } = renderHook(() => usePublicSession())
    expect(result.current).toBe('checking')
  })

  it('informa "signed-in" cuando Clerk confirma la sesión', () => {
    clerk.isLoaded = true
    clerk.isSignedIn = true
    const { result } = renderHook(() => usePublicSession())
    expect(result.current).toBe('signed-in')
  })

  it('informa "signed-out" cuando Clerk confirma que no hay sesión', () => {
    clerk.isLoaded = true
    clerk.isSignedIn = false
    const { result } = renderHook(() => usePublicSession())
    expect(result.current).toBe('signed-out')
  })

  it('si Clerk no responde a tiempo (red lenta o script bloqueado) trata al visitante como sin sesión', () => {
    const { result } = renderHook(() => usePublicSession())

    act(() => {
      vi.advanceTimersByTime(PUBLIC_SESSION_TIMEOUT_MS - 1)
    })
    expect(result.current).toBe('checking')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('signed-out')
  })

  it('si Clerk carga después del plazo, manda lo que informa Clerk', () => {
    const { result, rerender } = renderHook(() => usePublicSession())
    act(() => {
      vi.advanceTimersByTime(PUBLIC_SESSION_TIMEOUT_MS)
    })
    expect(result.current).toBe('signed-out')

    clerk.isLoaded = true
    clerk.isSignedIn = true
    rerender()
    expect(result.current).toBe('signed-in')
  })
})
