import '@testing-library/jest-dom'
import { act, render, screen, waitFor } from '@testing-library/react'
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
      { path: '/productos', element: <h1>Catálogo de productos</h1> },
    ],
    {
      initialEntries: ['/productos/prod-1'],
    }
  )
  render(<RouterProvider router={router} />)
  return router
}

const harinaGuardada = (quantity: number): Product => ({
  ...mockProduct,
  ingredients: [
    {
      ingredientId: 'ing-1',
      quantity,
      ingredient: { id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: 500 },
    },
  ],
})

// Al salir del campo se vuelve a montar con la cantidad vigente: siempre se busca de nuevo
const campoHarina = () => screen.getByLabelText('Cantidad de Harina')

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

    const router = renderPage()

    // 1. Esperar a que cargue la ficha del producto
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()
    expect(screen.getByText('Harina')).toBeInTheDocument()

    // 2. Modificamos activamente la cantidad en la línea de receta antes de guardar
    const qtyInput = screen.getByLabelText('Cantidad de Harina')
    await user.clear(qtyInput)
    await user.type(qtyInput, '0,5')
    await user.tab()

    // 3. Ejecutar el guardado diferido mediante el botón principal
    const saveButton = screen.getByRole('button', { name: /Guardar cambios/i })
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

    // 7. El borrador sigue marcado como no guardado: salir de la pantalla pide confirmación
    await act(async () => {
      await router.navigate('/productos')
    })
    expect(await screen.findByText('¿Descartar cambios?')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catálogo de productos' })).not.toBeInTheDocument()
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

  it('edición en la lista: una cantidad menor al mínimo se avisa, no se guarda y se restaura la vigente', async () => {
    const user = userEvent.setup()
    vi.mocked(productService.getById).mockResolvedValueOnce(harinaGuardada(0.25))
    vi.mocked(productService.update).mockResolvedValue(harinaGuardada(0.25))

    renderPage()
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    // 0,4 gr = 0,0004 kg: redondea a 0 kg, que la API rechaza con 400
    await user.clear(campoHarina())
    await user.type(campoHarina(), '0,4')
    await user.tab()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Es menor al mínimo que se puede guardar (0,001 kg). Se mantiene 250 gr.'
    )
    expect(campoHarina()).toHaveValue('250')

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => expect(productService.update).toHaveBeenCalledTimes(1))
    expect(vi.mocked(productService.update).mock.calls[0]?.[1]).toMatchObject({
      ingredients: [{ ingredientId: 'ing-1', quantity: 0.25 }],
    })
  })

  it('edición en la lista: una cantidad que se redondea se avisa y se guarda lo mismo que se muestra', async () => {
    const user = userEvent.setup()
    vi.mocked(productService.getById).mockResolvedValueOnce(harinaGuardada(0.25))
    vi.mocked(productService.update).mockResolvedValue(harinaGuardada(0.001))

    renderPage()
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    // 0,5 gr = 0,0005 kg: la base guarda 3 decimales, queda 0,001 kg = 1 gr
    await user.clear(campoHarina())
    await user.type(campoHarina(), '0,5')
    await user.tab()

    expect(screen.getByRole('status')).toHaveTextContent('Se guarda como 1 gr (0,001 kg): hasta 3 decimales en kg.')
    expect(campoHarina()).toHaveValue('1')

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => expect(productService.update).toHaveBeenCalledTimes(1))
    expect(vi.mocked(productService.update).mock.calls[0]?.[1]).toMatchObject({
      ingredients: [{ ingredientId: 'ing-1', quantity: 0.001 }],
    })
    expect(await screen.findByText('Producto guardado exitosamente')).toBeInTheDocument()
    expect(campoHarina()).toHaveValue('1')
  })
})

describe('ProductDetailPage - lugar para las barras de abajo en mobile (#406)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productService.getById).mockResolvedValue(mockProduct)
    vi.mocked(ingredientService.getAll).mockResolvedValue([])
  })

  it('el final de la ficha deja lugar a la barra del producto, la BottomNav y la zona segura de iOS', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    // Barra del producto (132 px) + BottomNav (50 px + max(12 px, zona segura)) entran en 13rem + zona segura
    expect(screen.getByRole('main')).toHaveClass('pb-[calc(13rem+env(safe-area-inset-bottom))]')
  })
})

