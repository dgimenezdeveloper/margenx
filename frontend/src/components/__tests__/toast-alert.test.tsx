import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ToastAlert } from '../ToastAlert'

describe('ToastAlert (#364)', () => {
  it('un error se anuncia de inmediato como alerta', () => {
    render(<ToastAlert title="No se pudo guardar el insumo." type="error" onClose={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar el insumo.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('una advertencia también se anuncia como alerta', () => {
    render(<ToastAlert title="¡Atención!" description="3 productos quedaron debajo de su margen." type="warning" />)

    expect(screen.getByRole('alert')).toHaveTextContent('3 productos quedaron debajo de su margen.')
  })

  it('un éxito o una información se anuncian sin interrumpir', () => {
    const { rerender } = render(<ToastAlert title="Proveedor creado" type="success" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')

    rerender(<ToastAlert title="Esa pantalla es solo para el administrador" type="info" />)
    expect(screen.getByRole('status')).toHaveTextContent('Esa pantalla es solo para el administrador')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('la X cierra el aviso', () => {
    const onClose = vi.fn()
    render(<ToastAlert title="No se pudo copiar el pedido" type="error" onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
