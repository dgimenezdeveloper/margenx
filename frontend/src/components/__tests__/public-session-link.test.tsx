import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import InstallPage from '@/app/instalar/page'
import PrivacyPage from '@/app/privacidad/page'
import type { PublicSessionState } from '@/hooks/usePublicSession'

const session = vi.hoisted(() => ({ state: 'signed-out' as PublicSessionState }))

vi.mock('@/hooks/usePublicSession', () => ({
  usePublicSession: () => session.state,
}))

function renderPage(page: React.ReactElement) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

describe('Pantallas públicas según la sesión', () => {
  beforeEach(() => {
    session.state = 'signed-out'
  })

  describe('/instalar', () => {
    it('sin sesión ofrece "Ingresar" hacia /login', () => {
      renderPage(<InstallPage />)
      expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
      expect(screen.queryByRole('link', { name: 'Ir al panel' })).not.toBeInTheDocument()
    })

    it('Escenario Gherkin "Guía con sesión": con sesión ve "Ir al panel" en lugar de "Ingresar"', () => {
      session.state = 'signed-in'
      renderPage(<InstallPage />)
      expect(screen.getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard')
      expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
    })

    it('mientras se verifica la sesión no muestra ninguno de los dos (sin parpadeo)', () => {
      session.state = 'checking'
      renderPage(<InstallPage />)
      expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Ir al panel' })).not.toBeInTheDocument()
    })
  })

  describe('/privacidad', () => {
    it('sin sesión ofrece "Volver a la web" hacia la landing', () => {
      renderPage(<PrivacyPage />)
      expect(screen.getByRole('link', { name: 'Volver a la web' })).toHaveAttribute('href', '/')
    })

    it('con sesión ofrece "Ir al panel" en lugar de "Volver a la web"', () => {
      session.state = 'signed-in'
      renderPage(<PrivacyPage />)
      expect(screen.getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard')
      expect(screen.queryByRole('link', { name: 'Volver a la web' })).not.toBeInTheDocument()
    })

    it('mientras se verifica la sesión no muestra el enlace', () => {
      session.state = 'checking'
      renderPage(<PrivacyPage />)
      expect(screen.queryByRole('link', { name: /Volver a la web|Ir al panel/ })).not.toBeInTheDocument()
    })
  })
})
