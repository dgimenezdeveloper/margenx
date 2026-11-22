import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import LandingPage from './page'
import { useAuth } from '@clerk/clerk-react'
import { useRouter } from 'next/navigation'
import { PUBLIC_SESSION_TIMEOUT_MS } from '@/hooks/usePublicSession'

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

  describe('Escenario Gherkin "Sin pantallazo"', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('mientras Clerk verifica la sesión no muestra la landing (el usuario con sesión no la ve antes del dashboard)', () => {
      const replaceMock = vi.fn()
      vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
      vi.mocked(useAuth).mockReturnValue({ isLoaded: false, isSignedIn: undefined } as unknown as ReturnType<typeof useAuth>)

      const { queryByText, getByRole } = render(<LandingPage />)

      expect(queryByText(/Control de costos/i)).not.toBeInTheDocument()
      expect(getByRole('status')).toHaveAccessibleName(/Cargando MargenX/i)
      expect(replaceMock).not.toHaveBeenCalled()
    })

    it('si Clerk no responde a tiempo, el visitante igual ve la landing', () => {
      vi.useFakeTimers()
      vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>)
      vi.mocked(useAuth).mockReturnValue({ isLoaded: false, isSignedIn: undefined } as unknown as ReturnType<typeof useAuth>)

      const { getByText } = render(<LandingPage />)
      act(() => {
        vi.advanceTimersByTime(PUBLIC_SESSION_TIMEOUT_MS)
      })

      expect(getByText(/Control de costos/i)).toBeInTheDocument()
    })
  })

  describe('Fichas de ejemplo con los nombres de estado vigentes (#430)', () => {
    function renderLanding() {
      vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>)
      vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as unknown as ReturnType<typeof useAuth>)
      return render(<LandingPage />)
    }

    it('Panadería Central: medialunas en Superávit y bizcochitos En objetivo, con el margen mediano', () => {
      const { getByText, queryByText } = renderLanding()

      // 73,2 % con mínimo de 65 %: cumple su mínimo y pasa el 60 % (especificación funcional §6).
      expect(getByText('73,2% Superávit')).toBeInTheDocument()
      expect(getByText('48,0% En objetivo')).toBeInTheDocument()
      expect(getByText('Margen mediano')).toBeInTheDocument()
      expect(getByText('60,6%')).toBeInTheDocument()
      expect(queryByText(/saludable|cr[ií]tico/i)).toBeNull()
      expect(queryByText('Margen promedio')).toBeNull()
    })

    it('Química GyJ: detergente En objetivo y suavizante En riesgo', () => {
      const { getByRole, getByText, queryByText } = renderLanding()

      fireEvent.click(getByRole('button', { name: /química/i }))

      expect(getByText('51,3% En objetivo')).toBeInTheDocument()
      expect(getByText('28,1% En riesgo')).toBeInTheDocument()
      expect(getByText('40,8%')).toBeInTheDocument()
      expect(queryByText(/saludable|cr[ií]tico/i)).toBeNull()
    })
  })
})
