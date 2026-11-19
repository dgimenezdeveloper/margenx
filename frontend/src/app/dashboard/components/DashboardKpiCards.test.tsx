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

describe('DashboardKpiCards: margen promedio (#351)', () => {
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

  it('aclara que el valor es la mediana de los productos con receta', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(screen.getByText(/mediana de los productos con receta/i)).toBeInTheDocument()
  })

  it('la tarjeta suma Pérdida y En riesgo de todo el catálogo sin usar el nombre de un estado (#358)', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(screen.getByText('119 Productos debajo de su mínimo')).toBeInTheDocument()
    expect(screen.getByText('Pérdida o En riesgo')).toBeInTheDocument()
    expect(screen.queryByText(/productos en riesgo/i)).toBeNull()
  })

  it('los rótulos de las tarjetas no usan gris 400 sobre blanco (contraste menor a 4,5:1)', () => {
    const { container } = render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    const textoClaroBajo = Array.from(container.querySelectorAll<HTMLElement>('p, span')).filter((el) =>
      el.className.split(/\s+/).includes('text-gray-400')
    )
    expect(textoClaroBajo.map((el) => el.textContent)).toEqual([])
  })
})
