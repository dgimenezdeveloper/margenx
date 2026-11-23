import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isAdminOnlyRedirectState } from '@/lib/adminOnlyRedirect'
import { AdminOnlyRoute } from '../admin-only-route'

const role = vi.hoisted(() => ({ isCollaborator: false, isLoading: false }))

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => role,
}))

function CatalogProbe() {
  const location = useLocation()
  return (
    <div>
      <h1>Productos</h1>
      <p data-testid="redirigido-desde">
        {isAdminOnlyRedirectState(location.state) ? location.state.adminOnlyFrom : 'sin aviso'}
      </p>
    </div>
  )
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/insumos', element: <AdminOnlyRoute><h1>Insumos</h1></AdminOnlyRoute> },
      { path: '/proveedores/cuarentena', element: <AdminOnlyRoute><h1>Precios en cuarentena</h1></AdminOnlyRoute> },
      { path: '/productos', element: <CatalogProbe /> },
    ],
    { initialEntries: [path] }
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('AdminOnlyRoute (#364)', () => {
  beforeEach(() => {
    role.isCollaborator = false
    role.isLoading = false
  })

  it('el administrador entra a la pantalla', () => {
    renderAt('/insumos')

    expect(screen.getByRole('heading', { name: 'Insumos' })).toBeInTheDocument()
  })

  it('mientras se carga el rol no muestra la pantalla ni redirige', () => {
    role.isLoading = true
    const router = renderAt('/insumos')

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/insumos')
  })

  it.each(['/insumos', '/proveedores/cuarentena'])(
    'el colaborador que abre %s vuelve a /productos con la ruta de origen para el aviso',
    (path) => {
      role.isCollaborator = true
      const router = renderAt(path)

      expect(router.state.location.pathname).toBe('/productos')
      expect(screen.getByTestId('redirigido-desde')).toHaveTextContent(path)
    }
  )
})

describe('isAdminOnlyRedirectState (#364)', () => {
  it('reconoce solo el estado que deja AdminOnlyRoute', () => {
    expect(isAdminOnlyRedirectState({ adminOnlyFrom: '/insumos' })).toBe(true)
    expect(isAdminOnlyRedirectState(null)).toBe(false)
    expect(isAdminOnlyRedirectState(undefined)).toBe(false)
    expect(isAdminOnlyRedirectState('/insumos')).toBe(false)
    expect(isAdminOnlyRedirectState({ adminOnlyFrom: 42 })).toBe(false)
    expect(isAdminOnlyRedirectState({ from: '/insumos' })).toBe(false)
  })
})
