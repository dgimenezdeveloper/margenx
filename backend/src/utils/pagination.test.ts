// src/utils/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { parsePaginationParams } from './pagination';

describe('parsePaginationParams', () => {
  it('aplica los defaults cuando no se envía ningún parámetro', () => {
    expect(parsePaginationParams({})).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'name',
      order: 'asc',
    });
  });

  it('respeta page y limit válidos', () => {
    expect(parsePaginationParams({ page: '2', limit: '10' })).toEqual({
      page: 2,
      limit: 10,
      sortBy: 'name',
      order: 'asc',
    });
  });

  it('cae al default si page o limit no son enteros positivos', () => {
    expect(parsePaginationParams({ page: '-1', limit: '0' })).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'name',
      order: 'asc',
    });
    expect(parsePaginationParams({ page: 'abc', limit: 'xyz' })).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'name',
      order: 'asc',
    });
  });

  it('trunca limit al máximo permitido (100)', () => {
    expect(parsePaginationParams({ limit: '99999' }).limit).toBe(100);
  });

  it('acepta los sortBy permitidos', () => {
    for (const field of ['name', 'currentCost', 'updatedAt']) {
      expect(parsePaginationParams({ sortBy: field }).sortBy).toBe(field);
    }
  });

  it('cae a "name" si sortBy no es un campo permitido', () => {
    expect(parsePaginationParams({ sortBy: 'accountId' }).sortBy).toBe('name');
    expect(parsePaginationParams({ sortBy: 123 }).sortBy).toBe('name');
  });

  it('acepta "asc"/"desc" sin distinguir mayúsculas', () => {
    expect(parsePaginationParams({ order: 'DESC' }).order).toBe('desc');
    expect(parsePaginationParams({ order: 'asc' }).order).toBe('asc');
  });

  it('cae a "asc" si order no es válido', () => {
    expect(parsePaginationParams({ order: 'random' }).order).toBe('asc');
  });
});