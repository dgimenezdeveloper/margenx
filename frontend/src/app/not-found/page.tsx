import { useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { Search } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar title="Página no encontrada" />
          <div className="mt-12">
            <EmptyState
              icon={<Search className="size-6" />}
              title="Error 404"
              description="La página que estás buscando no existe o fue movida."
              actionLabel="Volver al Dashboard"
              onAction={() => navigate('/dashboard')}
            />
          </div>
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />
    </main>
  )
}