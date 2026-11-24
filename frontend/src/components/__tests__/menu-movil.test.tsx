import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { BottomNav } from '@/components/bottom-nav'
import { useTheme } from '@/hooks/useTheme'

const session = vi.hoisted(() => ({ role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR', sales: true }))
const signOut = vi.hoisted(() => vi.fn())

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn(), signOut }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: session.role, email: 'admin.panaderia@seed.example.test', features: { sales: session.sales } },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

/** El menú inferior existe solo debajo de 768 px: las pruebas simulan un celular salvo que digan lo contrario. */
function simularAncho(celular: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({ matches: celular && query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList
  )
}

function Ruta() {
  return <span data-testid="ruta">{useLocation().pathname}</span>
}

function renderMenu(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<><input aria-label="Buscar productos por nombre" /><BottomNav /><Ruta /></>} />
      </Routes>
    </MemoryRouter>
  )
}

const menuInferior = () => screen.getByRole('navigation', { name: 'Menú inferior' })
const panel = () => screen.queryByRole('dialog', { name: 'Menú' })

/** Arrastre con un dedo: de `desde` a `hasta`, pasando por los puntos intermedios. */
function arrastrar(desde: [number, number], puntos: [number, number][], destino: Element = document.body) {
  const toque = ([x, y]: [number, number]) => new Touch({ identifier: 1, target: destino, clientX: x, clientY: y })
  const inicio = toque(desde)
  destino.dispatchEvent(new TouchEvent('touchstart', { touches: [inicio], changedTouches: [inicio], bubbles: true, cancelable: true }))
  const movimientos: TouchEvent[] = []
  for (const punto of puntos) {
    const t = toque(punto)
    const evento = new TouchEvent('touchmove', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true })
    movimientos.push(evento)
    destino.dispatchEvent(evento)
  }
  const fin = toque(puntos.at(-1) ?? desde)
  destino.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [fin], bubbles: true, cancelable: true }))
  return movimientos
}

