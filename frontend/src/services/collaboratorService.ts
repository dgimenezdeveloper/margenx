import { fetchApi, type TokenGetter } from './api'

/** Invitación pendiente (`docs/api.md` §3, `/api/auth/invitations`). */
export interface PendingInvitation {
  id: string
  email: string
  createdAt: string
  /** Enlace para aceptar la invitación, para mandarlo por otro canal si el mail no llega. */
  url: string | null
}

/** Respuesta de `POST /api/auth/invitations`: `emailSent` es false si el mail de MargenX no salió. */
export interface InvitationResult {
  invitation: PendingInvitation
  emailSent: boolean
}

/** Usuario activo de la cuenta (`docs/api.md` §3, `GET /api/auth/users`). */
export interface AccountMember {
  id: string
  email: string
  role: 'ADMIN' | 'COLLABORATOR'
  createdAt: string
}

/** Equipo de la cuenta: solo ADMIN. La cuenta y el rol los fija el servidor, nunca el cliente. */
export const collaboratorService = {
  async invite(getToken: TokenGetter, email: string): Promise<InvitationResult> {
    return fetchApi<InvitationResult>('/auth/invitations', getToken, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async listInvitations(getToken: TokenGetter): Promise<PendingInvitation[]> {
    const response = await fetchApi<{ invitations: PendingInvitation[] }>('/auth/invitations', getToken)
    return response.invitations
  },

  async revokeInvitation(getToken: TokenGetter, invitationId: string): Promise<void> {
    await fetchApi(`/auth/invitations/${encodeURIComponent(invitationId)}`, getToken, { method: 'DELETE' })
  },

  async listUsers(getToken: TokenGetter): Promise<AccountMember[]> {
    const response = await fetchApi<{ users: AccountMember[] }>('/auth/users', getToken)
    return response.users
  },

  async removeUser(getToken: TokenGetter, userId: string): Promise<void> {
    await fetchApi(`/auth/users/${encodeURIComponent(userId)}`, getToken, { method: 'DELETE' })
  },
}
