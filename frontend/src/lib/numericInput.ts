import type React from 'react'

/**
 * Sanea cualquier valor de entrada asegurando que solo contenga dígitos numéricos (0-9)
 * y como máximo un único punto decimal, colapsando cualquier punto adicional al pegar texto
 * (ej: "12.34.56" -> "12.3456").
 */
export function sanitizeDecimal(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return cleaned
  return `${parts[0]}.${parts.slice(1).join('')}`
}

/**
 * Sanea un importe escrito en es-AR sin reinterpretarlo: deja dígitos, los puntos de miles y una
 * sola coma decimal, y descarta los separadores que aparezcan después de la coma
 * (ej: "$ 1.234,56" -> "1.234,56"; "1.234,5,6" -> "1.234,56").
 * La conversión a número la hace parseNumeroAR (`src/lib/numericFormat.ts`): "1.250" es 1250.
 */
export function sanitizeDecimalAR(val: string): string {
  const cleaned = val.replace(/[^0-9.,]/g, '')
  const comma = cleaned.indexOf(',')
  if (comma === -1) return cleaned
  return cleaned.slice(0, comma + 1) + cleaned.slice(comma + 1).replace(/[.,]/g, '')
}

/**
 * Teclado de un importe en es-AR: el punto separa miles y la coma es el decimal.
 * Bloquea la coma o el punto al principio, una segunda coma y un punto después de la coma.
 * Tiene en cuenta el texto seleccionado, que la tecla reemplaza. El resto, como handleNumericKeyDown.
 */
export function handleDecimalARKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (e.key !== ',' && e.key !== '.') {
    handleNumericKeyDown(e)
    return
  }
  const { value, selectionStart, selectionEnd } = e.currentTarget
  const start = selectionStart ?? value.length
  const end = selectionEnd ?? value.length
  const before = value.slice(0, start)
  const remaining = before + value.slice(end)
  if (before === '' || remaining.includes(',')) {
    e.preventDefault()
  }
}

/**
 * Bloquea físicamente a nivel de evento de teclado cualquier carácter que no sea un número.
 * Permite teclas de control, navegación (flechas, Home, End), atajos de edición (Ctrl/Cmd)
 * y previene tipear un segundo punto decimal si ya existe uno en el campo.
 */
export function handleNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    '.',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ]

  if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
    if (e.key === '.' && (e.currentTarget.value.includes('.') || e.currentTarget.value === '')) {
      e.preventDefault()
    }
    return
  }

  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault()
  }
}