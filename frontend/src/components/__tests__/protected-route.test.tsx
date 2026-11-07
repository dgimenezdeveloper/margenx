import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProtectedRoute } from '../protected-route'

const clerk = vi.hoisted(() => ({
  isSignedIn: true,
  signOut: vi.fn((callback?: () => void) => {
    callback?.()
    return Promise.resolve()
  }),
}))
const displayMode = vi.hoisted(() => ({ standalone: false }))
const clearSessionCaches = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerk.isSignedIn }),
  useClerk: () => ({ signOut: clerk.signOut }),
  SignedIn: ({ children }: { children: React.ReactNode }) => (clerk.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: React.ReactNode }) => (clerk.isSignedIn ? null : <>{children}</>),
}))

vi.mock('@/lib/clerkConfig', () => ({ isClerkConfigured: true, publishableKey: 'pk_test_123' }))
vi.mock('@/lib/displayMode', () => ({ isStandaloneMode: () => displayMode.standalone }))
vi.mock('@/lib/serviceWorkerCache', () => ({ clearSessionCaches }))

function LoginProbe() {
  return <div data-testid="login">{window.location.pathname}</div>
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/productos/:id', element: <ProtectedRoute><h1>Medialunas de manteca</h1></ProtectedRoute> },
      { path: '/login', element: <LoginProbe /> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

function clearBrowserSession() {
  sessionStorage.clear()
  localStorage.clear()
  document.cookie = 'margenx_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // jsdom informa navigator.webdriver = true, que activa el atajo de los E2E con Playwright.
    vi.spyOn(window.navigator, 'webdriver', 'get').mockReturnValue(false)
    clearBrowserSession()
    clerk.isSignedIn = true
    clerk.signOut.mockClear()
    clearSessionCaches.mockClear()
    displayMode.standalone = false
  })
  afterEach(() => {
    clearBrowserSession()
    vi.restoreAllMocks()
  })

  it('app instalada con sesión de Clerk activa: abre el producto aunque la app se haya cerrado', () => {
    displayMode.standalone = true

    renderAt('/productos/medialunas-de-manteca')

    expect(screen.getByRole('heading', { name: 'Medialunas de manteca' })).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
  })

  it('navegador común tras cerrar el navegador: cierra la sesión como hasta ahora y conserva el destino', async () => {
    const router = renderAt('/productos/medialunas-de-manteca')

    await waitFor(() => expect(clerk.signOut).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?redirect_url=%2Fproductos%2Fmedialunas-de-manteca')
  })

  it('al cerrar la sesión huérfana limpia las cachés del service worker', async () => {
    renderAt('/productos/medialunas-de-manteca')

    await waitFor(() => expect(clerk.signOut).toHaveBeenCalledTimes(1))
    expect(clearSessionCaches).toHaveBeenCalledTimes(1)
  })

  it('con la sesión viva no toca las cachés', () => {
    sessionStorage.setItem('margenx_active_session', 'true')
    renderAt('/productos/medialunas-de-manteca')

    expect(clearSessionCaches).not.toHaveBeenCalled()
  })

  it('navegador común con la sesión de la pestaña viva: no cambia el comportamiento', () => {
    sessionStorage.setItem('margenx_active_session', 'true')

    renderAt('/productos/medialunas-de-manteca')

    expect(screen.getByRole('heading', { name: 'Medialunas de manteca' })).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
  })

  it('al llegar a la pantalla protegida olvida el destino recordado durante el login', () => {
    displayMode.standalone = true
    sessionStorage.setItem('margenx_return_url', '/productos/medialunas-de-manteca')

    renderAt('/productos/medialunas-de-manteca')

    expect(sessionStorage.getItem('margenx_return_url')).toBeNull()
  })

  it('sesión vencida: manda al login con la URL de retorno del producto', async () => {
    clerk.isSignedIn = false
    displayMode.standalone = true

    const router = renderAt('/productos/medialunas-de-manteca')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?redirect_url=%2Fproductos%2Fmedialunas-de-manteca')
  })
})
