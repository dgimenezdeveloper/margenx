// backend/src/utils/pagination.test.ts
import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  normalizeSearchText,
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

  describe('normalizeSearchText', () => {
    it('normaliza a minúsculas y elimina espacios iniciales/finales', () => {
      expect(normalizeSearchText('  HARINA 000  ')).toBe('harina 000');
    });

    it('elimina tildes simples y diacríticos estándar', () => {
      expect(normalizeSearchText('Semillas de sésamo')).toBe('semillas de sesamo');
      expect(normalizeSearchText('Azúcar')).toBe('azucar');
      expect(normalizeSearchText('Almidón')).toBe('almidon');
    });

    it('resuelve nombres con dos tildes', () => {
      expect(normalizeSearchText('Azúcar común')).toBe('azucar comun');
      expect(normalizeSearchText('azúcar común')).toBe('azucar comun');
      expect(normalizeSearchText('Almidón de maíz')).toBe('almidon de maiz');
      expect(normalizeSearchText('Jabón líquido')).toBe('jabon liquido');
    });

    it('descompone la letra ñ en n mediante NFD', () => {
      expect(normalizeSearchText('Cañoncitos con dulce de leche')).toBe('canoncitos con dulce de leche');
      expect(normalizeSearchText('cañoncitos')).toBe('canoncitos');
      expect(normalizeSearchText('CANONCITOS')).toBe('canoncitos');
    });

    it('maneja strings vacíos o compuestos solo por espacios', () => {
      expect(normalizeSearchText('')).toBe('');
      expect(normalizeSearchText('    ')).toBe('');
    });
  });
});