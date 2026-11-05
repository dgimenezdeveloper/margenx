import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARS = /^[0-9+\-\s()]+$/
const MIN_PHONE_DIGITS = 6

/**
 * Formulario de alta y edición de proveedor.
 * El backend solo exige el nombre y el formato del email (`parseSupplierInput` en
 * `backend/src/routes/suppliers.ts`); el resto de las reglas son guardas de la pantalla
 * para que el contacto quede usable.
 */
export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribí el nombre del proveedor.')
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  contactPhone: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (PHONE_CHARS.test(value) && value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS),
      'Revisá el teléfono: usá solo números, espacios, guiones, paréntesis o +, con al menos 6 dígitos.'
    ),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || EMAIL_PATTERN.test(value),
      'Revisá el email: tiene que ser como ventas@proveedor.com.ar.'
    ),
  address: z.string().trim().max(200, 'La dirección no puede superar los 200 caracteres.'),
  isActive: z.boolean(),
})

export type SupplierFormInput = z.input<typeof supplierSchema>

export interface SupplierPayload {
  name: string
  contactPhone: string | null
  email: string | null
  address: string | null
  isActive: boolean
}

const emptyToNull = (value: string) => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Arma el cuerpo de POST/PUT: `null` en un campo vacío lo borra al editar. */
export function toSupplierPayload(values: SupplierFormInput): SupplierPayload {
  return {
    name: values.name.trim(),
    contactPhone: emptyToNull(values.contactPhone),
    email: emptyToNull(values.email),
    address: emptyToNull(values.address),
    isActive: values.isActive,
  }
}
