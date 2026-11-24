import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import type { DashboardMetrics } from '@/services/dashboardService'
import { HealthDistributionHistogram } from './HealthDistributionHistogram'

/** Catálogo grande del recorrido del 10/11 en la cuenta Demo: 339 productos, 50 en borrador. */
const catalogoDemo: DashboardMetrics = {
  activeIngredientsCount: 218,
  criticalProductsCount: 119,
  healthyProductsCount: 170,
  averageMarginPercent: 38.5,
  recentCostVariationsCount: 7,
  lossCount: 12,
  riskCount: 107,
  targetCount: 130,
  surplusCount: 40,
  draftCount: 50,
}

function renderHistograma(metrics: DashboardMetrics | null, onSelectBucket = vi.fn()) {
  render(
    <HealthDistributionHistogram
      metrics={metrics}
      isLoading={false}
      selectedBucket={null}
      onSelectBucket={onSelectBucket}
    />
  )
  return onSelectBucket
}

describe('HealthDistributionHistogram con los buckets del servidor (#351 / #358)', () => {
  it('dibuja los conteos de todo el catálogo: columnas + borradores = 339', () => {
    renderHistograma(catalogoDemo)

    const columnas = {
      loss: screen.getByRole('button', { name: /pérdida ?: 12 productos/i }),
      risk: screen.getByRole('button', { name: /en riesgo ?: 107 productos/i }),
      target: screen.getByRole('button', { name: /en objetivo ?: 130 productos/i }),
      surplus: screen.getByRole('button', { name: /superávit ?: 40 productos/i }),
    }
    const suma = Object.values(columnas)
      .map((col) => Number(within(col).getByTestId('bucket-count').textContent))
      .reduce((a, b) => a + b, 0)

    expect(suma + catalogoDemo.draftCount).toBe(339)
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText(/en borrador \(sin receta\)/i)).toBeInTheDocument()
    expect(screen.getByText(/339 productos en total/i)).toBeInTheDocument()
  })

  it('calcula el porcentaje de cada columna sobre los productos con receta (289)', () => {
    renderHistograma(catalogoDemo)
    const riesgo = screen.getByRole('button', { name: /en riesgo/i })
    // 107 / 289 = 37,02 %
    expect(within(riesgo).getByText('37 %')).toBeInTheDocument()
  })

  it('los rótulos dicen que cada producto se compara con su propio mínimo, sin un 30 % fijo', () => {
    renderHistograma(catalogoDemo)

    expect(screen.queryByText(/30\s?%\s?[–-]\s?60/)).toBeNull()
    expect(screen.getByText('Bajo su mínimo')).toBeInTheDocument()
    expect(screen.getByText('Su mínimo a 60 %')).toBeInTheDocument()
    expect(screen.getByText(/cada producto se compara con su propio margen mínimo/i)).toBeInTheDocument()
  })

  it('cada columna muestra el nombre completo del estado en todos los anchos, sin abreviar (#430)', () => {
    renderHistograma(catalogoDemo)

    const nombres = {
      loss: 'Pérdida',
      risk: 'En riesgo',
      target: 'En objetivo',
      surplus: 'Superávit',
    }
    for (const nombre of Object.values(nombres)) {
      const columna = screen.getByRole('button', { name: new RegExp(`^${nombre} ?:`, 'i') })
      // Un solo rótulo visible por columna: el mismo a 360 px y en escritorio.
      expect(within(columna).getByText(nombre, { exact: true })).toBeInTheDocument()
    }
    expect(screen.queryByText('Riesgo', { exact: true })).toBeNull()
    expect(screen.queryByText('Objetivo', { exact: true })).toBeNull()
  })

  it('el nombre de cada columna sale del texto visible: estado, cantidad, porcentaje y rango (WCAG 2.5.3, axe, #442)', () => {
    renderHistograma(catalogoDemo)

    const riesgo = screen.getByRole('button', { name: /^en riesgo ?: 107 productos/i })
    // Con aria-label, el nombre no contenía el porcentaje que se ve en la columna.
    expect(riesgo).not.toHaveAttribute('aria-label')
    // Los ":" van en un texto oculto aparte: happy-dom y Chrome suman un espacio antes, que el lector no pronuncia.
    expect(riesgo).toHaveAccessibleName(/^En riesgo ?: 107 productos, 37\u00a0% del catálogo, Bajo su mínimo$/)
    expect(screen.getByRole('button', { name: /^superávit ?: 40 productos/i })).toHaveAccessibleName(
      /^Superávit ?: 40 productos, 14\u00a0% del catálogo, > 60\u00a0%$/
    )
  })

  it('al tocar una columna avisa qué bucket filtrar', () => {
    const onSelect = renderHistograma(catalogoDemo)
    fireEvent.click(screen.getByRole('button', { name: /en riesgo ?: 107 productos/i }))
    expect(onSelect).toHaveBeenCalledWith('risk')
  })

  it('una columna vacía queda deshabilitada', () => {
    renderHistograma({ ...catalogoDemo, lossCount: 0, criticalProductsCount: 107 })
    expect(screen.getByRole('button', { name: /pérdida ?: 0 productos/i })).toBeDisabled()
  })

  it('sin productos con receta muestra el aviso y cuenta los borradores', () => {
    renderHistograma({
      ...catalogoDemo,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 3,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
    })
    expect(screen.getByText(/aún no hay productos con receta/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /en riesgo/i })).toBeNull()
  })

  it('sin métricas (falla de la API) no dibuja columnas en cero', () => {
    renderHistograma(null)
    expect(screen.queryByRole('button', { name: /en riesgo/i })).toBeNull()
    expect(screen.queryByText(/distribución de salud financiera/i)).toBeNull()
  })

  it('marca la columna seleccionada y muestra el chip con su nombre unificado y conteo', () => {
    render(
      <HealthDistributionHistogram
        metrics={catalogoDemo}
        isLoading={false}
        selectedBucket="surplus"
        onSelectBucket={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /superávit ?: 40 productos/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /filtrando: superávit \(40\)/i })).toBeInTheDocument()
  })

  it('el total del catálogo y los porcentajes no usan gris 400 sobre blanco (contraste menor a 4,5:1)', () => {
    const { container } = render(
      <HealthDistributionHistogram metrics={catalogoDemo} isLoading={false} selectedBucket={null} onSelectBucket={vi.fn()} />
    )
    const conTextoClaroBajo = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
      el.className.split(/\s+/).includes('text-gray-400')
    )
    expect(conTextoClaroBajo.map((el) => el.textContent)).toEqual([])
  })

  it('el aviso sin productos con receta tampoco usa gris 400 sobre blanco', () => {
    const { container } = render(
      <HealthDistributionHistogram
        metrics={{ ...catalogoDemo, lossCount: 0, riskCount: 0, targetCount: 0, surplusCount: 0 }}
        isLoading={false}
        selectedBucket={null}
        onSelectBucket={vi.fn()}
      />
    )
    const conTextoClaroBajo = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
      el.className.split(/\s+/).includes('text-gray-400')
    )
    expect(conTextoClaroBajo.map((el) => el.textContent)).toEqual([])
  })
})