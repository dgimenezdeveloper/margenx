import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import NotFoundPage from './page'
import { useNavigate } from 'react-router-dom'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/ruta-falsa'),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ signOut: vi.fn() })
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({ businessName: 'Test', isLoading: false })
}))

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isCollaborator: false })
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() })
}))

describe('NotFoundPage', () => {
  it('renderiza el mensaje 404 y permite volver al dashboard', () => {
    const navigateMock = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigateMock)

    render(<NotFoundPage />)

    expect(screen.getByText('Error 404')).toBeInTheDocument()
    expect(screen.getByText(/La página que estás buscando no existe/i)).toBeInTheDocument()

    const button = screen.getByRole('button', { name: /Volver al Dashboard/i })
    fireEvent.click(button)

    expect(navigateMock).toHaveBeenCalledWith('/dashboard')
  })
})