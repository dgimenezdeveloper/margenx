import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { LogoutDialog } from '../logout-dialog'
import { UnsavedChangesDialog } from '../unsaved-changes-dialog'
import { SupportDocsModal } from '../support-docs-modal'
import { PriceHistoryModal } from '../price-history-modal'
import { ProductDeleteDialog } from '@/app/productos/[id]/components/ProductDeleteDialog'
import { ProductRemoveIngredientDialog } from '@/app/productos/[id]/components/ProductRemoveIngredientDialog'
import { ProductAddIngredientModal } from '@/app/productos/[id]/components/ProductAddIngredientModal'
import { ProductMobileSimulatorSheet } from '@/app/productos/[id]/components/ProductMobileSimulatorSheet'
import { IngredientUpsertSheet } from '@/app/insumos/components/IngredientUpsertSheet'
import { SupplierFormDialog } from '@/app/proveedores/components/SupplierFormDialog'
import { SupplierDeleteDialog } from '@/app/proveedores/components/SupplierDeleteDialog'
import type { SupplierSummary } from '@/services/supplierService'
import type { Ingredient } from '@/services/ingredientService'
import type { productSchema } from '@/schemas/productSchema'
import type { ingredientSchema } from '@/schemas/ingredientSchema'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token-de-prueba') }),
}))

vi.mock('@/services/ingredientService', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ingredientService')>()
  return {
    ...original,
    ingredientService: { ...original.ingredientService, getHistory: vi.fn().mockResolvedValue([]) },
  }
})

vi.mock('@/services/supplierService', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/supplierService')>()
  return {
    ...original,
    supplierService: {
      ...original.supplierService,
      getById: vi.fn().mockResolvedValue({ id: 'sup-molino', ingredients: [] }),
    },
  }
})

const molino: SupplierSummary = {
  id: 'sup-molino',
  accountId: 'acc-panaderia',
  name: 'Molino Olavarriense',
  contactPhone: '+54 9 2284 41-5566',
  email: null,
  address: null,
  isActive: true,
  ingredientCount: 0,
  quarantineCount: 0,
}

const harina: Ingredient = { id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: 850 }
const levadura: Ingredient = { id: 'ing-levadura', name: 'Levadura fresca', unit: 'kg', currentCost: 4200 }

type ProductInput = z.input<typeof productSchema>
type IngredientInput = z.input<typeof ingredientSchema>

function SimulatorSheetHarness() {
  const { register, setValue, formState } = useForm<ProductInput>()
  return (
    <ProductMobileSimulatorSheet
      isOpen
      onClose={vi.fn()}
      gain={420}
      cost={980}
      margin={30}
      targetMargin={35}
      hasRecipe
      watchedSalePrice={1400}
      isSaving={false}
      activeStrategy="custom"
      flashingKey={null}
      register={register}
      setValue={setValue}
      errors={formState.errors}
      onAdjustPriceFactor={vi.fn()}
      onApplySuggestedMargin={vi.fn()}
      onSave={vi.fn()}
      setActiveStrategy={vi.fn()}
    />
  )
}

function IngredientSheetHarness({ selected, showDeleteConfirm = false }: { selected: Ingredient | null; showDeleteConfirm?: boolean }) {
  const { register, setValue, formState } = useForm<IngredientInput>()
  return (
    <IngredientUpsertSheet
      selected={selected}
      newOpen={!selected}
      showDeleteConfirm={showDeleteConfirm}
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
      register={register}
      setValue={setValue}
      errors={formState.errors}
      selectedUnit="kg"
      money={(value) => `$${value}`}
      onNumericKeyDown={vi.fn()}
      onDecimalChange={vi.fn()}
    />
  )
}

const casos: Array<{ nombre: string; ui: ReactElement; titulo: string | RegExp }> = [
  {
    nombre: 'Cerrar sesión',
    ui: <LogoutDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
    titulo: '¿Cerrar sesión?',
  },
  {
    nombre: 'Cambios sin guardar',
    ui: <UnsavedChangesDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
    titulo: '¿Descartar cambios?',
  },
  {
    nombre: 'Soporte y documentación',
    ui: <SupportDocsModal isOpen onClose={vi.fn()} />,
    titulo: 'Soporte y Documentación',
  },
  {
    nombre: 'Historial de precios',
    ui: <PriceHistoryModal isOpen onClose={vi.fn()} ingredientId={harina.id} ingredientName={harina.name} />,
    titulo: /Harina 000/,
  },
  {
    nombre: 'Eliminar producto',
    ui: <ProductDeleteDialog isOpen isDeleting={false} productName="Medialunas de manteca" onClose={vi.fn()} onConfirm={vi.fn()} />,
    titulo: '¿Eliminar producto?',
  },
  {
    nombre: 'Quitar insumo de la receta',
    ui: <ProductRemoveIngredientDialog ingredientName="Levadura fresca" onClose={vi.fn()} onConfirm={vi.fn()} />,
    titulo: '¿Quitar insumo de la receta?',
  },
  {
    nombre: 'Sumar insumo a la receta',
    ui: (
      <ProductAddIngredientModal
        isOpen
        onClose={vi.fn()}
        availablePantry={[harina, levadura]}
        isLoadingSupplies={false}
        onAdd={vi.fn().mockResolvedValue(undefined)}
      />
    ),
    titulo: 'Sumar Insumo a la Receta',
  },
  {
    nombre: 'Simulador de precio (mobile)',
    ui: <SimulatorSheetHarness />,
    titulo: /Simulador de Precio/,
  },
  {
    nombre: 'Nuevo insumo',
    ui: <IngredientSheetHarness selected={null} />,
    titulo: 'Nuevo Insumo',
  },
  {
    nombre: 'Actualizar costo de insumo',
    ui: <IngredientSheetHarness selected={harina} />,
    titulo: 'Actualizar Costo',
  },
  {
    nombre: 'Eliminar insumo',
    ui: <IngredientSheetHarness selected={harina} showDeleteConfirm />,
    titulo: '¿Eliminar insumo?',
  },
  {
    nombre: 'Nuevo proveedor',
    ui: <SupplierFormDialog open supplier={null} onClose={vi.fn()} onSaved={vi.fn()} />,
    titulo: 'Nuevo proveedor',
  },
  {
    nombre: 'Editar proveedor',
    ui: <SupplierFormDialog open supplier={molino} onClose={vi.fn()} onSaved={vi.fn()} />,
    titulo: 'Editar proveedor',
  },
  {
    nombre: 'Dar de baja un proveedor',
    ui: (
      <SupplierDeleteDialog open supplier={molino} onClose={vi.fn()} onDeleted={vi.fn()} onDeactivated={vi.fn()} />
    ),
    titulo: '¿Dar de baja a Molino Olavarriense?',
  },
]

describe('Diálogos de MargenX: título, descripción y botones con nombre accesible', () => {
  it.each(casos)('$nombre', async ({ ui, titulo }) => {
    render(ui)
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveAccessibleName(titulo)
    expect(dialog).toHaveAccessibleDescription(/\S/)

    // Un botón solo con ícono (por ejemplo, la X de cerrar) necesita aria-label para el lector de pantalla
    for (const button of within(dialog).getAllByRole('button')) {
      expect(button).toHaveAccessibleName(/\S/)
    }
  })
})
