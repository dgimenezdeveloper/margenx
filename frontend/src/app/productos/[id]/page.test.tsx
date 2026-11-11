import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { productService, type Product } from '@/services/productService'
import { ingredientService } from '@/services/ingredientService'
import ProductDetailPage from './page'

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isCollaborator: false, isLoading: false }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN' },
    isLoading: false,
  }),
}))

vi.mock('@/services/productService', () => ({
  productService: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: {
    getAll: vi.fn(),
  },
}))

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Pan flauta',
  salePrice: 1500,
  minMarginPercent: 30,
  cost: 500,
  marginAmount: 1000,
  marginPercent: 66.67,
  ingredients: [
    {
      ingredientId: 'ing-1',
      quantity: 1,
      ingredient: { id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: 500 },
    },
  ],
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/productos/:id',
        element: <ProductDetailPage />,
      },
    ],
    {
      initialEntries: ['/productos/prod-1'],
    }
  )
  return render(<RouterProvider router={router} />)
}

describe('ProductDetailPage - Guardado diferido y manejo de errores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productService.getById).mockResolvedValue(mockProduct)
    vi.mocked(ingredientService.getAll).mockResolvedValue([])
  })

  it('Escenario Gherkin 4: Si falla el guardado (400), la línea editada no se pierde y se muestra el error', async () => {
    const user = userEvent.setup()
    vi.mocked(productService.update).mockRejectedValue(
      new ApiError('La cantidad excede el límite permitido.', 400)
    )

    renderPage()

    // 1. Esperar a que cargue la ficha del producto
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()
    expect(screen.getByText('Harina')).toBeInTheDocument()

    // 2. Modificamos activamente la cantidad en la línea de receta antes de guardar
    const qtyInput = screen.getByLabelText('Cantidad de Harina')
    await user.clear(qtyInput)
    await user.type(qtyInput, '0,5')
    await user.tab()

    // 3. Ejecutar el guardado diferido mediante el botón principal
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i })
    await user.click(saveButton)

    // 4. Confirmar que la API recibió la mutación con el valor editado
    await waitFor(() => {
      expect(productService.update).toHaveBeenCalledTimes(1)
    })
    expect(vi.mocked(productService.update).mock.calls[0]?.[1]).toMatchObject({
      ingredients: [{ ingredientId: 'ing-1', quantity: 0.5 }],
    })

    // 5. Verificar que el mensaje de error se presenta sin romper la interfaz
    expect(await screen.findByText('La cantidad excede el límite permitido.')).toBeInTheDocument()

    // 6. Certificar que el campo conserva el borrador editado (0,5) y no se reseteó al valor original
    expect(screen.getByLabelText('Cantidad de Harina')).toHaveValue('0,5')
  })

  it('Escenario Gherkin: las líneas guardadas con cantidades menores a 1 kg se presentan en gramos', async () => {
    // Simulamos un producto que viene guardado con 0.25 kg de Harina
    vi.mocked(productService.getById).mockResolvedValueOnce({
      ...mockProduct,
      ingredients: [
        {
          ingredientId: 'ing-1',
          quantity: 0.25,
          ingredient: { id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: 500 },
        },
      ],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    // Debe presentarse como 250 gr automáticamente para mayor legibilidad
    expect(screen.getByLabelText('Cantidad de Harina')).toHaveValue('250')
    expect(screen.getByText('gr')).toBeInTheDocument()
  })
})