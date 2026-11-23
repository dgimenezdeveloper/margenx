import type { Application, Router } from 'express';

export interface RegisteredRoute {
  method: string;
  path: string;
}

export interface OpenApiLikeDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths?: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
}

interface RouterLayerLike {
  name?: string;
  path?: string;
  rawPath?: string;
  slash?: boolean;
  match?: (path: string) => boolean;
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
  };
  handle?: {
    stack?: RouterLayerLike[];
    listRoutes?: () => ListedRouteEntry[];
  };
}

interface ListedRouteEntry {
  path: string | RegExp;
  methods: string[];
  router?: {
    stack?: RouterLayerLike[];
    listRoutes?: () => ListedRouteEntry[];
  };
}

interface ExpressAppInternal {
  router?: {
    stack?: RouterLayerLike[];
    listRoutes?: () => ListedRouteEntry[];
  };
  _router?: {
    stack?: RouterLayerLike[];
  };
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const mountedPrefixRegistry = new WeakMap<object, string>();

export function registerRouterMount(prefix: string, router: Router): void {
  mountedPrefixRegistry.set(router, prefix);
}

export function normalizeRoutePath(rawPath: string): string {
  const withBraces = rawPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  const collapsed = withBraces.replace(/\/{2,}/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) {
    return collapsed.slice(0, -1);
  }
  return collapsed || '/';
}

function joinPaths(prefix: string, subPath: string): string {
  const cleanPrefix = prefix === '/' ? '' : prefix.replace(/\/+$/, '');
  const cleanSub = subPath === '/' ? '' : subPath;
  const combined = `${cleanPrefix}${cleanSub.startsWith('/') || cleanSub === '' ? cleanSub : `/${cleanSub}`}`;
  return normalizeRoutePath(combined || '/');
}

function resolveLayerMountPrefix(layer: RouterLayerLike): string {
  if (typeof layer.rawPath === 'string') {
    return layer.rawPath === '/' ? '' : layer.rawPath;
  }
  if (typeof layer.path === 'string') {
    return layer.path === '/' ? '' : layer.path;
  }
  if (layer.handle) {
    const knownPrefix = mountedPrefixRegistry.get(layer.handle);
    if (knownPrefix !== undefined) {
      return knownPrefix === '/' ? '' : knownPrefix;
    }
  }
  if (layer.slash === true) {
    return '';
  }
  if (typeof layer.match === 'function' && layer.match('/__margenx_root_probe__')) {
    return '';
  }
  return '';
}

function collectFromStack(
  stack: RouterLayerLike[],
  prefix: string,
  out: RegisteredRoute[]
): void {
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([method]) => method.toUpperCase())
        .filter((method) => HTTP_METHODS.has(method));

      for (const routePath of paths) {
        if (typeof routePath !== 'string') continue;
        const fullPath = joinPaths(prefix, routePath);
        for (const method of methods) {
          out.push({ method, path: fullPath });
        }
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const mountPrefix = resolveLayerMountPrefix(layer);
      collectFromStack(layer.handle.stack, joinPaths(prefix, mountPrefix), out);
    }
  }
}

function collectFromListRoutes(
  router: { listRoutes: () => ListedRouteEntry[] },
  prefix: string,
  out: RegisteredRoute[]
): void {
  for (const entry of router.listRoutes()) {
    if (typeof entry.path !== 'string') continue;
    const fullPath = joinPaths(prefix, entry.path);

    if (entry.router) {
      if (typeof entry.router.listRoutes === 'function') {
        collectFromListRoutes(
          { listRoutes: entry.router.listRoutes.bind(entry.router) },
          fullPath,
          out
        );
      } else if (entry.router.stack) {
        collectFromStack(entry.router.stack, fullPath, out);
      }
      continue;
    }

    for (const method of entry.methods) {
      const upper = method.toUpperCase();
      if (HTTP_METHODS.has(upper)) {
        out.push({ method: upper, path: fullPath });
      }
    }
  }
}

export function extractExpressRoutes(
  app: Application,
  options: { ignorePrefixes?: string[] } = {}
): RegisteredRoute[] {
  const internal = app as unknown as ExpressAppInternal;
  const rawRoutes: RegisteredRoute[] = [];

  if (internal.router && typeof internal.router.listRoutes === 'function') {
    collectFromListRoutes(
      { listRoutes: internal.router.listRoutes.bind(internal.router) },
      '',
      rawRoutes
    );
  } else {
    const stack = internal.router?.stack ?? internal._router?.stack;
    if (!stack) {
      throw new Error('No se encontró el stack de rutas en la instancia de Express.');
    }
    collectFromStack(stack, '', rawRoutes);
  }

  const ignorePrefixes = options.ignorePrefixes ?? [];
  const unique = new Map<string, RegisteredRoute>();

  for (const route of rawRoutes) {
    const ignored = ignorePrefixes.some(
      (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`)
    );
    if (ignored) continue;

    const key = `${route.method} ${route.path}`;
    unique.set(key, route);
  }

  return [...unique.values()].sort((a, b) =>
    `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`)
  );
}

export function extractOpenApiRoutes(spec: OpenApiLikeDocument): RegisteredRoute[] {
  const routes: RegisteredRoute[] = [];
  const paths = spec.paths ?? {};

  for (const [rawPath, pathItem] of Object.entries(paths)) {
    const normalizedPath = normalizeRoutePath(rawPath);
    for (const method of Object.keys(pathItem)) {
      const upper = method.toUpperCase();
      if (HTTP_METHODS.has(upper)) {
        routes.push({ method: upper, path: normalizedPath });
      }
    }
  }

  return routes.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
}

export function findRouteMismatches(
  expressRoutes: RegisteredRoute[],
  openApiRoutes: RegisteredRoute[]
): { missingInSpec: string[]; missingInApp: string[] } {
  const toKey = (r: RegisteredRoute) => `${r.method} ${r.path}`;
  const expressSet = new Set(expressRoutes.map(toKey));
  const specSet = new Set(openApiRoutes.map(toKey));

  const missingInSpec = [...expressSet].filter((key) => !specSet.has(key)).sort();
  const missingInApp = [...specSet].filter((key) => !expressSet.has(key)).sort();

  return { missingInSpec, missingInApp };
}
