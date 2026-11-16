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

const ADMIN = { id: 'u-admin', email: 'gustavo@quimicagyj.com.ar', role: 'ADMIN' as const, createdAt: '2026-08-30T13:00:00.000Z' }
const REPOSITOR = {
  id: 'u-repositor',
  email: 'repositor.quimica@gmail.com',
  role: 'COLLABORATOR' as const,
  createdAt: '2026-10-02T13:00:00.000Z',
}
const INVITACION_CAJERA = { id: 'inv_cajera', email: 'cajera.quimica@gmail.com', createdAt: '2026-11-16T13:00:00.000Z' }

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
    expect(within(pendientes).getByText('cajera.quimica@gmail.com')).toBeInTheDocument()
    expect(within(pendientes).getByText('Enviada el 16/11/2026')).toBeInTheDocument()

    const activos = screen.getByRole('list', { name: 'Colaboradores activos' })
    expect(within(activos).getByText('repositor.quimica@gmail.com')).toBeInTheDocument()
    expect(within(activos).getByText('Desde el 02/10/2026')).toBeInTheDocument()
    expect(screen.queryByText('gustavo@quimicagyj.com.ar')).not.toBeInTheDocument()
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

    expect(await screen.findByText('repositor.quimica@gmail.com')).toBeInTheDocument()
    expect(service.listUsers).toHaveBeenCalledTimes(2)
  })

  it('invita por mail, avisa y recarga la lista', async () => {
    service.invite.mockResolvedValue({ id: 'inv_repartidor', email: 'repartidor.quimica@gmail.com', createdAt: '2026-11-16T14:00:00.000Z' })
    const { user, onNotify } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.type(screen.getByLabelText('Correo del colaborador'), '  repartidor.quimica@gmail.com ')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => expect(service.invite).toHaveBeenCalledWith(expect.any(Function), 'repartidor.quimica@gmail.com'))
    expect(onNotify).toHaveBeenCalledWith('Invitación enviada a repartidor.quimica@gmail.com')
    expect(screen.getByLabelText('Correo del colaborador')).toHaveValue('')
    await waitFor(() => expect(service.listInvitations).toHaveBeenCalledTimes(2))
  })

  it('valida el correo antes de llamar a la API', async () => {
    const { user } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repartidor-quimica')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un correo electrónico válido.')
    expect(screen.getByLabelText('Correo del colaborador')).toHaveAttribute('aria-invalid', 'true')
    expect(service.invite).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de la API si el correo ya existe (409)', async () => {
    service.invite.mockRejectedValue(new ApiError('Ese correo ya tiene un usuario en MargenX.', 409))
    const { user } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repositor.quimica@gmail.com')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese correo ya tiene un usuario en MargenX.')
  })

  it('muestra un mensaje genérico si falla la red al invitar', async () => {
    service.invite.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.type(screen.getByLabelText('Correo del colaborador'), 'repartidor.quimica@gmail.com')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar la invitación. Probá de nuevo.')
  })

  it('revoca una invitación después de confirmar', async () => {
    service.revokeInvitation.mockResolvedValue(undefined)
    const { user, onNotify } = renderSection()
    await screen.findByText('cajera.quimica@gmail.com')

    await user.click(screen.getByRole('button', { name: 'Revocar la invitación de cajera.quimica@gmail.com' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('¿Revocar la invitación?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Revocar' }))

    await waitFor(() => expect(service.revokeInvitation).toHaveBeenCalledWith(expect.any(Function), 'inv_cajera'))
    expect(onNotify).toHaveBeenCalledWith('Invitación revocada')
  })

  it('cancelar la confirmación no da de baja a nadie', async () => {
    const { user } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.click(screen.getByRole('button', { name: 'Dar de baja a repositor.quimica@gmail.com' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(service.removeUser).not.toHaveBeenCalled()
  })

  it('da de baja a un colaborador después de confirmar', async () => {
    service.removeUser.mockResolvedValue(undefined)
    const { user, onNotify } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.click(screen.getByRole('button', { name: 'Dar de baja a repositor.quimica@gmail.com' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/ya no va a poder entrar a MargenX/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

    await waitFor(() => expect(service.removeUser).toHaveBeenCalledWith(expect.any(Function), 'u-repositor'))
    expect(onNotify).toHaveBeenCalledWith('repositor.quimica@gmail.com ya no tiene acceso')
  })

  it('si la baja falla, el error se ve en el diálogo', async () => {
    service.removeUser.mockRejectedValue(
      new ApiError('No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos.', 502)
    )
    const { user } = renderSection()
    await screen.findByText('repositor.quimica@gmail.com')

    await user.click(screen.getByRole('button', { name: 'Dar de baja a repositor.quimica@gmail.com' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos comunicarnos con el servicio de cuentas')
  })
})
