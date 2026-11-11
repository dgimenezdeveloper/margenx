// backend/src/utils/pagination.ts
export const SORTABLE_FIELDS = ['name', 'currentCost', 'updatedAt'] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: SortableField;
  order: 'asc' | 'desc';
  search: string;
}

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawLimit = Number(query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const rawSortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
  const sortBy = (SORTABLE_FIELDS as readonly string[]).includes(rawSortBy)
    ? (rawSortBy as SortableField)
    : 'name';

  const rawOrder = typeof query.order === 'string' ? query.order.toLowerCase() : '';
  const order = rawOrder === 'desc' ? 'desc' : 'asc';

  const rawSearch = typeof query.search === 'string' ? query.search.trim() : '';
  const search = rawSearch.slice(0, 100); // Límite defensivo de longitud

  return { page, limit, sortBy, order, search };
}
// Variantes básicas: término original + versión sin tildes + versión con tildes comunes
  const ACCENT_MAPPING: Record<string, string[]> = {
  a: ['a', 'á', 'à', 'ä', 'â'],
  e: ['e', 'é', 'è', 'ë', 'ê'],
  i: ['i', 'í', 'ì', 'ï', 'î'],
  o: ['o', 'ó', 'ò', 'ö', 'ô'],
  u: ['u', 'ú', 'ù', 'ü', 'û'],
};

/**
 * Genera términos alternativos reemplazando vocales simples por sus variantes acentuadas.
 * Para palabras comunes o términos de búsqueda de hasta 3 vocales, genera las variantes más probables.
 */
export function buildDiacriticSearchConditions(
  field: string,
  term: string
): Array<Record<string, unknown>> {
  const cleanTerm = term.trim();
  if (!cleanTerm) return [];

  const normalizedWithoutAccents = cleanTerm
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const termsSet = new Set<string>([cleanTerm, normalizedWithoutAccents]);

  // Si la palabra contiene vocales sin acentuar, generar la variante con acento habitual en español
  // Ej: "sesamo" -> "sésamo", "azucar" -> "azúcar"
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  for (const v of vowels) {
    if (normalizedWithoutAccents.includes(v)) {
      const accentedVowel = ACCENT_MAPPING[v]?.[1];
      if (accentedVowel) {
        // Reemplazar la primera ocurrencia de la vocal por su versión acentuada
        termsSet.add(normalizedWithoutAccents.replace(v, accentedVowel));
        // Reemplazar la última ocurrencia (ej. para agudas)
        const lastIdx = normalizedWithoutAccents.lastIndexOf(v);
        if (lastIdx !== -1) {
          const replaced =
            normalizedWithoutAccents.substring(0, lastIdx) +
            accentedVowel +
            normalizedWithoutAccents.substring(lastIdx + 1);
          termsSet.add(replaced);
        }
      }
    }
  }

  return Array.from(termsSet).map((t) => ({
    [field]: { contains: t, mode: 'insensitive' },
  }));
}