import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { DesktopFooter as Footer } from '../desktop-footer'
import { SupportDocsModal } from '../support-docs-modal'

// Destino acordado en #363 hasta que #401 publique la v1.0.0 del manual.
const MANUAL_EN_MAIN = 'https://github.com/dgimenezdeveloper/margenx/tree/main/docs/manual-usuario'

// El pie usa enlaces del router para Política e Instalar (#429).
function DesktopFooter() {
  return (
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  )
}

describe('DesktopFooter: Soporte y documentación (#363)', () => {
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

    const dialogo = await screen.findByRole('dialog', { name: 'Soporte y documentación' })
    expect(within(dialogo).getByRole('link', { name: /Correo de asistencia/ })).toHaveAttribute(
      'href',
      'mailto:soporte@margenx.tech',
    )
    expect(within(dialogo).getByRole('link', { name: /Guía de usuario/ })).toHaveAttribute('href', MANUAL_EN_MAIN)
    expect(dialogo).not.toHaveTextContent(/WhatsApp/i)
    expect(dialogo).not.toHaveTextContent(/\+54|\d{4}-\d{4}/)
    expect(dialogo.querySelector('a[href*="wa.me"]')).toBeNull()
  })
})

describe('SupportDocsModal: guía de usuario (#363)', () => {
  it('la guía es un enlace activo al manual y ya no figura como no disponible', () => {
    render(<SupportDocsModal isOpen onClose={() => {}} />)

    const guia = screen.getByRole('link', { name: /Guía de usuario/ })
    expect(guia).toHaveAttribute('href', MANUAL_EN_MAIN)
    expect(guia).toHaveAttribute('target', '_blank')
    expect(guia).toHaveAttribute('rel', 'noopener noreferrer')
    expect(guia).toHaveAccessibleName(/se abre en una pestaña nueva/)
    expect(screen.queryByText(/Disponible en versión 1\.0/)).not.toBeInTheDocument()
  })
})

describe('DesktopFooter: Política e Instalar (#429)', () => {
  it('ofrece la política de privacidad y la guía de instalación, que salieron de los botones de Perfil', () => {
    render(<DesktopFooter />)

    expect(screen.getByRole('link', { name: 'Política' })).toHaveAttribute('href', '/privacidad')
    expect(screen.getByRole('link', { name: 'Instalar' })).toHaveAttribute('href', '/instalar')
  })

  it('usa el mismo orden que el pie móvil de Perfil: Política, Instalar, Soporte y documentación', () => {
    render(<DesktopFooter />)

    const nombres = screen
      .getAllByRole('contentinfo')[0]
      .querySelectorAll('a, button')
    expect(Array.from(nombres, (el) => el.textContent?.replace(' (se abre en una pestaña nueva)', ''))).toEqual([
      'Política',
      'Instalar',
      'Soporte',
      'Documentación',
    ])
  })
})

describe('DesktopFooter: contraste AA que marcó axe (#442)', () => {
  it('"Sistemas en línea" no hereda gray-500 sobre el gris de la píldora (4,39:1)', () => {
    render(<DesktopFooter />)

    expect(screen.getByText('Sistemas en línea')).toHaveClass('text-gray-600', 'dark:text-gray-400')
  })
})
