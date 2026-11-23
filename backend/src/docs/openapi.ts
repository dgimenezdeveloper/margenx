import fs from 'node:fs';
import path from 'node:path';
import type { Application, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import type { OpenApiLikeDocument } from './routeInspector';

export const OPENAPI_YAML_PATH = path.resolve(__dirname, '../../openapi/openapi.yaml');

let cachedSpec: OpenApiLikeDocument | null = null;

export function loadOpenApiDocument(): OpenApiLikeDocument {
  if (!cachedSpec) {
    const rawYaml = fs.readFileSync(OPENAPI_YAML_PATH, 'utf8');
    cachedSpec = YAML.parse(rawYaml) as OpenApiLikeDocument;
  }
  return cachedSpec;
}

export function resetOpenApiCache(): void {
  cachedSpec = null;
}

export function mountOpenApiDocs(app: Application): void {
  const spec = loadOpenApiDocument();

  app.get('/api/docs/openapi.json', (_req: Request, res: Response) => {
    res.status(200).json(spec);
  });

  const docsCspMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
      },
    },
  });

  app.use(
    '/api/docs',
    docsCspMiddleware,
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'MargenX API — Documentación OpenAPI',
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}
