import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { FeatureRoute } from '@/components/feature-route'

const state = vi.hoisted(() => ({ sales: false, isLoading: false }))
vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({ hasFeature: () => state.sales, isLoading: state.isLoading, features: { sales: state.sales } }),
}))
vi.mock('@/app/not-found/page', () => ({ default: () => <p>Error 404</p> }))

const renderRoute = () =>
  render(
    <MemoryRouter>
      <FeatureRoute feature="sales">
        <p>Nueva venta</p>
      </FeatureRoute>
    </MemoryRouter>
  )

describe('FeatureRoute (ADR-010)', () => {
  beforeEach(() => {
    state.sales = false
    state.isLoading = false
  })

  it('con el módulo prendido muestra la pantalla', () => {
    state.sales = true
    renderRoute()
    expect(screen.getByText('Nueva venta')).toBeInTheDocument()
  })

  it('con el módulo apagado muestra la 404, como la API', () => {
    renderRoute()
    expect(screen.getByText('Error 404')).toBeInTheDocument()
    expect(screen.queryByText('Nueva venta')).toBeNull()
  })

  it('mientras carga /me no muestra ni la pantalla ni la 404', () => {
    state.isLoading = true
    renderRoute()
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.queryByText('Error 404')).toBeNull()
  })
})
