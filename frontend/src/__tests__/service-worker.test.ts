import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  pwaOptions,
  isApiRequest,
  isAppNavigation,
  OFFLINE_FALLBACK_URL,
} from '../../pwa.config';

type MatchOptions = { url: URL; request: { mode: string }; sameOrigin: boolean };
type Matcher = (options: MatchOptions) => boolean;

const APP_ORIGIN = 'https://dev.margenx.tech';

function navigation(href: string, sameOrigin = true): MatchOptions {
  return { url: new URL(href, APP_ORIGIN), request: { mode: 'navigate' }, sameOrigin };
}

function fetchRequest(href: string, sameOrigin = false): MatchOptions {
  return { url: new URL(href, APP_ORIGIN), request: { mode: 'cors' }, sameOrigin };
}

// workbox-build copia las funciones al sw.js con toString(): no pueden depender
// de nada definido fuera de su propio cuerpo. Se reconstruyen igual que en el build.
function rebuilt(matcher: Matcher): Matcher {
  return new Function(`return (${matcher.toString()})`)() as Matcher;
}

const workbox = pwaOptions.workbox ?? {};
const runtimeCaching = workbox.runtimeCaching ?? [];

describe('Service worker: rutas que nunca se interceptan', () => {
  it.each([
    '/api/products',
    '/api',
    '/login',
    '/login/factor-one',
    '/login/sso-callback?redirect_url=%2Fproductos',
    '/__clerk/v1/client',
    '/dashboard?__clerk_handshake=abc',
    '/productos?__clerk_db_jwt=abc',
  ])('la navegación a %s no recibe la página Sin conexión', (href) => {
    expect(isAppNavigation(navigation(href))).toBe(false);
  });

  it.each(['/', '/dashboard?source=pwa', '/productos', '/productos/7f3c', '/insumos', '/perfil', '/apis-panaderia'])(
    'la navegación a %s sí tiene respaldo Sin conexión',
    (href) => {
      expect(isAppNavigation(navigation(href))).toBe(true);
    },
  );

  it('no responde navegaciones a otro origen (Clerk, dominio de la API)', () => {
    expect(isAppNavigation(navigation('https://clerk.margenx.tech/v1/client', false))).toBe(false);
  });

  it('no trata como navegación los pedidos de recursos', () => {
    expect(isAppNavigation(fetchRequest('/productos', true))).toBe(false);
  });
});

describe('Service worker: llamadas a la API', () => {
  it.each([
    'https://api.margenx.tech/api/products',
    'https://api-dev.margenx.tech/api/dashboard/summary',
    'http://localhost:3000/api/ingredients?page=2',
  ])('reconoce %s como llamada a la API', (href) => {
    expect(isApiRequest(fetchRequest(href))).toBe(true);
  });

  it.each(['https://clerk.margenx.tech/v1/client', '/assets/index-abc123.js', '/apis-panaderia'])(
    'no confunde %s con la API',
    (href) => {
      expect(isApiRequest(fetchRequest(href))).toBe(false);
    },
  );

  it('la API va en NetworkOnly y sin ninguna opción de caché', () => {
    const apiRule = runtimeCaching.find((rule) => rule.urlPattern === isApiRequest);
    expect(apiRule?.handler).toBe('NetworkOnly');
    expect(apiRule?.options).toBeUndefined();
  });

  it('ninguna regla guarda respuestas en caché en tiempo de ejecución', () => {
    for (const rule of runtimeCaching) {
      expect(rule.handler).toBe('NetworkOnly');
      expect(rule.options?.cacheName).toBeUndefined();
      expect(rule.options?.expiration).toBeUndefined();
    }
  });

  it('la regla de la API va antes que la de navegación', () => {
    const patterns = runtimeCaching.map((rule) => rule.urlPattern);
    expect(patterns.indexOf(isApiRequest)).toBeLessThan(patterns.indexOf(isAppNavigation));
  });
});

describe('Service worker: página Sin conexión', () => {
  it('las navegaciones de la app caen en offline.html cuando falla la red', () => {
    const navigationRule = runtimeCaching.find((rule) => rule.urlPattern === isAppNavigation);
    expect(navigationRule?.handler).toBe('NetworkOnly');
    expect(navigationRule?.options?.precacheFallback?.fallbackURL).toBe(OFFLINE_FALLBACK_URL);
    expect(OFFLINE_FALLBACK_URL).toBe('/offline.html');
  });

  it('no sirve el index.html precacheado para las navegaciones', () => {
    expect(workbox.navigateFallback).toBeNull();
    expect(workbox.directoryIndex).toBeNull();
  });

  it('las funciones siguen funcionando copiadas al sw.js', () => {
    expect(rebuilt(isAppNavigation)(navigation('/productos'))).toBe(true);
    expect(rebuilt(isAppNavigation)(navigation('/api/products'))).toBe(false);
    expect(rebuilt(isAppNavigation)(navigation('/login/factor-one'))).toBe(false);
    expect(rebuilt(isApiRequest)(fetchRequest('https://api.margenx.tech/api/products'))).toBe(true);
  });
});

