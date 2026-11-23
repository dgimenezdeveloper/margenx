import { createBrowserRouter } from 'react-router-dom'

import LandingPage from './app/page'
import LoginPage from './app/login/page'
import DashboardPage from './app/dashboard/page'
import SuppliesPage from './app/insumos/page'
import ProductsPage from './app/productos/page'
import NewProductPage from './app/productos/nuevo/page'
import ProductDetailPage from './app/productos/[id]/page'
import ProfilePage from './app/perfil/page'
import PrivacyPage from './app/privacidad/page'
import InstallPage from './app/instalar/page'
import SuppliersListPage from './app/proveedores/page'
import SupplierDetailPage from './app/proveedores/[id]/page'
import QuarantinePage from './app/proveedores/cuarentena/page'
import PurchasesPage from './app/compras/page'
import SalesHistoryPage from './app/ventas/page'
import NewSalePage from './app/ventas/nueva/page'
import SaleTicketPage from './app/ventas/[id]/ticket/page'
import CashShiftsPage from './app/ventas/turnos/page'
import CashShiftSummaryPage from './app/ventas/turnos/[id]/page'
import CloseCashShiftPage from './app/ventas/turnos/[id]/cerrar/page'
import NotFoundPage from './app/not-found/page'
import { ProtectedRoute } from './components/protected-route'
import { AdminOnlyRoute } from './components/admin-only-route'
import { FeatureRoute } from './components/feature-route'

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