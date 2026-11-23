import { act, fireEvent, render, screen } from '@testing-library/react'
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

  it('los números grandes de "Cómo funciona" son decorativos: sin texto que lean ni que se audite el contraste (#398)', () => {
    vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as unknown as ReturnType<typeof useAuth>)

    const { container } = render(<LandingPage />)

    const marcas = container.querySelectorAll('[data-step]')
    expect(Array.from(marcas, (m) => m.getAttribute('data-step'))).toEqual(['01', '02', '03'])
    for (const marca of marcas) {
      expect(marca).toHaveAttribute('aria-hidden', 'true')
      expect(marca).toBeEmptyDOMElement()
    }
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

  describe('Escenario Gherkin "Sin jerga" (#436)', () => {
    // Términos técnicos que el dueño no tiene por qué conocer: no van en el texto visible de la portada.
    const JERGA = [
      /RBAC/, /tenant/i, /\bslug\b/i, /\bADMIN\b/, /\(Admin\)/, /Zero-Click/i, /Anti-Polución/i, /Prisma/,
      /ROUND_HALF_UP/, /middleware/i, /\bExpress\b/, /\bDOM\b/, /server-side/i, /\bAPI\b/, /\bn8n\b/,
      /Mobile-First/i, /\bB2B\b/, /dataset/i, /\bseed\b/i, /punto flotante/i, /ingeniería de costos/i, /satélite/i,
      /sanitizad/i, /censurad/i, /mapead/i,
    ]

    // Texto visible de la portada con cada pregunta frecuente abierta (se abre una por vez).
    const textoVisible = () => {
      vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>)
      vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as unknown as ReturnType<typeof useAuth>)
      render(<LandingPage />)
      const partes = [document.body.textContent ?? '']
      for (const pregunta of screen.getAllByRole('button', { name: /\?$/ })) {
        fireEvent.click(pregunta)
        partes.push(document.body.textContent ?? '')
      }
      return partes.join('\n')
    }

    it('la portada no usa términos técnicos, ni en las preguntas frecuentes', () => {
      const texto = textoVisible()
      for (const termino of JERGA) expect(texto, `aparece ${termino}`).not.toMatch(termino)
    })

    it('nombra lo que hace MargenX con palabras del dueño', () => {
      const texto = textoVisible()
      expect(texto).toContain('Cada empleado ve solo lo que le corresponde')
      expect(texto).toContain('Tus datos, solo para tu comercio')
      expect(texto).toContain('Pensada para el celular')
    })

    it('en el celular las tres marcas van una por línea, sin el separador colgando al final', () => {
      textoVisible()
      const marca = screen.getByText('Cada empleado ve solo lo que le corresponde')
      const separadores = Array.from(marca.parentElement?.querySelectorAll('span') ?? []).filter((s) => s.textContent === '·')
      expect(separadores).toHaveLength(2)
      for (const separador of separadores) expect(separador).toHaveClass('hidden', 'sm:inline')
    })

    it('muestra la dirección recomendada de la ingesta por correo, la misma de Proveedores (precios-<comercio>@margenx.tech)', () => {
      const texto = textoVisible()
      expect(texto).toContain('precios-panaderia-central@margenx.tech')
      expect(texto).not.toContain('precios+panaderia-central@margenx.tech')
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
