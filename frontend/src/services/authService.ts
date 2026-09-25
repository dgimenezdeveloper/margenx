import { fetchApi, type TokenGetter } from './api'

export interface AuthUser {
  id: string
  accountId: string
  email: string
  role: 'ADMIN' | 'COLLABORATOR'
  account?: {
    id: string
    businessName: string
  }
}

export const authService = {
  async getMe(getToken: TokenGetter): Promise<AuthUser> {
    const response = await fetchApi<{ user: AuthUser }>('/auth/me', getToken)
    return response.user
  },
}