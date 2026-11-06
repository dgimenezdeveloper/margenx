import { z } from 'zod'

const MAX_PACKAGE_SIZE = 9_999_999.999
const MAX_PACKAGE_PRICE = 99_999_999.99

export const supplierPresentationSchema = z.object({
  supplierCode: z
    .string()
    .trim()
    .max(64, 'El código no puede superar 64 caracteres.')
    .optional()
    .or(z.literal('')),
  rawDescription: z
    .string()
    .trim()
    .max(500, 'La descripción no puede superar 500 caracteres.')
    .optional()
    .or(z.literal('')),
  packageSize: z.coerce
    .number({ error: 'Ingresá una cantidad válida' })
    .positive('El tamaño del bulto debe ser mayor a 0')
    .max(MAX_PACKAGE_SIZE, 'El tamaño no puede superar 9.999.999,999'),
  packagePrice: z.coerce
    .number({ error: 'Ingresá un precio válido' })
    .positive('El precio debe ser mayor a 0')
    .max(MAX_PACKAGE_PRICE, 'El precio no puede superar $99.999.999,99'),
  isDefault: z.boolean().default(false),
})

export type SupplierPresentationInput = z.input<typeof supplierPresentationSchema>
export type SupplierPresentationFormValues = z.output<typeof supplierPresentationSchema>