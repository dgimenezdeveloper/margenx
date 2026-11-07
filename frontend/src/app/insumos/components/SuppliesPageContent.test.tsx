import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import SuppliesPageContent from './SuppliesPageContent'
import { ingredientService } from '@/services/ingredientService'
import { supplierService } from '@/services/supplierService'
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
    useLocation: () => ({ pathname: '/insumos' }),
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => '/insumos',
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

vi.mock('@/services/ingredientService', () => ({
  ingredientService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getQuarantine: vi.fn(),
  },
}))

describe('SuppliesPageContent - Manejo de Errores y Reintentos (UX-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.getAll).mockResolvedValue([])
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
  })

  it('Escenario Gherkin: Falla la carga de insumos -> ve ErrorState con Reintentar y no una lista vacía ni KPIs en cero', async () => {
    vi.mocked(ingredientService.getAll).mockRejectedValueOnce(
      new ApiError('Fallo al consultar /api/ingredients (500)', 500)
    )
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])

    render(<SuppliesPageContent />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText('Error al cargar insumos')).toBeInTheDocument()
    expect(screen.getByText(/Fallo al consultar \/api\/ingredients/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()

    expect(screen.queryByText('Sin insumos en la despensa')).toBeNull()
    expect(screen.queryByText('Insumos activos')).toBeNull()
  })

  it('Escenario Gherkin: Reintento exitoso en Insumos -> recupera la lista completa', async () => {
    vi.mocked(ingredientService.getAll).mockRejectedValueOnce(new ApiError('Fallo temporal', 500))
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])

    render(<SuppliesPageContent />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    vi.mocked(ingredientService.getAll).mockResolvedValueOnce([
      { id: 'ing-1', name: 'Harina de trigo 000', unit: 'kg', currentCost: 736.25 },
    ])
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])

    const retryBtn = screen.getByRole('button', { name: /reintentar/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Harina de trigo 000').length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Sin red (fetch lanza TypeError) -> muestra un mensaje en español, no el texto técnico del navegador', async () => {
    vi.mocked(ingredientService.getAll).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    render(<SuppliesPageContent />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText('No se pudieron cargar los insumos.')).toBeInTheDocument()
    expect(screen.queryByText(/failed to fetch/i)).toBeNull()
  })

  it('Mientras se reintenta muestra el estado de carga y no el error anterior', async () => {
    vi.mocked(ingredientService.getAll).mockRejectedValueOnce(new ApiError('Fallo temporal', 500))

    render(<SuppliesPageContent />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // El reintento queda pendiente para observar el estado intermedio.
    vi.mocked(ingredientService.getAll).mockReturnValueOnce(new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Cargando insumos...')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('Fallo temporal')).toBeNull()
  })
})
