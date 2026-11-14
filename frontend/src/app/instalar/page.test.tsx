import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import fs from 'node:fs'
import path from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import InstallPage from './page'

// La guía usa PublicSessionLink, que lee la sesión con useAuth de Clerk.
// Estas pruebas cubren el contenido de la guía para un visitante sin sesión;
// la versión con sesión ("Ir al panel") la cubre public-session-link.test.tsx.
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
}))

const publicDir = path.resolve(process.cwd(), 'public')

const renderInstallPage = () =>
  render(
    <MemoryRouter>
      <InstallPage />
    </MemoryRouter>,
  )

const SECTIONS = ['Android · Chrome', 'iPhone · Safari', 'Escritorio · Chrome o Edge']

describe('Guía de instalación (/instalar)', () => {
  it('no muestra "Captura pendiente" en ninguna sección', () => {
    renderInstallPage()

    expect(screen.queryByText(/captura pendiente/i)).not.toBeInTheDocument()
  })

  it.each(SECTIONS)('la sección "%s" tiene una captura con texto alternativo en cada paso', (title) => {
    renderInstallPage()

    const section = screen.getByRole('heading', { name: title }).closest('section')
    expect(section, `No se encontró la sección ${title}`).not.toBeNull()

    const steps = within(section as HTMLElement).getAllByRole('listitem')
    expect(steps.length).toBeGreaterThan(0)

    for (const step of steps) {
      const image = within(step).getByRole('img')
      expect(image.getAttribute('alt')?.trim()).toBeTruthy()
    }
  })

  it('cada captura de la guía existe en public/', () => {
    renderInstallPage()

    const sources = screen.getAllByRole('img').map((image) => image.getAttribute('src') ?? '')
    expect(sources.length).toBeGreaterThan(0)

    for (const src of sources) {
      expect(src.startsWith('/guia-instalacion/'), `Ruta fuera de /guia-instalacion: ${src}`).toBe(true)
      expect(fs.existsSync(path.join(publicDir, src)), `Falta el archivo: ${src}`).toBe(true)
    }
  })
})
