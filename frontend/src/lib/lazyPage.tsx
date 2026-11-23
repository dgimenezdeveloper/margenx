import { lazy, Suspense, type ComponentType } from 'react'
import { LoaderCircle } from 'lucide-react'

/**
 * Carga una pantalla bajo demanda, con su propio aviso de carga (#398).
 *
 * Con todas las pantallas en el bundle principal, el login y la landing bajaban 1,2 MB de JavaScript
 * que no usaban (Lighthouse: "Reduce unused JavaScript"). Cada pantalla con sesión queda en su chunk
 * y se baja al abrirla; el router no cambia, así que las rutas mantienen sus guardas.
 */
export function lazyPage(loader: () => Promise<{ default: ComponentType }>): ComponentType {
  const Page = lazy(loader)
  function LazyPage() {
    return (
      <Suspense
        fallback={
          <div role="status" aria-label="Cargando la pantalla" className="flex min-h-[60vh] items-center justify-center">
            <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
        }
      >
        <Page />
      </Suspense>
    )
  }
  return LazyPage
}
