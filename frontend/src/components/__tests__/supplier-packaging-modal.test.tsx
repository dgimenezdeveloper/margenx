import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('expone título, descripción y botones con nombre accesible para el lector de pantalla', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-2', name: 'Molino Campodónico', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
    ])

    render(
      <SupplierPackagingModal isOpen={true} onClose={vi.fn()} ingredient={mockIngredient} onSuccess={vi.fn()} />
    )

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Harina')
    expect(dialog).toHaveAccessibleDescription(/presentación mayorista/)
    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })
    for (const button of within(dialog).getAllByRole('button')) {
      expect(button).toHaveAccessibleName(/\S/)
    }
  })

  it('excluye proveedores que ya tienen presentación para el insumo', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-1', name: 'Proveedor 1', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
      { id: 'sup-2', name: 'Proveedor 2', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
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
      { id: 'sup-1', name: 'Proveedor 1', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
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

  it('muestra advertencia al intentar cerrar con cambios sin guardar en formulario', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-1', name: 'Proveedor 1', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
    ])

    const onCloseMock = vi.fn()
    render(
      <SupplierPackagingModal
        isOpen={true}
        onClose={onCloseMock}
        ingredient={mockIngredient}
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })

    // Simular un cambio en el tamaño del bulto
    const sizeInput = screen.getByLabelText(/Tamaño del bulto/i)
    fireEvent.change(sizeInput, { target: { value: '100' } })

    // Intentar cerrar con Cancelar
    const cancelButton = screen.getByRole('button', { name: /^Cancelar$/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByText('¿Descartar cambios?')).toBeInTheDocument()
    })
    expect(onCloseMock).not.toHaveBeenCalled()

    // Confirmar descarte
    const discardButton = screen.getByRole('button', { name: /Descartar/i })
    fireEvent.click(discardButton)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('muestra advertencia al intentar cerrar mientras se escribe el nombre de un nuevo proveedor', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-1', name: 'Proveedor 1', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
      { id: 'sup-2', name: 'Proveedor 2', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
    ])

    const onCloseMock = vi.fn()
    render(
      <SupplierPackagingModal
        isOpen={true}
        onClose={onCloseMock}
        ingredient={mockIngredient}
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })

    // Abrir el sub-formulario para nuevo proveedor (usando el texto exacto 'Nuevo')
    const newSupplierBtn = screen.getByRole('button', { name: 'Nuevo' })
    fireEvent.click(newSupplierBtn)

    // Escribir en el campo de texto del nuevo proveedor
    const supplierInput = screen.getByPlaceholderText('Nombre del proveedor...')
    fireEvent.change(supplierInput, { target: { value: 'Molino Nuevo S.A.' } })

    // Intentar cerrar haciendo clic en Cancelar
    const cancelButton = screen.getByRole('button', { name: /^Cancelar$/i })
    fireEvent.click(cancelButton)

    // Debe mostrar la advertencia
    await waitFor(() => {
      expect(screen.getByText('¿Descartar cambios?')).toBeInTheDocument()
    })
    expect(onCloseMock).not.toHaveBeenCalled()

    // Confirmar descarte
    const discardButton = screen.getByRole('button', { name: /Descartar/i })
    fireEvent.click(discardButton)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('Escape sin cambios pendientes cierra el modal una sola vez', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-2', name: 'Molino Campodónico', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
    ])
    const user = userEvent.setup()
    const onCloseMock = vi.fn()
    render(
      <SupplierPackagingModal isOpen={true} onClose={onCloseMock} ingredient={mockIngredient} onSuccess={vi.fn()} />
    )
    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })

    await user.keyboard('{Escape}')

    expect(onCloseMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument()
  })

  it('Escape con cambios pendientes pide confirmación y Escape otra vez vuelve al formulario', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-2', name: 'Molino Campodónico', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
    ])
    const user = userEvent.setup()
    const onCloseMock = vi.fn()
    render(
      <SupplierPackagingModal isOpen={true} onClose={onCloseMock} ingredient={mockIngredient} onSuccess={vi.fn()} />
    )
    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })
    await user.type(screen.getByLabelText(/Tamaño del bulto/i), '25')

    await user.keyboard('{Escape}')
    await screen.findByRole('dialog', { name: '¿Descartar cambios?' })

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '¿Descartar cambios?' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('dialog', { name: 'Harina' })).toBeInTheDocument()
    expect(onCloseMock).not.toHaveBeenCalled()
  })

  it('cancelar el alta rápida de proveedor descarta el nombre y no deja cambios pendientes', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      { id: 'sup-2', name: 'Molino Campodónico', accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 },
    ])
    const user = userEvent.setup()
    const onCloseMock = vi.fn()
    render(
      <SupplierPackagingModal isOpen={true} onClose={onCloseMock} ingredient={mockIngredient} onSuccess={vi.fn()} />
    )
    await waitFor(() => {
      expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Nuevo/ }))
    await user.type(screen.getByPlaceholderText('Nombre del proveedor...'), 'Distribuidora La Espiga')
    await user.click(screen.getByRole('button', { name: 'Cancelar alta de proveedor' }))
    await user.click(screen.getByRole('button', { name: /^Cancelar$/ }))

    expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument()
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
