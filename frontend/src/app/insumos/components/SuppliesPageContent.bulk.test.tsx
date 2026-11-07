import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { supplierService } from '@/services/supplierService'
import SuppliesPageContent from './SuppliesPageContent'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token-de-prueba'), signOut: vi.fn() }),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/insumos' }),
}))

const currentUser: { role: 'ADMIN' | 'COLLABORATOR' | undefined } = { role: 'ADMIN' }

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: currentUser.role ? { id: 'u1', role: currentUser.role, email: 'admin@panaderia.com' } : null,
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { getAll: vi.fn(), bulkUpload: vi.fn() },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: { getQuarantine: vi.fn() },
}))

const HARINA: Ingredient = {
  id: 'ing-1',
  name: 'Harina de trigo 000 Olavarriense',
  unit: 'kg',
  currentCost: 736.25,
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/insumos']}>
      <SuppliesPageContent />
    </MemoryRouter>
  )

describe('SuppliesPageContent - acceso a la carga desde planilla (#252)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.role = 'ADMIN'
    vi.mocked(ingredientService.getAll).mockResolvedValue([HARINA])
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
  })

  it('el administrador ve el acceso en desktop y en mobile, y abre el diálogo', async () => {
    const user = userEvent.setup()
    renderPage()

    const [desktopButton, mobileButton] = await screen.findAllByRole('button', { name: 'Cargar desde planilla' })
    expect(desktopButton).toBeDefined()
    expect(mobileButton).toBeDefined()

    await user.click(mobileButton as HTMLElement)
    expect(screen.getByRole('dialog', { name: 'Cargar insumos desde una planilla' })).toBeInTheDocument()
  })

  it.each([
    ['COLLABORATOR', 'COLLABORATOR' as const],
    ['un rol todavía desconocido', undefined],
  ])('no muestra el acceso para %s', async (_caso, role) => {
    currentUser.role = role
    renderPage()

    await waitFor(() => expect(ingredientService.getAll).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /planilla/i })).not.toBeInTheDocument()
  })

  it('con la despensa vacía, el administrador ve el atajo para cargarla desde una planilla', async () => {
    vi.mocked(ingredientService.getAll).mockResolvedValue([])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cargala desde una planilla' }))

    expect(screen.getByRole('dialog', { name: 'Cargar insumos desde una planilla' })).toBeInTheDocument()
  })
})
