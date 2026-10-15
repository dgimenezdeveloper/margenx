import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IngredientUpsertSheet } from './IngredientUpsertSheet'

describe('IngredientUpsertSheet', () => {
  it('requests deletion instead of closing the confirmation panel when the trash button is pressed', async () => {
    const onRequestDelete = vi.fn()
    const onCancelDelete = vi.fn()

    render(
      <IngredientUpsertSheet
        selected={{ id: '1', name: 'Harina', unit: 'kg', currentCost: 120 }}
        newOpen={false}
        showDeleteConfirm={false}
        isCollaborator={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        onRequestClose={vi.fn()}
        onDeleteConfirm={vi.fn()}
        onCancelDelete={onCancelDelete}
        onRequestDelete={onRequestDelete}
        onOpenHistory={vi.fn()}
        onOpenPackaging={vi.fn()}
        onEditConnection={vi.fn()}
        onMakeDefault={vi.fn()}
        register={vi.fn() as never}
        setValue={vi.fn() as never}
        errors={{}}
        selectedUnit="kg"
        money={(value) => `$${value}`}
        onNumericKeyDown={vi.fn()}
        onDecimalChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText('Eliminar insumo'))

    expect(onRequestDelete).toHaveBeenCalledTimes(1)
    expect(onCancelDelete).not.toHaveBeenCalled()
  })
})
