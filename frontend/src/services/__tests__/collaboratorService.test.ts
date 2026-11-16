import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchApi } from '@/services/api'
import { collaboratorService } from '@/services/collaboratorService'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return { ...actual, fetchApi: vi.fn() }
})

const getToken = vi.fn().mockResolvedValue('token')

describe('collaboratorService: contrato de /api/auth (docs/api.md §3)', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset()
  })

  it('invite manda solo el correo, sin cuenta ni rol', async () => {
    const invitation = { id: 'inv_cajera', email: 'cajera.quimica@seed.example.test', createdAt: '2026-11-16T12:00:00.000Z' }
    vi.mocked(fetchApi).mockResolvedValueOnce({ invitation })

    await expect(collaboratorService.invite(getToken, 'cajera.quimica@seed.example.test')).resolves.toEqual(invitation)
    expect(fetchApi).toHaveBeenCalledWith('/auth/invitations', getToken, {
      method: 'POST',
      body: JSON.stringify({ email: 'cajera.quimica@seed.example.test' }),
    })
  })

  it('listInvitations devuelve las invitaciones pendientes', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ invitations: [] })

    await expect(collaboratorService.listInvitations(getToken)).resolves.toEqual([])
    expect(fetchApi).toHaveBeenCalledWith('/auth/invitations', getToken)
  })

  it('revokeInvitation codifica el id en la ruta', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ message: 'ok' })

    await collaboratorService.revokeInvitation(getToken, 'inv/raro')
    expect(fetchApi).toHaveBeenCalledWith('/auth/invitations/inv%2Fraro', getToken, { method: 'DELETE' })
  })

  it('listUsers devuelve los usuarios de la cuenta', async () => {
    const users = [{ id: 'u1', email: 'admin.quimica@seed.example.test', role: 'ADMIN', createdAt: '2026-08-30T10:00:00.000Z' }]
    vi.mocked(fetchApi).mockResolvedValueOnce({ users })

    await expect(collaboratorService.listUsers(getToken)).resolves.toEqual(users)
    expect(fetchApi).toHaveBeenCalledWith('/auth/users', getToken)
  })

  it('removeUser llama al DELETE del usuario', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ message: 'ok' })

    await collaboratorService.removeUser(getToken, 'u-repositor')
    expect(fetchApi).toHaveBeenCalledWith('/auth/users/u-repositor', getToken, { method: 'DELETE' })
  })
})
