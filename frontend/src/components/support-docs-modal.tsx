import { X, MessageCircle, FileText, Mail } from 'lucide-react'
import { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

interface SupportDocsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SupportDocsModal({ isOpen, onClose }: SupportDocsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md text-left">
          <div className="flex items-center justify-between mb-6">
            <DialogTitle className="text-xl">Soporte y Documentación</DialogTitle>
            <DialogClose aria-label="Cerrar soporte y documentación" className="flex min-h-11 min-w-11 items-center justify-center cursor-pointer rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <X className="size-5" />
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            Canales de contacto con el equipo de MargenX y acceso a la guía de usuario.
          </DialogDescription>

          <div className="space-y-4">
            <a
              href="https://wa.me/5491162193426?text=Hola%20equipo%20de%20MargenX,%20necesito%20asistencia."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-gray-700 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 group"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <MessageCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">WhatsApp Oficial</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">+54 9 11 6219-3426</p>
              </div>
            </a>

            <a
              href="mailto:soporte@margenx.tech"
              className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition hover:border-indigo-500 hover:bg-indigo-50 dark:border-gray-700 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 group"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <Mail className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400">Correo de Asistencia</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">soporte@margenx.tech</p>
              </div>
            </a>

            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 opacity-80">
              <div className="flex size-10 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Guía de Usuario</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Guía oficial en PDF (Disponible en versión 1.0)</p>
              </div>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
