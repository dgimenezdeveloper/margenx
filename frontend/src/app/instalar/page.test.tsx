import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import fs from 'node:fs'
import path from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import InstallPage from './page'

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