beforeEach(() => {
  session.role = 'ADMIN'
  session.sales = true
  signOut.mockReset()
  simularAncho(true)
  useTheme.getState().setTheme(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Menú inferior a 360 px (#437)', () => {
  it('Escenario "Menú inferior del ADMIN con el módulo de ventas": 4 pestañas fijas y "Más", con los rótulos completos', () => {
    renderMenu()

    const nav = menuInferior()
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Inicio', 'Productos', 'Insumos', 'Ventas'])
    expect(within(nav).getByRole('button', { name: 'Más' })).toHaveAttribute('aria-haspopup', 'dialog')
    // Proveedores, Impacto en el margen y Perfil quedan en el panel.
    expect(within(nav).queryByRole('link', { name: 'Proveedores' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: 'Impacto en el margen' })).toBeNull()
  })

  it('sin el módulo de ventas, la cuarta pestaña es Proveedores', () => {
    session.sales = false
    renderMenu()

    expect(within(menuInferior()).getAllByRole('link').map((link) => link.textContent)).toEqual(['Inicio', 'Productos', 'Insumos', 'Proveedores'])
    expect(within(menuInferior()).getByRole('button', { name: 'Más' })).toBeInTheDocument()
  })

  it('el colaborador ve sus 4 pestañas y no necesita "Más"', () => {
    session.role = 'COLLABORATOR'
    renderMenu('/productos')

    expect(within(menuInferior()).getAllByRole('link').map((link) => link.textContent)).toEqual(['Inicio', 'Productos', 'Ventas', 'Perfil'])
    expect(within(menuInferior()).queryByRole('button', { name: 'Más' })).toBeNull()
  })

  it('"Más" queda marcado cuando la pantalla actual está en el panel', () => {
    const { unmount } = renderMenu('/compras')
    expect(screen.getByTestId('bottom-nav-mas')).toHaveClass('text-indigo-600', 'dark:text-indigo-400')
    unmount()

    renderMenu('/productos')
    expect(screen.getByTestId('bottom-nav-mas')).not.toHaveClass('text-indigo-600')
    expect(screen.getByTestId('bottom-nav-productos')).toHaveAttribute('aria-current', 'page')
  })
})

describe('Panel del menú (#437)', () => {
  it('"Más" abre el panel con todas las pantallas del ADMIN, el modo oscuro y Salir', async () => {
    const user = userEvent.setup()
    renderMenu('/compras')

    await user.click(screen.getByRole('button', { name: 'Más' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Menú' })

    expect(dialogo).toHaveAccessibleDescription(/\S/)
    for (const boton of within(dialogo).getAllByRole('button')) expect(boton).toHaveAccessibleName(/\S/)
    expect(within(dialogo).getByText('Panadería Central')).toBeInTheDocument()
    expect(within(dialogo).getByText('Administrador')).toBeInTheDocument()
    const enlaces = within(dialogo).getAllByRole('link')
    expect(enlaces.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Inicio', '/dashboard'],
      ['Productos', '/productos'],
      ['Insumos', '/insumos'],
      ['Ventas', '/ventas'],
      ['Proveedores', '/proveedores'],
      ['Impacto en el margen', '/compras'],
      ['Perfil', '/perfil'],
    ])
    expect(within(dialogo).getByRole('link', { name: 'Impacto en el margen' })).toHaveAttribute('aria-current', 'page')
    expect(within(dialogo).getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
    expect(within(dialogo).getByRole('switch', { name: 'Modo oscuro' })).toHaveAttribute('aria-checked', 'false')
    expect(within(dialogo).getByRole('button', { name: 'Salir' })).toBeInTheDocument()
    // Con el panel abierto, el resto de la página queda oculto para el lector de pantalla (diálogo modal).
    expect(screen.getByTestId('bottom-nav-mas')).toHaveAttribute('aria-expanded', 'true')
  })

  it('se cierra con Escape y el foco vuelve a "Más"', async () => {
    const user = userEvent.setup()
    renderMenu()

    const mas = screen.getByRole('button', { name: 'Más' })
    await user.click(mas)
    await screen.findByRole('dialog', { name: 'Menú' })
    await user.keyboard('{Escape}')

    await waitFor(() => expect(panel()).toBeNull())
    expect(mas).toHaveFocus()
  })

  it('al elegir una pantalla navega y el panel se cierra', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Más' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Menú' })).getByRole('link', { name: 'Proveedores' }))

    expect(screen.getByTestId('ruta')).toHaveTextContent('/proveedores')
    await waitFor(() => expect(panel()).toBeNull())
  })

  it('el modo oscuro se cambia desde el panel', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Más' }))
    const interruptor = within(await screen.findByRole('dialog', { name: 'Menú' })).getByRole('switch', { name: 'Modo oscuro' })
    await user.click(interruptor)

    expect(interruptor).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('"Salir" cierra el panel y pide confirmar el cierre de sesión', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Más' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Menú' })).getByRole('button', { name: 'Salir' }))

    const confirmacion = await screen.findByRole('dialog', { name: '¿Cerrar sesión?' })
    await waitFor(() => expect(panel()).toBeNull())
    await user.click(within(confirmacion).getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/' }))
  })
})

