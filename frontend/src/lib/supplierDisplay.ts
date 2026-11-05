import type { Supplier } from '@/services/supplierService'

const EMPTY = '—'

/**
 * La API manda los decimales como texto con punto (`"25.500"`, Prisma.Decimal).
 * Se leen con `Number` y no con `parseNumeroAR`, que tomaría ese punto como separador de miles.
 */
function toApiNumber(value: number | string): number | null {
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const decimalFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 })
const moneyFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

/** Tamaño del bulto con su unidad de costeo: "25,5 kg". */
export function formatPackage(size: number | string, unit: string): string {
  const parsed = toApiNumber(size)
  return parsed === null ? EMPTY : `${decimalFormat.format(parsed)} ${unit}`
}

/** Precio del bulto en pesos: "$35.000,5". */
export function formatPackagePrice(price: number | string): string {
  const parsed = toApiNumber(price)
  return parsed === null ? EMPTY : `$${moneyFormat.format(parsed)}`
}

type ContactFields = Partial<Pick<Supplier, 'contactPhone' | 'email' | 'address'>>

/** Dato de contacto principal (teléfono, si no email, si no dirección) y uno secundario. */
export function supplierContact(supplier: ContactFields): { primary: string | null; secondary: string | null } {
  const values = [supplier.contactPhone, supplier.email, supplier.address]
    .map((value) => value?.trim() ?? '')
    .filter((value) => value !== '')

  return { primary: values[0] ?? null, secondary: values[1] ?? null }
}
