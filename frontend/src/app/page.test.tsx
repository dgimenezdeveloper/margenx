import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import LandingPage from './page'
import { useAuth } from '@clerk/clerk-react'
// @ts-expect-error - El alias next/navigation está definido en tsconfig.app.json pero excluye los tests
import { useRouter } from 'next/navigation'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() })
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}))

describe('LandingPage', () => {
  it('redirige al dashboard si el usuario tiene sesión activa', () => {
    const replaceMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as unknown as ReturnType<typeof useAuth>)

    const { container } = render(<LandingPage />)

    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza la landing si el usuario no tiene sesión', () => {
    const replaceMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as unknown as ReturnType<typeof useAuth>)

    const { getByText } = render(<LandingPage />)

    expect(replaceMock).not.toHaveBeenCalled()
    expect(getByText(/Control de costos/i)).toBeInTheDocument()
  })
})