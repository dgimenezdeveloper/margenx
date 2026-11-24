import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { useForm } from 'react-hook-form'

import { BottomNav } from '@/components/bottom-nav'
import { ProductFinancialCockpit } from '@/app/productos/[id]/components/ProductFinancialCockpit'
import { ProductRecipeBOM } from '@/app/productos/[id]/components/ProductRecipeBOM'
import { RecipeQuantityField } from '@/app/productos/[id]/components/RecipeQuantityField'
import { HEALTH_BUCKET_META } from '@/lib/healthBucket'
import type { RecipeItem } from '@/stores/useRecipeStore'
import type { z } from 'zod'
import type { productSchema } from '@/schemas/productSchema'

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

/**
 * Colores de texto del modo claro que Lighthouse marcó sin contraste AA (4,5:1) sobre fondo blanco
 * o gris muy claro, en textos de 10 a 16 px (#398): gray-400 (2,6:1), slate-400 (2,6:1),
 * amber-600 (3,2:1), emerald-600 (3,7:1) y rose-600 (4,4:1).
 */
const SIN_CONTRASTE_AA = ['text-gray-400', 'text-slate-400', 'text-amber-600', 'text-emerald-600', 'text-rose-600']

/** Clases de color de texto del modo claro (sin `dark:` ni `hover:`) de los elementos con texto propio. */
function coloresDeTexto(container: HTMLElement): string[] {
  const conTexto = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
  )
  const clases = new Set<string>()
  for (const el of conTexto) {
    // El color se hereda: se mira el elemento y sus ancestros dentro del contenedor.
    for (let nodo: HTMLElement | null = el; nodo && nodo !== container; nodo = nodo.parentElement) {
      for (const c of nodo.className.toString().split(/\s+/)) {
        if (c.startsWith('text-') && !c.includes(':')) clases.add(c)
      }
    }
  }
  return [...clases]
}

const MANTECA: RecipeItem = {
  ingredientId: 'ing-manteca',
  name: 'Manteca La Serenísima',
  unit: 'kg',
  unitCost: 7000.51,
  quantity: 0.25,
  recipeUnit: 'gr',
  inputQty: 250,
}

describe('Contraste AA en el modo claro (#398, Lighthouse a 360 px)', () => {
  it('las pestañas inactivas del menú inferior no usan grises claros', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav />
      </MemoryRouter>
    )
    expect(coloresDeTexto(container).filter((c) => SIN_CONTRASTE_AA.includes(c))).toEqual([])
  })

  it('la receta de la ficha del producto: contador, costo base y aviso de línea cara', () => {
    const { container } = render(
      <ProductRecipeBOM
        isCollaborator={false}
        items={[{ ...MANTECA, quantity: 1 }]}
        salePrice={4500}
        onAddIngredient={vi.fn()}
        onRemoveIngredient={vi.fn()}
      />
    )
    expect(container).toHaveTextContent('El costo de esta línea supera el precio de venta')
    expect(coloresDeTexto(container).filter((c) => SIN_CONTRASTE_AA.includes(c))).toEqual([])
  })

  it('la unidad junto a la cantidad de la receta tiene contraste sobre el gris del campo', () => {
    const { container } = render(
      <RecipeQuantityField ingredientName="Manteca La Serenísima" recipeUnit="gr" baseUnit="kg" value={250} onChange={vi.fn()} />
    )
    const unidad = Array.from(container.querySelectorAll('span')).find((s) => s.textContent === 'gr')
    expect(unidad).toBeDefined()
    // gray-500 sobre gray-100 da 4,39:1; gray-600 pasa el AA.
    expect(unidad).not.toHaveClass('text-gray-500')
  })

  it('el número de productos "En riesgo" del panel no usa rose-600', () => {
    expect(HEALTH_BUCKET_META.risk.textClassName.split(' ')).not.toContain('text-rose-600')
  })
})

type ProductInput = z.input<typeof productSchema>

/** El simulador de escritorio de la ficha, con un formulario real. */
function Simulador({ hasRecipe }: { hasRecipe: boolean }) {
  const { register, setValue, formState } = useForm<ProductInput>()
  return (
    <ProductFinancialCockpit
      gain={hasRecipe ? 1650 : 0}
      cost={hasRecipe ? 2850 : 0}
      margin={hasRecipe ? 36.67 : 0}
      targetMargin={35}
      hasRecipe={hasRecipe}
      watchedSalePrice={4500}
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

describe('Contraste AA que marcó axe en claro y oscuro (#442)', () => {
  it('la pestaña activa del menú inferior tiene contraste en el modo oscuro', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav />
      </MemoryRouter>
    )
    // indigo-600 sobre el gray-900 del menú da 2,74:1; indigo-400 pasa el AA.
    expect(getByTestId('bottom-nav-dashboard')).toHaveClass('text-indigo-600', 'dark:text-indigo-400')
  })

  it('el título del simulador de la ficha y la ganancia sin receta no usan gray-400 sobre blanco', () => {
    const { getByText, unmount } = render(<Simulador hasRecipe />)
    expect(getByText('Simulador Financiero')).not.toHaveClass('text-gray-400')
    expect(getByText('Simulador Financiero')).toHaveClass('text-gray-500', 'dark:text-gray-400')
    unmount()

    const sinReceta = render(<Simulador hasRecipe={false} />)
    expect(sinReceta.getByText(/^Ganancia:/)).not.toHaveClass('text-gray-400')
    expect(sinReceta.getByText(/^Ganancia:/)).toHaveClass('text-gray-500', 'dark:text-gray-400')
  })
})
