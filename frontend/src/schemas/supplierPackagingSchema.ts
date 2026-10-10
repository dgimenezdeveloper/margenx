import { z } from 'zod'

const MAX_NUMERIC_VALUE = 99_999_999.99

export const supplierPackagingSchema = z.object({
  supplierId: z.string().min(1, 'Debes seleccionar un proveedor'),
  packageSize: z.coerce
    .number({ error: 'Ingresa una cantidad válida' })
    .positive('El tamaño del bulto debe ser mayor a 0')
    .max(MAX_NUMERIC_VALUE, 'El tamaño no puede superar 99.999.999,99'),
  packageUnit: z.enum(['kg', 'l', 'u'], {
    error: 'Unidad de empaque inválida',
  }),
  packagePrice: z.coerce
    .number({ error: 'Ingresa un precio válido' })
    .positive('El precio del empaque debe ser mayor a 0')
    .max(MAX_NUMERIC_VALUE, 'El precio no puede superar $99.999.999,99'),
  isDefault: z.boolean().default(false),
})

export type SupplierPackagingFormValues = z.infer<typeof supplierPackagingSchema>