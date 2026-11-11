import '@testing-library/jest-dom'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RecipeQuantityField } from './RecipeQuantityField'

// Línea de receta de panadería: 10 gr de levadura (el insumo se compra por kg)
function renderLevadura(initial = 10) {
  const onChange = vi.fn()
  function Harness() {
    // Igual que el store de receta: la cantidad vigente vuelve al campo como prop
    const [qty, setQty] = useState(initial)
    return (
      <RecipeQuantityField
        ingredientName="Levadura fresca"
        value={qty}
        recipeUnit="gr"
        baseUnit="kg"
        onChange={(inputQty, baseQty) => {
          onChange(inputQty, baseQty)
          setQty(inputQty)
        }}
      />
    )
  }
  render(<Harness />)
  return { onChange }
}

// Al salir del campo se vuelve a montar con la cantidad vigente: siempre se busca de nuevo
const campo = () => screen.getByLabelText('Cantidad de Levadura fresca')

async function escribir(value: string) {
  const user = userEvent.setup()
  await user.clear(campo())
  if (value) await user.type(campo(), value)
  await user.tab()
}

describe('RecipeQuantityField', () => {
  it('guarda una cantidad válida sin avisos', async () => {
    const { onChange } = renderLevadura()

    await escribir('25')

    expect(onChange).toHaveBeenLastCalledWith(25, 0.025)
    expect(campo()).toHaveValue('25')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('avisa el redondeo y, al salir, muestra la cantidad que se guarda (0,5 gr → 1 gr)', async () => {
    const { onChange } = renderLevadura()

    await escribir('0,5')

    expect(onChange).toHaveBeenLastCalledWith(1, 0.001)
    expect(campo()).toHaveValue('1')
    expect(screen.getByRole('status')).toHaveTextContent('Se guarda como 1 gr (0,001 kg): hasta 3 decimales en kg.')
    expect(campo()).toHaveAttribute('aria-describedby', screen.getByRole('status').id)
  })

  it('avisa que no llega al mínimo, no la guarda y restaura la cantidad vigente (0,3 gr)', async () => {
    const { onChange } = renderLevadura()

    await escribir('0,3')

    expect(onChange).not.toHaveBeenCalled()
    expect(campo()).toHaveValue('10')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Es menor al mínimo que se puede guardar (0,001 kg). Se mantiene 10 gr.'
    )
  })

  it('con el campo vacío restaura la cantidad vigente al salir y lo avisa', async () => {
    const { onChange } = renderLevadura()

    await escribir('')

    expect(onChange).not.toHaveBeenCalled()
    expect(campo()).toHaveValue('10')
    expect(screen.getByRole('status')).toHaveTextContent('La cantidad debe ser mayor a cero. Se mantiene 10 gr.')
  })

  it('borra el aviso cuando se corrige la cantidad', async () => {
    renderLevadura()

    await escribir('0,3')
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement()

    await escribir('12')
    expect(campo()).toHaveValue('12')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(campo()).not.toHaveAttribute('aria-describedby')
  })

  it('muestra 3 decimales en la unidad del insumo (1,125 kg no se ve como 1,13)', () => {
    render(
      <RecipeQuantityField ingredientName="Harina 000" value={1.125} recipeUnit="kg" baseUnit="kg" onChange={vi.fn()} />
    )
    expect(screen.getByLabelText('Cantidad de Harina 000')).toHaveValue('1,125')
  })
})
