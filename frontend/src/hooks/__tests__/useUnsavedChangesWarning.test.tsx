import '@testing-library/jest-dom'
import { act, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithDataRouter } from '@/test-utils/renderWithDataRouter'
import { useUnsavedChangesWarning } from '../useUnsavedChangesWarning'

function Harness({ isDirty }: { isDirty: boolean }) {
  const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(isDirty)
  return (
    <div>
      <h1>Ficha de Medialunas de manteca</h1>
      {showDialog && (
        <div role="dialog" aria-label="¿Descartar cambios?">
          <button type="button" onClick={cancelNavigation}>Seguir editando</button>
          <button type="button" onClick={confirmNavigation}>Descartar</button>
        </div>
      )}
    </div>
  )
}

function SavingHarness() {
  const [isDirty, setIsDirty] = useState(true)
  return (
    <>
      <Harness isDirty={isDirty} />
      <button type="button" onClick={() => setIsDirty(false)}>Guardar cambios</button>
    </>
  )
}

const beforeUnloadPrevented = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('useUnsavedChangesWarning (#364)', () => {
  it('sin cambios no intercepta la salida ni el cierre de la pestaña', async () => {
    const { router } = renderWithDataRouter(<Harness isDirty={false} />, '/productos/prod-1')

    expect(beforeUnloadPrevented()).toBe(false)

    await act(async () => {
      await router.navigate('/productos')
    })
    expect(screen.getByRole('heading', { name: 'Otra pantalla' })).toBeInTheDocument()
  })

  it('con cambios, cerrar o recargar la pestaña pide confirmación al navegador', () => {
    renderWithDataRouter(<Harness isDirty />, '/productos/prod-1')

    expect(beforeUnloadPrevented()).toBe(true)
  })

  it('con cambios, navegar dentro de la app queda en espera y "Seguir editando" la cancela', async () => {
    const { router } = renderWithDataRouter(<Harness isDirty />, '/productos/prod-1')

    await act(async () => {
      await router.navigate('/productos')
    })

    expect(screen.getByRole('dialog', { name: '¿Descartar cambios?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/productos/prod-1')

    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/productos/prod-1')
  })

  it('con cambios, "Descartar" completa la navegación pendiente', async () => {
    const { router } = renderWithDataRouter(<Harness isDirty />, '/productos/prod-1')

    await act(async () => {
      await router.navigate('/productos')
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    })

    expect(router.state.location.pathname).toBe('/productos')
    expect(screen.getByRole('heading', { name: 'Otra pantalla' })).toBeInTheDocument()
  })

  it('al guardar (deja de haber cambios) retira el aviso del navegador y deja salir', async () => {
    const { router } = renderWithDataRouter(<SavingHarness />, '/productos/prod-1')
    expect(beforeUnloadPrevented()).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(beforeUnloadPrevented()).toBe(false)
    await act(async () => {
      await router.navigate('/productos')
    })
    expect(screen.getByRole('heading', { name: 'Otra pantalla' })).toBeInTheDocument()
  })
})
