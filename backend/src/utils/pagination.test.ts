// backend/src/utils/pagination.test.ts
import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  buildDiacriticSearchConditions,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SORTABLE_FIELDS,
} from './pagination';

describe('pagination utility', () => {
  describe('parsePaginationParams', () => {
    it('aplica valores por defecto si no se envían parámetros', () => {
      const result = parsePaginationParams({});
      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        sortBy: 'name',
        order: 'asc',
        search: '',
      });
    });

    it('parsea page y limit correctamente si son números válidos', () => {
      const result = parsePaginationParams({ page: '2', limit: '50' });
      expect(result).toEqual({
        page: 2,
        limit: 50,
        sortBy: 'name',
        order: 'asc',
        search: '',
      });
    });

    it('usa los valores por defecto si page o limit son inválidos (letras, negativos, cero)', () => {
      expect(parsePaginationParams({ page: 'abc', limit: '-5' })).toEqual(
        expect.objectContaining({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT, search: '' })
      );
      expect(parsePaginationParams({ page: '0', limit: '0' })).toEqual(
        expect.objectContaining({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT, search: '' })
      );
    });

    it('limita el parámetro limit al máximo permitido (MAX_LIMIT)', () => {
      const result = parsePaginationParams({ limit: '999' });
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it('permite ordenar por campos de la allowlist SORTABLE_FIELDS', () => {
      for (const field of SORTABLE_FIELDS) {
        const result = parsePaginationParams({ sortBy: field });
        expect(result.sortBy).toBe(field);
      }
    });

    it('usa "name" por defecto si sortBy no está en la allowlist', () => {
      const result = parsePaginationParams({ sortBy: 'campo_inexistente' });
      expect(result.sortBy).toBe('name');
    });

    it('parsea order de forma case-insensitive ("DESC" -> "desc")', () => {
      const result = parsePaginationParams({ order: 'DESC' });
      expect(result.order).toBe('desc');
    });

    it('usa "asc" por defecto si order es inválido o no se envía', () => {
      expect(parsePaginationParams({ order: 'invalid' }).order).toBe('asc');
      expect(parsePaginationParams({}).order).toBe('asc');
    });

    it('parsea el parámetro search recortando espacios y limitando a 100 caracteres', () => {
      const result = parsePaginationParams({ search: '  harina 000  ' });
      expect(result.search).toBe('harina 000');

      const longSearch = 'a'.repeat(150);
      expect(parsePaginationParams({ search: longSearch }).search).toHaveLength(100);
    });
  });

  describe('buildDiacriticSearchConditions', () => {
    it('retorna array vacío si el término de búsqueda está vacío o son solo espacios', () => {
      expect(buildDiacriticSearchConditions('name', '')).toEqual([]);
      expect(buildDiacriticSearchConditions('name', '   ')).toEqual([]);
    });

    it('Gherkin: búsqueda sin tildes ("sesamo") genera condición para "sésamo"', () => {
      const conditions = buildDiacriticSearchConditions('name', 'sesamo');
      expect(conditions).toEqual(
        expect.arrayContaining([
          { name: { contains: 'sesamo', mode: 'insensitive' } },
          { name: { contains: 'sésamo', mode: 'insensitive' } },
        ])
      );
    });

    it('Gherkin: búsqueda con tildes ("sésamo") genera condición para "sesamo"', () => {
      const conditions = buildDiacriticSearchConditions('name', 'sésamo');
      expect(conditions).toEqual(
        expect.arrayContaining([
          { name: { contains: 'sésamo', mode: 'insensitive' } },
          { name: { contains: 'sesamo', mode: 'insensitive' } },
        ])
      );
    });

    it('genera variantes acentuadas para "azucar" -> "azúcar"', () => {
      const conditions = buildDiacriticSearchConditions('name', 'azucar');
      expect(conditions).toEqual(
        expect.arrayContaining([
          { name: { contains: 'azucar', mode: 'insensitive' } },
          { name: { contains: 'azúcar', mode: 'insensitive' } },
        ])
      );
    });

    it('genera condición para "frío" cuando se busca "frio" sin tilde', () => {
      const conditions = buildDiacriticSearchConditions('name', 'frio');
      expect(conditions).toEqual(
        expect.arrayContaining([
          { name: { contains: 'frio', mode: 'insensitive' } },
          { name: { contains: 'frío', mode: 'insensitive' } },
        ])
      );
    });

    it('aplica el nombre de campo dinámico provisto (ej. rawDescription, supplierCode)', () => {
      const conditions = buildDiacriticSearchConditions('rawDescription', 'integral');
      expect(conditions.length).toBeGreaterThan(0);
      expect(conditions[0]).toHaveProperty('rawDescription');
    });
  });
});