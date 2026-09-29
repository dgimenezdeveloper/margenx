import { Check, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error'

interface ToastAlertProps {
  message: string
  type?: ToastType
}

export function ToastAlert({ message, type = 'success' }: ToastAlertProps) {
  return (
    <div
      className={`fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-4 ${
        type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {type === 'success' ? <Check className="size-5 shrink-0" /> : <AlertTriangle className="size-5 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}

export default ToastAlert
