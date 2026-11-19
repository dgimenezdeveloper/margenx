import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import ProfilePage from './page'
import { authService } from '@/services/authService'
import { ApiError } from '@/services/api'
import { reportService } from '@/services/reportService'
import { saveBlobAsFile } from '@/lib/downloadFile'

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

let mockIsLoading = false

let mockRefreshUser = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mockUser,
    businessName: 'Panadería Central',
    defaultMinMarginPercent: 30,
    isLoading: mockIsLoading,
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

vi.mock('@/services/reportService', () => ({
  reportService: { downloadWeeklyPdf: vi.fn() },
}))

vi.mock('@/lib/downloadFile', () => ({ saveBlobAsFile: vi.fn() }))

const collaboratorsSection = vi.hoisted(() => ({ onNotify: null as null | ((message: string) => void) }))
vi.mock('@/components/collaborators-section', () => ({
  CollaboratorsSection: ({ onNotify }: { onNotify: (message: string) => void }) => {
    collaboratorsSection.onNotify = onNotify
    return <section aria-label="Colaboradores" />
  },
}))

describe('ProfilePage (/perfil) - Criterios de Aceptación Issue #356', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    mockRefreshUser = vi.fn().mockResolvedValue(undefined)
    // Lo pone en true una prueba del bloque de Colaboradores: se restablece acá para que el
    // resultado no dependa del orden en que corren las pruebas.
    mockIsLoading = false
  })

  it('Escenario Gherkin "Sin interruptores falsos": el administrador no ve elementos role="switch"', () => {
    render(<ProfilePage />)

    // No debe existir ningún toggle switch falso en el DOM
    const switches = screen.queryAllByRole('switch')
    expect(switches).toHaveLength(0)

    // La alerta crítica se visualiza como "Activa"
    expect(screen.getByText('Alerta de Margen Crítico')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()

    // El reporte semanal en PDF ya está activo (#392); dejó de ser "Próximamente"
    expect(screen.getByText('Reporte Semanal en PDF')).toBeInTheDocument()
    expect(screen.getByText('Activo · lunes 08:00')).toBeInTheDocument()
    expect(screen.queryByText('Próximamente')).toBeNull()
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

describe('ProfilePage (/perfil): sección Colaboradores (#395)', () => {
  beforeEach(() => {
    collaboratorsSection.onNotify = null
    mockIsLoading = false
  })

  it('queda debajo de Empresa / Comercio, en la columna de la cuenta', () => {
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    render(<ProfilePage />)

    const empresa = screen.getByText('Empresa / Comercio').closest('section')!
    const colaboradores = screen.getByRole('region', { name: 'Colaboradores' })
    expect(empresa.parentElement).toBe(colaboradores.parentElement)
    expect(empresa.compareDocumentPosition(colaboradores) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Margen Objetivo Global').compareDocumentPosition(colaboradores) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('no se monta mientras el rol todavía se está cargando (evita pedidos 403 de un colaborador)', () => {
    mockIsLoading = true
    render(<ProfilePage />)

    expect(screen.queryByRole('region', { name: 'Colaboradores' })).not.toBeInTheDocument()
  })

  it('el administrador ve la sección y sus avisos usan el toast de Perfil', async () => {
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    render(<ProfilePage />)

    expect(screen.getByRole('region', { name: 'Colaboradores' })).toBeInTheDocument()
    act(() => collaboratorsSection.onNotify?.('Invitación enviada a mostrador.panaderia@seed.example.test'))
    expect(await screen.findByText('Invitación enviada a mostrador.panaderia@seed.example.test')).toBeInTheDocument()
  })

  it('el colaborador no ve la sección', () => {
    mockUser = { id: 'u-colab', role: 'COLLABORATOR', email: 'colab.panaderia@seed.example.test' }
    render(<ProfilePage />)

    expect(screen.queryByRole('region', { name: 'Colaboradores' })).not.toBeInTheDocument()
  })
})

describe('ProfilePage (/perfil): reporte semanal en PDF (#392)', () => {
  beforeEach(() => {
    vi.mocked(reportService.downloadWeeklyPdf).mockReset()
    vi.mocked(saveBlobAsFile).mockReset()
    mockIsLoading = false
  })

  it('el administrador ve el reporte activo y descarga el último desde el enlace', async () => {
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    vi.mocked(reportService.downloadWeeklyPdf).mockResolvedValue({ blob: pdf, fileName: 'margenx-reporte-2026-11-16.pdf' })
    render(<ProfilePage />)

    expect(screen.getByText('Activo · lunes 08:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descargar el último reporte' }))

    await waitFor(() => expect(saveBlobAsFile).toHaveBeenCalledWith(pdf, 'margenx-reporte-2026-11-16.pdf'))
  })

  it('a 360 px el badge baja debajo del texto en vez de partir el título en tres líneas', () => {
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    render(<ProfilePage />)

    const fila = screen.getByText('Activo · lunes 08:00').parentElement!
    expect(fila.className).toMatch(/flex-wrap/)
    const texto = screen.getByText('Reporte Semanal en PDF').parentElement!
    expect(texto.className).toMatch(/basis-48/)
    expect(screen.getByText('Reporte Semanal en PDF').className).toMatch(/whitespace-nowrap/)
  })

  it('no monta la descarga mientras el rol se está cargando', () => {
    mockIsLoading = true
    render(<ProfilePage />)

    expect(screen.queryByRole('button', { name: 'Descargar el último reporte' })).toBeNull()
  })

  it('Escenario Gherkin: Colaborador -> no ve el reporte ni su descarga', () => {
    mockUser = { id: 'u-colab', role: 'COLLABORATOR', email: 'colab.panaderia@seed.example.test' }
    render(<ProfilePage />)

    expect(screen.queryByText('Reporte Semanal en PDF')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descargar el último reporte' })).toBeNull()
  })
})

describe('ProfilePage (/perfil): pie de Soporte y Documentación (#363)', () => {
  const MANUAL_EN_MAIN = 'https://github.com/dgimenezdeveloper/margenx/tree/main/docs/manual-usuario'

  beforeEach(() => {
    mockIsLoading = false
  })

  it.each([
    ['administrador', { id: 'u-admin', role: 'ADMIN' as const, email: 'admin.panaderia@seed.example.test' }],
    ['colaborador', { id: 'u-colab', role: 'COLLABORATOR' as const, email: 'colab.panaderia@seed.example.test' }],
  ])('Escenario Gherkin "Documentación": el %s llega al manual desde el pie móvil y el de escritorio', (_rol, usuario) => {
    mockUser = usuario
    render(<ProfilePage />)

    // Perfil monta el pie móvil (md:hidden) y el DesktopFooter (hidden md:flex).
    const enlaces = screen.getAllByRole('link', { name: 'Documentación (se abre en una pestaña nueva)' })
    expect(enlaces).toHaveLength(2)
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute('href', MANUAL_EN_MAIN)
      expect(enlace).toHaveAttribute('target', '_blank')
      expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(screen.queryByRole('button', { name: /Documentación/ })).toBeNull()
  })

  it('Escenario Gherkin "Soporte": el pie móvil abre el diálogo de soporte sin teléfono', async () => {
    mockUser = { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' }
    render(<ProfilePage />)

    const [soporteMovil] = screen.getAllByRole('button', { name: 'Soporte' })
    fireEvent.click(soporteMovil)

    const dialogo = await screen.findByRole('dialog', { name: 'Soporte y Documentación' })
    expect(dialogo).toHaveTextContent('soporte@margenx.tech')
    expect(dialogo).not.toHaveTextContent(/WhatsApp/i)
  })
})