describe('ProductDetailPage - avisos y cambios sin guardar (#364)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productService.getById).mockResolvedValue(mockProduct)
    vi.mocked(ingredientService.getAll).mockResolvedValue([])
  })

  const cambiarPrecio = async (user: ReturnType<typeof userEvent.setup>) => {
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()
    // Hay un campo de precio en el panel de escritorio y otro en la hoja del simulador mobile.
    const precio = screen.getAllByLabelText('Precio de venta al público ($)')[0]
    await user.clear(precio)
    await user.type(precio, '1800')
  }

  it('Escenario Gherkin "Cambios sin guardar": con el precio modificado, salir pide confirmación y "Seguir editando" se queda', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await cambiarPrecio(user)

    await act(async () => {
      await router.navigate('/productos')
    })

    expect(await screen.findByText('¿Descartar cambios?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/productos/prod-1')

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    await waitFor(() => expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/productos/prod-1')
    // El borrador sigue en el campo (NumericInput lo muestra con separador de miles es-AR).
    expect((screen.getAllByLabelText('Precio de venta al público ($)')[0] as HTMLInputElement).value).toMatch(/^1\.?800$/)
  })

  it('Escenario Gherkin "Cambios sin guardar": "Descartar" deja salir de la ficha', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await cambiarPrecio(user)

    await act(async () => {
      await router.navigate('/productos')
    })
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))

    expect(await screen.findByRole('heading', { name: 'Catálogo de productos' })).toBeInTheDocument()
  })

  it('Escenario Gherkin "Cambios sin guardar": cerrar o recargar la pestaña pide confirmación al navegador', async () => {
    const user = userEvent.setup()
    renderPage()
    await cambiarPrecio(user)

    const evento = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(evento)

    expect(evento.defaultPrevented).toBe(true)
  })

  it('sin cambios, salir de la ficha no pide confirmación', async () => {
    const router = renderPage()
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    const evento = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)

    await act(async () => {
      await router.navigate('/productos')
    })
    expect(await screen.findByRole('heading', { name: 'Catálogo de productos' })).toBeInTheDocument()
    expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument()
  })

  it('el error al guardar se anuncia como alerta y se puede cerrar con la X', async () => {
    const user = userEvent.setup()
    vi.mocked(productService.update).mockRejectedValue(new ApiError('Error al actualizar el producto.', 500))
    renderPage()
    await cambiarPrecio(user)

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Error al actualizar el producto.')

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
    await waitFor(() => expect(screen.queryByText('Error al actualizar el producto.')).not.toBeInTheDocument())
  })

  it('Escenario "Aviso al crear" (#432): al eliminar, vuelve a la lista con el aviso para que se vea allá', async () => {
    vi.mocked(productService.getById).mockResolvedValue(mockProduct)
    vi.mocked(productService.delete).mockResolvedValue(undefined)
    const user = userEvent.setup()
    const router = renderPage()

    await user.click(await screen.findByRole('button', { name: /Eliminar producto/ }))
    await user.click(await screen.findByRole('button', { name: 'Sí, eliminar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/productos'))
    expect(router.state.location.state).toEqual({
      productNotice: { title: 'Producto eliminado correctamente.', type: 'success' },
    })
  })
})


describe('ProductDetailPage - ancho de escritorio igual al de las demás pantallas (#497)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productService.getById).mockResolvedValue(mockProduct)
    vi.mocked(ingredientService.getAll).mockResolvedValue([])
  })

  it('265: el relleno lateral va dentro del contenedor, como en Panel o Productos, así la barra de arriba no se corre al entrar a la ficha', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Pan flauta' })).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(main).not.toHaveClass('md:px-8')
    expect(main).not.toHaveClass('lg:px-12')
    expect(main.firstElementChild).toHaveClass('px-4', 'md:max-w-5xl', 'md:px-8', 'lg:max-w-6xl', 'lg:px-12')
  })
})
