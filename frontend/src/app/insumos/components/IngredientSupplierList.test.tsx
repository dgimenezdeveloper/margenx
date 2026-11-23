import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import type { Ingredient } from '@/services/ingredientService'
import type { SupplierIngredient } from '@/services/supplierService'
import { IngredientSupplierList } from './IngredientSupplierList'

const money = (value: number) => `$${value.toFixed(2)}`

const molino: SupplierIngredient = {
  id: 'si-molino',
  supplierId: 'sup-molino',
  ingredientId: 'ing-harina',
  packageSize: 25,
  packageUnit: 'kg',
  packagePrice: 18406.25,
  isDefault: true,
  isQuarantined: false,
  supplier: { id: 'sup-molino', name: 'Molino Olavarriense' },
}

const marjuanc: SupplierIngredient = {
  id: 'si-marjuanc',
  supplierId: 'sup-marjuanc',
  ingredientId: 'ing-harina',
  packageSize: 25,
  packageUnit: 'kg',
  packagePrice: 18000,
  isDefault: false,
  isQuarantined: true,
  supplier: { id: 'sup-marjuanc', name: 'Distribuidora MarJuanC Alimentos' },
}

const harina = (connections: SupplierIngredient[]): Ingredient =>
  ({
    id: 'ing-harina',
    name: 'Harina de trigo 000 Olavarriense',
    unit: 'kg',
    currentCost: 736.25,
    supplierConnections: connections,
  }) as Ingredient

const renderList = (selected: Ingredient, isCollaborator = false) =>
  render(
    <MemoryRouter>
      <IngredientSupplierList
        selected={selected}
        isCollaborator={isCollaborator}
        onOpenPackaging={vi.fn()}
        onEditConnection={vi.fn()}
        onMakeDefault={vi.fn()}
        money={money}
      />
    </MemoryRouter>
  )

describe('IngredientSupplierList: indicador de cuarentena', () => {
  it('marca con texto la presentación que tiene un precio retenido y lleva a la bandeja', () => {
    renderList(harina([molino, marjuanc]))

    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent('1 precio de este insumo está retenido en cuarentena')
    expect(within(notice).getByRole('link', { name: 'Revisar en Cuarentena' })).toHaveAttribute(
      'href',
      '/proveedores/cuarentena'
    )

    const retained = screen.getByText('Distribuidora MarJuanC Alimentos').closest('li')
    expect(retained).not.toBeNull()
    expect(within(retained as HTMLElement).getByText('En cuarentena')).toBeInTheDocument()

    const regular = screen.getByText('Molino Olavarriense').closest('li')
    expect(within(regular as HTMLElement).queryByText('En cuarentena')).not.toBeInTheDocument()
  })

  it('usa el plural cuando hay más de un precio retenido', () => {
    renderList(harina([{ ...molino, isQuarantined: true }, marjuanc]))

    expect(screen.getByRole('note')).toHaveTextContent('2 precios de este insumo están retenidos en cuarentena')
    expect(screen.getAllByText('En cuarentena')).toHaveLength(2)
  })

  it('sin precios retenidos no muestra el indicador', () => {
    renderList(harina([molino]))

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(screen.queryByText('En cuarentena')).not.toBeInTheDocument()
  })

  it('el colaborador no ve proveedores ni el indicador', () => {
    renderList(harina([molino, marjuanc]), true)

    expect(screen.queryByText('Proveedores y presentaciones')).not.toBeInTheDocument()
    expect(screen.queryByText('En cuarentena')).not.toBeInTheDocument()
  })
})

describe('IngredientSupplierList: presentaciones con nombres unificados y estrella (#434)', () => {
  const directo = { ...marjuanc, isQuarantined: false }

  it('la predeterminada tiene la estrella llena; las demás, la estrella vacía que llama a la acción', async () => {
    const onMakeDefault = vi.fn()
    render(
      <MemoryRouter>
        <IngredientSupplierList
          selected={harina([molino, directo])}
          isCollaborator={false}
          onOpenPackaging={vi.fn()}
          onEditConnection={vi.fn()}
          onMakeDefault={onMakeDefault}
          money={money}
        />
      </MemoryRouter>
    )

    const filaMolino = screen.getByText('Molino Olavarriense').closest('li') as HTMLElement
    expect(within(filaMolino).getByRole('img', { name: 'Presentación predeterminada' })).toBeInTheDocument()
    const estrella = screen.getByRole('button', { name: 'Usar como predeterminada la presentación de Distribuidora MarJuanC Alimentos' })
    expect(estrella).toHaveAttribute('title', 'Usar como predeterminada')
    estrella.click()
    expect(onMakeDefault).toHaveBeenCalledWith(directo)
  })

  it('usa "presentación" y "precio del bulto" en lugar de "empaque"', () => {
    renderList(harina([molino]))
    expect(screen.getByText('Proveedores y presentaciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Asociar otra presentación/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar presentación de Molino Olavarriense' })).toBeInTheDocument()
    const fila = screen.getByText('Molino Olavarriense').closest('li') as HTMLElement
    expect(fila).toHaveTextContent('Precio del bulto')
    expect(fila).toHaveTextContent('Costo por unidad')
    expect(document.body).not.toHaveTextContent(/empaque/i)
  })
})

