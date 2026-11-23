import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import type { z } from 'zod'

import { ProductFinancialCockpit } from '@/app/productos/[id]/components/ProductFinancialCockpit'
import { ProductMobileSimulatorSheet } from '@/app/productos/[id]/components/ProductMobileSimulatorSheet'
import type { productSchema } from '@/schemas/productSchema'

type ProductInput = z.input<typeof productSchema>

/** Simulador de un producto sin receta (borrador), con el formulario real de react-hook-form. */
function SimuladorSinReceta({ variante }: { variante: 'escritorio' | 'celular' }) {
  const { register, setValue, formState } = useForm<ProductInput>({
    defaultValues: { name: 'Medialunas de manteca — docena (12 unidades)', salePrice: '0', minMarginPercent: '30' },
  })
  const props = {
    cost: 0,
    margin: 0,
    targetMargin: 30,
    hasRecipe: false,
    watchedSalePrice: 0,
    isSaving: false,
    activeStrategy: 'target' as const,
    flashingKey: null,
    register,
    setValue,
    errors: formState.errors,
    onAdjustPriceFactor: vi.fn(),
    onApplySuggestedMargin: vi.fn(),
    onSave: vi.fn(),
    setActiveStrategy: vi.fn(),
    gain: 0,
  }
  return variante === 'escritorio' ? (
    <ProductFinancialCockpit {...props} />
  ) : (
    <ProductMobileSimulatorSheet {...props} isOpen onClose={vi.fn()} />
  )
}

describe('Escenario "Formato es-AR" del simulador (#431)', () => {
  it.each(['escritorio', 'celular'] as const)(
    'en %s, un producto sin receta muestra la ganancia con centavos, el margen y los ajustes con el formato es-AR',
    (variante) => {
      render(<SimuladorSinReceta variante={variante} />)

      expect(screen.getByText('Ganancia: $0,00')).toBeInTheDocument()
      expect(screen.getByText(/0,0\s%/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^\+5\s%$/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^\+10\s%$/ })).toBeInTheDocument()
      expect(screen.queryByText('Ganancia: $0')).toBeNull()
    }
  )
})