describe('Arrastre de izquierda a derecha para abrir el panel (#437)', () => {
  it('arrastrar hacia la derecha desde el medio de la pantalla va abriendo el panel y, al soltar lejos, queda abierto', async () => {
    renderMenu()

    act(() => {
      const t0 = new Touch({ identifier: 1, target: document.body, clientX: 150, clientY: 400 })
      document.body.dispatchEvent(new TouchEvent('touchstart', { touches: [t0], changedTouches: [t0], bubbles: true, cancelable: true }))
      const t1 = new Touch({ identifier: 1, target: document.body, clientX: 210, clientY: 404 })
      document.body.dispatchEvent(new TouchEvent('touchmove', { touches: [t1], changedTouches: [t1], bubbles: true, cancelable: true }))
    })
    // Mientras el dedo sigue apoyado, el panel acompaña el arrastre: está corrido hacia la izquierda.
    const dialogo = await screen.findByRole('dialog', { name: 'Menú' })
    expect(dialogo.style.getPropertyValue('--menu-drag-x')).toMatch(/^-\d+(\.\d+)?px$/)

    act(() => {
      const t2 = new Touch({ identifier: 1, target: document.body, clientX: 330, clientY: 410 })
      document.body.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], changedTouches: [t2], bubbles: true, cancelable: true }))
      document.body.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t2], bubbles: true, cancelable: true }))
    })

    expect(screen.getByRole('dialog', { name: 'Menú' })).toBeInTheDocument()
    expect(dialogo.style.getPropertyValue('--menu-drag-x')).toBe('')
  })

  it('si la tarjeta donde se apoyó el dedo se vuelve a dibujar a mitad del arrastre, el panel igual termina de abrirse', async () => {
    renderMenu()
    const tarjeta = document.createElement('div')
    document.body.appendChild(tarjeta)
    const toque = (x: number) => new Touch({ identifier: 1, target: tarjeta, clientX: x, clientY: 400 })

    act(() => {
      tarjeta.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(150)], changedTouches: [toque(150)], bubbles: true, cancelable: true }))
      tarjeta.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(180)], changedTouches: [toque(180)], bubbles: true, cancelable: true }))
      // Llegan los datos y la tarjeta sale del DOM: el navegador le sigue mandando los toques a ella.
      tarjeta.remove()
      tarjeta.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(320)], changedTouches: [toque(320)], bubbles: true, cancelable: true }))
      tarjeta.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [toque(320)], bubbles: true, cancelable: true }))
    })

    const dialogo = await screen.findByRole('dialog', { name: 'Menú' })
    expect(dialogo.style.getPropertyValue('--menu-drag-x')).toBe('')
  })

  it('el arrastre horizontal no deja que la página se desplace mientras se abre', () => {
    renderMenu()
    let movimientos: TouchEvent[] = []
    act(() => {
      movimientos = arrastrar([150, 400], [[200, 402], [260, 404]])
    })
    expect(movimientos.at(-1)?.defaultPrevented).toBe(true)
  })

  it('un arrastre corto y lento vuelve a cerrarlo', async () => {
    renderMenu()
    act(() => {
      arrastrar([150, 400], [[175, 401], [190, 402]])
    })
    await waitFor(() => expect(panel()).toBeNull())
  })

  it('un desplazamiento vertical no abre el panel ni frena el scroll', async () => {
    renderMenu()
    let movimientos: TouchEvent[] = []
    act(() => {
      movimientos = arrastrar([150, 400], [[156, 470], [160, 560]])
    })
    expect(movimientos.some((evento) => evento.defaultPrevented)).toBe(false)
    expect(panel()).toBeNull()
  })

  it('no se activa si el arrastre empieza en un campo de texto', () => {
    renderMenu()
    act(() => {
      arrastrar([150, 400], [[220, 402], [300, 404]], screen.getByRole('textbox', { name: 'Buscar productos por nombre' }))
    })
    expect(panel()).toBeNull()
  })

  it('no se activa si el arrastre empieza en una zona que se desplaza en horizontal', () => {
    renderMenu()
    const carrusel = document.createElement('div')
    carrusel.style.overflowX = 'auto'
    Object.defineProperty(carrusel, 'scrollWidth', { value: 640 })
    Object.defineProperty(carrusel, 'clientWidth', { value: 320 })
    const tarjeta = document.createElement('span')
    carrusel.appendChild(tarjeta)
    document.body.appendChild(carrusel)

    act(() => {
      arrastrar([150, 400], [[220, 402], [300, 404]], tarjeta)
    })
    expect(panel()).toBeNull()
    carrusel.remove()
  })

  it('en escritorio (desde 768 px) no hace nada: ahí está la barra de arriba', () => {
    simularAncho(false)
    renderMenu()
    act(() => {
      arrastrar([150, 400], [[220, 402], [300, 404]])
    })
    expect(panel()).toBeNull()
  })

  it('el colaborador también puede abrirlo arrastrando y ve solo sus pantallas', async () => {
    session.role = 'COLLABORATOR'
    renderMenu('/productos')
    act(() => {
      arrastrar([150, 400], [[220, 402], [330, 404]])
    })

    const dialogo = await screen.findByRole('dialog', { name: 'Menú' })
    expect(within(dialogo).getAllByRole('link').map((link) => link.textContent)).toEqual(['Inicio', 'Productos', 'Ventas', 'Perfil'])
    expect(within(dialogo).getByText('Colaborador')).toBeInTheDocument()
  })
})
