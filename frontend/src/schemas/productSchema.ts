import { z } from 'zod'

const MAX_SALE_PRICE = 99_999_999.99
const MAX_MARGIN_DB = 999.99

export const productSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  salePrice: z.coerce
    .number()
    .positive('El precio de venta debe ser mayor a 0')
    .max(MAX_SALE_PRICE, 'El precio de venta no puede superar $99.999.999,99.'),
  minMarginPercent: z.coerce
    .number()
    .min(0, 'El margen mínimo debe ser mayor o igual a 0')
    .max(MAX_MARGIN_DB, 'El margen no puede superar el 999.99%'),
})

export type ProductFormValues = z.infer<typeof productSchema>