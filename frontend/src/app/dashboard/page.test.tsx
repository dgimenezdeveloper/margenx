import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import DashboardPage from './page'
import { dashboardService } from '@/services/dashboardService'
import { productService } from '@/services/productService'
import { ApiError } from '@/services/api'
import type { Product } from '@/services/productService'

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
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const mockUser: { id: string; role: 'ADMIN' | 'COLLABORATOR'; email: string } = {
  id: 'u1',
  role: 'ADMIN',
  email: 'admin@panaderia.com',
}

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
    mockUser.role = 'ADMIN'
    vi.mocked(dashboardService.getMetrics).mockResolvedValue({
      activeIngredientsCount: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      recentCostVariationsCount: 0,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 0,
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
    expect(screen.queryByText(/0 productos debajo de su mínimo/i)).toBeNull()
    expect(screen.queryByText(/0 insumos/i)).toBeNull()
    expect(screen.queryByText(/0,0 %/i)).toBeNull()
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
      lossCount: 0,
      riskCount: 2,
      targetCount: 6,
      surplusCount: 2,
      draftCount: 0,
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
      expect(screen.getByText(/2 Productos debajo de su mínimo/i)).toBeInTheDocument()
      expect(screen.getByText(/10 Insumos/i)).toBeInTheDocument()
      expect(screen.getByText(/55,5 %/i)).toBeInTheDocument()
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
    expect(screen.queryByText(/productos? debajo de su mínimo/i)).toBeNull()
  })
})

/** 339 productos (cuenta Demo del recorrido del 10/11): 289 con receta y 50 en borrador. */
function catalogoDemo(): Product[] {
  return Array.from({ length: 339 }, (_, i) => ({
    id: `prod-${i + 1}`,
    name: `Medialuna de manteca ${String(i + 1).padStart(3, '0')}`,
    salePrice: 900,
    cost: 540,
    minMarginPercent: 35,
    marginPercent: 40,
    ingredients: i < 289 ? [{ ingredientId: 'harina-000', quantity: 0.05 }] : [],
  }))
}

describe('DashboardPage sobre todo el catálogo (#351)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.role = 'ADMIN'
    vi.mocked(productService.getAll).mockResolvedValue(catalogoDemo())
    vi.mocked(dashboardService.getMetrics).mockResolvedValue({
      activeIngredientsCount: 218,
      criticalProductsCount: 119,
      healthyProductsCount: 170,
      averageMarginPercent: 38.5,
      recentCostVariationsCount: 7,
      lossCount: 12,
      riskCount: 107,
      targetCount: 130,
      surplusCount: 40,
      draftCount: 50,
    })
  })

  it('Escenario Gherkin: Números coherentes -> columnas + borradores = 339 = "Ver catálogo completo (339)"', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/339 productos en total/i)).toBeInTheDocument()
    })
    const columnas = screen
      .getAllByTestId('bucket-count')
      .reduce((sum, el) => sum + Number(el.textContent), 0)
    expect(columnas + 50).toBe(339)
    expect(screen.getByText('Ver catálogo completo (339)')).toBeInTheDocument()
    expect(screen.getByText('119 Productos debajo de su mínimo')).toBeInTheDocument()
  })

  it('Escenario Gherkin: Precio mal cargado -> un margen promedio negativo se muestra en rojo', async () => {
    vi.mocked(dashboardService.getMetrics).mockResolvedValueOnce({
      activeIngredientsCount: 3,
      criticalProductsCount: 2,
      healthyProductsCount: 1,
      averageMarginPercent: -18.2,
      recentCostVariationsCount: 0,
      lossCount: 2,
      riskCount: 0,
      targetCount: 1,
      surplusCount: 0,
      draftCount: 0,
    })
    render(<DashboardPage />)

    const valor = await screen.findByTestId('average-margin')
    expect(valor).toHaveTextContent('-18,2 %')
    expect(valor.className).toMatch(/text-rose-700/)
    expect(valor.className).not.toMatch(/emerald/)
  })

  it('Escenario Gherkin: Colaborador -> el panel no pide /api/dashboard/metrics ni dibuja datos financieros', async () => {
    mockUser.role = 'COLLABORATOR'
    vi.mocked(productService.getAll).mockResolvedValue(
      catalogoDemo().map(({ id, name, salePrice, ingredients }) => ({ id, name, salePrice, ingredients }))
    )
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Ver catálogo completo (339)')).toBeInTheDocument()
    })
    expect(dashboardService.getMetrics).not.toHaveBeenCalled()
    expect(screen.queryByText(/distribución de salud financiera/i)).toBeNull()
    expect(screen.queryByText(/productos? debajo de su mínimo/i)).toBeNull()
    expect(screen.queryByText(/margen promedio/i)).toBeNull()
  })
})

describe('DashboardPage: descarga del reporte semanal (#392)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dashboardService.getMetrics).mockResolvedValue({
      activeIngredientsCount: 218,
      criticalProductsCount: 119,
      healthyProductsCount: 170,
      averageMarginPercent: 38.5,
      recentCostVariationsCount: 7,
      lossCount: 12,
      riskCount: 107,
      targetCount: 130,
      surplusCount: 40,
      draftCount: 50,
    })
    vi.mocked(productService.getAll).mockResolvedValue(catalogoDemo())
  })

  it('el ADMIN ve "Descargar reporte (PDF)" también en el celular', async () => {
    mockUser.role = 'ADMIN'
    render(<DashboardPage />)

    const boton = await screen.findByRole('button', { name: 'Descargar reporte (PDF)' })
    // Los otros atajos del encabezado se ocultan en mobile; la descarga no.
    expect(boton.closest('.hidden')).toBeNull()
  })

  it('los atajos del encabezado no se parten en dos líneas al sumar la descarga', async () => {
    mockUser.role = 'ADMIN'
    render(<DashboardPage />)

    const boton = await screen.findByRole('button', { name: 'Descargar reporte (PDF)' })
    for (const el of [boton, screen.getByText('Actualizar Insumos'), screen.getByText('Nuevo Producto').closest('a')!]) {
      expect(el.className).toMatch(/whitespace-nowrap/)
    }
    // Con tres acciones, el saludo y los botones van en fila recién desde lg (en md no entran).
    const seccion = screen.getByRole('heading', { level: 1 }).closest('section')!
    expect(seccion.className).toMatch(/lg:flex-row/)
    expect(seccion.className).not.toMatch(/(^|\s)md:flex-row/)
  })

  it('Escenario Gherkin: Colaborador -> no ve la descarga del reporte', async () => {
    mockUser.role = 'COLLABORATOR'
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Ver catálogo completo (339)')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /descargar reporte/i })).toBeNull()
  })
})
