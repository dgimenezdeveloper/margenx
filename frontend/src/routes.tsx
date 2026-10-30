import { createBrowserRouter, Navigate } from 'react-router-dom'

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
import QuarantinePage from './app/proveedores/cuarentena/page' // NUEVO
import { ProtectedRoute } from './components/protected-route'
import { AdminOnlyRoute } from './components/admin-only-route'

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
    path: '/proveedores/cuarentena', // NUEVO
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <QuarantinePage />
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
    element: <ProtectedRoute><NewProductPage /></ProtectedRoute>,
  },
  {
    path: '/productos/:id',
    element: <ProtectedRoute><ProductDetailPage /></ProtectedRoute>,
  },
  {
    path: '/perfil',
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])