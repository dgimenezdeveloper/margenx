import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

import { IngredientUpsertSheet } from './IngredientUpsertSheet'
import type { Ingredient, IngredientProductUsage } from '@/services/ingredientService'

const mockIngredient: Ingredient = { id: 'ing-1', name: 'Harina 000 Olavariense', unit: 'kg', currentCost: 736.25 }

describe('IngredientUpsertSheet - Criterios de Aceptación Issue #354', () => {
  it('solicita confirmación de eliminación en vez de cerrar el diálogo al presionar el botón de papelera', async () => {
    const onRequestDelete = vi.fn()
    const onCancelDelete = vi.fn()

    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={onCancelDelete}
          onRequestDelete={onRequestDelete}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{}}
          selectedUnit="kg"
          money={(value) => `$${value}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByLabelText('Eliminar insumo'))

    expect(onRequestDelete).toHaveBeenCalledTimes(1)
    expect(onCancelDelete).not.toHaveBeenCalled()
  })

  it('renderiza inputs de nombre y unidad editables cuando selected está presente', () => {
    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{}}
          selectedUnit="kg"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByLabelText('Nombre del insumo')).toBeInTheDocument()
    expect(screen.getByText('Unidad de medida')).toBeInTheDocument()
  })

  it('Escenario Gherkin "Dónde se usa": renderiza los 27 productos vinculados con enlace a cada uno', () => {
    const mockProducts: IngredientProductUsage[] = Array.from({ length: 27 }, (_, i) => ({
      id: `prod-${i + 1}`,
      name: `Producto Terminado ${i + 1}`,
      quantity: 0.25,
      salePrice: 4000,
      cost: 1200,
      marginAmount: 2800,
      marginPercent: 70,
      minMarginPercent: 30,
      marginStatus: 'surplus',
      updatedAt: '2026-10-14T12:00:00.000Z',
    }))

    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{}}
          selectedUnit="kg"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
          usedProducts={mockProducts}
          isLoadingProducts={false}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('27 productos')).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(27)
    expect(links[0]).toHaveAttribute('href', '/productos/prod-1')
    expect(links[26]).toHaveAttribute('href', '/productos/prod-27')
  })

  it('muestra mensaje adyacente al input cuando existe error 409 de nombre duplicado', () => {
    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{ name: { type: 'server', message: 'Ya existe un insumo con ese nombre.' } }}
          selectedUnit="kg"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
        />
      </MemoryRouter>
    )

    const errorMsg = screen.getByRole('alert')
    expect(errorMsg).toHaveTextContent('Ya existe un insumo con ese nombre.')
  })

  it('deshabilita los botones de unidad y muestra el motivo cuando el insumo se usa en recetas', () => {
    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{}}
          selectedUnit="kg"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
          usedProductsTotal={2}
          isLoadingProducts={false}
        />
      </MemoryRouter>
    )

    for (const label of ['kg', 'litro', 'unidad']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled()
    }
    expect(
      screen.getByText(
        'La unidad no se puede cambiar porque el insumo ya está en recetas o en presentaciones de proveedor.'
      )
    ).toBeInTheDocument()
  })

  it('deshabilita los botones de unidad y muestra el motivo cuando tiene presentaciones de proveedor', () => {
    const withSupplier: Ingredient = {
      ...mockIngredient,
      supplierConnections: [
        {
          id: 'si-1',
          supplierId: 'sup-1',
          ingredientId: 'ing-1',
          packageSize: 25,
          packageUnit: 'kg',
          packagePrice: 18406.25,
          isDefault: true,
        },
      ],
    }

    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={withSupplier}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{}}
          selectedUnit="kg"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
          usedProducts={[]}
          usedProductsTotal={0}
          isLoadingProducts={false}
        />
      </MemoryRouter>
    )

    for (const label of ['kg', 'litro', 'unidad']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled()
    }
    expect(
      screen.getByText(
        'La unidad no se puede cambiar porque el insumo ya está en recetas o en presentaciones de proveedor.'
      )
    ).toBeInTheDocument()
  })

  it('mantiene habilitados los botones de unidad cuando el insumo no tiene recetas ni presentaciones', () => {
    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{}}
          selectedUnit="kg"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
          usedProducts={[]}
          usedProductsTotal={0}
          isLoadingProducts={false}
        />
      </MemoryRouter>
    )

    for (const label of ['kg', 'litro', 'unidad']) {
      expect(screen.getByRole('button', { name: label })).toBeEnabled()
    }
    expect(
      screen.queryByText(
        'La unidad no se puede cambiar porque el insumo ya está en recetas o en presentaciones de proveedor.'
      )
    ).not.toBeInTheDocument()
  })

  it('muestra el mensaje de error 409 sobre la unidad con role="alert"', () => {
    const serverMessage =
      'No se puede cambiar la unidad: el insumo está en 1 receta(s) y 0 presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad.'

    render(
      <MemoryRouter>
        <IngredientUpsertSheet
          selected={mockIngredient}
          newOpen={false}
          showDeleteConfirm={false}
          isCollaborator={false}
          onSubmit={vi.fn()}
          onRequestClose={vi.fn()}
          onRequestDelete={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onCancelDelete={vi.fn()}
          onOpenHistory={vi.fn()}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={vi.fn()}
          register={vi.fn() as never}
          setValue={vi.fn() as never}
          errors={{ unit: { type: 'server', message: serverMessage } }}
          selectedUnit="litro"
          money={(v) => `$${v}`}
          onNumericKeyDown={vi.fn()}
          onDecimalChange={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toHaveTextContent(serverMessage)
  })
  describe('textos de la ficha (#433)', () => {
    const props = {
      newOpen: false,
      showDeleteConfirm: false,
      isCollaborator: false,
      onSubmit: vi.fn(),
      onRequestClose: vi.fn(),
      onRequestDelete: vi.fn(),
      onDeleteConfirm: vi.fn(),
      onCancelDelete: vi.fn(),
      onOpenHistory: vi.fn(),
      onOpenPackaging: vi.fn(),
      onEditConnection: vi.fn(),
      onMakeDefault: vi.fn(),
      register: vi.fn() as never,
      setValue: vi.fn() as never,
      errors: {},
      selectedUnit: 'kg' as const,
      money: (v: number) => `$${v}`,
      onNumericKeyDown: vi.fn(),
      onDecimalChange: vi.fn(),
      isLoadingProducts: false,
    }

    it('RC-09: al editar se llama "Editar insumo" y guarda con "Guardar cambios"; en el alta, "Nuevo insumo"', () => {
      const { unmount } = render(
        <MemoryRouter>
          <IngredientUpsertSheet {...props} selected={mockIngredient} usedProducts={[]} />
        </MemoryRouter>
      )
      expect(screen.getByRole('heading', { name: 'Editar insumo' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
      expect(screen.queryByText('Actualizar Costo')).toBeNull()
      unmount()

      render(
        <MemoryRouter>
          <IngredientUpsertSheet {...props} selected={null} newOpen usedProducts={[]} />
        </MemoryRouter>
      )
      expect(screen.getByRole('heading', { name: 'Nuevo insumo' })).toBeInTheDocument()
    })

    it('RC-08: en "Se usa en", el monto dice que es el precio de venta del producto', () => {
      const medialunas: IngredientProductUsage = {
        id: 'prod-medialunas',
        name: 'Medialunas de manteca, docena',
        quantity: 0.6,
        salePrice: 13500,
        cost: 4200,
        marginAmount: 9300,
        marginPercent: 68.89,
        minMarginPercent: 40,
        marginStatus: 'surplus',
        updatedAt: '2026-11-20T12:00:00.000Z',
      }
      render(
        <MemoryRouter>
          <IngredientUpsertSheet {...props} selected={mockIngredient} usedProducts={[medialunas]} />
        </MemoryRouter>
      )

      const enlace = screen.getByRole('link', { name: /Medialunas de manteca/ })
      expect(enlace).toHaveTextContent('Precio de venta')
      expect(enlace).toHaveTextContent('$13500')
    })

    it('el campo de nombre no se pone blanco al enfocarlo en modo oscuro', () => {
      render(
        <MemoryRouter>
          <IngredientUpsertSheet {...props} selected={mockIngredient} usedProducts={[]} />
        </MemoryRouter>
      )
      expect(screen.getByLabelText('Nombre del insumo').className).toContain('dark:focus:bg-gray-800')
    })
  })
})