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

  it('la tarjeta de riesgo suma pérdida y riesgo de todo el catálogo', () => {
    render(<DashboardKpiCards metrics={metricas} isLoading={false} />)
    expect(screen.getByText('119 Productos en Riesgo')).toBeInTheDocument()
  })
})
