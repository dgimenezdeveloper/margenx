import '@testing-library/jest-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CollaboratorsSection } from '@/components/collaborators-section'
import { ApiError } from '@/services/api'
import { collaboratorService } from '@/services/collaboratorService'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token') }),
}))

vi.mock('@/services/collaboratorService', () => ({
  collaboratorService: {
    invite: vi.fn(),
    listInvitations: vi.fn(),
    revokeInvitation: vi.fn(),
    listUsers: vi.fn(),
    removeUser: vi.fn(),
  },
}))

const service = vi.mocked(collaboratorService)

const ADMIN = { id: 'u-admin', email: 'admin.quimica@seed.example.test', role: 'ADMIN' as const, createdAt: '2026-08-30T13:00:00.000Z' }
const REPOSITOR = {
  id: 'u-repositor',
  email: 'colab.quimica@seed.example.test',
  role: 'COLLABORATOR' as const,
  createdAt: '2026-10-02T13:00:00.000Z',
}
const ENLACE_CAJERA = 'https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=inv_cajera'
const INVITACION_CAJERA = {
  id: 'inv_cajera',
  email: 'cajera.quimica@seed.example.test',
  createdAt: '2026-11-16T13:00:00.000Z',
  url: ENLACE_CAJERA,
}

function renderSection() {
  const onNotify = vi.fn()
  render(<CollaboratorsSection onNotify={onNotify} />)
  return { onNotify, user: userEvent.setup() }
}

