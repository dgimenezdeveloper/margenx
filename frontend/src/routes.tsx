import { createBrowserRouter } from 'react-router-dom'

import LandingPage from './app/page'
import LoginPage from './app/login/page'
import InstallPage from './app/instalar/page'
import PrivacyPage from './app/privacidad/page'
import NotFoundPage from './app/not-found/page'
import { ProtectedRoute } from './components/protected-route'
import { AdminOnlyRoute } from './components/admin-only-route'
import { FeatureRoute } from './components/feature-route'
import { lazyPage } from './lib/lazyPage'

// Cada pantalla con sesión se baja al abrirla (#398). Las públicas (landing, login, privacidad e instalación) van en el
// bundle principal: se abren por enlace directo y bajarlas aparte demoraba su primer pintado (LCP). La de "no encontrada"
// también, porque FeatureRoute la importa directo y cargarla bajo demanda no la sacaba del bundle.
const DashboardPage = lazyPage(() => import('./app/dashboard/page'))
const SuppliesPage = lazyPage(() => import('./app/insumos/page'))
const ProductsPage = lazyPage(() => import('./app/productos/page'))
const NewProductPage = lazyPage(() => import('./app/productos/nuevo/page'))
const ProductDetailPage = lazyPage(() => import('./app/productos/[id]/page'))
const ProfilePage = lazyPage(() => import('./app/perfil/page'))
const SuppliersListPage = lazyPage(() => import('./app/proveedores/page'))
const SupplierDetailPage = lazyPage(() => import('./app/proveedores/[id]/page'))
const QuarantinePage = lazyPage(() => import('./app/proveedores/cuarentena/page'))
const PurchasesPage = lazyPage(() => import('./app/compras/page'))
const SalesHistoryPage = lazyPage(() => import('./app/ventas/page'))
const NewSalePage = lazyPage(() => import('./app/ventas/nueva/page'))
const SaleTicketPage = lazyPage(() => import('./app/ventas/[id]/ticket/page'))
const CashShiftsPage = lazyPage(() => import('./app/ventas/turnos/page'))
const RealProfitPage = lazyPage(() => import('./app/ventas/ganancia/page'))
const CashShiftSummaryPage = lazyPage(() => import('./app/ventas/turnos/[id]/page'))
const CloseCashShiftPage = lazyPage(() => import('./app/ventas/turnos/[id]/cerrar/page'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login/*',
    element: <LoginPage />,
  },
  {
    path: '/privacidad',
    element: <PrivacyPage />,
  },
  {
    path: '/instalar',
    element: <InstallPage />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/insumos',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <SuppliesPage />
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/proveedores',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <SuppliersListPage />
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/proveedores/:id',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <SupplierDetailPage />
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/proveedores/cuarentena',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <QuarantinePage />
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/compras',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <PurchasesPage />
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/productos',
    element: <ProtectedRoute><ProductsPage /></ProtectedRoute>,
  },
  {
    path: '/productos/nuevo',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <NewProductPage />
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/productos/:id',
    element: <ProtectedRoute><ProductDetailPage /></ProtectedRoute>,
  },
  {
    path: '/ventas',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <SalesHistoryPage />
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ventas/nueva',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <NewSalePage />
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ventas/:id/ticket',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <SaleTicketPage />
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    // Ganancia real: datos financieros, solo para el ADMIN (especificación §8 y ADR-010).
    path: '/ventas/ganancia',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <AdminOnlyRoute>
            <RealProfitPage />
          </AdminOnlyRoute>
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ventas/turnos',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <CashShiftsPage />
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ventas/turnos/:id',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <CashShiftSummaryPage />
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ventas/turnos/:id/cerrar',
    element: (
      <ProtectedRoute>
        <FeatureRoute feature="sales">
          <CloseCashShiftPage />
        </FeatureRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/perfil',
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
  },
  {
    path: '*',
    element: (
      <ProtectedRoute>
        <NotFoundPage />
      </ProtectedRoute>
    ),
  },
])