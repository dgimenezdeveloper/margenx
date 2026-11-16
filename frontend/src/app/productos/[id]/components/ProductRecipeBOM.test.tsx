import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RecipeItem } from '@/stores/useRecipeStore'
import { ProductRecipeBOM } from './ProductRecipeBOM'

// Manteca a $7.000,51 el kg: con el redondeo anterior se leía "$7.001" (#359, [RV377-I1]).
const MANTECA: RecipeItem = {
  ingredientId: 'ing-manteca',
  name: 'Manteca La Serenísima',
  unit: 'kg',
  unitCost: 7000.51,
  quantity: 0.25,
  recipeUnit: 'gr',
  inputQty: 250,
}

const renderBOM = (isCollaborator: boolean) =>
  render(
    <ProductRecipeBOM
      isCollaborator={isCollaborator}
      items={[MANTECA]}
      salePrice={4500}
      onAddIngredient={vi.fn()}
      onRemoveIngredient={vi.fn()}
    />
  )

describe('ProductRecipeBOM - importes con centavos (#359)', () => {
  it('muestra el costo base y el subtotal con centavos, sin redondear a pesos', () => {
    renderBOM(false)

    expect(screen.getByText('Costo base: $7.000,51 por kg')).toBeInTheDocument()
    // 0,25 kg × $7.000,51 = $1.750,1275 → $1.750,13
    expect(screen.getByText('$1.750,13')).toBeInTheDocument()
  })

  it('al colaborador no le muestra el costo base', () => {
    renderBOM(true)

    expect(screen.queryByText(/Costo base/)).not.toBeInTheDocument()
  })
})
