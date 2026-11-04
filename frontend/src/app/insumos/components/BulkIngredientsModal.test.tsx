import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { BulkIngredientsModal } from './BulkIngredientsModal'
import { ingredientService } from '@/services/ingredientService'
import * as bulkLib from '@/lib/bulkIngredients'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('fake-token') }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: {
    bulkUpload: vi.fn(),
  },
}))

describe('BulkIngredientsModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza la vista inicial con el botón de descarga de plantilla', () => {
    render(
      <BulkIngredientsModal
        isOpen={true}
        onClose={vi.fn()}
        existingSupplies={[]}
        onSuccess={vi.fn()}
      />
    )

    expect(screen.getByText('Carga Masiva de Insumos')).toBeInTheDocument()
    expect(screen.getByText('Descargar Excel')).toBeInTheDocument()
    expect(screen.getByText(/Elegir archivo Excel/i)).toBeInTheDocument()
  })

  it('ejecuta downloadTemplateFile al hacer clic en Descargar Excel', () => {
    const downloadSpy = vi.spyOn(bulkLib, 'downloadTemplateFile').mockImplementation(() => {})

    render(
      <BulkIngredientsModal
        isOpen={true}
        onClose={vi.fn()}
        existingSupplies={[]}
        onSuccess={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Descargar Excel'))
    expect(downloadSpy).toHaveBeenCalledTimes(1)
  })

  it('Escenario Gherkin: Procesa archivo, muestra vista previa con filas válidas y permite confirmar', async () => {
    const mockFile = new File(['dummy content'], 'planilla.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))

    vi.spyOn(bulkLib, 'parseSpreadsheet').mockReturnValue([
      { Nombre: 'Harina 000', Unidad: 'kg', Costo: '736,25' },
      { Nombre: 'Leche entera', Unidad: 'l', Costo: '1715,00' },
    ])

    vi.mocked(ingredientService.bulkUpload).mockResolvedValueOnce({
      created: 2,
      skipped: 0,
      errors: [],
    })

    const onSuccess = vi.fn()

    render(
      <BulkIngredientsModal
        isOpen={true}
        onClose={vi.fn()}
        existingSupplies={[]}
        onSuccess={onSuccess}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByText(/Confirmar \(2 válidas\)/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Harina 000')).toBeInTheDocument()
    expect(screen.getByText('Leche entera')).toBeInTheDocument()

    // Confirmar importación
    fireEvent.click(screen.getByText(/Confirmar \(2 válidas\)/i))

    await waitFor(() => {
      expect(screen.getByText('¡Importación finalizada!')).toBeInTheDocument()
      expect(screen.getByText('Insumos Creados')).toBeInTheDocument()
    })

    expect(ingredientService.bulkUpload).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith({ created: 2, skipped: 0, errors: [] })
  })

  it('Escenario Gherkin: Fila con error ("abc") se muestra en la pestaña de errores sin impedir confirmar las válidas', async () => {
    const mockFile = new File(['dummy content'], 'con-error.xlsx')
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))

    vi.spyOn(bulkLib, 'parseSpreadsheet').mockReturnValue([
      { Nombre: 'Harina 000', Unidad: 'kg', Costo: '736,25' },
      { Nombre: 'Levadura Mala', Unidad: 'kg', Costo: 'abc' },
    ])

    render(
      <BulkIngredientsModal
        isOpen={true}
        onClose={vi.fn()}
        existingSupplies={[]}
        onSuccess={vi.fn()}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByText(/Confirmar \(1 válidas\)/i)).toBeInTheDocument()
    })

    // Cambiar a pestaña con error
    fireEvent.click(screen.getByText('Con error'))

    expect(screen.getByText('Levadura Mala')).toBeInTheDocument()
    expect(screen.getByText(/El costo debe ser un valor decimal válido/i)).toBeInTheDocument()
  })
})