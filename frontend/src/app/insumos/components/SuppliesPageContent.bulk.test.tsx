import '@testing-library/jest-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { supplierService } from '@/services/supplierService'
import SuppliesPageContent from './SuppliesPageContent'
import { renderWithDataRouter } from '@/test-utils/renderWithDataRouter'

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
  ingredientService: { getAll: vi.fn(), list: vi.fn(), bulkUpload: vi.fn() },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: { getQuarantine: vi.fn() },
}))


/** Respuesta paginada de GET /ingredients con una sola página. */
const pagina = <T,>(items: T[]) => ({
  items,
  meta: { total: items.length, page: 1, limit: 20, totalPages: items.length === 0 ? 0 : 1 },
})

const HARINA: Ingredient = {
  id: 'ing-1',
  name: 'Harina de trigo 000 Olavarriense',
  unit: 'kg',
  currentCost: 736.25,
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const renderPage = () => renderWithDataRouter(<SuppliesPageContent />, '/insumos')

describe('SuppliesPageContent - acceso a la carga desde planilla (#252)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.role = 'ADMIN'
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([HARINA]))
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
    expect(await screen.findByRole('dialog', { name: 'Cargar insumos desde una planilla' })).toBeInTheDocument()
  })

  it.each([
    ['COLLABORATOR', 'COLLABORATOR' as const],
    ['un rol todavía desconocido', undefined],
  ])('no muestra el acceso para %s', async (_caso, role) => {
    currentUser.role = role
    renderPage()

    await waitFor(() => expect(ingredientService.list).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /planilla/i })).not.toBeInTheDocument()
  })

  it('con la despensa vacía, el administrador ve el atajo para cargarla desde una planilla', async () => {
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([]))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cargala desde una planilla' }))

    expect(await screen.findByRole('dialog', { name: 'Cargar insumos desde una planilla' })).toBeInTheDocument()
  })

  it('la detección de duplicados recibe el catálogo completo, no solo la página visible (#350)', async () => {
    const user = userEvent.setup()
    renderPage()

    const [desktopButton] = await screen.findAllByRole('button', { name: 'Cargar desde planilla' })
    await user.click(desktopButton as HTMLElement)

    await screen.findByRole('dialog', { name: 'Cargar insumos desde una planilla' })
    expect(ingredientService.getAll).toHaveBeenCalledTimes(1)
  })

  it('si no se puede leer el catálogo completo, igual abre el diálogo', async () => {
    vi.mocked(ingredientService.getAll).mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()
    renderPage()

    const [desktopButton] = await screen.findAllByRole('button', { name: 'Cargar desde planilla' })
    await user.click(desktopButton as HTMLElement)

    expect(await screen.findByRole('dialog', { name: 'Cargar insumos desde una planilla' })).toBeInTheDocument()
  })
})

describe('SuppliesPageContent - encabezado y tarjetas (#362)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.role = 'ADMIN'
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([HARINA]))
    vi.mocked(ingredientService.getAll).mockResolvedValue([HARINA])
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
  })

  const encabezado = async () => {
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Insumos' })
    return within(titulo.closest('section') as HTMLElement)
  }

  it('ordena el encabezado: Cuarentena, después las dos altas, con "Nuevo Insumo" (la acción principal) al final', async () => {
    renderPage()
    const botones = (await encabezado()).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim())
    expect(botones).toEqual(['Cuarentena', 'Cargar desde planilla', 'Nuevo Insumo'])
  })

  it('"Cargar desde planilla" responde al pasar el mouse en claro y en oscuro, y muestra el foco', async () => {
    renderPage()
    const [desktopButton, mobileButton] = await screen.findAllByRole('button', { name: 'Cargar desde planilla' })
    for (const boton of [desktopButton, mobileButton]) {
      const clases = (boton as HTMLElement).className.split(/\s+/)
      expect(clases).toEqual(
        expect.arrayContaining(['hover:border-indigo-300', 'hover:bg-indigo-50', 'dark:hover:bg-gray-700', 'focus-visible:outline-2'])
      )
    }
  })

  it('quita las tarjetas "Recálculo: Activo" y "Afectan a: Catálogo general", que no informaban nada', async () => {
    renderPage()
    expect(await screen.findByText('Insumos activos')).toBeInTheDocument()
    expect(screen.getByText('Variaciones recientes')).toBeInTheDocument()
    for (const texto of ['Recálculo', 'Activo', 'Afectan a', 'Catálogo general']) {
      expect(screen.queryByText(texto)).toBeNull()
    }
  })

  it('el colaborador no ve Cuarentena ni la planilla en el encabezado', async () => {
    currentUser.role = 'COLLABORATOR'
    renderPage()
    const botones = (await encabezado()).queryAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim())
    expect(botones).not.toContain('Cuarentena')
    expect(botones).not.toContain('Cargar desde planilla')
  })
})
