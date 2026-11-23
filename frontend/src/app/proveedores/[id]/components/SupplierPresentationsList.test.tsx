import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SupplierPresentation } from '@/services/supplierService'
import { SupplierPresentationsList } from './SupplierPresentationsList'

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

/** Nombre largo como los del catálogo de la cuenta Demo del recorrido del 10/11 ("Cacao…"). */
const CACAO = 'Cacao amargo en polvo alcalinizado para repostería Bahía Blanca'

const presentaciones: SupplierPresentation[] = [
  {
    id: 'si-cacao',
    supplierCode: 'CAC220',
    rawDescription: 'CACAO AMARGO ALCALINO EN POLVO BOLSA X 25 KG MARCA BAHIA',
    packageSize: 25,
    packageUnit: 'kg',
    packagePrice: 412500,
    isDefault: false,
    ingredient: { id: 'ing-cacao', name: CACAO, unit: 'kg' },
  },
  {
    id: 'si-harina',
    supplierCode: 'HAR188',
    rawDescription: 'HARINA SARITA 000 X 25 KG',
    packageSize: 25,
    packageUnit: 'kg',
    packagePrice: 18406.25,
    isDefault: true,
    ingredient: { id: 'ing-harina', name: 'Harina de trigo 000', unit: 'kg' },
  },
]

function renderLista() {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onMakeDefault: vi.fn() }
  render(<SupplierPresentationsList presentations={presentaciones} {...handlers} />)
  return handlers
}

const filaDe = (nombre: string) =>
  screen.getAllByRole('listitem').find((li) => within(li).queryByText(nombre)) as HTMLElement

describe('SupplierPresentationsList - retoques visuales (#362)', () => {
  it('Escenario Gherkin: Nombres completos -> un insumo de nombre largo se lee completo y tiene tooltip', () => {
    renderLista()
    const nombre = screen.getByText(CACAO)
    const clases = nombre.className.split(/\s+/)
    expect(clases).not.toContain('truncate')
    expect(clases).toContain('break-words')
    expect(nombre).toHaveAttribute('title', CACAO)
  })

  it('la etiqueta En cuarentena baja de renglón en lugar de recortar el nombre', () => {
    renderLista()
    const nombre = screen.getByText('Harina de trigo 000')
    expect(nombre.parentElement?.className.split(/\s+/)).toContain('flex-wrap')
  })

  it('la descripción de la lista del proveedor también tiene tooltip con el texto completo', () => {
    renderLista()
    const descripcion = screen.getByText('CACAO AMARGO ALCALINO EN POLVO BOLSA X 25 KG MARCA BAHIA')
    expect(descripcion).toHaveAttribute('title', 'CACAO AMARGO ALCALINO EN POLVO BOLSA X 25 KG MARCA BAHIA')
  })

  it('la estrella vacía "Usar como predeterminada" responde al pasar el mouse en claro y en oscuro, muestra el foco y llama a la acción', async () => {
    const user = userEvent.setup()
    const { onMakeDefault } = renderLista()
    const boton = within(filaDe(CACAO)).getByRole('button', { name: `Usar como predeterminada la presentación de ${CACAO}` })
    expect(boton).toHaveAttribute('title', 'Usar como predeterminada')
    expect(boton.className.split(/\s+/)).toEqual(
      expect.arrayContaining([
        'hover:border-indigo-300',
        'hover:bg-indigo-50',
        'hover:text-indigo-700',
        'dark:hover:bg-indigo-950/40',
        'focus-visible:outline-2',
      ])
    )
    await user.click(boton)
    expect(onMakeDefault).toHaveBeenCalledWith(presentaciones[0])
  })

  it('la presentación que ya es predeterminada tiene la estrella llena y no ofrece el botón', () => {
    renderLista()
    const fila = filaDe('Harina de trigo 000')
    expect(within(fila).getByRole('img', { name: 'Presentación predeterminada' })).toHaveAttribute('title', 'Presentación predeterminada')
    expect(within(fila).queryByRole('button', { name: /Usar como predeterminada/ })).toBeNull()
  })
})

describe('SupplierPresentationsList - Escenario "Tabla legible" (#434)', () => {
  it('cada dato va en su columna, con los nombres unificados y la columna Acciones', () => {
    renderLista()
    const encabezado = screen.getByTestId('supplier-presentations-header')
    expect([...encabezado.children].map((c) => c.textContent)).toEqual([
      'Insumo',
      'Presentación',
      'Precio del bulto',
      'Costo por unidad',
      'Código',
      'Acciones',
    ])

    const celdas = [...filaDe(CACAO).children].map((c) => c.textContent ?? '')
    expect(celdas).toHaveLength(6)
    expect(celdas[1]).toContain('25 kg')
    expect(celdas[2]).toContain('$412.500,00')
    expect(celdas[3]).toContain('$16.500,00')
    expect(celdas[4]).toContain('CAC220')
  })

  it('una presentación sin código lo dice en su columna', () => {
    render(
      <SupplierPresentationsList
        presentations={[{ ...presentaciones[0]!, supplierCode: null, rawDescription: null }]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMakeDefault={vi.fn()}
      />
    )
    expect([...filaDe(CACAO).children][4]).toHaveTextContent('Sin código')
  })
})
