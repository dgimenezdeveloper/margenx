import { Component, lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

import { ErrorState } from '@/components/error-state'
import { reloadPage } from '@/lib/reloadPage'

/** La descarga del chunk de una pantalla falló (red caída, o una versión nueva publicada que ya no lo tiene). */
class PageLoadError extends Error {
  constructor(cause: unknown) {
    super('No se pudo descargar la pantalla', { cause })
    this.name = 'PageLoadError'
  }
}

/**
 * Atrapa solo la falla de descarga: un error de la pantalla ya cargada sigue al manejo de errores del
 * router, así no se presenta un bug como un problema de conexión.
 */
class PageLoadBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (!(error instanceof PageLoadError)) throw error
    return (
      <ErrorState
        className="mx-4 my-8"
        title="No se pudo cargar la pantalla"
        description="Revisá tu conexión y volvé a intentar. Si se publicó una versión nueva de MargenX, al reintentar se carga esa."
        onRetry={reloadPage}
      />
    )
  }
}

/**
 * Carga una pantalla bajo demanda, con su propio aviso de carga y de error (#398).
 *
 * Con todas las pantallas en el bundle principal, el login y la landing bajaban 1,2 MB de JavaScript
 * que no usaban (Lighthouse: "Reduce unused JavaScript"). Cada pantalla con sesión queda en su chunk
 * y se baja al abrirla; el router no cambia, así que las rutas mantienen sus guardas. Si el chunk no
 * baja, Reintentar recarga la app: `lazy` recuerda la falla, y el index.html nuevo trae los chunks vigentes.
 */
export function lazyPage(loader: () => Promise<{ default: ComponentType }>): ComponentType {
  const Page = lazy(() =>
    loader().catch((error: unknown) => {
      throw new PageLoadError(error)
    })
  )
  function LazyPage() {
    return (
      <PageLoadBoundary>
        <Suspense
          fallback={
            <div role="status" aria-label="Cargando la pantalla" className="flex min-h-[60vh] items-center justify-center">
              <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </div>
          }
        >
          <Page />
        </Suspense>
      </PageLoadBoundary>
    )
  }
  return LazyPage
}
