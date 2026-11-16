import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { QuarantineList } from './QuarantineList'
import { supplierService, type QuarantinedItem } from '../../../../services/supplierService'
import { ApiError } from '../../../../services/api'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('fake-token') }),
}))

vi.mock('../../../../services/supplierService', () => ({
  supplierService: {
    releaseQuarantine: vi.fn(),
    rejectQuarantine: vi.fn(),
  },
}))

const removeItemLocally = vi.fn()

vi.mock('../../../../stores/useQuarantineStore', () => ({
  useQuarantineStore: () => ({
    removeItemLocally,
  }),
}))

const mockItems: QuarantinedItem[] = [
  {
    id: 'q1',
    ingredientId: 'ing1',
    supplierId: 'sup1',
    packagePrice: 18406.25,
    packageSize: 25,
    currentPrice: 18406.25,
    proposedPrice: 50000,
    quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
    isDefault: true,
    isQuarantined: true,
    ingredient: { id: 'ing1', name: 'Harina 000', currentCost: 742.98 },
    supplier: { id: 'sup1', name: 'Distribuidora MarJuanC' },
  },
  {
    id: 'q2',
    ingredientId: 'ing2',
    supplierId: 'sup2',
    packagePrice: 18000,
    packageSize: 25,
    currentPrice: 18000,
    proposedPrice: 40000,
    quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
    isDefault: false,
    isQuarantined: true,
    ingredient: { id: 'ing2', name: 'Harina Sarita', currentCost: 720 },
    supplier: { id: 'sup2', name: 'Molinera' },
  },
]

