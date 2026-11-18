import { afterEach, describe, expect, it, vi } from 'vitest'

import { saveBlobAsFile } from '@/lib/downloadFile'

describe('saveBlobAsFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('descarga el blob con el nombre indicado y libera la URL después', () => {
    vi.useFakeTimers()
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:margenx/reporte')
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const clicks: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this)
    })
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

    saveBlobAsFile(blob, 'margenx-reporte-2026-11-16.pdf')

    expect(createSpy).toHaveBeenCalledWith(blob)
    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('margenx-reporte-2026-11-16.pdf')
    expect(clicks[0].href).toBe('blob:margenx/reporte')
    // El enlace temporal no queda en la página.
    expect(document.querySelector('a[download]')).toBeNull()
    // Safari cancela la descarga si la URL se libera en el mismo ciclo.
    expect(revokeSpy).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeSpy).toHaveBeenCalledWith('blob:margenx/reporte')
  })
})
