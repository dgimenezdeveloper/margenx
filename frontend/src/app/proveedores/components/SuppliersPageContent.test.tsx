import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { ApiError } from '@/services/api'
import { supplierService, type SupplierSummary } from '@/services/supplierService'
import SuppliersPageContent from './SuppliersPageContent'

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken, signOut: vi.fn() }),
}))

const currentUser = vi.hoisted(() => ({
  value: {
    id: 'u1',
    role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR',
    email: 'admin.panaderia@seed.example.test',
    account: { id: 'acc-1', businessName: 'Panadería Central', slug: 'panaderia-central' as string | undefined },
  },
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: currentUser.value,
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

const molino: SupplierSummary = {
  id: 'sup-1',
  accountId: 'acc-1',
  name: 'Molino Olavarriense',
  contactPhone: '+54 9 2284 41-5566',
  email: null,
  address: null,
  isActive: true,
  ingredientCount: 3,
  quarantineCount: 1,
}

const quimica: SupplierSummary = {
  id: 'sup-2',
  accountId: 'acc-1',
  name: 'Distribuidora Química del Sur',
  contactPhone: null,
  email: 'compras@quimicadelsur.com.ar',
  address: null,
  isActive: true,
  ingredientCount: 2,
  quarantineCount: 0,
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/proveedores']}>
      <SuppliersPageContent />
    </MemoryRouter>
  )

const supplierList = () => screen.getByRole('list', { name: 'Proveedores' })

describe('SuppliersPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.value.role = 'ADMIN'
    currentUser.value.account.slug = 'panaderia-central'
    vi.mocked(supplierService.getAll).mockResolvedValue([quimica, molino])
  })

  it('Escenario Gherkin: la bandeja de cuarentena se elige desde las pestañas de Proveedores', async () => {
    renderPage()

    const tabs = within(screen.getByRole('navigation', { name: 'Secciones de proveedores' }))
    expect(tabs.getByRole('link', { name: 'Proveedores' })).toHaveAttribute('aria-current', 'page')
    // Sin lista cargada todavía no se conoce cuántos precios hay retenidos.
    expect(tabs.getByRole('link', { name: 'Cuarentena' })).toHaveAttribute('href', '/proveedores/cuarentena')

    expect(await tabs.findByRole('link', { name: 'Cuarentena, 1 precio retenido' })).toHaveAttribute(
      'href',
      '/proveedores/cuarentena'
    )
  })

  it('muestra al administrador la dirección de ingesta de su comercio, aun sin proveedores cargados', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByText('Todavía no cargaste proveedores')).toBeInTheDocument()
    expect(screen.getByText('precios-panaderia-central@margenx.tech')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar dirección' })).toBeInTheDocument()
  })

  it('no muestra la dirección si la cuenta no trae slug (la API no se lo envía al colaborador)', async () => {
    currentUser.value.role = 'COLLABORATOR'
    currentUser.value.account.slug = undefined
    renderPage()

    await screen.findByRole('list', { name: 'Proveedores' })
    expect(screen.queryByText(/@margenx\.tech/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copiar dirección' })).not.toBeInTheDocument()
  })

  it('muestra el esqueleto mientras carga y después la lista ordenada con el resumen', async () => {
    vi.mocked(supplierService.getAll).mockReturnValueOnce(new Promise(() => {}))
    const { unmount } = renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando proveedores...')
    unmount()

    renderPage()
    const rows = within(await screen.findByRole('list', { name: 'Proveedores' })).getAllByRole('listitem')
    expect(rows.map((row) => row.getAttribute('aria-labelledby'))).toEqual(['supplier-name-sup-2', 'supplier-name-sup-1'])
    expect(screen.getByText('Proveedores activos').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Insumos vinculados').nextSibling).toHaveTextContent('5')
    expect(screen.getByText('Precios en cuarentena').nextSibling).toHaveTextContent('1')
  })

  it('sin proveedores invita a cargar el primero y abre el alta', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getAll).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Todavía no cargaste proveedores')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cargar mi primer proveedor' }))

    expect(await screen.findByRole('dialog', { name: 'Nuevo proveedor' })).toBeInTheDocument()
  })

  it('si la carga falla muestra el error con Reintentar y recupera la lista', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getAll).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudieron cargar los proveedores.')
    expect(screen.queryByText(/failed to fetch/i)).toBeNull()
    expect(screen.queryByText('Proveedores activos')).toBeNull()

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('list', { name: 'Proveedores' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('muestra el mensaje del servidor cuando la API responde con error', async () => {
    vi.mocked(supplierService.getAll).mockRejectedValueOnce(new ApiError('No tenés permisos para esta acción.', 403))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No tenés permisos para esta acción.')
  })

  it('Escenario Gherkin: al completar nombre y contacto y confirmar, el proveedor aparece en la lista', async () => {
    const user = userEvent.setup()
    const created = {
      id: 'sup-3',
      accountId: 'acc-1',
      name: 'Avícola San Cayetano',
      contactPhone: '0221 455-1020',
      email: null,
      address: null,
      isActive: true,
    }
    vi.mocked(supplierService.create).mockResolvedValue(created)
    renderPage()

    await screen.findByRole('list', { name: 'Proveedores' })
    await user.click(screen.getAllByRole('button', { name: 'Nuevo proveedor' })[0])
    await user.type(screen.getByLabelText('Nombre'), 'Avícola San Cayetano')
    await user.type(screen.getByLabelText(/Teléfono/), '0221 455-1020')
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }))

    const row = await within(supplierList()).findByRole('listitem', { name: 'Avícola San Cayetano' })
    expect(within(row).getByText('0 insumos')).toBeInTheDocument()
    expect(within(row).getByText('0221 455-1020')).toBeInTheDocument()
    expect(await screen.findByText('Proveedor "Avícola San Cayetano" creado')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuevo proveedor' })).toBeNull())
  })

  it('la edición actualiza la fila y conserva sus contadores', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.update).mockResolvedValue({ ...molino, name: 'Molino Olavarriense S.A.' })
    renderPage()

    await screen.findByRole('list', { name: 'Proveedores' })
    await user.click(screen.getByRole('button', { name: 'Editar Molino Olavarriense' }))
    const name = screen.getByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Molino Olavarriense S.A.')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const row = await within(supplierList()).findByRole('listitem', { name: 'Molino Olavarriense S.A.' })
    expect(within(row).getByText('3 insumos')).toBeInTheDocument()
    expect(within(row).getByText('1 en cuarentena')).toBeInTheDocument()
    expect(await screen.findByText('Cambios guardados en "Molino Olavarriense S.A."')).toBeInTheDocument()
  })

  it('la baja confirmada quita al proveedor de la lista y lo avisa', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getById).mockResolvedValue({ ...quimica, ingredients: [] })
    vi.mocked(supplierService.remove).mockResolvedValue(undefined)
    renderPage()

    await screen.findByRole('list', { name: 'Proveedores' })
    await user.click(screen.getByRole('button', { name: 'Dar de baja Distribuidora Química del Sur' }))
    await screen.findByText('No tiene presentaciones cargadas: ningún insumo se ve afectado.')
    await user.click(screen.getByRole('button', { name: 'Sí, dar de baja' }))

    await waitFor(() =>
      expect(within(supplierList()).queryByRole('listitem', { name: 'Distribuidora Química del Sur' })).toBeNull()
    )
    expect(await screen.findByText('Diste de baja a "Distribuidora Química del Sur"')).toBeInTheDocument()
  })

  it('desactivar en lugar de borrar deja al proveedor como Inactivo', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getById).mockResolvedValue({
      ...molino,
      ingredients: [
        {
          id: 'si-1',
          packageSize: '50',
          packageUnit: 'kg',
          packagePrice: '35000',
          isDefault: true,
          ingredient: { id: 'ing-1', name: 'Harina de trigo 000', unit: 'kg' },
        },
      ],
    })
    vi.mocked(supplierService.update).mockResolvedValue({ ...molino, isActive: false })
    renderPage()

    await screen.findByRole('list', { name: 'Proveedores' })
    await user.click(screen.getByRole('button', { name: 'Dar de baja Molino Olavarriense' }))
    await user.click(await screen.findByRole('button', { name: 'Desactivar en su lugar' }))

    const row = await within(supplierList()).findByRole('listitem', { name: 'Molino Olavarriense' })
    await waitFor(() => expect(within(row).getByText('Inactivo')).toBeInTheDocument())
    expect(within(row).getByText('3 insumos')).toBeInTheDocument()
    expect(await screen.findByText('"Molino Olavarriense" quedó inactivo')).toBeInTheDocument()
  })
})
