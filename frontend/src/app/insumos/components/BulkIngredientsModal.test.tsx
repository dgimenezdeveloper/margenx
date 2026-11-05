import '@testing-library/jest-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as bulkLib from '@/lib/bulkIngredients'
import { ApiError } from '@/services/api'
import { ingredientService, type BulkUploadResponse } from '@/services/ingredientService'
import { BulkIngredientsModal } from './BulkIngredientsModal'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token-de-prueba') }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { bulkUpload: vi.fn() },
}))

const csvFile = (lines: string[], name = 'insumos-panaderia.csv') =>
  new File([lines.join('\r\n')], name, { type: 'text/csv' })

/** 18 insumos válidos, 1 que ya está en la despensa y 1 con costo "abc". */
const PANADERIA_CSV = [
  'Nombre;Unidad;Costo',
  ...Array.from({ length: 18 }, (_, index) => `Insumo de panadería ${index + 1};kg;${1000 + index},50`),
  'Harina de trigo 000 Olavarriense;kg;736,25',
  'Levadura fresca La Cordobesa;kg;abc',
]

function renderModal(props: Partial<React.ComponentProps<typeof BulkIngredientsModal>> = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <BulkIngredientsModal
      isOpen
      onClose={onClose}
      onSuccess={onSuccess}
      existingSupplies={[{ name: 'Harina de trigo 000 Olavarriense' }]}
      {...props}
    />
  )
  return { onClose, onSuccess, user: userEvent.setup() }
}

async function uploadFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(screen.getByLabelText(/Elegí tu planilla/i), file)
}

