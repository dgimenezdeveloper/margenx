import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

/**
 * Monta una pantalla dentro de un router de datos en memoria, como `createBrowserRouter` en la app.
 * Lo necesitan las pantallas con `useUnsavedChangesWarning`: `useBlocker` no funciona con `MemoryRouter`.
 * Cualquier otra ruta muestra el encabezado "Otra pantalla", para comprobar si la navegación salió.
 */
export function renderWithDataRouter(ui: ReactElement, path = '/') {
  const router = createMemoryRouter(
    [
      { path, element: ui },
      { path: '*', element: <h1>Otra pantalla</h1> },
    ],
    { initialEntries: [path] }
  )
  return { router, ...render(<RouterProvider router={router} />) }
}
