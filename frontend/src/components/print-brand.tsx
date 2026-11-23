import { BRAND_TAGLINE, TICKET_BRAND_SIGNATURE } from '@/lib/sales'

/**
 * Logo completo de MargenX y lema, arriba de lo que se imprime (ticket y cierre de caja).
 * En la ticketera, `lib/print.ts` pasa el logo a negro y oculta el lema.
 */
export function PrintBrandHeader() {
  return (
    <>
      <img
        src="/logo.png"
        alt="MargenX"
        width={644}
        height={249}
        className="mx-ticket-logo mx-auto h-auto w-40 dark:brightness-0 dark:invert"
      />
      <p className="mx-ticket-tagline mb-3 font-sans text-[11px] text-gray-500 dark:text-gray-400 print:text-black">
        {BRAND_TAGLINE}
      </p>
    </>
  )
}

/** Firma de MargenX al pie de lo que se imprime. */
export function PrintBrandSignature() {
  return <p className="mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400 print:text-black">{TICKET_BRAND_SIGNATURE}</p>
}
