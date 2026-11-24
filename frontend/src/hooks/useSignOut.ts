import { useAuth } from '@clerk/clerk-react'
import { clearSessionCaches } from '@/lib/serviceWorkerCache'

/**
 * Cierra la sesión después de que la persona lo confirma (LogoutDialog): borra las marcas de sesión del
 * navegador y las cachés del service worker, y recién después llama a Clerk, que redirige a la landing.
 */
export function useSignOut(): () => void {
  const { signOut } = useAuth()

  return () => {
    sessionStorage.removeItem('margenx_active_session')
    document.cookie = 'margenx_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    localStorage.removeItem('margenx_last_active')
    // Primero se limpian las cachés del service worker: signOut redirige y la página se descarga.
    void clearSessionCaches().then(() => signOut({ redirectUrl: '/' }))
  }
}
