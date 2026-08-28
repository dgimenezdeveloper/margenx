import { Link, useParams } from 'react-router-dom'

const pageCopy: Record<string, { title: string; description: string }> = {
  Dashboard: { title: 'Tu cocina, en orden.', description: 'Consulta el estado de tu inventario y tus productos desde un solo lugar.' },
  Insumos: { title: 'Insumos', description: 'Administra las materias primas disponibles para tus recetas.' },
  Productos: { title: 'Productos', description: 'Organiza tu catalogo y edita las recetas de cada producto.' },
}

export function Home() {
  return <Page title="Gestiona tu cocina con claridad." description="Una forma sencilla de mantener tus insumos, productos y recetas bajo control."><Link to="/dashboard" className="inline-flex rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Ir al dashboard</Link></Page>
}

export function Login() { return <Page title="Bienvenido de nuevo." description="Inicia sesion para continuar gestionando tu operacion." /> }

export function SectionPage({ section }: { section: keyof typeof pageCopy }) {
  const copy = pageCopy[section]
  return <Page title={copy.title} description={copy.description}><div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Aun no hay registros para mostrar.</div></Page>
}

export function ProductDetail() {
  const { id } = useParams()
  return <Page title={`Editar receta ${id ?? ''}`} description="Actualiza los insumos y cantidades de este producto." />
}

function Page({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div><p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange-500">Mesalista</p><h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 lg:text-6xl">{title}</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{description}</p>{children}</div>
}