// backend/src/utils/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { parsePaginationParams, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from './pagination';

describe('parsePaginationParams', () => {
  it('aplica valores por defecto si no se envían parámetros', () => {
    const result = parsePaginationParams({});
    expect(result).toEqual({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT, sortBy: 'name', order: 'asc' });
  });

  it('parsea page y limit correctamente si son números válidos', () => {
    const result = parsePaginationParams({ page: '2', limit: '50' });
    expect(result).toEqual({ page: 2, limit: 50, sortBy: 'name', order: 'asc' });
  });

  it('usa los valores por defecto si page o limit son inválidos (letras, negativos, cero)', () => {
    expect(parsePaginationParams({ page: 'abc', limit: '-5' })).toEqual(
      expect.objectContaining({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT })
    );
    expect(parsePaginationParams({ page: '0', limit: '0' })).toEqual(
      expect.objectContaining({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT })
    );
  });

  it('limita el parámetro limit al máximo permitido (MAX_LIMIT)', () => {
    const result = parsePaginationParams({ limit: '999' });
    expect(result.limit).toBe(MAX_LIMIT);
  });

  it('permite ordenar por campos de la allowlist', () => {
    const result = parsePaginationParams({ sortBy: 'currentCost' });
    expect(result.sortBy).toBe('currentCost');
  });

  it('usa "name" por defecto si sortBy no está en la allowlist', () => {
    const result = parsePaginationParams({ sortBy: 'invalidField' });
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
});