describe('BulkIngredientsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('es un diálogo accesible con título, descripción y el paso 1 de 3', () => {
    renderModal()

    const dialog = screen.getByRole('dialog', { name: 'Cargar insumos desde una planilla' })
    expect(dialog).toHaveAccessibleDescription(/El archivo se lee en tu dispositivo/)
    expect(within(dialog).getByText('Paso 1 de 3: Archivo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar plantilla' })).toBeInTheDocument()
  })

  it('Escenario Gherkin "Plantilla": el botón descarga la plantilla', async () => {
    const download = vi.spyOn(bulkLib, 'downloadTemplateFile').mockResolvedValue()
    const { user } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Descargar plantilla' }))

    expect(download).toHaveBeenCalledTimes(1)
  })

  it('avisa si no se pudo generar la plantilla', async () => {
    vi.spyOn(bulkLib, 'downloadTemplateFile').mockRejectedValue(new Error('chunk no disponible'))
    const { user } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Descargar plantilla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar la plantilla')
  })

  it('Escenarios Gherkin "Filas con error" y "Confirmación": muestra las 18 válidas, la fila con error y el resultado', async () => {
    vi.mocked(ingredientService.bulkUpload).mockResolvedValue({ created: 18, skipped: 0, errors: [] })
    const { user, onSuccess } = renderModal()

    await uploadFile(user, csvFile(PANADERIA_CSV))

    expect(await screen.findByText('Paso 2 de 3: Revisión')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /18\s*Válidas/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /1\s*Repetidas/ })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /1\s*Con error/ }))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Levadura fresca La Cordobesa')).toBeInTheDocument()
    expect(within(panel).getByText(/Fila 21/)).toBeInTheDocument()
    expect(within(panel).getByText('El costo no es un número válido. Escribilo como 1.234,56.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Importar 18 insumos' }))

    const payload = vi.mocked(ingredientService.bulkUpload).mock.calls[0]?.[1]
    expect(payload).toHaveLength(18)
    expect(payload?.[0]).toEqual({ name: 'Insumo de panadería 1', unit: 'kg', cost: '1000.50' })

    const status = await screen.findByRole('status')
    expect(within(status).getByRole('heading', { name: 'Se cargaron 18 insumos' })).toBeInTheDocument()
    expect(within(status).getByText('Creados').nextSibling).toHaveTextContent('18')
    expect(within(status).getByText('Omitidos').nextSibling).toHaveTextContent('2')
    expect(onSuccess).toHaveBeenCalledWith({ created: 18, skipped: 0, errors: [] })
  })

  it('muestra los rechazos del servidor con el número de fila de la planilla', async () => {
    const response: BulkUploadResponse = { created: 1, skipped: 1, errors: [{ row: 2, reason: 'El costo es inválido.' }] }
    vi.mocked(ingredientService.bulkUpload).mockResolvedValue(response)
    const { user } = renderModal({ existingSupplies: [] })

    await uploadFile(user, csvFile(['Nombre;Unidad;Costo', 'Soda;l;2300', 'Etoxilado;kg;4928', 'Sulfonico;l;6930']))
    await user.click(await screen.findByRole('button', { name: 'Importar 3 insumos' }))

    const status = await screen.findByRole('status')
    expect(within(status).getByRole('heading', { name: 'Se cargó 1 insumo' })).toBeInTheDocument()
    expect(within(status).getByText('Fila 3 (Etoxilado): El costo es inválido.')).toBeInTheDocument()
  })

  it('si el servidor falla, avisa y conserva la vista previa para reintentar', async () => {
    vi.mocked(ingredientService.bulkUpload).mockRejectedValue(new ApiError('La lista supera el tope de 500 filas por lote.', 413))
    const { user, onSuccess } = renderModal()

    await uploadFile(user, csvFile(PANADERIA_CSV))
    await user.click(await screen.findByRole('button', { name: 'Importar 18 insumos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La lista supera el tope de 500 filas por lote.')
    expect(screen.getByRole('button', { name: 'Importar 18 insumos' })).toBeEnabled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('sin red muestra un mensaje en español que aclara que no se cargó nada', async () => {
    vi.mocked(ingredientService.bulkUpload).mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = renderModal()

    await uploadFile(user, csvFile(PANADERIA_CSV))
    await user.click(await screen.findByRole('button', { name: 'Importar 18 insumos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('no se cargó nada')
  })

  it('no deja confirmar si no hay filas válidas y abre la pestaña de errores', async () => {
    const { user } = renderModal()

    await uploadFile(user, csvFile(['Nombre;Unidad;Costo', 'Levadura fresca La Cordobesa;kg;abc']))

    expect(await screen.findByRole('button', { name: 'No hay insumos para importar' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: /1\s*Con error/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('las pestañas se recorren con las flechas del teclado', async () => {
    const { user } = renderModal()
    await uploadFile(user, csvFile(PANADERIA_CSV))
    const validTab = await screen.findByRole('tab', { name: /Válidas/ })

    validTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Repetidas/ })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: /Con error/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(validTab).toHaveFocus()
  })

  it.each([
    ['un PDF', new File(['%PDF-1.7'], 'lista.pdf', { type: 'application/pdf' }), 'Elegí un archivo de Excel'],
    ['una planilla sin columna Unidad', csvFile(['Nombre;Precio', 'Soda;2300']), 'No encontramos la columna Unidad'],
    ['una planilla con solo el encabezado', csvFile(['Nombre;Unidad;Costo']), 'no tiene insumos cargados'],
  ])('rechaza %s con un aviso y se queda en el paso 1', async (_caso, file, message) => {
    renderModal()
    // Sin el filtro de `accept`: así llega lo que un navegador deja pasar al arrastrar el archivo.
    const user = userEvent.setup({ applyAccept: false })

    await user.upload(screen.getByLabelText(/Elegí tu planilla/i), file)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByText('Paso 1 de 3: Archivo')).toBeInTheDocument()
  })

  it('"Cambiar" vuelve a elegir archivo y "Cancelar" cierra el diálogo', async () => {
    const { user, onClose } = renderModal()
    await uploadFile(user, csvFile(PANADERIA_CSV))

    await user.click(await screen.findByRole('button', { name: 'Cambiar' }))
    expect(screen.getByText('Paso 1 de 3: Archivo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('no se puede cerrar mientras guarda los insumos', async () => {
    let resolveUpload: (value: BulkUploadResponse) => void = () => {}
    vi.mocked(ingredientService.bulkUpload).mockReturnValue(new Promise((resolve) => (resolveUpload = resolve)))
    const { user, onClose } = renderModal()
    await uploadFile(user, csvFile(PANADERIA_CSV))

    await user.click(await screen.findByRole('button', { name: 'Importar 18 insumos' }))
    expect(screen.getByRole('button', { name: /Guardando insumos/ })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    resolveUpload({ created: 18, skipped: 0, errors: [] })
    await user.click(await screen.findByRole('button', { name: 'Listo' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('"Cargar otra planilla" vuelve al paso 1 después de importar', async () => {
    vi.mocked(ingredientService.bulkUpload).mockResolvedValue({ created: 0, skipped: 18, errors: [] })
    const { user } = renderModal()
    await uploadFile(user, csvFile(PANADERIA_CSV))
    await user.click(await screen.findByRole('button', { name: 'Importar 18 insumos' }))

    expect(await screen.findByRole('heading', { name: 'No se cargó ningún insumo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cargar otra planilla' }))
    await waitFor(() => expect(screen.getByText('Paso 1 de 3: Archivo')).toBeInTheDocument())
  })
})
