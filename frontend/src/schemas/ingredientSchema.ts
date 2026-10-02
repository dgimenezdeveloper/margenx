import { z } from 'zod'

const MAX_INGREDIENT_COST = 99_999_999.99

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  unit: z.enum(['kg', 'litro', 'unidad', 'gr', 'ml', 'bidón'], {
    error: 'Selecciona una unidad válida',
  }),
  currentCost: z.coerce
    .number()
    .positive('El costo debe ser mayor a 0')
    .max(MAX_INGREDIENT_COST, 'El insumo no puede superar $99.999.999,99.'),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>