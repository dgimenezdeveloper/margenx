import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BulkIngredientsModal } from '../app/insumos/components/BulkIngredientsModal'
import { CANONICAL_FOCUS_CLASSES } from '../lib/accessibility'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token-de-prueba') }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { bulkUpload: vi.fn() },
}))

describe('Uniformidad de Anillo de Foco en BulkIngredientsModal (#361)', () => {
  it('aplica el estilo de foco canónico al botón de cierre y botones de acción en paso 1', () => {
    render(
      <BulkIngredientsModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingSupplies={[]}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /cerrar carga desde planilla/i })
    const templateBtn = screen.getByRole('button', { name: /descargar plantilla/i })
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i })

    const expectedClasses = CANONICAL_FOCUS_CLASSES.split(' ')

    ;[closeBtn, templateBtn, cancelBtn].forEach((element) => {
      expectedClasses.forEach((cls) => {
        expect(element.className).toContain(cls)
      })
    })
  })

  it('aplica foco canónico y atributos ARIA correspondientes en las pestañas de revisión', async () => {
    const user = userEvent.setup()
    render(
      <BulkIngredientsModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingSupplies={[]}
      />
    )

    const csvFile = new File(
      ['Nombre;Unidad;Costo\r\nHarina de trigo;kg;750,00'],
      'insumos.csv',
      { type: 'text/csv' }
    )

    const fileInput = screen.getByLabelText(/Elegí tu planilla/i)
    await user.upload(fileInput, csvFile)

    const validTab = await screen.findByRole('tab', { name: /válidas/i })
    const duplicatesTab = screen.getByRole('tab', { name: /repetidas/i })
    const errorsTab = screen.getByRole('tab', { name: /con error/i })

    expect(validTab.getAttribute('aria-selected')).toBe('true')
    expect(validTab).toHaveAttribute('aria-controls')

    const expectedClasses = CANONICAL_FOCUS_CLASSES.split(' ')
    ;[validTab, duplicatesTab, errorsTab].forEach((tab) => {
      expectedClasses.forEach((cls) => {
        expect(tab.className).toContain(cls)
      })
    })

    const panel = screen.getByRole('tabpanel')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute('tabindex', '0')
  })
})