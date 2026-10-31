import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import DashboardPage from './page'
import { dashboardService } from '@/services/dashboardService'
import { productService } from '@/services/productService'
import { ApiError } from '@/services/api'

const mockGetToken = vi.fn().mockResolvedValue('fake-token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    signOut: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/dashboard' }),
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockUser = { id: 'u1', role: 'ADMIN', email: 'admin@panaderia.com' }

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mockUser,
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/dashboardService', () => ({
  dashboardService: {
    getMetrics: vi.fn(),
  },
}))

vi.mock('@/services/productService', () => ({
  productService: {
    getAll: vi.fn(),
  },
}))

describe('DashboardPage - Manejo de Errores y Reintentos (UX-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dashboardService.getMetrics).mockResolvedValue({
      activeIngredientsCount: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      recentCostVariationsCount: 0,
    })
    vi.mocked(productService.getAll).mockResolvedValue([])
  })

  it('Escenario Gherkin: Falla la carga del dashboard -> ve ErrorState con Reintentar y NO ve indicadores en cero', async () => {
    vi.mocked(dashboardService.getMetrics).mockRejectedValueOnce(
      new ApiError('Error interno del servidor (500)', 500)
    )
    vi.mocked(productService.getAll).mockRejectedValueOnce(
      new ApiError('Error interno del servidor (500)', 500)
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText('Error al cargar el panel')).toBeInTheDocument()
    expect(screen.getByText(/Error interno del servidor \(500\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()

    // No debe pintar indicadores en cero
    expect(screen.queryByText(/0 productos en riesgo/i)).toBeNull()
    expect(screen.queryByText(/0 insumos/i)).toBeNull()
    expect(screen.queryByText(/0\.0%/i)).toBeNull()
  })

  it('Escenario Gherkin: Reintento exitoso -> recupera la visualización de métricas reales', async () => {
    vi.mocked(dashboardService.getMetrics).mockRejectedValueOnce(new ApiError('Fallo del servidor', 500))
    vi.mocked(productService.getAll).mockRejectedValueOnce(new ApiError('Fallo del servidor', 500))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Siguiente llamada resuelve exitosamente
    vi.mocked(dashboardService.getMetrics).mockResolvedValueOnce({
      activeIngredientsCount: 10,
      criticalProductsCount: 2,
      healthyProductsCount: 8,
      averageMarginPercent: 55.5,
      recentCostVariationsCount: 1,
    })
    vi.mocked(productService.getAll).mockResolvedValueOnce([
      {
        id: 'p1',
        name: 'Pan flauta',
        salePrice: 4000,
        cost: 2000,
        marginPercent: 50,
        minMarginPercent: 30,
        ingredients: [{ ingredientId: 'i1', quantity: 1 }],
      },
    ])

    const retryBtn = screen.getByRole('button', { name: /reintentar/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText(/2 Productos en Riesgo/i)).toBeInTheDocument()
      expect(screen.getByText(/10 Insumos/i)).toBeInTheDocument()
      expect(screen.getByText(/55\.5%/i)).toBeInTheDocument()
      expect(screen.getByText('Pan flauta')).toBeInTheDocument()
    })

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Sin red (fetch lanza TypeError) -> muestra un mensaje en español, no el texto técnico del navegador', async () => {
    vi.mocked(dashboardService.getMetrics).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.mocked(productService.getAll).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText('No se pudieron cargar los datos del panel.')).toBeInTheDocument()
    expect(screen.queryByText(/failed to fetch/i)).toBeNull()
  })

  it('Mientras se reintenta muestra el estado de carga y no el error anterior', async () => {
    vi.mocked(dashboardService.getMetrics).mockRejectedValueOnce(new ApiError('Fallo del servidor', 500))
    vi.mocked(productService.getAll).mockRejectedValueOnce(new ApiError('Fallo del servidor', 500))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // El reintento queda pendiente para observar el estado intermedio.
    vi.mocked(dashboardService.getMetrics).mockReturnValueOnce(new Promise(() => {}))
    vi.mocked(productService.getAll).mockReturnValueOnce(new Promise(() => {}))

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })
    expect(screen.queryByText('Fallo del servidor')).toBeNull()
    expect(screen.queryByText(/productos en riesgo/i)).toBeNull()
  })
})
