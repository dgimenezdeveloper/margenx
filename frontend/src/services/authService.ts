import { fetchApi, type TokenGetter } from './api'

export interface AuthUser {
  id: string
  accountId: string
  email: string
  role: 'ADMIN' | 'COLLABORATOR'
  account?: {
    id: string
    businessName: string
    defaultMinMarginPercent: number | string // <-- NUEVO CAMPO
    /** Solo llega para el ADMIN: base de la dirección de ingesta (`docs/api.md`, GET /api/auth/me). */
    slug?: string
  }
}

export const authService = {
  async getMe(getToken: TokenGetter): Promise<AuthUser> {
    const response = await fetchApi<{ user: AuthUser }>('/auth/me', getToken)
    return response.user
  },

  // <-- NUEVO MÉTODO PARA GUARDAR EL MARGEN
  async updateGlobalMargin(
    getToken: TokenGetter,
    defaultMinMarginPercent: number
  ): Promise<{ id: string; businessName: string; defaultMinMarginPercent: number }> {
    const response = await fetchApi<{
      account: { id: string; businessName: string; defaultMinMarginPercent: number | string }
    }>('/auth/account/margin', getToken, {
      method: 'PATCH',
      body: JSON.stringify({ defaultMinMarginPercent }),
    })

    return {
      ...response.account,
      defaultMinMarginPercent: Number(response.account.defaultMinMarginPercent),
    }
  },
}