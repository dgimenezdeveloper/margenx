import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { vi } from 'vitest'

import InstallPage from './app/instalar/page'
import LoginPage from './app/login/page'
import PrivacyPage from './app/privacidad/page'
import ProfilePage from './app/perfil/page'
import { router } from './routes'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
    getToken: vi.fn(),
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
  SignIn: () => <div data-testid="sign-in" />,
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: vi.fn(),
  }),
}))

vi.mock('@/lib/clerkConfig', () => ({
  isClerkConfigured: true,
  publishableKey: 'pk_test_123',
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      email: 'demo@margenx.test',
      role: 'ADMIN',
    },
    businessName: 'Panadería Central',
    defaultMinMarginPercent: 30,
    isLoading: false,
    refreshUser: vi.fn(),
  }),
}))

describe('Páginas públicas y enlaces de privacidad', () => {
  it('renderiza la política y la guía sin requerir sesión', () => {
    const router = createMemoryRouter([
      { path: '/privacidad', element: <PrivacyPage /> },
      { path: '/instalar', element: <InstallPage /> },
    ], {
      initialEntries: ['/privacidad'],
    })

    render(<RouterProvider router={router} />)

    expect(screen.getByText(/Privacidad y protección de datos/i)).toBeInTheDocument()
    expect(screen.getByText(/Qué datos guarda MargenX/i)).toBeInTheDocument()

    const installRouter = createMemoryRouter([
      { path: '/instalar', element: <InstallPage /> },
    ], {
      initialEntries: ['/instalar'],
    })

    render(<RouterProvider router={installRouter} />)

    expect(screen.getByText(/Instalá MargenX en tu celular o computadora/i)).toBeInTheDocument()
  })

  it('muestra enlaces visibles a la política desde login y perfil', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /política de privacidad/i })).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ProfilePage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/política de privacidad|privacidad/i)).toBeInTheDocument()
  })

  it('documenta el flujo de instalación con pasos de iPhone y Android visibles', () => {
    const router = createMemoryRouter([
      { path: '/instalar', element: <InstallPage /> },
    ], {
      initialEntries: ['/instalar'],
    })

    render(<RouterProvider router={router} />)

    expect(screen.getByText(/Android · Chrome/i)).toBeInTheDocument()
    expect(screen.getByText(/iPhone · Safari/i)).toBeInTheDocument()
    expect(screen.getByText(/Safari es la opción recomendada/i)).toBeInTheDocument()
  })

  it('registra las rutas públicas de privacidad e instalación en el router principal', () => {
    expect(router.routes.some((route) => route.path === '/privacidad')).toBe(true)
    expect(router.routes.some((route) => route.path === '/instalar')).toBe(true)
  })
})
