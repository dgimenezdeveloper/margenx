import type { BulkUploadResponse } from '@/services/ingredientService'

function plural(count: number, singular: string, pluralWord: string): string {
  return `${count} ${count === 1 ? singular : pluralWord}`
}

/**
 * Aviso al terminar la carga desde planilla (#433): "Se cargaron 3 insumos." y, si los hay,
 * los repetidos y los errores ("2 repetidos y 1 con error.").
 */
export function bulkUploadNotice({ created, skipped, errors }: BulkUploadResponse): string {
  const loaded =
    created === 0 ? 'No se cargó ningún insumo.' : created === 1 ? 'Se cargó 1 insumo.' : `Se cargaron ${created} insumos.`
  const extras = [
    skipped > 0 ? plural(skipped, 'repetido', 'repetidos') : null,
    errors.length > 0 ? `${errors.length} con error` : null,
  ].filter((part): part is string => part !== null)
  return extras.length > 0 ? `${loaded} ${extras.join(' y ')}.` : loaded
}
