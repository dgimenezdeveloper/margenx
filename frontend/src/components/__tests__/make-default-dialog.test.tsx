import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MakeDefaultDialog } from '@/components/make-default-dialog'

describe('MakeDefaultDialog: confirmar la presentación predeterminada (#434)', () => {
  const props = {
    ingredientName: 'Harina de trigo 000 Olavarriense',
    supplierName: 'Distribuidora Mayorista Molinera',
    currentSupplierName: 'Distribuidora MarJuanC Alimentos',
    unitCost: 712.5,
    unit: 'kg',
    isSaving: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('explica qué cambia: el proveedor nuevo, el que reemplaza y el costo por unidad que pasa a usar', () => {
    render(<MakeDefaultDialog open {...props} />)

    const dialog = screen.getByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })
    expect(dialog).toHaveTextContent('Distribuidora Mayorista Molinera')
    expect(dialog).toHaveTextContent('Harina de trigo 000 Olavarriense')
    expect(dialog).toHaveTextContent('reemplaza a Distribuidora MarJuanC Alimentos')
    expect(dialog).toHaveTextContent('$712,50 por kg')
    expect(dialog).toHaveTextContent('se recalculan las recetas que lo usan')
  })

  it('sin predeterminada anterior, no menciona un reemplazo', () => {
    render(<MakeDefaultDialog open {...props} currentSupplierName={null} />)
    expect(screen.getByRole('dialog')).not.toHaveTextContent('reemplaza a')
  })

  it('confirma o cancela; mientras guarda, no deja confirmar dos veces', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(<MakeDefaultDialog open {...props} onConfirm={onConfirm} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    rerender(<MakeDefaultDialog open {...props} isSaving onConfirm={onConfirm} onCancel={onCancel} />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /Guardando|Confirmar/ })).toBeDisabled()
  })
})
