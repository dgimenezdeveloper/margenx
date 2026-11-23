import '@testing-library/jest-dom'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { lazyPage } from '@/lib/lazyPage'

describe('lazyPage: cada pantalla se baja cuando se abre (#398)', () => {
  it('mientras baja la pantalla muestra un aviso de carga accesible y después la pantalla', async () => {
    let resolver!: (mod: { default: () => React.JSX.Element }) => void
    const Pantalla = lazyPage(() => new Promise((resolve) => (resolver = resolve)))

    render(<Pantalla />)
    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando la pantalla')

    resolver({ default: () => <h1>Insumos</h1> })
    expect(await screen.findByRole('heading', { name: 'Insumos' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('el router importa estáticamente solo la landing y el login; el resto va bajo demanda', () => {
    const fuente = readFileSync(path.resolve(__dirname, '../../routes.tsx'), 'utf8')
    const estaticas = [...fuente.matchAll(/^import \w+ from '\.\/app\/(.+)\/page'$/gm)].map((m) => m[1])
    expect(estaticas.sort()).toEqual(['login'])
    expect(fuente).toMatch(/^import LandingPage from '\.\/app\/page'$/m)
    expect(fuente).toContain("lazyPage(() => import('./app/dashboard/page'))")
  })
})
