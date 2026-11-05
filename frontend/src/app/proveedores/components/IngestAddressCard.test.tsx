import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { IngestAddressCard } from './IngestAddressCard'

const ADDRESS = 'precios-panaderia-central@margenx.tech'
const writeText = vi.fn<(text: string) => Promise<void>>()

const setClipboard = (clipboard: Pick<Clipboard, 'writeText'> | undefined) => {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
}

describe('IngestAddressCard', () => {
  beforeEach(() => {
    writeText.mockReset()
    setClipboard({ writeText })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra la dirección de ingesta del comercio y para qué sirve', () => {
    render(<IngestAddressCard address={ADDRESS} />)

    expect(screen.getByRole('heading', { name: 'Dirección para tus listas de precios' })).toBeInTheDocument()
    expect(screen.getByText(ADDRESS)).toBeInTheDocument()
    expect(screen.getByText(/reenviá a esta dirección/i)).toBeInTheDocument()
  })

  it('Escenario Gherkin: al tocar Copiar la dirección queda copiada y se ve el aviso de copiado', async () => {
    writeText.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    setClipboard({ writeText })
    render(<IngestAddressCard address={ADDRESS} />)

    await user.click(screen.getByRole('button', { name: 'Copiar dirección' }))

    expect(writeText).toHaveBeenCalledWith(ADDRESS)
    expect(await screen.findByText('Dirección copiada. Pasásela a tu proveedor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar dirección' })).toHaveTextContent('Copiada')
  })

  it('el aviso de copiado desaparece solo después de unos segundos', async () => {
    vi.useFakeTimers()
    writeText.mockResolvedValueOnce(undefined)
    render(<IngestAddressCard address={ADDRESS} />)

    await act(async () => {
      screen.getByRole('button', { name: 'Copiar dirección' }).click()
    })
    expect(screen.getByText('Dirección copiada. Pasásela a tu proveedor.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByText('Dirección copiada. Pasásela a tu proveedor.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar dirección' })).toHaveTextContent('Copiar')
  })

  it('si el navegador rechaza el copiado avisa cómo copiarla a mano', async () => {
    writeText.mockRejectedValueOnce(new Error('NotAllowedError'))
    const user = userEvent.setup()
    setClipboard({ writeText })
    render(<IngestAddressCard address={ADDRESS} />)

    await user.click(screen.getByRole('button', { name: 'Copiar dirección' }))

    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument()
    expect(screen.queryByText('Dirección copiada. Pasásela a tu proveedor.')).not.toBeInTheDocument()
  })

  it('sin portapapeles disponible (sitio sin HTTPS) también avisa cómo copiarla a mano', async () => {
    setClipboard(undefined)
    render(<IngestAddressCard address={ADDRESS} />)

    await act(async () => {
      screen.getByRole('button', { name: 'Copiar dirección' }).click()
    })

    expect(screen.getByText(/No se pudo copiar/)).toBeInTheDocument()
  })
})
