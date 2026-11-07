import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('combina clases simples y filtra valores falsy', () => {
    expect(cn('btn', false, 'btn-primary')).toBe('btn btn-primary');
    expect(cn('box', null, undefined, 'p-4')).toBe('box p-4');
  });

  it('resuelve colisiones de clases Tailwind con merge inteligente', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});