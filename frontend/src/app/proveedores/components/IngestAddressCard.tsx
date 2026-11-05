import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Mail } from 'lucide-react'

const NOTICE_MS = 3000

type CopyState = 'idle' | 'copied' | 'failed'

interface IngestAddressCardProps {
  address: string
}

/** Dirección de ingesta del comercio, con botón para copiarla y dársela a los proveedores. */
export function IngestAddressCard({ address }: IngestAddressCardProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const show = (next: CopyState) => {
    if (timer.current) clearTimeout(timer.current)
    setState(next)
    timer.current = setTimeout(() => setState('idle'), NOTICE_MS)
  }

  const copy = async () => {
    // Sin HTTPS (o en navegadores viejos) no hay portapapeles: se avisa cómo copiarla a mano.
    if (!navigator.clipboard) {
      show('failed')
      return
    }
    try {
      await navigator.clipboard.writeText(address)
      show('copied')
    } catch {
      show('failed')
    }
  }

  const copied = state === 'copied'

  return (
    <section
      aria-labelledby="ingest-address-heading"
      className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-indigo-900/60 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Mail className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ingest-address-heading" className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Dirección para tus listas de precios
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Pedile a tus proveedores que manden sus listas a esta dirección, o reenviá a esta dirección las que te lleguen
            por mail o WhatsApp. MargenX actualiza los costos de los insumos que tengan su código de artículo.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2.5 font-mono text-sm font-semibold break-all text-gray-900 select-all dark:bg-gray-800 dark:text-gray-100">
          {address}
        </p>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar dirección"
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copiada' : 'Copiar'}
        </button>
      </div>

      <p aria-live="polite" className="mt-2 min-h-4 text-xs font-semibold">
        {state === 'copied' && (
          <span className="text-emerald-700 dark:text-emerald-400">Dirección copiada. Pasásela a tu proveedor.</span>
        )}
        {state === 'failed' && (
          <span className="text-rose-700 dark:text-rose-400">
            No se pudo copiar. Mantené presionada la dirección (o seleccionala) para copiarla a mano.
          </span>
        )}
      </p>
    </section>
  )
}
