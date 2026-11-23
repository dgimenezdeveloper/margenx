import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom'

import type { DashboardMetrics } from '@/services/dashboardService'
import { DashboardKpiCards } from './DashboardKpiCards'

const metricas: DashboardMetrics = {
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

function margenPromedio() {
  return screen.getByTestId('average-margin')
}

describe('DashboardKpiCards: margen mediano (#351, #430)', () => {
  it('un margen positivo se muestra en verde', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(margenPromedio()).toHaveTextContent('38,5 %')
    expect(margenPromedio().className).toMatch(/text-emerald-700/)
    expect(margenPromedio().className).not.toMatch(/rose/)
  })

  it('un margen negativo se muestra en rojo y no en verde', () => {
    render(<DashboardKpiCards metrics={{ ...metricas, averageMarginPercent: -12.4 }} isLoading={false} />)
    expect(margenPromedio()).toHaveTextContent('-12,4 %')
    expect(margenPromedio().className).toMatch(/text-rose-700/)
    expect(margenPromedio().className).not.toMatch(/emerald/)
  })

  it('un margen de 0 % no se pinta como ganancia ni como pérdida', () => {
    render(<DashboardKpiCards metrics={{ ...metricas, averageMarginPercent: 0 }} isLoading={false} />)
    expect(margenPromedio()).toHaveTextContent('0,0 %')
    expect(margenPromedio().className).not.toMatch(/emerald|rose/)
  })

  it('se llama "Margen mediano" y explica qué significa la mediana (#430)', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(screen.getByText('Margen mediano')).toBeInTheDocument()
    expect(screen.getByText('La mitad de tus productos gana más que esto y la mitad menos.')).toBeInTheDocument()
    expect(screen.queryByText(/margen promedio/i)).toBeNull()
  })

  it('la tarjeta suma Pérdida y En riesgo de todo el catálogo sin usar el nombre de un estado (#358)', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(screen.getByTestId('critical-count')).toHaveTextContent('119')
    expect(screen.getByText('Productos debajo de su mínimo')).toBeInTheDocument()
    expect(screen.getByText('Pérdida o En riesgo')).toBeInTheDocument()
    expect(screen.queryByText(/productos en riesgo/i)).toBeNull()
  })

  it('con un solo producto debajo de su mínimo el rótulo va en singular', () => {
    render(<DashboardKpiCards metrics={{ ...metricas, criticalProductsCount: 1 }} isLoading={false} />)
    expect(screen.getByTestId('critical-count')).toHaveTextContent('1')
    expect(screen.getByText('Producto debajo de su mínimo')).toBeInTheDocument()
  })

  it('los rótulos de las tarjetas no usan gris 400 sobre blanco (contraste menor a 4,5:1)', () => {
    const { container } = render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    const textoClaroBajo = Array.from(container.querySelectorAll<HTMLElement>('p, span')).filter((el) =>
      el.className.split(/\s+/).includes('text-gray-400')
    )
    expect(textoClaroBajo.map((el) => el.textContent)).toEqual([])
  })
})

describe('DashboardKpiCards en el celular (#362)', () => {
  it('Escenario: las tres KPI se ven a 360 px como las tarjetas de Proveedores (grilla de tres, sin ocultar ninguna)', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    const tarjetas = screen.getAllByTestId('kpi-card')
    expect(tarjetas).toHaveLength(3)
    expect(tarjetas[0].parentElement?.className.split(/\s+/)).toContain('grid-cols-3')
    for (const tarjeta of tarjetas) {
      expect(tarjeta.className.split(/\s+/)).not.toContain('hidden')
    }
    expect(screen.getByTestId('critical-count')).toHaveTextContent('119')
    expect(screen.getByTestId('active-ingredients')).toHaveTextContent('218')
    expect(screen.getByTestId('average-margin')).toHaveTextContent('38,5 %')
  })

  it('un margen largo (por ejemplo "-12,4 %") baja de renglón dentro de la tarjeta en lugar de desbordarla', () => {
    render(<DashboardKpiCards metrics={{ ...metricas, averageMarginPercent: -12.4 }} isLoading={false} />)
    for (const id of ['critical-count', 'active-ingredients', 'average-margin']) {
      expect(screen.getByTestId(id).className.split(/\s+/)).toEqual(expect.arrayContaining(['wrap-anywhere', 'text-lg']))
    }
    for (const tarjeta of screen.getAllByTestId('kpi-card')) {
      expect(tarjeta.className.split(/\s+/)).toContain('min-w-0')
    }
  })

  it('cada tarjeta tiene un rótulo corto para el celular y el completo desde la tableta', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(screen.getByText('Debajo de su mínimo').className).toMatch(/md:hidden/)
    expect(screen.getByText('Productos debajo de su mínimo').className).toMatch(/hidden md:inline/)
    expect(screen.getByText('Insumos activos')).toBeInTheDocument()
    expect(screen.getByText('Margen mediano')).toBeInTheDocument()
  })

  it('las aclaraciones largas no se pierden para el lector de pantalla en el celular', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    for (const texto of ['Pérdida o En riesgo', 'La mitad de tus productos gana más que esto y la mitad menos.']) {
      const clases = screen.getByText(texto).className
      expect(clases).toMatch(/\bsr-only\b/)
      expect(clases).toMatch(/md:not-sr-only/)
    }
  })

  it('mientras carga muestra tres esqueletos también en el celular', () => {
    const { container } = render(<DashboardKpiCards metrics={null} isLoading />)
    const esqueletos = container.querySelectorAll('.animate-pulse')
    expect(esqueletos).toHaveLength(3)
    for (const esqueleto of esqueletos) {
      expect(esqueleto.className.split(/\s+/)).not.toContain('hidden')
    }
  })

  it('sin métricas (falla de la API) no dibuja tarjetas en cero', () => {
    const { container } = render(<DashboardKpiCards metrics={null} isLoading={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
