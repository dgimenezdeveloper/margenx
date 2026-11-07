import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'

import type { TokenGetter } from '@/services/api'

/**
 * `getToken` de Clerk con referencia estable. Sirve como dependencia de un efecto que
 * pide datos sin volver a dispararlo si `useAuth` entrega otra función en un render.
 */
export function useTokenGetter(): TokenGetter {
  const { getToken } = useAuth()
  const latest = useRef(getToken)

  useEffect(() => {
    latest.current = getToken
  }, [getToken])

  return useCallback(() => latest.current(), [])
}
