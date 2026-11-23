import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app';
import { loadOpenApiDocument, resetOpenApiCache, OPENAPI_YAML_PATH } from './openapi';
import {
  extractExpressRoutes,
  extractOpenApiRoutes,
  findRouteMismatches,
  normalizeRoutePath,
} from './routeInspector';

describe('OpenAPI & Swagger UI Documentation (Issue #393)', () => {
  beforeEach(() => {
    resetOpenApiCache();
  });

  it('el archivo openapi.yaml debe ser un documento OpenAPI 3.1 sintácticamente válido', async () => {
    const api = await SwaggerParser.validate(OPENAPI_YAML_PATH);
    const apiDocument = api as unknown as { openapi: string; info: { title: string } };
    expect(apiDocument).toBeDefined();
    expect(apiDocument.openapi).toMatch(/^3\.1\./);
    expect(apiDocument.info.title).toBe('MargenX API');
  });

  it('todas las rutas registradas en Express deben estar documentadas en openapi.yaml y viceversa', () => {
    const app = createApp();
    const spec = loadOpenApiDocument();

    const expressRoutes = extractExpressRoutes(app, { ignorePrefixes: ['/api/docs'] });
    const openApiRoutes = extractOpenApiRoutes(spec);
    const mismatches = findRouteMismatches(expressRoutes, openApiRoutes);

    expect(
      mismatches.missingInSpec,
      `Rutas presentes en Express pero faltantes en openapi.yaml: ${mismatches.missingInSpec.join(', ')}`
    ).toEqual([]);

    expect(
      mismatches.missingInApp,
      `Rutas documentadas en openapi.yaml pero inexistentes en Express: ${mismatches.missingInApp.join(', ')}`
    ).toEqual([]);
  });

  it('debe servir el documento OpenAPI en formato JSON en GET /api/docs/openapi.json', async () => {
    const app = createApp();
    const response = await request(app).get('/api/docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.openapi).toMatch(/^3\.1\./);
    expect(response.body.paths).toHaveProperty('/api/health');
    expect(response.body.paths).toHaveProperty('/api/products');
  });

  it('debe servir la interfaz Swagger UI en GET /api/docs/', async () => {
    const app = createApp();
    const response = await request(app).get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('MargenX API');
  });

  it('debe aislar la relajación de CSP exclusivamente a /api/docs y mantener Helmet estricto en el resto de la API', async () => {
    const app = createApp();

    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    const healthCsp = healthRes.headers['content-security-policy'] || '';
    expect(healthCsp).not.toContain("script-src 'self' 'unsafe-inline'");

    const docsRes = await request(app).get('/api/docs/');
    expect(docsRes.status).toBe(200);
    const docsCsp = docsRes.headers['content-security-policy'] || '';
    expect(docsCsp).toContain("'unsafe-inline'");
  });

  describe('routeInspector helpers', () => {
    it('normalizeRoutePath colapsa barras múltiples y formatea parámetros de ruta', () => {
      expect(normalizeRoutePath('/api//products///:id/')).toBe('/api/products/{id}');
      expect(normalizeRoutePath('/:id')).toBe('/{id}');
      expect(normalizeRoutePath('/')).toBe('/');
      expect(normalizeRoutePath('')).toBe('/');
    });

    it('findRouteMismatches detecta diferencias entre colecciones de rutas', () => {
      const express = [
        { method: 'GET', path: '/api/a' },
        { method: 'POST', path: '/api/b' },
      ];
      const spec = [
        { method: 'GET', path: '/api/a' },
        { method: 'DELETE', path: '/api/c' },
      ];

      const diff = findRouteMismatches(express, spec);
      expect(diff.missingInSpec).toEqual(['POST /api/b']);
      expect(diff.missingInApp).toEqual(['DELETE /api/c']);
    });
  });
});
