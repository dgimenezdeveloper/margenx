'use client'

import { useState } from 'react'
import { SupportDocsModal } from './support-docs-modal'

export function DesktopFooter() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <footer className="hidden md:flex mt-auto w-full items-center justify-between border-t border-gray-200/60 py-6 text-sm text-gray-500 dark:border-gray-800/60 dark:text-gray-400">
        <p>© {new Date().getFullYear()} MargenX. Todos los derechos reservados.</p>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsModalOpen(true)} className="transition-colors hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
            Soporte
          </button>
          <button onClick={() => setIsModalOpen(true)} className="transition-colors hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
            Documentación
          </button>
          <span className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium dark:bg-gray-800">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            Sistemas en línea
          </span>
        </div>
      </footer>

      <SupportDocsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}