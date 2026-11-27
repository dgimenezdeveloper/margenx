import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom'

import { SuppliersTabs } from './SuppliersTabs'

const renderTabs = (props: Parameters<typeof SuppliersTabs>[0]) =>
  render(
    <MemoryRouter>
      <SuppliersTabs {...props} />
    </MemoryRouter>
  )

describe('SuppliersTabs', () => {
  it('ofrece Proveedores y Cuarentena como enlaces dentro de la sección y marca la activa', () => {
    renderTabs({ active: 'suppliers' })

    const nav = screen.getByRole('navigation', { name: 'Secciones de proveedores' })
    const suppliers = within(nav).getByRole('link', { name: 'Proveedores' })
    const quarantine = within(nav).getByRole('link', { name: /Cuarentena/ })

    expect(suppliers).toHaveAttribute('href', '/proveedores')
    expect(suppliers).toHaveAttribute('aria-current', 'page')
    expect(quarantine).toHaveAttribute('href', '/proveedores/cuarentena')
    expect(quarantine).not.toHaveAttribute('aria-current')
  })

  it('marca Cuarentena como activa en la bandeja', () => {
    renderTabs({ active: 'quarantine' })

    expect(screen.getByRole('link', { name: /Cuarentena/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Proveedores' })).not.toHaveAttribute('aria-current')
  })

  it('muestra cuántos precios esperan decisión con texto, no solo con color', () => {
    renderTabs({ active: 'suppliers', quarantineCount: 3 })

    expect(screen.getByRole('link', { name: 'Cuarentena, 3 precios retenidos' })).toBeInTheDocument()
  })

  it('usa el singular con un solo precio retenido', () => {
    renderTabs({ active: 'suppliers', quarantineCount: 1 })

    expect(screen.getByRole('link', { name: 'Cuarentena, 1 precio retenido' })).toBeInTheDocument()
  })

  it('no muestra contador cuando no hay precios retenidos o todavía no se conoce', () => {
    const { unmount } = renderTabs({ active: 'suppliers', quarantineCount: 0 })
    expect(screen.getByRole('link', { name: 'Cuarentena' })).toBeInTheDocument()
    unmount()

    renderTabs({ active: 'suppliers' })
    expect(screen.getByRole('link', { name: 'Cuarentena' })).toBeInTheDocument()
  })

  it('C6: a 360 px las pestañas reducen padding y gap y admiten encogerse (min-w-0) sin romper el contenedor', () => {
    renderTabs({ active: 'suppliers', quarantineCount: 12 })

    const suppliers = screen.getByRole('link', { name: 'Proveedores' })
    const quarantine = screen.getByRole('link', { name: 'Cuarentena, 12 precios retenidos' })

    for (const tab of [suppliers, quarantine]) {
      expect(tab.className).toContain('min-w-0')
      expect(tab.className).toContain('px-2.5')
      expect(tab.className).toContain('sm:px-4')
    }
    expect(quarantine.querySelector('svg')?.getAttribute('class') ?? '').toContain('shrink-0')
  })
})
