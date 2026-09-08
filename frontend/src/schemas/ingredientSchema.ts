import { z } from 'zod'

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  unit: z.enum(['kg', 'litro', 'unidad', 'gr', 'ml', 'bidón'], {
    error: 'Selecciona una unidad válida',
  }),
  currentCost: z.coerce.number().positive('El costo debe ser mayor a 0'),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>