import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SupplierPackagingModal } from '../supplier-packaging-modal'
import { supplierService, type SupplierIngredient } from '@/services/supplierService'
import type { Ingredient } from '@/services/ingredientService'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('fake-token') }),
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getAll: vi.fn(),
    addPackaging: vi.fn(),
    create: vi.fn(),
  },
}))

describe('SupplierPackagingModal', () => {
  const mockSupplierConnection: SupplierIngredient = {
    id: 'conn-1',
    supplierId: 'sup-1',
    packageSize: 50,
    packagePrice: 25000,
    isDefault: true,
    packageUnit: 'kg',
    ingredientId: 'ing-1',
  }

  const mockIngredient: Ingredient = {
    id: 'ing-1',
    name: 'Harina',
    unit: 'kg',
    currentCost: 500,
    supplierConnections: [mockSupplierConnection],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excluye proveedores que ya tienen presentación para el insumo', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-1', name: 'Proveedor 1', accountId: 'acc-1', isActive: true },
      { id: 'sup-2', name: 'Proveedor 2', accountId: 'acc-1', isActive: true },
    ])

    render(
      <SupplierPackagingModal
        isOpen={true}
        onClose={vi.fn()}
        ingredient={mockIngredient}
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })

    const select = screen.getByLabelText('Proveedor mayorista')
    expect(select).toBeInTheDocument()

    // Proveedor 1 no debe figurar en la lista desplegable porque ya está vinculado al insumo
    expect(screen.queryByText('Proveedor 1')).not.toBeInTheDocument()
    expect(screen.getByText('Proveedor 2')).toBeInTheDocument()
  })

  it('muestra error si se intenta quitar el predeterminado sin reemplazo', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-1', name: 'Proveedor 1', accountId: 'acc-1', isActive: true },
    ])

    render(
      <SupplierPackagingModal
        isOpen={true}
        onClose={vi.fn()}
        ingredient={mockIngredient}
        existingConnection={mockSupplierConnection}
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })

    const checkbox = screen.getByLabelText(/Marcar como proveedor predeterminado/i)
    expect(checkbox).toBeChecked()

    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()

    const submitBtn = screen.getByRole('button', { name: /Actualizar Empaque/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(
          /No puedes quitar el proveedor predeterminado sin asignar otro/i
        )
      ).toBeInTheDocument()
    })
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
  })
})