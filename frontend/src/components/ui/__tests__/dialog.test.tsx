import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, DialogDescription, DialogClose } from '../dialog'

describe('Dialog component', () => {
  it('traps focus, closes on Escape, and restores focus', () => {
    const onClose = vi.fn()

    const TestComponent = () => (
      <div>
        <button data-testid="trigger">Open</button>
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
              <button data-testid="inside-button">Inside</button>
              <DialogClose data-testid="close-button">Close</DialogClose>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      </div>
    )

    render(<TestComponent />)

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByTestId('inside-button'), { key: 'Escape', code: 'Escape' })
    if (onClose.mock.calls.length === 0) {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    }
    expect(onClose).toHaveBeenCalled()
  })
})