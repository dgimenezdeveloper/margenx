import { Fragment } from 'react'
import { cn } from '@/lib/utils'

/**
 * Correo que, si no entra en el renglón, se corta antes de "@" o de un punto y no a mitad de palabra (#497).
 * `break-words` queda solo para un tramo que no entre ni solo en un renglón.
 */
export function EmailText({ email, className }: { email: string; className?: string }) {
  const parts = email.split(/(?=[@.])/)
  return (
    <span className={cn('break-words', className)}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </span>
  )
}
