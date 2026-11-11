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

  it('Escenario Gherkin 4: Si falla el guardado (400), la línea no se pierde y se muestra el error', async () => {
    const user = userEvent.setup()
    vi.mocked(productService.update).mockRejectedValue(
      new ApiError('La cantidad excede el límite permitido.', 400)
    )

    renderPage()

    // Esperar a que cargue la página
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    // Verificar que el ingrediente está en la receta
    expect(screen.getByText('Harina')).toBeInTheDocument()

    // Intentar guardar (el botón en desktop dice "Guardar Cambios")
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i })
    await user.click(saveButton)

    // Verificar que se llamó a la API
    await waitFor(() => {
      expect(productService.update).toHaveBeenCalledTimes(1)
    })

    // Verificar que el error se muestra en un toast o en la UI
    expect(await screen.findByText('La cantidad excede el límite permitido.')).toBeInTheDocument()

    // Verificar que la línea SIGUE en la receta (no se borró por el error)
    expect(screen.getByText('Harina')).toBeInTheDocument()
  })
})