import { createBrowserRouter, Navigate } from 'react-router-dom'

// Importaciones directas relativas desde src/routes.tsx hacia src/app/
import LandingPage from './app/page'
import LoginPage from './app/login/page'
import DashboardPage from './app/dashboard/page'
import SuppliesPage from './app/insumos/page'
import ProductsPage from './app/productos/page'
import NewProductPage from './app/productos/nuevo/page'
import ProductDetailPage from './app/productos/hamburguesa-doble/page'
import ProfilePage from './app/perfil/page'
import { ProtectedRoute } from './components/protected-route'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/insumos',
    element: <ProtectedRoute><SuppliesPage /></ProtectedRoute>,
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
    path: '/productos/hamburguesa-doble',
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