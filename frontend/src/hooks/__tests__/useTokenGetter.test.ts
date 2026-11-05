import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useTokenGetter } from '../useTokenGetter'

const auth = vi.hoisted(() => ({ getToken: vi.fn() }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: auth.getToken }),
}))

describe('useTokenGetter', () => {
  it('devuelve la misma función entre renders aunque Clerk entregue otra', () => {
    auth.getToken = vi.fn().mockResolvedValue('token-1')
    const { result, rerender } = renderHook(() => useTokenGetter())
    const first = result.current

    auth.getToken = vi.fn().mockResolvedValue('token-2')
    rerender()

    expect(result.current).toBe(first)
  })

  it('siempre delega en el getToken más reciente', async () => {
    auth.getToken = vi.fn().mockResolvedValue('token-viejo')
    const { result, rerender } = renderHook(() => useTokenGetter())

    const latest = vi.fn().mockResolvedValue('token-nuevo')
    auth.getToken = latest
    rerender()

    await expect(result.current()).resolves.toBe('token-nuevo')
    expect(latest).toHaveBeenCalledTimes(1)
  })
})
