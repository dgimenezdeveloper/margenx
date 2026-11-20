import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TOAST_DURATION_MS } from '@/lib/toast'
import { useToast } from '../useToast'

describe('TOAST_DURATION_MS (#364)', () => {
  it('los errores y advertencias duran más que los éxitos y la información', () => {
    expect(TOAST_DURATION_MS.error).toBeGreaterThan(TOAST_DURATION_MS.success)
    expect(TOAST_DURATION_MS.warning).toBeGreaterThan(TOAST_DURATION_MS.success)
    expect(TOAST_DURATION_MS.error).toBeGreaterThan(TOAST_DURATION_MS.info)
  })
})

describe('useToast (#364)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra el aviso de éxito y lo oculta al cumplirse su duración', () => {
    const { result } = renderHook(() => useToast())

    act(() => result.current.notify('Insumo "Harina 000" actualizado correctamente'))
    expect(result.current.toast).toMatchObject({ title: 'Insumo "Harina 000" actualizado correctamente', type: 'success' })

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.success - 1))
    expect(result.current.toast).not.toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.toast).toBeNull()
  })

  it('el error sigue visible cuando un aviso de éxito ya habría desaparecido', () => {
    const { result } = renderHook(() => useToast())

    act(() => result.current.notify('No se pudo guardar el insumo.', 'error', 'Revisá tu conexión.'))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.success))

    expect(result.current.toast).toMatchObject({
      title: 'No se pudo guardar el insumo.',
      type: 'error',
      description: 'Revisá tu conexión.',
    })

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.error - TOAST_DURATION_MS.success))
    expect(result.current.toast).toBeNull()
  })

  it('un aviso anterior no acorta al siguiente: el temporizador viejo se cancela', () => {
    const { result } = renderHook(() => useToast())

    act(() => result.current.notify('Producto guardado'))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.success - 500))
    act(() => result.current.notify('Error al actualizar el producto', 'error'))

    // Cuando vence el temporizador del primer aviso, el error sigue en pantalla.
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.toast).toMatchObject({ title: 'Error al actualizar el producto', type: 'error' })
  })

  it('cada aviso tiene un id distinto aunque repita el texto', () => {
    const { result } = renderHook(() => useToast())

    act(() => result.current.notify('Pedido copiado'))
    const firstId = result.current.toast?.id
    act(() => result.current.notify('Pedido copiado'))

    expect(result.current.toast?.id).not.toBe(firstId)
  })

  it('dismiss cierra el aviso en el acto y cancela su temporizador', () => {
    const { result } = renderHook(() => useToast())

    act(() => result.current.notify('No se pudo copiar el pedido', 'error'))
    act(() => result.current.dismiss())
    expect(result.current.toast).toBeNull()

    act(() => result.current.notify('Pedido sugerido calculado'))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.success - 1))
    expect(result.current.toast).not.toBeNull()
  })

  it('al desmontar no deja temporizadores pendientes', () => {
    const { result, unmount } = renderHook(() => useToast())

    act(() => result.current.notify('Proveedor creado'))
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
