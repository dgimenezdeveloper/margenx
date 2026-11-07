import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import type { SupplierSummary } from '@/services/supplierService'
import { SuppliersList, SuppliersListSkeleton } from './SuppliersList'

const molino: SupplierSummary = {
  id: 'sup-1',
  accountId: 'acc-1',
  name: 'Molino Olavarriense',
  contactPhone: '+54 9 2284 41-5566',
  email: 'ventas@molinoolavarriense.com.ar',
  address: null,
  isActive: true,
  ingredientCount: 4,
  quarantineCount: 2,
}

const quimica: SupplierSummary = {
  id: 'sup-2',
  accountId: 'acc-1',
  name: 'Distribuidora Química del Sur',
  contactPhone: null,
  email: null,
  address: null,
  isActive: false,
  ingredientCount: 1,
  quarantineCount: 0,
}

const renderList = (props: Partial<React.ComponentProps<typeof SuppliersList>> = {}) =>
  render(
    <MemoryRouter>
      <SuppliersList suppliers={[molino, quimica]} onEdit={vi.fn()} onDelete={vi.fn()} {...props} />
    </MemoryRouter>
  )

const rowOf = (name: string) => screen.getByRole('listitem', { name })

describe('SuppliersList', () => {
  it('Escenario Gherkin: muestra ambos proveedores con su cantidad de insumos y la cantidad en cuarentena', () => {
    renderList()

    const molinoRow = rowOf('Molino Olavarriense')
    expect(within(molinoRow).getByText('4 insumos')).toBeInTheDocument()
    expect(within(molinoRow).getByText('2 en cuarentena')).toBeInTheDocument()

    const quimicaRow = rowOf('Distribuidora Química del Sur')
    expect(within(quimicaRow).getByText('1 insumo')).toBeInTheDocument()
    expect(within(quimicaRow).getByText('Sin precios retenidos')).toBeInTheDocument()
  })

  it('el indicador de cuarentena explica qué significa y lleva a la bandeja', () => {
    renderList()

    const badge = within(rowOf('Molino Olavarriense')).getByRole('link', { name: /2 en cuarentena/i })
    expect(badge).toHaveAttribute('href', '/proveedores/cuarentena')
    expect(badge).toHaveAccessibleDescription(
      'Precios de este proveedor retenidos porque cambiaron demasiado. Esperan que los apruebes o rechaces en Cuarentena.'
    )
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent(/esperan que los apruebes o rechaces/i)
  })

  it('muestra el estado con texto, no solo con color', () => {
    renderList()

    expect(within(rowOf('Molino Olavarriense')).getByText('Activo')).toBeInTheDocument()
    expect(within(rowOf('Distribuidora Química del Sur')).getByText('Inactivo')).toBeInTheDocument()
  })

  it('muestra el contacto principal y secundario, o avisa que no hay', () => {
    renderList()

    const molinoRow = rowOf('Molino Olavarriense')
    expect(within(molinoRow).getByText('+54 9 2284 41-5566')).toBeInTheDocument()
    expect(within(molinoRow).getByText('ventas@molinoolavarriense.com.ar')).toBeInTheDocument()
    expect(within(rowOf('Distribuidora Química del Sur')).getByText('Sin datos de contacto')).toBeInTheDocument()
  })

  it('las acciones nombran al proveedor y devuelven el proveedor correcto', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderList({ onEdit, onDelete })

    fireEvent.click(screen.getByRole('button', { name: 'Editar Molino Olavarriense' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja Distribuidora Química del Sur' }))

    expect(onEdit).toHaveBeenCalledWith(molino)
    expect(onDelete).toHaveBeenCalledWith(quimica)
  })

  it('el esqueleto de carga se anuncia al lector de pantalla', () => {
    render(<SuppliersListSkeleton />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando proveedores...')
  })
})
