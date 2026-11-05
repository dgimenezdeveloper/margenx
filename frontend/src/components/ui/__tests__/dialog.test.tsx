import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog'

/**
 * Diálogo controlado, igual que lo usan las pantallas de MargenX:
 * un botón común cambia el estado y el diálogo avisa el cierre por onOpenChange.
 */
function DeleteIngredientExample() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button">Ver historial</button>
      <button type="button" onClick={() => setOpen(true)}>
        Eliminar Harina 000
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogBackdrop data-testid="dialog-backdrop" />
          <DialogPopup>
            <DialogTitle>¿Eliminar insumo?</DialogTitle>
            <DialogDescription>Estás a punto de eliminar Harina 000 de la despensa.</DialogDescription>
            <DialogClose>Cancelar</DialogClose>
            <button type="button" onClick={() => setOpen(false)}>
              Sí, eliminar
            </button>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}

function SupportExample() {
  return (
    <Dialog>
      <DialogTrigger>Soporte</DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Soporte y Documentación</DialogTitle>
          <DialogDescription>Canales de contacto con el equipo de MargenX.</DialogDescription>
          <DialogClose aria-label="Cerrar">X</DialogClose>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}

/**
 * Dos diálogos hermanos apilados, como en Insumos: la ficha queda abierta
 * y encima se abre el historial de precios.
 */
function StackedExample() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setSheetOpen(true)}>
        Editar Harina 000
      </button>
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Actualizar Costo</DialogTitle>
            <DialogDescription>Costo unitario de Harina 000.</DialogDescription>
            <button type="button" onClick={() => setHistoryOpen(true)}>
              Ver historial de precios
            </button>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Historial de Costos</DialogTitle>
            <DialogDescription>Variaciones del costo de Harina 000.</DialogDescription>
            <DialogClose>Cerrar historial</DialogClose>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}

async function openDeleteDialog() {
  const user = userEvent.setup()
  render(<DeleteIngredientExample />)
  const trigger = screen.getByRole('button', { name: 'Eliminar Harina 000' })
  await user.click(trigger)
  const dialog = await screen.findByRole('dialog')
  return { user, trigger, dialog }
}

describe('Dialog', () => {
  it('mueve el foco dentro del diálogo al abrirse', async () => {
    const { dialog } = await openDeleteDialog()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
  })

  it('mantiene el foco dentro del diálogo al presionar Tab y Shift+Tab repetidamente', async () => {
    const { user, dialog } = await openDeleteDialog()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true })
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    expect(screen.getByRole('button', { name: 'Ver historial', hidden: true })).not.toHaveFocus()
  })

  it('se cierra con Escape', async () => {
    const { user } = await openDeleteDialog()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('devuelve el foco al botón que lo abrió al cerrarse con Escape', async () => {
    const { user, trigger } = await openDeleteDialog()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('devuelve el foco al botón que lo abrió al cerrarse desde una acción del diálogo', async () => {
    const { user, trigger } = await openDeleteDialog()
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('expone el título como nombre accesible y la descripción como descripción accesible', async () => {
    const { dialog } = await openDeleteDialog()
    expect(dialog).toHaveAccessibleName('¿Eliminar insumo?')
    expect(dialog).toHaveAccessibleDescription('Estás a punto de eliminar Harina 000 de la despensa.')
  })

  it('con DialogTrigger se abre, se cierra con DialogClose y devuelve el foco al disparador', async () => {
    const user = userEvent.setup()
    render(<SupportExample />)
    const trigger = screen.getByRole('button', { name: 'Soporte' })

    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Soporte y Documentación' })
    expect(dialog).toHaveAccessibleDescription('Canales de contacto con el equipo de MargenX.')

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('oculta el resto de la página al lector de pantalla mientras está abierto', async () => {
    await openDeleteDialog()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ver historial' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Ver historial', hidden: true })).toBeInTheDocument()
  })

  it('se cierra con un clic en el fondo oscuro', async () => {
    const { user } = await openDeleteDialog()
    const backdrop = document.querySelector('[data-testid="dialog-backdrop"]') as HTMLElement
    await user.click(backdrop)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('bloquea el scroll del fondo con useBodyScrollLock (arreglo de iOS Safari) y lo libera al cerrarse', async () => {
    const { user } = await openDeleteDialog()
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')
  })

  it('con DialogTrigger (no controlado) también bloquea el scroll mientras está abierto', async () => {
    const user = userEvent.setup()
    render(<SupportExample />)
    await user.click(screen.getByRole('button', { name: 'Soporte' }))
    await screen.findByRole('dialog')
    expect(document.body.style.position).toBe('fixed')

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.style.position).toBe('')
  })

  it('con dos diálogos apilados, Escape cierra solo el de arriba y el foco vuelve al de abajo', async () => {
    const user = userEvent.setup()
    render(<StackedExample />)

    await user.click(screen.getByRole('button', { name: 'Editar Harina 000' }))
    await screen.findByRole('dialog', { name: 'Actualizar Costo' })
    const historyButton = screen.getByRole('button', { name: 'Ver historial de precios' })
    await user.click(historyButton)
    const history = await screen.findByRole('dialog', { name: 'Historial de Costos' })
    await waitFor(() => expect(history).toContainElement(document.activeElement as HTMLElement))

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Historial de Costos' })).not.toBeInTheDocument()
    )
    expect(screen.getByRole('dialog', { name: 'Actualizar Costo' })).toBeInTheDocument()
    await waitFor(() => expect(historyButton).toHaveFocus())
  })
})
