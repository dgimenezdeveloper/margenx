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
  const search = rawSearch.slice(0, 100);

  return { page, limit, sortBy, order, search };
}

/**
 * Normaliza el texto para búsquedas eliminando tildes y diacríticos.
 * Al usar NFD, la "ñ" se descompone en "n" + "~", y el replace elimina la virgulilla (\u0300-\u036f).
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}