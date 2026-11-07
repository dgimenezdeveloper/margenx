import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { UpdatePrompt } from './update-prompt'

describe('UpdatePrompt', () => {
  it('no se muestra si no hay versión nueva', () => {
    render(<UpdatePrompt needRefresh={false} onUpdate={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('avisa la versión nueva sin aplicarla sola', () => {
    const onUpdate = vi.fn()
    render(<UpdatePrompt needRefresh onUpdate={onUpdate} onDismiss={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva de MargenX')
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('carga la versión nueva al tocar Actualizar', () => {
    const onUpdate = vi.fn()
    render(<UpdatePrompt needRefresh onUpdate={onUpdate} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('permite seguir con lo que estaba haciendo', () => {
    const onUpdate = vi.fn()
    const onDismiss = vi.fn()
    render(<UpdatePrompt needRefresh onUpdate={onUpdate} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: 'Más tarde' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('deshabilita Actualizar mientras se aplica', () => {
    render(<UpdatePrompt needRefresh isUpdating onUpdate={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Actualizando...' })).toBeDisabled()
  })
})
