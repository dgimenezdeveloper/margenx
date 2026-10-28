import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from '../useTheme';

describe('useTheme hook / store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('permite alternar el tema claro y oscuro', () => {
    useTheme.getState().setTheme(false);
    expect(useTheme.getState().isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    useTheme.getState().toggleTheme();
    expect(useTheme.getState().isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('alterna tema de claro a oscuro y viceversa cubriendo todas las ramas', () => {
    useTheme.getState().setTheme(false)
    useTheme.getState().toggleTheme() // pasa a dark
    expect(useTheme.getState().isDark).toBe(true)
    useTheme.getState().toggleTheme() // pasa a light
    expect(useTheme.getState().isDark).toBe(false)
  })

  it('permite fijar explícitamente el tema con setTheme', () => {
    useTheme.getState().setTheme(true);
    expect(useTheme.getState().isDark).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    useTheme.getState().setTheme(false);
    expect(useTheme.getState().isDark).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});