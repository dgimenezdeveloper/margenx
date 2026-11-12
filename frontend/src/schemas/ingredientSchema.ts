import { z } from 'zod'
import { parseNumeroAR } from '@/lib/numericFormat'

const MAX_INGREDIENT_COST = 99_999_999.99

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  unit: z.enum(['kg', 'litro', 'unidad'], {
    error: 'Selecciona una unidad válida',
  }),
  // Acepta lo que escribe el usuario en es-AR ("2.179,13") y el decimal con punto de la API.
  currentCost: z.preprocess(
    (value) => (typeof value === 'string' ? parseNumeroAR(value) || value : value),
    z.coerce.number()
    .positive('El costo debe ser mayor a 0')
    .max(MAX_INGREDIENT_COST, 'El insumo no puede superar $99.999.999,99.')
  ),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>