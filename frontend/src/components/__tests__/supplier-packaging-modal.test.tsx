import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SupplierPackagingModal } from '../supplier-packaging-modal'
import { supplierService, type SupplierIngredient } from '@/services/supplierService'
import type { Ingredient } from '@/services/ingredientService'

// Como en Clerk, getToken conserva su referencia entre renders: si cambiara, el modal
// volvería a pedir los proveedores y la prueba no reflejaría lo que pasa en la app.
const getToken = vi.fn().mockResolvedValue('fake-token')
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getAll: vi.fn(),
    addPackaging: vi.fn(),
    create: vi.fn(),
  },
}))

type SupplierRow = Awaited<ReturnType<typeof supplierService.getAll>>[number]

function buildSupplier(id: string, name: string): SupplierRow {
  const supplier = { id, name, accountId: 'acc-1', isActive: true, ingredientCount: 0, quarantineCount: 0 }
  return supplier
}

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

    // Abrir el sub-formulario para nuevo proveedor
    const newSupplierBtn = screen.getByRole('button', { name: 'Nuevo proveedor' })
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

    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }))
    await user.type(screen.getByPlaceholderText('Nombre del proveedor...'), 'Distribuidora La Espiga')
    await user.click(screen.getByRole('button', { name: 'Cancelar alta de proveedor' }))
    await user.click(screen.getByRole('button', { name: /^Cancelar$/ }))

    expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument()
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('Escenario Gherkin: muestra errores junto al campo y enfoca el primero al fallar la validación', async () => {
    vi.mocked(supplierService.getAll).mockResolvedValue([
      buildSupplier('sup-1', 'Proveedor 1'),
      buildSupplier('sup-2', 'Proveedor 2'),
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

    // Dejamos los campos numéricos vacíos
    const sizeInput = screen.getByLabelText(/Tamaño del bulto/i)
    fireEvent.change(sizeInput, { target: { value: '' } })

    const priceInput = screen.getByLabelText(/Precio total del bulto/i)
    fireEvent.change(priceInput, { target: { value: '' } })

    const submitBtn = screen.getByRole('button', { name: /Asociar Empaque/i })
    expect(submitBtn).toBeEnabled()
    fireEvent.click(submitBtn)

    // Los mensajes deben aparecer en el DOM con semántica alert
    await waitFor(() => {
      expect(
        screen.getByText(/Ingresa una cantidad válida|El tamaño del bulto debe ser mayor a 0/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Ingresa un precio válido|El precio del empaque debe ser mayor a 0/i)
      ).toBeInTheDocument()
    })

    // El foco debe desplazarse al primer campo inválido (packageSize)
    await waitFor(() => {
      expect(sizeInput).toHaveFocus()
    })
  })

  describe('retoques visuales (#362)', () => {
    const PROVEEDORES = [
      buildSupplier('sup-2', 'Molino Campodónico'),
      buildSupplier('sup-3', 'Distribuidora MarJuanC Alimentos'),
    ]

    const esperarCarga = () =>
      waitFor(() => {
        expect(screen.queryByText('Cargando proveedores...')).not.toBeInTheDocument()
      })

    it('el botón para dar de alta un proveedor se ve como botón y dice qué hace', async () => {
      vi.mocked(supplierService.getAll).mockResolvedValue(PROVEEDORES)
      render(<SupplierPackagingModal isOpen onClose={vi.fn()} ingredient={mockIngredient} onSuccess={vi.fn()} />)
      await esperarCarga()

      const boton = screen.getByRole('button', { name: 'Nuevo proveedor' })
      const clases = boton.className.split(/\s+/)
      expect(clases).toEqual(
        expect.arrayContaining(['border', 'border-indigo-200', 'bg-indigo-50', 'text-indigo-700', 'min-h-11', 'focus-visible:outline-2'])
      )
      expect(clases).not.toContain('hover:underline')
    })

    it('Escenario: el proveedor se elige en un desplegable con el estilo de MargenX, no en un select nativo', async () => {
      vi.mocked(supplierService.getAll).mockResolvedValue(PROVEEDORES)
      vi.mocked(supplierService.addPackaging).mockResolvedValue({
        unitCost: 760,
        supplierIngredient: { ...mockSupplierConnection, id: 'conn-3', supplierId: 'sup-3', packageSize: 25, packagePrice: 19000, isDefault: false },
      } as Awaited<ReturnType<typeof supplierService.addPackaging>>)
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      render(<SupplierPackagingModal isOpen onClose={vi.fn()} ingredient={mockIngredient} onSuccess={onSuccess} />)
      await esperarCarga()

      expect(document.querySelector('select')).toBeNull()
      const desplegable = screen.getByRole('combobox', { name: 'Proveedor mayorista' })
      expect(desplegable).toHaveTextContent('Molino Campodónico')

      await user.click(desplegable)
      const lista = await screen.findByRole('listbox')
      expect(within(lista).getAllByRole('option').map((o) => o.textContent)).toEqual([
        'Molino Campodónico',
        'Distribuidora MarJuanC Alimentos',
      ])
      await user.click(within(lista).getByRole('option', { name: 'Distribuidora MarJuanC Alimentos' }))
      await waitFor(() => expect(desplegable).toHaveTextContent('Distribuidora MarJuanC Alimentos'))

      await user.type(screen.getByLabelText(/Tamaño del bulto/i), '25')
      await user.type(screen.getByLabelText(/Precio total del bulto/i), '19000')
      await user.click(screen.getByRole('button', { name: /Asociar Empaque/i }))

      await waitFor(() => expect(supplierService.addPackaging).toHaveBeenCalledTimes(1))
      expect(vi.mocked(supplierService.addPackaging).mock.calls[0][1]).toBe('sup-3')
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('el proveedor dado de alta rápido queda elegido en el desplegable', async () => {
      vi.mocked(supplierService.getAll).mockResolvedValue(PROVEEDORES)
      vi.mocked(supplierService.create).mockResolvedValue(buildSupplier('sup-9', 'Distribuidora La Espiga'))
      const user = userEvent.setup()
      render(<SupplierPackagingModal isOpen onClose={vi.fn()} ingredient={mockIngredient} onSuccess={vi.fn()} />)
      await esperarCarga()

      await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }))
      await user.type(screen.getByPlaceholderText('Nombre del proveedor...'), 'Distribuidora La Espiga')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      const desplegable = await screen.findByRole('combobox', { name: 'Proveedor mayorista' })
      await waitFor(() => expect(desplegable).toHaveTextContent('Distribuidora La Espiga'))
    })

    it('al editar una presentación el proveedor no se puede cambiar', async () => {
      vi.mocked(supplierService.getAll).mockResolvedValue([buildSupplier('sup-1', 'Molino Olavarriense'), ...PROVEEDORES])
      render(
        <SupplierPackagingModal
          isOpen
          onClose={vi.fn()}
          ingredient={mockIngredient}
          existingConnection={mockSupplierConnection}
          onSuccess={vi.fn()}
        />
      )
      await esperarCarga()

      const desplegable = screen.getByRole('combobox', { name: 'Proveedor mayorista' })
      expect(desplegable).toHaveTextContent('Molino Olavarriense')
      expect(desplegable).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Nuevo proveedor' })).toBeNull()
    })
  })
})
