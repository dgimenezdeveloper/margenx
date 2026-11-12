/**
 * Formato es-AR compartido para todo lo que se muestra en pantalla: importes, porcentajes,
 * cantidades y unidades. Coma decimal, punto de miles ("1.234,56") y espacio duro antes del
 * signo de porcentaje ("36,9 %"), como lo escribe un comercio argentino.
 *
 * Solo formatea: los valores que viajan a la API siguen siendo números o texto decimal con punto.
 */

const NBSP = ' '

type Numeric = number | string | null | undefined

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function formatDecimal(num: number, minDecimals: number, maxDecimals: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(num)
}

/** "$1.234,56". Con `decimals: 0` redondea a pesos enteros ("$1.235"). */
export function formatMoney(value: Numeric, options: { decimals?: number } = {}): string {
  const num = toNumber(value)
  if (num === null) return '—'
  const decimals = options.decimals ?? 2
  const sign = num < 0 ? '-' : ''
  return `${sign}$${formatDecimal(Math.abs(num), decimals, decimals)}`
}

/**
 * "36,9 %". Con `signed: true` antepone "+" a los positivos ("+119,0 %"). Para umbrales que
 * carga el usuario, `minDecimals: 0` evita ceros sobrantes ("30 %", "32,5 %").
 */
export function formatPercent(
  value: Numeric,
  options: { decimals?: number; minDecimals?: number; signed?: boolean } = {}
): string {
  const num = toNumber(value)
  if (num === null) return '—'
  const decimals = options.decimals ?? 1
  const sign = options.signed && num > 0 ? '+' : ''
  // Evita "-0,0 %" cuando el valor redondeado es cero.
  const rounded = Number(num.toFixed(decimals))
  return `${sign}${formatDecimal(rounded === 0 ? 0 : rounded, options.minDecimals ?? decimals, decimals)}${NBSP}%`
}

/** "0,7" o "1.250": cantidades sin ceros sobrantes, hasta 3 decimales por defecto. */
export function formatQuantity(value: Numeric, maxDecimals = 3): string {
  const num = toNumber(value)
  if (num === null) return ''
  return formatDecimal(num, 0, maxDecimals)
}

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  g: 'g',
  l: 'litro',
  ml: 'ml',
  u: 'unidad',
  unit: 'unidad',
  unidad: 'unidad',
  litro: 'litro',
}

/** Nombre legible de la unidad interna: "u" y el valor heredado "unit" se leen como "unidad". */
export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return ''
  return UNIT_LABELS[unit.trim().toLowerCase()] ?? unit
}

/** "0,7 kg", "3 unidad". */
export function formatQuantityWithUnit(value: Numeric, unit: string | null | undefined, maxDecimals = 3): string {
  return `${formatQuantity(value, maxDecimals)} ${formatUnit(unit)}`.trim()
}