describe('CollaboratorsSection (Perfil, solo ADMIN)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.listUsers.mockResolvedValue([ADMIN, REPOSITOR])
    service.listInvitations.mockResolvedValue([INVITACION_CAJERA])
  })

  it('muestra el estado de carga y luego invitaciones pendientes y colaboradores activos (sin el ADMIN)', async () => {
    renderSection()

    expect(screen.getByRole('status', { name: 'Cargando colaboradores' })).toBeInTheDocument()

    const pendientes = await screen.findByRole('list', { name: 'Invitaciones pendientes' })
    expect(within(pendientes).getByText('cajera.quimica@seed.example.test')).toBeInTheDocument()
    expect(within(pendientes).getByText('Creada el 16/11/2026')).toBeInTheDocument()

    const activos = screen.getByRole('list', { name: 'Colaboradores activos' })
    expect(within(activos).getByText('colab.quimica@seed.example.test')).toBeInTheDocument()
    expect(within(activos).getByText('Desde el 02/10/2026')).toBeInTheDocument()
    expect(screen.queryByText('admin.quimica@seed.example.test')).not.toBeInTheDocument()
  })

  it('estado vacío: el botón lleva el foco al campo de correo', async () => {
    service.listUsers.mockResolvedValue([ADMIN])
    service.listInvitations.mockResolvedValue([])
    const { user } = renderSection()

    expect(await screen.findByText('Todavía no sumaste colaboradores')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Invitar a mi primer colaborador' }))

    expect(screen.getByLabelText('Correo del colaborador')).toHaveFocus()
  })

  it('estado de error con reintento', async () => {
    service.listUsers.mockRejectedValueOnce(new ApiError('Error interno del servidor.', 500))
    const { user } = renderSection()

    expect(await screen.findByText('No pudimos cargar tu equipo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('colab.quimica@seed.example.test')).toBeInTheDocument()
    expect(service.listUsers).toHaveBeenCalledTimes(2)
  })

  it('invita por mail, avisa y recarga la lista', async () => {
    service.invite.mockResolvedValue({
      invitation: { id: 'inv_repartidor', email: 'repartidor.quimica@seed.example.test', createdAt: '2026-11-16T14:00:00.000Z', url: null },
      emailSent: true,
    })
    const { user, onNotify } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.type(screen.getByLabelText('Correo del colaborador'), '  repartidor.quimica@seed.example.test ')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => expect(service.invite).toHaveBeenCalledWith(expect.any(Function), 'repartidor.quimica@seed.example.test'))
    expect(onNotify).toHaveBeenCalledWith('Invitación enviada a repartidor.quimica@seed.example.test')
    expect(screen.getByLabelText('Correo del colaborador')).toHaveValue('')
    await waitFor(() => expect(service.listInvitations).toHaveBeenCalledTimes(2))
  })

  it('si el mail no salió, avisa que la invitación quedó y que hay que copiar el enlace', async () => {
    service.invite.mockResolvedValue({
      invitation: { id: 'inv_repartidor', email: 'repartidor.quimica@seed.example.test', createdAt: '2026-11-16T14:00:00.000Z', url: 'https://x.clerk.accounts.dev/v1/tickets/accept?ticket=t' },
      emailSent: false,
    })
    const { user, onNotify } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repartidor.quimica@seed.example.test')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    const aviso = await screen.findByRole('status', { name: 'Aviso de invitación' })
    expect(aviso).toHaveTextContent('Creamos la invitación para repartidor.quimica@seed.example.test, pero no pudimos enviar el mail.')
    expect(aviso).toHaveTextContent('Copiar enlace')
    expect(onNotify).not.toHaveBeenCalled()
  })

  it('copia el enlace de una invitación pendiente al portapapeles', async () => {
    const { user, onNotify } = renderSection()
    await screen.findByText('cajera.quimica@seed.example.test')
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    await user.click(screen.getByRole('button', { name: 'Copiar enlace de la invitación de cajera.quimica@seed.example.test' }))

    expect(writeText).toHaveBeenCalledWith(ENLACE_CAJERA)
    expect(onNotify).toHaveBeenCalledWith('Enlace copiado: mandáselo a cajera.quimica@seed.example.test')
  })

  it('si el navegador no deja copiar, muestra el enlace para copiarlo a mano', async () => {
    const { user, onNotify } = renderSection()
    await screen.findByText('cajera.quimica@seed.example.test')
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'))

    await user.click(screen.getByRole('button', { name: 'Copiar enlace de la invitación de cajera.quimica@seed.example.test' }))

    expect(await screen.findByRole('textbox', { name: 'Enlace de la invitación de cajera.quimica@seed.example.test' })).toHaveValue(ENLACE_CAJERA)
    expect(onNotify).not.toHaveBeenCalled()
  })

  it('sin enlace no ofrece copiarlo', async () => {
    service.listInvitations.mockResolvedValue([{ ...INVITACION_CAJERA, url: null }])
    renderSection()
    await screen.findByText('cajera.quimica@seed.example.test')

    expect(screen.queryByRole('button', { name: /^Copiar enlace/ })).not.toBeInTheDocument()
  })

  it('valida el correo antes de llamar a la API', async () => {
    const { user } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repartidor-quimica')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un correo electrónico válido.')
    expect(screen.getByLabelText('Correo del colaborador')).toHaveAttribute('aria-invalid', 'true')
    expect(service.invite).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de la API si el correo ya existe (409)', async () => {
    service.invite.mockRejectedValue(new ApiError('Ese correo ya tiene un usuario en MargenX.', 409))
    const { user } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'colab.quimica@seed.example.test')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese correo ya tiene un usuario en MargenX.')
  })

  it('muestra un mensaje genérico si falla la red al invitar', async () => {
    service.invite.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repartidor.quimica@seed.example.test')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar la invitación. Probá de nuevo.')
  })

  it('revoca una invitación después de confirmar', async () => {
    service.revokeInvitation.mockResolvedValue(undefined)
    const { user, onNotify } = renderSection()
    await screen.findByText('cajera.quimica@seed.example.test')

    await user.click(screen.getByRole('button', { name: 'Revocar la invitación de cajera.quimica@seed.example.test' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('¿Revocar la invitación?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Revocar' }))

    await waitFor(() => expect(service.revokeInvitation).toHaveBeenCalledWith(expect.any(Function), 'inv_cajera'))
    expect(onNotify).toHaveBeenCalledWith('Invitación revocada')
  })

  it('cancelar la confirmación no da de baja a nadie', async () => {
    const { user } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.click(screen.getByRole('button', { name: 'Dar de baja a colab.quimica@seed.example.test' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(service.removeUser).not.toHaveBeenCalled()
  })

  it('da de baja a un colaborador después de confirmar', async () => {
    service.removeUser.mockResolvedValue(undefined)
    const { user, onNotify } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.click(screen.getByRole('button', { name: 'Dar de baja a colab.quimica@seed.example.test' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/ya no va a poder entrar a MargenX/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

    await waitFor(() => expect(service.removeUser).toHaveBeenCalledWith(expect.any(Function), 'u-repositor'))
    expect(onNotify).toHaveBeenCalledWith('colab.quimica@seed.example.test ya no tiene acceso')
  })

  it('si la baja falla, el error se ve en el diálogo', async () => {
    service.removeUser.mockRejectedValue(
      new ApiError('No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos.', 502)
    )
    const { user } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.click(screen.getByRole('button', { name: 'Dar de baja a colab.quimica@seed.example.test' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos comunicarnos con el servicio de cuentas')
  })
})

describe('CollaboratorsSection: recorrida del 26 y 27/11 (#497)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.listUsers.mockResolvedValue([ADMIN, REPOSITOR])
    service.listInvitations.mockResolvedValue([INVITACION_CAJERA])
  })

  it('255: el nombre accesible de "Copiar enlace" empieza con el texto visible (WCAG 2.5.3)', async () => {
    renderSection()

    const boton = await screen.findByRole('button', { name: /^Copiar enlace/ })
    expect(boton).toHaveTextContent('Copiar enlace')
    expect(boton).toHaveAccessibleName('Copiar enlace de la invitación de cajera.quimica@seed.example.test')
  })

  it('249: los correos no se parten a mitad de palabra: se cortan antes de "@" o de un punto, y nunca con break-all', async () => {
    renderSection()

    const pendientes = await screen.findByRole('list', { name: 'Invitaciones pendientes' })
    const activos = screen.getByRole('list', { name: 'Colaboradores activos' })
    for (const [lista, correo] of [
      [pendientes, 'cajera.quimica@seed.example.test'],
      [activos, 'colab.quimica@seed.example.test'],
    ] as const) {
      const parrafo = within(lista).getByText(correo).closest('p') as HTMLElement
      expect(parrafo, correo).not.toHaveClass('break-all')
      expect(parrafo, correo).toHaveTextContent(correo)
      expect(parrafo.querySelectorAll('wbr').length, correo).toBeGreaterThan(0)
    }
  })

  it('249: el aviso de la invitación sin mail y el diálogo de baja tampoco usan break-all', async () => {
    service.invite.mockResolvedValue({
      invitation: { id: 'inv_repartidor', email: 'repartidor.quimica@seed.example.test', createdAt: '2026-11-16T14:00:00.000Z', url: 'https://x.clerk.accounts.dev/v1/tickets/accept?ticket=t' },
      emailSent: false,
    })
    const { user } = renderSection()
    await screen.findByText('colab.quimica@seed.example.test')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repartidor.quimica@seed.example.test')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))
    const aviso = await screen.findByRole('status', { name: 'Aviso de invitación' })
    expect(aviso.querySelector('.break-all')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Dar de baja a colab.quimica@seed.example.test' }))
    const dialogo = await screen.findByRole('dialog')
    expect(dialogo.querySelector('.break-all')).toBeNull()
  })
})
