import '@testing-library/jest-dom'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Component, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { lazyPage } from '@/lib/lazyPage'

const recargar = vi.hoisted(() => vi.fn())
vi.mock('@/lib/reloadPage', () => ({ reloadPage: recargar }))

/** Boundary externo de prueba: hace las veces del manejo de errores del router. */
class BoundaryExterno extends Component<{ children: ReactNode }, { mensaje: string | null }> {
  state = { mensaje: null as string | null }
  static getDerivedStateFromError(error: Error) {
    return { mensaje: error.message }
  }
  render() {
    return this.state.mensaje ? <p>Error del router: {this.state.mensaje}</p> : this.props.children
  }
}

describe('lazyPage: cada pantalla se baja cuando se abre (#398)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    recargar.mockClear()
  })

  it('mientras baja la pantalla muestra un aviso de carga accesible y después la pantalla', async () => {
    let resolver!: (mod: { default: () => React.JSX.Element }) => void
    const Pantalla = lazyPage(() => new Promise((resolve) => (resolver = resolve)))

    render(<Pantalla />)
    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando la pantalla')

    resolver({ default: () => <h1>Insumos</h1> })
    expect(await screen.findByRole('heading', { name: 'Insumos' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('si la pantalla no baja (red caída o versión nueva publicada), avisa en español y Reintentar recarga la app', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Insumos = lazyPage(() =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/page-insumos.js'))
    )

    render(<Insumos />)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo cargar la pantalla')
    expect(alerta).not.toHaveTextContent('Failed to fetch')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('un error de la pantalla ya cargada no se disfraza de falla de red: sigue al manejo de errores del router', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function ProductosRota(): React.JSX.Element {
      throw new Error('receta sin insumos')
    }
    const Productos = lazyPage(() => Promise.resolve({ default: ProductosRota }))

    render(
      <BoundaryExterno>
        <Productos />
      </BoundaryExterno>
    )

    expect(await screen.findByText('Error del router: receta sin insumos')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo cargar la pantalla')).not.toBeInTheDocument()
  })

  it('el router importa estáticamente solo las páginas públicas; las de sesión van bajo demanda', () => {
    const fuente = readFileSync(path.resolve(__dirname, '../../routes.tsx'), 'utf8')
    const estaticas = [...fuente.matchAll(/^import \w+ from '\.\/app\/(.+)\/page'$/gm)].map((m) => m[1])
    // not-found va estática porque FeatureRoute también la importa: cargarla bajo demanda no la sacaba del bundle principal.
    expect(estaticas.sort()).toEqual(['instalar', 'login', 'not-found', 'privacidad'])
    expect(fuente).toMatch(/^import LandingPage from '\.\/app\/page'$/m)
    expect(fuente).toContain("lazyPage(() => import('./app/dashboard/page'))")
  })
})
