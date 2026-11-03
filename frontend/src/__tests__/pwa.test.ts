import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Configuration', () => {
  // process.cwd() apunta a la raíz del paquete frontend durante la ejecución de Vitest
  const publicDir = path.resolve(process.cwd(), 'public');
  const manifestPath = path.join(publicDir, 'manifest.webmanifest');

  it('manifest.webmanifest existe y tiene los campos obligatorios', () => {
    expect(fs.existsSync(manifestPath), 'Falta manifest.webmanifest').toBe(true);

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    expect(manifest.name).toBe('MargenX');
    expect(manifest.short_name).toBeDefined();
    expect(manifest.lang).toBe('es-AR');
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/dashboard?source=pwa');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBeDefined();
    expect(manifest.theme_color).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });

  it('los íconos declarados en el manifest existen físicamente', () => {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    manifest.icons.forEach((icon: { src: string }) => {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath), `Falta el ícono: ${icon.src}`).toBe(true);
    });
  });

  it('apple-touch-icon.png existe para iOS', () => {
    const appleIconPath = path.join(publicDir, 'apple-touch-icon.png');
    expect(fs.existsSync(appleIconPath), 'Falta apple-touch-icon.png').toBe(true);
  });

  it('robots.txt y favicon.ico existen', () => {
    expect(fs.existsSync(path.join(publicDir, 'robots.txt')), 'Falta robots.txt').toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'favicon.ico')), 'Falta favicon.ico').toBe(true);
  });
});