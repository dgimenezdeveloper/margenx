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