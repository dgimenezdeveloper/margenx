import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { UpdatePrompt } from './update-prompt'

// Registra el service worker (solo en el build de producción) y muestra el aviso de versión nueva.
export function PwaUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // La app instalada puede quedar abierta días en segundo plano: al volver a primer plano se busca la versión nueva.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        // Sin conexión la búsqueda falla; se reintenta en la próxima vuelta a primer plano.
        registration.update().catch(() => undefined)
      })
    },
    onRegisterError() {
      // Sin service worker la app funciona igual, solo sin página Sin conexión ni precache.
    },
  })

  const handleUpdate = () => {
    setIsUpdating(true)
    void updateServiceWorker(true)
  }

  return (
    <UpdatePrompt
      needRefresh={needRefresh}
      isUpdating={isUpdating}
      onUpdate={handleUpdate}
      onDismiss={() => setNeedRefresh(false)}
    />
  )
}
