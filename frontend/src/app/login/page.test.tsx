import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import LoginPage from './page'

const clerk = vi.hoisted(() => ({
  isSignedIn: false,
  signOut: vi.fn(() => Promise.resolve()),
}))
const displayMode = vi.hoisted(() => ({ standalone: false }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerk.isSignedIn }),
  useClerk: () => ({ signOut: clerk.signOut }),
  SignIn: ({ forceRedirectUrl }: { forceRedirectUrl: string }) => (
    <div data-testid="sign-in" data-redirect={forceRedirectUrl} />
  ),
}))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }))
vi.mock('@/lib/clerkConfig', () => ({ isClerkConfigured: true, publishableKey: 'pk_test_123' }))
vi.mock('@/lib/displayMode', () => ({ isStandaloneMode: () => displayMode.standalone }))

const AJUSTAR = '/login?redirect_url=%2Fproductos%2Fmedialunas-de-manteca'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login/*', element: <LoginPage /> },
      { path: '/productos/:id', element: <h1>Detalle del producto</h1> },
      { path: '/dashboard', element: <h1>Dashboard</h1> },
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

describe('LoginPage: URL de retorno y app instalada', () => {
  beforeEach(() => {
    // jsdom informa navigator.webdriver = true, que activa el atajo de los E2E con Playwright.
    vi.spyOn(window.navigator, 'webdriver', 'get').mockReturnValue(false)
    clearBrowserSession()
    clerk.isSignedIn = false
    clerk.signOut.mockClear()
    displayMode.standalone = false
  })
  afterEach(() => {
    clearBrowserSession()
    vi.restoreAllMocks()
  })

  it('sesión vencida: el login vuelve al producto del enlace Ajustar', () => {
    renderAt(AJUSTAR)

    expect(screen.getByTestId('sign-in')).toHaveAttribute('data-redirect', '/productos/medialunas-de-manteca')
  })

  it('sin URL de retorno o con un destino externo, el login sigue yendo al dashboard', () => {
    renderAt('/login?redirect_url=https%3A%2F%2Fsitio-malicioso.com')

    expect(screen.getByTestId('sign-in')).toHaveAttribute('data-redirect', '/dashboard')
  })

  it('app instalada con sesión activa: va directo al producto sin cerrar la sesión', async () => {
    clerk.isSignedIn = true
    displayMode.standalone = true

    const router = renderAt(AJUSTAR)

    await waitFor(() => expect(router.state.location.pathname).toBe('/productos/medialunas-de-manteca'))
    expect(clerk.signOut).not.toHaveBeenCalled()
  })

  it('navegador común tras cerrar el navegador: sigue cerrando la sesión residual', async () => {
    clerk.isSignedIn = true

    renderAt(AJUSTAR)

    await waitFor(() => expect(clerk.signOut).toHaveBeenCalledTimes(1))
  })
})

describe('LoginPage: enlaces públicos al pie', () => {
  beforeEach(() => {
    vi.spyOn(window.navigator, 'webdriver', 'get').mockReturnValue(false)
    clearBrowserSession()
    clerk.isSignedIn = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Escenario Gherkin "Enlaces del login al pie": privacidad e instalación quedan debajo del formulario', () => {
    renderAt('/login')

    const signIn = screen.getByTestId('sign-in')
    const privacy = screen.getByRole('link', { name: 'Política de privacidad' })
    const install = screen.getByRole('link', { name: 'Guía de instalación' })

    expect(privacy).toHaveAttribute('href', '/privacidad')
    expect(install).toHaveAttribute('href', '/instalar')
    expect(signIn.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(signIn.compareDocumentPosition(install) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('contentinfo')).toContainElement(privacy)
  })
})
