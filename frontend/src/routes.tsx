import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import { Home, Login, ProductDetail, SectionPage } from './components/RoutePages'

export const router = createBrowserRouter([
  { element: <Layout />, children: [
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    { path: '/dashboard', element: <SectionPage section="Dashboard" /> },
    { path: '/insumos', element: <SectionPage section="Insumos" /> },
    { path: '/productos', element: <SectionPage section="Productos" /> },
    { path: '/productos/:id', element: <ProductDetail /> },
  ] },
])