describe('QuarantineList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza la tabla y tarjetas con actual, propuesto, variación y motivo calculados según el contrato real', () => {
    render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)

    // Insumos y Proveedores
    expect(screen.getAllByText('Harina 000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Distribuidora MarJuanC').length).toBeGreaterThan(0)

    // Caso 1: 18.406,25 / 25 = 736,25 actual vs 50.000 / 25 = 2.000,00 propuesto (+171,6%)
    expect(screen.getAllByText('$736,25').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$2.000,00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+171,6 %').length).toBeGreaterThan(0)

    // Caso 2: 18.000 / 25 = 720,00 actual vs 40.000 / 25 = 1.600,00 propuesto (+122,2%)
    expect(screen.getAllByText('$720,00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$1.600,00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+122,2 %').length).toBeGreaterThan(0)

    // Motivos basados en quarantineReason y signo
    expect(screen.getAllByText('Aumento > 50%').length).toBeGreaterThan(0)
  })

  it('muestra diálogo específico al rechazar y ejecuta rejectQuarantine con toast de confirmación', async () => {
    const onShowToast = vi.fn()
    vi.mocked(supplierService.rejectQuarantine).mockResolvedValueOnce(undefined)

    render(<QuarantineList items={mockItems} onShowToast={onShowToast} />)

    const rejectButtons = screen.getAllByText('Rechazar')
    fireEvent.click(rejectButtons[0])

    expect(screen.getByText('¿Rechazar precio?')).toBeInTheDocument()
    expect(screen.getByText(/mantendrá su costo actual/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /sí, rechazar/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(supplierService.rejectQuarantine).toHaveBeenCalledWith(expect.anything(), 'q1')
      expect(onShowToast).toHaveBeenCalledWith('Precio rechazado. Se mantiene el costo anterior.', 'success')
    })
  })

  it('muestra diálogo específico al liberar con proveedor predeterminado y ejecuta releaseQuarantine con toast de recálculo', async () => {
    const onShowToast = vi.fn()
    vi.mocked(supplierService.releaseQuarantine).mockResolvedValueOnce({
      supplierIngredient: {
        id: 'q1',
        supplierId: 'sup1',
        ingredientId: 'ing1',
        packageSize: 25,
        packageUnit: 'kg',
        packagePrice: 50000,
        isDefault: true,
      },
      unitCost: 2000,
      affectedProductsCount: 3,
      affectedProducts: [],
      criticalProducts: [{ id: 'p1' }],
    })

    render(<QuarantineList items={mockItems} onShowToast={onShowToast} />)

    const releaseButtons = screen.getAllByText('Liberar')
    fireEvent.click(releaseButtons[0]) // q1 es default

    expect(screen.getByText('¿Liberar precio?')).toBeInTheDocument()
    expect(screen.getByText(/recalculará las recetas afectadas/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /sí, liberar/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(supplierService.releaseQuarantine).toHaveBeenCalledWith(expect.anything(), 'q1')
      expect(onShowToast).toHaveBeenCalledWith(
        'Precio liberado. Recálculo: 3 afectados, 1 críticos.',
        'success'
      )
    })
  })

  it('muestra diálogo aclaratorio al liberar una presentación que no es predeterminada', () => {
    render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)

    const releaseButtons = screen.getAllByText('Liberar')
    fireEvent.click(releaseButtons[1]) // q2 no es default

    expect(screen.getByText(/no afectará las recetas porque no es el proveedor predeterminado/i)).toBeInTheDocument()
  })

  describe('Escenario Gherkin: error al liberar o rechazar', () => {
    it('ante un fallo de red al liberar muestra el error dentro del diálogo, sin cerrarlo ni usar el aviso flotante', async () => {
      const onShowToast = vi.fn()
      vi.mocked(supplierService.releaseQuarantine).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      render(<QuarantineList items={mockItems} onShowToast={onShowToast} />)
      fireEvent.click(screen.getAllByText('Liberar')[0])
      fireEvent.click(screen.getByRole('button', { name: /sí, liberar/i }))

      const dialog = screen.getByRole('dialog')
      const alert = await within(dialog).findByRole('alert')
      expect(alert).toHaveTextContent('No se pudo liberar el precio. Revisá tu conexión e intentá de nuevo.')
      expect(alert).not.toHaveTextContent('Failed to fetch')
      expect(within(dialog).getByRole('button', { name: /sí, liberar/i })).toBeEnabled()
      expect(onShowToast).not.toHaveBeenCalled()
      expect(removeItemLocally).not.toHaveBeenCalled()
    })

    it('al rechazar con error del servidor muestra su mensaje dentro del diálogo', async () => {
      const onShowToast = vi.fn()
      vi.mocked(supplierService.rejectQuarantine).mockRejectedValueOnce(
        new ApiError('La presentación ya no está en cuarentena.', 409)
      )

      render(<QuarantineList items={mockItems} onShowToast={onShowToast} />)
      fireEvent.click(screen.getAllByText('Rechazar')[0])
      fireEvent.click(screen.getByRole('button', { name: /sí, rechazar/i }))

      const alert = await within(screen.getByRole('dialog')).findByRole('alert')
      expect(alert).toHaveTextContent('La presentación ya no está en cuarentena.')
      expect(onShowToast).not.toHaveBeenCalled()
    })

    it('un error sin mensaje de la API al rechazar usa un texto en español', async () => {
      vi.mocked(supplierService.rejectQuarantine).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)
      fireEvent.click(screen.getAllByText('Rechazar')[0])
      fireEvent.click(screen.getByRole('button', { name: /sí, rechazar/i }))

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        'No se pudo rechazar el precio. Revisá tu conexión e intentá de nuevo.'
      )
    })

    it('al reintentar con éxito el error desaparece y el diálogo se cierra con la confirmación', async () => {
      const onShowToast = vi.fn()
      vi.mocked(supplierService.rejectQuarantine)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(undefined)

      render(<QuarantineList items={mockItems} onShowToast={onShowToast} />)
      fireEvent.click(screen.getAllByText('Rechazar')[0])
      fireEvent.click(screen.getByRole('button', { name: /sí, rechazar/i }))
      await within(screen.getByRole('dialog')).findByRole('alert')

      fireEvent.click(screen.getByRole('button', { name: /sí, rechazar/i }))

      await waitFor(() => {
        expect(onShowToast).toHaveBeenCalledWith('Precio rechazado. Se mantiene el costo anterior.', 'success')
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
      expect(removeItemLocally).toHaveBeenCalledWith('q1')
    })

    it('el error de una acción no queda visible al abrir el diálogo de otro precio', async () => {
      vi.mocked(supplierService.releaseQuarantine).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)
      fireEvent.click(screen.getAllByText('Liberar')[0])
      fireEvent.click(screen.getByRole('button', { name: /sí, liberar/i }))
      await within(screen.getByRole('dialog')).findByRole('alert')

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      fireEvent.click(screen.getAllByText('Rechazar')[1])
      expect(screen.getByText('¿Rechazar precio?')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
