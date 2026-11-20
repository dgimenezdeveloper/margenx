import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { ApiError } from '@/services/api'
import { supplierService, type SupplierSummary } from '@/services/supplierService'
import { renderWithDataRouter } from '@/test-utils/renderWithDataRouter'
import { SupplierFormDialog } from './SupplierFormDialog'

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

const molino: SupplierSummary = {
  id: 'sup-1',
  accountId: 'acc-1',
  name: 'Molino Olavarriense',
  contactPhone: '+54 9 2284 41-5566',
  email: 'ventas@molinoolavarriense.com.ar',
  address: 'Av. Pringles 1450, Olavarría',
  isActive: true,
  ingredientCount: 4,
  quarantineCount: 0,
}

const renderDialog = (props: Partial<React.ComponentProps<typeof SupplierFormDialog>> = {}) => {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const { router } = renderWithDataRouter(
    <SupplierFormDialog open supplier={null} onClose={onClose} onSaved={onSaved} {...props} />,
    '/proveedores'
  )
  return { onClose, onSaved, router }
}

describe('SupplierFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Escenario Gherkin: el alta con nombre y contacto crea el proveedor y lo devuelve a la lista', async () => {
    const user = userEvent.setup()
    const created = { ...molino, id: 'sup-9', name: 'Lácteos La Serenísima Mayorista', address: null, email: null }
    vi.mocked(supplierService.create).mockResolvedValue(created)
    const { onSaved } = renderDialog()

    expect(screen.getByRole('dialog', { name: 'Nuevo proveedor' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nombre'), '  Lácteos La Serenísima Mayorista ')
    await user.type(screen.getByLabelText(/Teléfono/), '(0221) 455-1020')
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created, 'create'))
    expect(supplierService.create).toHaveBeenCalledWith(expect.any(Function), {
      name: 'Lácteos La Serenísima Mayorista',
      contactPhone: '(0221) 455-1020',
      email: null,
      address: null,
      isActive: true,
    })
  })

  it('el campo Nombre recibe el foco al abrir', async () => {
    renderDialog()

    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveFocus())
  })

  it('valida mientras se escribe y no envía con errores', async () => {
    const user = userEvent.setup()
    renderDialog()

    const name = screen.getByLabelText('Nombre')
    await user.click(name)
    await user.tab()
    expect(await screen.findByText('Escribí el nombre del proveedor.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')

    await user.type(name, 'Molino Sur')
    await waitFor(() => expect(screen.queryByText('Escribí el nombre del proveedor.')).toBeNull())

    await user.type(screen.getByLabelText(/Email/), 'ventas@molino')
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }))

    expect(await screen.findByText('Revisá el email: tiene que ser como ventas@proveedor.com.ar.')).toBeInTheDocument()
    expect(supplierService.create).not.toHaveBeenCalled()
  })

  it('muestra el nombre repetido (409) en el propio campo', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.create).mockRejectedValue(new ApiError('Ya existe un proveedor con ese nombre.', 409))
    const { onSaved } = renderDialog()

    await user.type(screen.getByLabelText('Nombre'), 'Molino Olavarriense')
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }))

    expect(await screen.findByText('Ya existe un proveedor con ese nombre.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('ante un fallo de red muestra el error dentro del diálogo, en español', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.create).mockRejectedValue(new TypeError('Failed to fetch'))
    renderDialog()

    await user.type(screen.getByLabelText('Nombre'), 'Molino Olavarriense')
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el proveedor. Revisá tu conexión y volvé a intentar.'
    )
    expect(screen.queryByText(/failed to fetch/i)).toBeNull()
  })

  it('mientras guarda deshabilita el botón y lo anuncia', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.create).mockReturnValue(new Promise(() => {}))
    renderDialog()

    await user.type(screen.getByLabelText('Nombre'), 'Molino Olavarriense')
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }))

    const saving = await screen.findByRole('button', { name: 'Guardando...' })
    expect(saving).toBeDisabled()
  })

  it('la edición precarga los datos, permite desactivar y borrar un campo', async () => {
    const user = userEvent.setup()
    const updated = { ...molino, isActive: false, address: null }
    vi.mocked(supplierService.update).mockResolvedValue(updated)
    const { onSaved } = renderDialog({ supplier: molino })

    expect(screen.getByRole('dialog', { name: 'Editar proveedor' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Molino Olavarriense')
    expect(screen.getByLabelText(/Email/)).toHaveValue('ventas@molinoolavarriense.com.ar')

    const status = screen.getByRole('switch', { name: /Proveedor activo/ })
    expect(status).toHaveAttribute('aria-checked', 'true')
    await user.click(status)
    expect(status).toHaveAttribute('aria-checked', 'false')

    await user.clear(screen.getByLabelText(/Dirección/))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated, 'update'))
    expect(supplierService.update).toHaveBeenCalledWith(expect.any(Function), 'sup-1', {
      name: 'Molino Olavarriense',
      contactPhone: '+54 9 2284 41-5566',
      email: 'ventas@molinoolavarriense.com.ar',
      address: null,
      isActive: false,
    })
  })

  it('el alta no muestra el interruptor de estado: todo proveedor nuevo arranca activo', () => {
    renderDialog()

    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('cerrar sin cambios no pide confirmación; con cambios pide descartarlos', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.type(screen.getByLabelText('Nombre'), 'Molino')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('dialog', { name: '¿Descartar cambios?' })).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('SupplierFormDialog - cambios sin guardar al salir de la pantalla (#364)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('con datos cargados, salir de la pantalla pide confirmación y "Seguir editando" conserva lo escrito', async () => {
    const user = userEvent.setup()
    const { router } = renderDialog()
    await user.type(screen.getByLabelText('Nombre'), 'Distribuidora Química del Sur')

    await act(async () => {
      await router.navigate('/productos')
    })

    expect(await screen.findByRole('dialog', { name: '¿Descartar cambios?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/proveedores')

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Descartar cambios?' })).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/proveedores')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Distribuidora Química del Sur')
  })

  it('"Descartar" deja salir de la pantalla', async () => {
    const user = userEvent.setup()
    const { router } = renderDialog()
    await user.type(screen.getByLabelText('Nombre'), 'Distribuidora Química del Sur')

    await act(async () => {
      await router.navigate('/productos')
    })
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))

    expect(await screen.findByRole('heading', { name: 'Otra pantalla' })).toBeInTheDocument()
  })

  it('con datos cargados, cerrar o recargar la pestaña pide confirmación; sin cambios, no', async () => {
    const user = userEvent.setup()
    renderDialog({ supplier: molino })

    const sinCambios = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(sinCambios)
    expect(sinCambios.defaultPrevented).toBe(false)

    await user.clear(screen.getByLabelText(/Teléfono/))
    await user.type(screen.getByLabelText(/Teléfono/), '+54 9 2284 41-7788')
    const conCambios = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(conCambios)
    expect(conCambios.defaultPrevented).toBe(true)
  })

  it('con el diálogo cerrado no bloquea la salida', async () => {
    const { router } = renderDialog({ open: false })

    await act(async () => {
      await router.navigate('/productos')
    })

    expect(await screen.findByRole('heading', { name: 'Otra pantalla' })).toBeInTheDocument()
  })
})
