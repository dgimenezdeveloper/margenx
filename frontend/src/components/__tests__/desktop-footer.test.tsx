import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { DesktopFooter } from '../desktop-footer'
import { SupportDocsModal } from '../support-docs-modal'

// Destino acordado en #363 hasta que #401 publique la v1.0.0 del manual.
const MANUAL_EN_MAIN = 'https://github.com/dgimenezdeveloper/margenx/tree/main/docs/manual-usuario'

describe('DesktopFooter: Soporte y Documentación (#363)', () => {
  it('Escenario Gherkin "Documentación": el enlace lleva al manual de usuario en una pestaña nueva', () => {
    render(<DesktopFooter />)

    const enlace = screen.getByRole('link', { name: /Documentación/ })
    expect(enlace).toHaveAttribute('href', MANUAL_EN_MAIN)
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
    expect(enlace).toHaveAccessibleName('Documentación (se abre en una pestaña nueva)')
  })

  it('"Documentación" ya no abre el diálogo de soporte', async () => {
    const user = userEvent.setup()
    render(<DesktopFooter />)

    expect(screen.queryByRole('button', { name: /Documentación/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Documentación/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Escenario Gherkin "Soporte": abre el diálogo con el correo y el manual, sin teléfono', async () => {
    const user = userEvent.setup()
    render(<DesktopFooter />)

    const soporte = screen.getByRole('button', { name: 'Soporte' })
    expect(soporte).toHaveAttribute('type', 'button')
    expect(soporte.className).toContain('focus-visible:outline-2')
    await user.click(soporte)

    const dialogo = await screen.findByRole('dialog', { name: 'Soporte y Documentación' })
    expect(within(dialogo).getByRole('link', { name: /Correo de Asistencia/ })).toHaveAttribute(
      'href',
      'mailto:soporte@margenx.tech',
    )
    expect(within(dialogo).getByRole('link', { name: /Guía de Usuario/ })).toHaveAttribute('href', MANUAL_EN_MAIN)
    expect(dialogo).not.toHaveTextContent(/WhatsApp/i)
    expect(dialogo).not.toHaveTextContent(/\+54|\d{4}-\d{4}/)
    expect(dialogo.querySelector('a[href*="wa.me"]')).toBeNull()
  })
})

describe('SupportDocsModal: guía de usuario (#363)', () => {
  it('la guía es un enlace activo al manual y ya no figura como no disponible', () => {
    render(<SupportDocsModal isOpen onClose={() => {}} />)

    const guia = screen.getByRole('link', { name: /Guía de Usuario/ })
    expect(guia).toHaveAttribute('href', MANUAL_EN_MAIN)
    expect(guia).toHaveAttribute('target', '_blank')
    expect(guia).toHaveAttribute('rel', 'noopener noreferrer')
    expect(guia).toHaveAccessibleName(/se abre en una pestaña nueva/)
    expect(screen.queryByText(/Disponible en versión 1\.0/)).not.toBeInTheDocument()
  })
})
