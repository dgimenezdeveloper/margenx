import { describe, expect, it } from 'vitest'

import { CANONICAL_FOCUS_CLASSES } from '../accessibility'

describe('CANONICAL_FOCUS_CLASSES (#361)', () => {
  const classes = CANONICAL_FOCUS_CLASSES.split(' ')

  it('dibuja un contorno índigo de 2 px al navegar con teclado, en claro y en oscuro', () => {
    expect(classes).toEqual(
      expect.arrayContaining([
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-indigo-600',
        'dark:focus-visible:outline-indigo-400',
      ])
    )
  })

  it('no incluye outline-none, que en Tailwind 4 deja el contorno invisible al tabular', () => {
    // focus:outline-none fija --tw-outline-style: none, y focus-visible:outline-2 toma su estilo de
    // esa variable: con las dos clases, el control enfocado queda sin contorno ([RV387-B2]).
    expect(classes.filter((cls) => /(^|:)outline-none$/.test(cls))).toEqual([])
  })
})
