import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import ProfilePage from './page'
import { authService } from '@/services/authService'
import { ApiError } from '@/services/api'

const mockGetToken = vi.fn().mockResolvedValue('fake-token')
const mockSignOut = vi.fn()

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    signOut: mockSignOut,
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/perfil', search: '' }),
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
      <a href={to} className={className}>{children}</a>
    ),
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => '/perfil',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

let mockUser: { id: string; role: 'ADMIN' | 'COLLABORATOR'; email: string } = {
  id: 'u-admin',
  role: 'ADMIN',
  email: 'admin.panaderia@seed.example.test',
}

let mockRefreshUser = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mockUser,
    businessName: 'Panadería Central',
    defaultMinMarginPercent: 30,
    isLoading: false,
    refreshUser: mockRefreshUser,
  }),
}))

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    role: mockUser.role,
    isAdmin: mockUser.role === 'ADMIN',
    isCollaborator: mockUser.role === 'COLLABORATOR',
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}))

vi.mock('@/lib/serviceWorkerCache', () => ({
  clearSessionCaches: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/authService', () => ({
  authService: {
    updateGlobalMargin: vi.fn(),
  },
}))

describe('ProfilePage (/perfil) - Criterios de Aceptación Issue #356', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    mockRefreshUser = vi.fn().mockResolvedValue(undefined)
  })

  it('Escenario Gherkin "Sin interruptores falsos": el administrador no ve elementos role="switch"', () => {
    render(<ProfilePage />)

    // No debe existir ningún toggle switch falso en el DOM
    const switches = screen.queryAllByRole('switch')
    expect(switches).toHaveLength(0)

    // La alerta crítica se visualiza como "Activa"
    expect(screen.getByText('Alerta de Margen Crítico')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()

    // El reporte semanal en PDF se visualiza como "Próximamente"
    expect(screen.getByText('Reporte Semanal en PDF')).toBeInTheDocument()
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
  })

  it('Escenario Gherkin "Porcentaje": el símbolo % aparece una sola vez en Margen Mínimo Sugerido', () => {
    render(<ProfilePage />)

    const label = screen.getByText('Margen Mínimo Sugerido')
    const container = label.parentElement
    expect(container).not.toBeNull()

    // Verificamos que dentro del contenedor del campo solo exista un único símbolo '%'
    const percentMatches = (container?.textContent || '').match(/%/g) || []
    expect(percentMatches).toHaveLength(1)

    // El input numérico tiene su accesibilidad y valor formateado
    const input = screen.getByLabelText('Margen Mínimo Sugerido')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('30')
  })

  it('Blindaje RBAC: el colaborador no visualiza margen global ni alertas automáticas', () => {
    mockUser = { id: 'u-colab', role: 'COLLABORATOR', email: 'colab.panaderia@seed.example.test' }
    render(<ProfilePage />)

    expect(screen.getByText('Colaborador')).toBeInTheDocument()
    expect(screen.getByText('COLABORADOR')).toBeInTheDocument()

    // Secciones restringidas no deben montarse
    expect(screen.queryByText('Margen Objetivo Global')).toBeNull()
    expect(screen.queryByText('Alertas Automáticas (n8n)')).toBeNull()
    expect(screen.queryByLabelText('Margen Mínimo Sugerido')).toBeNull()
  })

  it('Guarda exitosamente la actualización del margen global', async () => {
    vi.mocked(authService.updateGlobalMargin).mockResolvedValueOnce({
      id: 'acc-1',
      businessName: 'Panadería Central',
      defaultMinMarginPercent: 35,
    })

    render(<ProfilePage />)

    const input = screen.getByLabelText('Margen Mínimo Sugerido')
    fireEvent.change(input, { target: { value: '35' } })

    const saveButton = screen.getByRole('button', { name: /Guardar Margen/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(authService.updateGlobalMargin).toHaveBeenCalledWith(expect.any(Function), 35)
      expect(mockRefreshUser).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText(/Margen objetivo global actualizado correctamente/i)).toBeInTheDocument()
  })

  it('Valida límites numéricos (0 a 100) y rechaza valores fuera de rango sin llamar a la API', async () => {
    render(<ProfilePage />)

    const input = screen.getByLabelText('Margen Mínimo Sugerido')
    fireEvent.change(input, { target: { value: '120' } })

    const saveButton = screen.getByRole('button', { name: /Guardar Margen/i })
    fireEvent.click(saveButton)

    expect(await screen.findByText('El margen debe estar entre 0% y 100%.')).toBeInTheDocument()
    expect(authService.updateGlobalMargin).not.toHaveBeenCalled()
  })

  it('Maneja errores de API al guardar el margen global y presenta notificación amigable', async () => {
    vi.mocked(authService.updateGlobalMargin).mockRejectedValueOnce(
      new ApiError('Error al conectar con el servidor', 500)
    )

    render(<ProfilePage />)

    const input = screen.getByLabelText('Margen Mínimo Sugerido')
    fireEvent.change(input, { target: { value: '40' } })

    const saveButton = screen.getByRole('button', { name: /Guardar Margen/i })
    fireEvent.click(saveButton)

    // Se usa findAllByText porque el error se presenta en el párrafo de error y en el toast
    const errorElements = await screen.findAllByText('Error al conectar con el servidor')
    expect(errorElements.length).toBeGreaterThanOrEqual(1)
  })

  it('Apertura de LogoutDialog al tocar Cerrar Sesión', async () => {
    render(<ProfilePage />)

    const logoutButtons = screen.getAllByRole('button', { name: /Cerrar Sesión/i })
    fireEvent.click(logoutButtons[0])

    expect(await screen.findByRole('dialog', { name: '¿Cerrar sesión?' })).toBeInTheDocument()
  })
})