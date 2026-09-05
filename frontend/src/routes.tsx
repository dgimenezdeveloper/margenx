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
    element: <DashboardPage />,
  },
  {
    path: '/insumos',
    element: <SuppliesPage />,
  },
  {
    path: '/productos',
    element: <ProductsPage />,
  },
  {
    path: '/productos/nuevo',
    element: <NewProductPage />,
  },
  {
    path: '/productos/hamburguesa-doble',
    element: <ProductDetailPage />,
  },
  {
    path: '/perfil',
    element: <ProfilePage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])