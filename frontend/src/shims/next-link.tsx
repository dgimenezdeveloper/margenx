import type React from 'react'
import { Link as RouterLink } from 'react-router-dom'

type LinkProps = Omit<React.ComponentProps<typeof RouterLink>, 'to'> & {
  href?: string
  to?: string
}

export default function Link({ href, to, ...props }: LinkProps) {
  return (
    <RouterLink to={href ?? to ?? '/'} {...props} />
  )
}