describe('Service worker: precache del shell', () => {
  const patterns = workbox.globPatterns ?? [];

  it('precachea HTML, JS, CSS e íconos', () => {
    expect(patterns).toContain('**/*.{js,css,html}');
    expect(patterns).toEqual(expect.arrayContaining(['favicon.ico', 'icon-*.png', 'apple-touch-icon.png']));
  });

  it('el HTML precacheado es la página Sin conexión, no index.html', () => {
    expect(workbox.globIgnores).toContain('index.html');
  });

  it('no precachea ExcelJS: se descarga solo al pedir la plantilla de insumos', () => {
    expect(workbox.globIgnores).toContain('**/exceljs*.js');
  });

  it('no precachea las capturas de la guía de instalación ni los placeholders', () => {
    expect(patterns.some((pattern) => pattern.includes('*.png') && pattern.startsWith('**'))).toBe(false);
    expect(patterns.some((pattern) => pattern.includes('placeholder') || pattern.includes('guia-instalacion'))).toBe(false);
  });

  it('borra el precache de versiones anteriores', () => {
    expect(workbox.cleanupOutdatedCaches).toBe(true);
  });
});

describe('Service worker: actualización', () => {
  it('no se aplica sola: espera la confirmación del usuario', () => {
    expect(pwaOptions.registerType).toBe('prompt');
    expect(workbox.skipWaiting).not.toBe(true);
    expect(workbox.clientsClaim).not.toBe(true);
  });

  it('no inyecta un registro propio ni reemplaza el manifest existente', () => {
    expect(pwaOptions.injectRegister).toBe(false);
    expect(pwaOptions.manifest).toBe(false);
  });
});

describe('Service worker: Nginx', () => {
  const nginxConf = fs.readFileSync(path.resolve(process.cwd(), 'nginx.conf'), 'utf-8');

  it('sirve sw.js sin la caché inmutable de los assets', () => {
    const swBlock = nginxConf.match(/location = \/sw\.js \{([^}]*)\}/);
    expect(swBlock, 'Falta la regla exacta de /sw.js en nginx.conf').not.toBeNull();
    expect(swBlock?.[1]).toMatch(/expires -1;/);
    expect(swBlock?.[1]).not.toMatch(/immutable/);
  });

  it('sirve index.html (fallback de la SPA) revalidando siempre', () => {
    const spaBlock = nginxConf.match(/location \/ \{([^}]*)\}/);
    expect(spaBlock?.[1]).toMatch(/try_files \$uri \$uri\/ \/index\.html;/);
    expect(spaBlock?.[1]).toMatch(/expires -1;/);
  });

  it('sirve offline.html sin caché de un año', () => {
    const offlineBlock = nginxConf.match(/location = \/offline\.html \{([^}]*)\}/);
    expect(offlineBlock, 'Falta la regla exacta de /offline.html en nginx.conf').not.toBeNull();
    expect(offlineBlock?.[1]).toMatch(/expires -1;/);
  });
});

describe('Página Sin conexión (public/offline.html)', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'public/offline.html'), 'utf-8');

  it('muestra el título Sin conexión y el botón Reintentar', () => {
    expect(html).toMatch(/<html lang="es">/);
    expect(html).toMatch(/<h1[^>]*>Sin conexión<\/h1>/);
    expect(html).toMatch(/<button[^>]*id="reintentar"[^>]*>Reintentar<\/button>/);
    expect(html).toMatch(/location\.reload\(\)/);
  });

  it('es autónoma: no carga scripts, estilos ni datos externos', () => {
    expect(html).not.toMatch(/<script[^>]*\ssrc=/);
    expect(html).not.toMatch(/<link[^>]*stylesheet/);
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|\/api\//);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('no muestra datos de costos ni márgenes', () => {
    const visibleText = (html.match(/<main>([\s\S]*)<\/main>/)?.[1] ?? '').replace(/<[^>]+>/g, ' ');
    expect(visibleText).toMatch(/Sin conexión/);
    expect(visibleText).not.toMatch(/\$\s?\d|\d+(?:[.,]\d+)?\s?%|\bcostos?\b|\bmargen\b|\bmárgenes/i);
  });

  it('es usable a 360 px', () => {
    expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1"/);
    expect(html).toMatch(/min-height:\s*44px/);
  });
});
