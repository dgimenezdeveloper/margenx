import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { ErrorState } from './error-state'
import { ShieldAlert } from 'lucide-react'

describe('ErrorState Component', () => {
  it('renderiza título y descripción por defecto con semántica alert', () => {
    render(<ErrorState />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('No pudimos cargar la información')).toBeInTheDocument()
    expect(
      screen.getByText('Ocurrió un problema al consultar el servidor. Verifica tu conexión e intenta nuevamente.')
    ).toBeInTheDocument()
  })

  it('permite personalizar título, descripción e icono', () => {
    render(
      <ErrorState
        title="Fallo crítico de red"
        description="El servidor no respondió a tiempo."
        icon={<ShieldAlert data-testid="custom-icon" className="size-7" />}
      />
    )

    expect(screen.getByText('Fallo crítico de red')).toBeInTheDocument()
    expect(screen.getByText('El servidor no respondió a tiempo.')).toBeInTheDocument()
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renderiza el botón Reintentar y ejecuta onRetry al hacer click', () => {
    const onRetryMock = vi.fn()
    render(<ErrorState onRetry={onRetryMock} />)

    const button = screen.getByRole('button', { name: /reintentar/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onRetryMock).toHaveBeenCalledTimes(1)
  })

  it('soporta onAction y actionLabel como alias de compatibilidad con EmptyState', () => {
    const onActionMock = vi.fn()
    render(<ErrorState onAction={onActionMock} actionLabel="Volver a intentar" />)

    const button = screen.getByRole('button', { name: /volver a intentar/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onActionMock).toHaveBeenCalledTimes(1)
  })

  it('muestra estado de carga cuando isRetrying es true y deshabilita el botón', () => {
    const onRetryMock = vi.fn()
    render(<ErrorState onRetry={onRetryMock} isRetrying={true} />)

    const button = screen.getByRole('button', { name: /reintentando/i })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onRetryMock).not.toHaveBeenCalled()
  })

  it('no renderiza botón de acción si no se provee onRetry ni onAction', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})