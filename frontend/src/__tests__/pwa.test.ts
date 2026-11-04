import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface PngInfo {
  width: number;
  height: number;
  opaque: boolean;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Lee el encabezado IHDR y decide si el PNG puede tener transparencia:
// tipos de color 4 y 6 traen canal alfa, y un bloque tRNS agrega transparencia a los demás.
function readPng(filePath: string): PngInfo {
  const buffer = fs.readFileSync(filePath);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${path.basename(filePath)} no es un PNG`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer.readUInt8(25);
  const hasAlphaChannel = colorType === 4 || colorType === 6;
  const hasTransparencyChunk = buffer.includes(Buffer.from('tRNS', 'ascii'));
  return { width, height, opaque: !hasAlphaChannel && !hasTransparencyChunk };
}

describe('PWA Configuration', () => {
  // process.cwd() apunta a la raíz del paquete frontend durante la ejecución de Vitest
  const publicDir = path.resolve(process.cwd(), 'public');
  const manifestPath = path.join(publicDir, 'manifest.webmanifest');
  const readManifest = () => JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const publicPath = (src: string) => path.join(publicDir, src.replace(/^\//, ''));

  it('manifest.webmanifest existe y tiene los campos obligatorios', () => {
    expect(fs.existsSync(manifestPath), 'Falta manifest.webmanifest').toBe(true);

    const manifest = readManifest();

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
    const icons: ManifestIcon[] = readManifest().icons;

    icons.forEach((icon) => {
      expect(fs.existsSync(publicPath(icon.src)), `Falta el ícono: ${icon.src}`).toBe(true);
    });
  });

  it('cada ícono del manifest mide exactamente lo que declara en sizes', () => {
    const icons: ManifestIcon[] = readManifest().icons;

    icons.forEach((icon) => {
      const { width, height } = readPng(publicPath(icon.src));
      expect(`${width}x${height}`, `Tamaño real de ${icon.src}`).toBe(icon.sizes);
    });
  });

  it('declara íconos de 192 y 512 px de uso general y uno de 512 px maskable opaco', () => {
    const icons: ManifestIcon[] = readManifest().icons;
    const generalSizes = icons.filter((icon) => !icon.purpose || icon.purpose.includes('any')).map((icon) => icon.sizes);
    const maskable = icons.find((icon) => icon.purpose?.includes('maskable'));

    expect(generalSizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(maskable?.sizes).toBe('512x512');
    // El sistema recorta el ícono maskable con su propia forma: un fondo transparente quedaría negro o vacío.
    expect(readPng(publicPath(maskable!.src)).opaque, 'El ícono maskable debe ser opaco').toBe(true);
  });

  it('apple-touch-icon.png mide 180x180 y es opaco para iOS', () => {
    const appleIconPath = path.join(publicDir, 'apple-touch-icon.png');
    expect(fs.existsSync(appleIconPath), 'Falta apple-touch-icon.png').toBe(true);

    // iOS rellena la transparencia con negro, por eso el ícono no debe tener canal alfa.
    expect(readPng(appleIconPath)).toEqual({ width: 180, height: 180, opaque: true });
  });

  it('robots.txt y favicon.ico existen y favicon.ico es un ICO real', () => {
    expect(fs.existsSync(path.join(publicDir, 'robots.txt')), 'Falta robots.txt').toBe(true);
    const faviconPath = path.join(publicDir, 'favicon.ico');
    expect(fs.existsSync(faviconPath), 'Falta favicon.ico').toBe(true);

    // Cabecera de un archivo ICO: reservado (0), tipo 1 (ícono).
    const header = fs.readFileSync(faviconPath).subarray(0, 4);
    expect([...header], 'favicon.ico no tiene cabecera ICO').toEqual([0, 0, 1, 0]);
  });
});
