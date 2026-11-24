import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { BottomNav } from '@/components/bottom-nav'

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

/**
 * Las barras fijas de la ficha del producto y de /productos/nuevo se apoyan sobre la BottomNav con
 * ABOVE_BOTTOM_NAV_CLASS (lib/mobile-layout.ts), que supone que la barra mide 3.125rem más su relleno
 * inferior: borde de 1 px + pt-2.5 (10 px) + ícono size-5 (20 px) + gap-1 (4 px) + etiqueta de 10 px (15 px).
 * Si cambia alguno de estos tamaños, entre la barra del producto y la BottomNav queda un hueco (#406, #417).
 */
describe('BottomNav: alto que supone ABOVE_BOTTOM_NAV_CLASS', () => {
  const renderNav = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav />
      </MemoryRouter>
    )

  it('mantiene el relleno superior y el relleno inferior con la zona segura', () => {
    renderNav()
    const nav = screen.getByRole('navigation')

    expect(nav).toHaveClass('pt-2.5')
    expect(nav).toHaveClass('pb-[max(.75rem,env(safe-area-inset-bottom))]')
  })

  it('cada pestaña mantiene el ícono de 20 px, la separación de 4 px y la etiqueta de 10 px', () => {
    renderNav()
    // Las pestañas y "Más" (#437) miden lo mismo.
    const pestañas = [...screen.getAllByRole('link'), screen.getByRole('button', { name: 'Más' })]
    expect(pestañas.length).toBeGreaterThan(1)

    for (const pestaña of pestañas) {
      expect(pestaña).toHaveClass('gap-1', 'text-[10px]')
      expect(pestaña.className).not.toMatch(/text-\[9/)
      expect(pestaña.querySelector('svg')).toHaveClass('size-5')
      expect(pestaña.querySelector('svg')?.getAttribute('class') ?? '').not.toMatch(/size-4/)
    }
  })
})
