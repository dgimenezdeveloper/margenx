import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { ApiError } from '@/services/api'
import { supplierService, type SupplierDetail, type SupplierSummary } from '@/services/supplierService'
import { SupplierDeleteDialog } from './SupplierDeleteDialog'

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getById: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  },
}))

const molino: SupplierSummary = {
  id: 'sup-1',
  accountId: 'acc-1',
  name: 'Molino Olavarriense',
  contactPhone: null,
  email: null,
  address: null,
  isActive: true,
  ingredientCount: 3,
  quarantineCount: 1,
}

const detail: SupplierDetail = {
  ...molino,
  ingredients: [
    {
      id: 'si-1',
      supplierCode: 'HAR-000',
      packageSize: '50',
      packageUnit: 'kg',
      packagePrice: '35000',
      isDefault: true,
      isQuarantined: false,
      ingredient: { id: 'ing-1', name: 'Harina de trigo 000', unit: 'kg' },
    },
    {
      id: 'si-2',
      supplierCode: null,
      packageSize: '25',
      packageUnit: 'kg',
      packagePrice: '18406.25',
      isDefault: false,
      isQuarantined: true,
      ingredient: { id: 'ing-2', name: 'Harina integral', unit: 'kg' },
    },
    {
      id: 'si-3',
      supplierCode: 'SAL-1',
      packageSize: '1',
      packageUnit: 'kg',
      packagePrice: '950',
      isDefault: false,
      isQuarantined: false,
      ingredient: { id: 'ing-3', name: 'Sal fina', unit: 'kg' },
    },
  ],
}

const renderDialog = (props: Partial<React.ComponentProps<typeof SupplierDeleteDialog>> = {}) => {
  const handlers = { onClose: vi.fn(), onDeleted: vi.fn(), onDeactivated: vi.fn() }
  render(<SupplierDeleteDialog open supplier={molino} {...handlers} {...props} />)
  return handlers
}

describe('SupplierDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Escenario Gherkin: la confirmación muestra las tres presentaciones afectadas antes de aceptar', async () => {
    let resolveDetail: (value: SupplierDetail) => void = () => {}
    vi.mocked(supplierService.getById).mockReturnValue(new Promise((resolve) => { resolveDetail = resolve }))
    renderDialog()

    const dialog = screen.getByRole('dialog', { name: '¿Dar de baja a Molino Olavarriense?' })
    const confirm = within(dialog).getByRole('button', { name: 'Sí, dar de baja' })
    expect(confirm).toBeDisabled()
    expect(within(dialog).getByRole('status')).toHaveTextContent('Buscando las presentaciones afectadas...')

    resolveDetail(detail)

    const list = await within(dialog).findByRole('list', { name: 'Presentaciones afectadas (3)' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Harina de trigo 000')
    expect(items[0]).toHaveTextContent('50 kg · $35.000')
    expect(items[1]).toHaveTextContent('25 kg · $18.406,25')
    expect(items[2]).toHaveTextContent('Sal fina')
    expect(confirm).toBeEnabled()
    expect(supplierService.getById).toHaveBeenCalledWith(getToken, 'sup-1')
  })

  it('marca la presentación predeterminada y la retenida, y explica qué pasa con el costo y las listas', async () => {
    vi.mocked(supplierService.getById).mockResolvedValue(detail)
    renderDialog()

    const list = await screen.findByRole('list', { name: /Presentaciones afectadas/ })
    const [harina, integral] = within(list).getAllByRole('listitem')
    expect(within(harina).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(harina).getByText('Cód. HAR-000')).toBeInTheDocument()
    expect(within(integral).getByText('En cuarentena')).toBeInTheDocument()

    expect(
      screen.getByText(
        'Harina de trigo 000 conserva su costo actual, pero queda sin proveedor predeterminado hasta que elijas otro.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Las listas de precios de este proveedor ya no van a actualizar estos insumos.')).toBeInTheDocument()
    expect(screen.getByText(/1 precio en cuarentena se descarta/)).toBeInTheDocument()
  })

  it('al confirmar da de baja y avisa a la pantalla', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getById).mockResolvedValue(detail)
    vi.mocked(supplierService.remove).mockResolvedValue(undefined)
    const { onDeleted } = renderDialog()

    await screen.findByRole('list', { name: /Presentaciones afectadas/ })
    await user.click(screen.getByRole('button', { name: 'Sí, dar de baja' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(molino))
    expect(supplierService.remove).toHaveBeenCalledWith(getToken, 'sup-1')
  })

  it('un proveedor sin presentaciones aclara que no afecta a ningún insumo', async () => {
    vi.mocked(supplierService.getById).mockResolvedValue({ ...detail, ingredients: [] })
    renderDialog({ supplier: { ...molino, ingredientCount: 0, quarantineCount: 0 } })

    expect(await screen.findByText('No tiene presentaciones cargadas: ningún insumo se ve afectado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Desactivar en su lugar/ })).toBeNull()
  })

  it('si no puede traer las presentaciones no deja confirmar y permite reintentar', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getById).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderDialog()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos traer las presentaciones de este proveedor.')
    expect(screen.getByRole('button', { name: 'Sí, dar de baja' })).toBeDisabled()

    vi.mocked(supplierService.getById).mockResolvedValueOnce(detail)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('list', { name: 'Presentaciones afectadas (3)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, dar de baja' })).toBeEnabled()
  })

  it('si la baja falla muestra el motivo dentro del diálogo y no cierra', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getById).mockResolvedValue(detail)
    vi.mocked(supplierService.remove).mockRejectedValue(new ApiError('Proveedor no encontrado.', 404))
    const { onDeleted, onClose } = renderDialog()

    await screen.findByRole('list', { name: /Presentaciones afectadas/ })
    await user.click(screen.getByRole('button', { name: 'Sí, dar de baja' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Proveedor no encontrado.')
    expect(onDeleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ofrece desactivarlo en lugar de borrarlo, sin perder sus presentaciones', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getById).mockResolvedValue(detail)
    const deactivated = { ...molino, isActive: false }
    vi.mocked(supplierService.update).mockResolvedValue(deactivated)
    const { onDeactivated } = renderDialog()

    await screen.findByRole('list', { name: /Presentaciones afectadas/ })
    await user.click(screen.getByRole('button', { name: 'Desactivar en su lugar' }))

    await waitFor(() => expect(onDeactivated).toHaveBeenCalledWith(deactivated))
    expect(supplierService.update).toHaveBeenCalledWith(getToken, 'sup-1', { isActive: false })
    expect(supplierService.remove).not.toHaveBeenCalled()
  })
})
