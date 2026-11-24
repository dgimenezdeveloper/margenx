This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: docs/api.md, docs/especificacion-funcional.md, docs/adr/**, backend/src/routes/**, backend/src/services/**, backend/src/controllers/**, backend/src/schemas/**, backend/src/types/**, backend/src/**/reports/**, backend/src/**/report*, backend/package.json, CHANGELOG.md, README.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
backend/
  src/
    routes/
      auth.test.ts
      auth.ts
      cashShiftRoutes.test.ts
      collaborators.test.ts
      collaborators.ts
      dashboard.test.ts
      dashboard.ts
      ingredients.test.ts
      ingredients.ts
      internalReports.test.ts
      internalReports.ts
      products.test.ts
      products.ts
      purchasing.test.ts
      purchasing.ts
      reports.test.ts
      reports.ts
      salesModule.test.ts
      salesModule.ts
      salesRoutes.test.ts
      salesSummaryRoutes.test.ts
      suppliers.test.ts
      suppliers.ts
      webhooks.test.ts
      webhooks.ts
    services/
      cashShiftService.test.ts
      cashShiftService.ts
      invitationMailDispatcher.test.ts
      invitationMailDispatcher.ts
      invitedUserProvisioning.test.ts
      invitedUserProvisioning.ts
      marginAlertDispatcher.test.ts
      marginAlertDispatcher.ts
      marginCalculator.test.ts
      marginCalculator.ts
      purchasingService.test.ts
      purchasingService.ts
      reportService.test.ts
      reportService.ts
      salesService.test.ts
      salesService.ts
      salesSummaryService.test.ts
      salesSummaryService.ts
  package.json
docs/
  adr/
    0001-adopcion-clerk-autenticacion.md
    0002-arquitectura-hibrida-vps.md
    0003-automatizacion-satelite-n8n.md
    0004-calculo-margen-ventas-vs-markup.md
    0005-costo-vigente-cuarentena-e-ingesta.md
    0006-sesion-persistente-pwa.md
    0007-roles-fijos-vs-permisos-granulares.md
    0008-alta-de-colaboradores-por-invitacion.md
    0009-reporte-semanal-pdf-n8n-gotenberg.md
    0010-modulo-de-ventas-y-control-de-modulos.md
    0011-costo-manual-con-presentacion-predeterminada.md
  api.md
  especificacion-funcional.md
CHANGELOG.md
README.md
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="backend/src/services/marginAlertDispatcher.test.ts">
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchMarginAlertEvent } from './marginAlertDispatcher';

const accountFindUniqueMock = vi.fn();

vi.mock('../lib/prisma', () => ({
    prisma: {
        account: {
            findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
        },
    },
}));

describe('dispatchMarginAlertEvent', () => {
    beforeEach(() => {
        process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
        process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';
        accountFindUniqueMock.mockReset();
    });

    afterEach(() => {
        delete process.env.N8N_MARGIN_ALERT_WEBHOOK_URL;
        delete process.env.INTERNAL_WEBHOOK_SECRET;
        delete process.env.APP_BASE_URL;
        vi.unstubAllGlobals();
    });

    it('selecciona el ADMIN más antiguo y usa timeout de 5s al despachar la alerta', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
        });
        vi.stubGlobal('fetch', fetchMock);

        accountFindUniqueMock.mockResolvedValue({
            businessName: 'Panadería Central',
            slug: 'panaderia-central',
            users: [
                { email: 'admin2@panaderia.com' },
                { email: 'admin1@panaderia.com' },
            ],
        });

        await dispatchMarginAlertEvent({
            accountId: 'acc-1',
            ingredientId: 'ing-1',
            ingredientName: 'Harina 000',
            affectedProductsCount: 2,
            criticalProducts: [
                {
                    productId: 'prod-1',
                    productName: 'Pan flauta',
                    previousCost: '50.00',
                    newCost: '9500.00',
                    currentMarginPercent: '10.00',
                    minMarginPercent: '30.00',
                },
            ],
        });

        expect(accountFindUniqueMock).toHaveBeenCalledWith({
            where: { id: 'acc-1' },
            select: {
                businessName: true,
                slug: true,
                users: {
                    where: { role: 'ADMIN' },
                    orderBy: { createdAt: 'asc' },
                    select: { email: true },
                    take: 1,
                },
            },
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const firstCall = fetchMock.mock.calls[0];
        expect(firstCall).toBeDefined();

        const requestInit = firstCall?.[1] as RequestInit | undefined;
        expect(requestInit).toEqual(
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
                    'x-margenx-webhook-secret': 'test-secret',
                }),
            })
        );
        expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
    });

    describe('appBaseUrl en el payload', () => {
        async function dispatchAndReadBody(): Promise<Record<string, unknown>> {
            const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
            vi.stubGlobal('fetch', fetchMock);

            accountFindUniqueMock.mockResolvedValue({
                businessName: 'Panadería Central',
                slug: 'panaderia-central',
                users: [{ email: 'admin1@panaderia.com' }],
            });

            await dispatchMarginAlertEvent({
                accountId: 'acc-1',
                ingredientId: 'ing-1',
                ingredientName: 'Harina 000',
                affectedProductsCount: 1,
                criticalProducts: [
                    {
                        productId: 'prod-1',
                        productName: 'Pan flauta',
                        previousCost: '50.00',
                        newCost: '9500.00',
                        currentMarginPercent: '10.00',
                        minMarginPercent: '30.00',
                    },
                ],
            });

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
            return JSON.parse(requestInit.body as string) as Record<string, unknown>;
        }

        it('no incluye appBaseUrl cuando APP_BASE_URL no está definida', async () => {
            const body = await dispatchAndReadBody();

            expect(body).not.toHaveProperty('appBaseUrl');
        });

        it('no incluye appBaseUrl cuando APP_BASE_URL está vacía', async () => {
            process.env.APP_BASE_URL = '   ';

            const body = await dispatchAndReadBody();

            expect(body).not.toHaveProperty('appBaseUrl');
        });

        it('incluye appBaseUrl con el valor de APP_BASE_URL cuando está definida', async () => {
            process.env.APP_BASE_URL = 'https://dev.margenx.tech';

            const body = await dispatchAndReadBody();

            expect(body.appBaseUrl).toBe('https://dev.margenx.tech');
        });
    });
});
</file>

<file path="backend/src/services/marginAlertDispatcher.ts">
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Payload de alerta crítica de margen para n8n.
 *
 * Este despachador no es un endpoint HTTP público; es un webhook saliente que el
 * backend dispara cuando un producto cruza el margen mínimo y se requiere avisar al
 * Administrador o consolidar la alerta para que n8n la transforme en correo y/o
 * seguimiento. La ejecución es fail-closed: si no hay secreto o URL configurada, la
 * alerta no se envía.
 */
export interface MarginAlertCriticalProduct {
  productId: string;
  productName: string;
  previousCost: string;
  newCost: string;
  currentMarginPercent: string;
  minMarginPercent: string;
}

export interface MarginAlertPayload {
  accountId: string;
  ingredientId: string;
  ingredientName: string;
  affectedProductsCount: number;
  criticalProducts: MarginAlertCriticalProduct[];
}

function formatDecimal(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(String(value)).toFixed(2);
}

/**
 * Dispatcher asíncrono hacia n8n.
 * Resuelve dinámicamente los datos del comercio y el email del dueño (ADMIN)
 * garantizando aislamiento multi-tenant y autenticando con secreto compartido.
 * Opera bajo patrón Fail-Closed (no despacha si no hay secreto configurado).
 *
 * Envía la alerta crítica de margen a n8n.
 *
 * La documentación del proyecto define a n8n como orquestador de notificaciones y
 * no como fuente de verdad del cálculo. Por eso este dispatcher sólo entrega el
 * contexto final calculado por el backend y delega en n8n la composición del mail,
 * la planificación o la notificación externa.
 */
export async function dispatchMarginAlertEvent(payload: MarginAlertPayload): Promise<void> {
  const webhookUrl = process.env.N8N_MARGIN_ALERT_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();

  if (!webhookUrl || payload.criticalProducts.length === 0) {
    return;
  }

  // 1. Blindaje Fail-Closed: nunca enviar peticiones si el secreto no está configurado
  if (!webhookSecret) {
    console.error(
      '[MarginAlert] Error crítico de seguridad: INTERNAL_WEBHOOK_SECRET no está configurado en las variables de entorno. Despacho cancelado para prevenir fail-open.'
    );
    return;
  }

  try {
    // 2. Resolver dinámicamente la cuenta y el email del ADMIN destinatario
    const account = await prisma.account.findUnique({
      where: { id: payload.accountId },
      select: {
        businessName: true,
        slug: true,
        users: {
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
          select: { email: true },
          take: 1,
        },
      },
    });

    if (!account) {
      console.warn(`[MarginAlert] No se encontró la cuenta con ID: ${payload.accountId}`);
      return;
    }

    const tradeName = account.businessName;
    const ownerEmail = account.users[0]?.email;

    if (!ownerEmail) {
      console.warn(`[MarginAlert] La cuenta "${tradeName}" no tiene un usuario ADMIN con email registrado.`);
      return;
    }

    // 3. Normalizar payload con datos dinámicos
    const appBaseUrl = process.env.APP_BASE_URL?.trim();

    const dynamicPayload = {
      accountId: payload.accountId,
      accountSlug: account.slug,
      tradeName,
      ownerEmail,
      ingredient: {
        id: payload.ingredientId,
        name: payload.ingredientName,
      },
      affectedProductsCount: payload.affectedProductsCount,
      criticalProducts: payload.criticalProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        previousCost: formatDecimal(product.previousCost),
        newCost: formatDecimal(product.newCost),
        currentMarginPercent: formatDecimal(product.currentMarginPercent),
        minMarginPercent: formatDecimal(product.minMarginPercent),
      })),
      triggeredAt: new Date().toISOString(),
      // Base del link de la alerta según entorno; si no está definida, n8n usa su fallback.
      ...(appBaseUrl ? { appBaseUrl } : {}),
    };

    // 4. Despachar a n8n autenticando mediante header secreto
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify(dynamicPayload),
      signal: AbortSignal.timeout(5000),
    });

    // 5. Verificación estricta de respuesta HTTP (previene pérdida silenciosa de alertas ante 401/500)
    if (!response.ok) {
      console.error(
        `[MarginAlert] Error de despacho HTTP ${response.status} (${response.statusText}) desde el webhook de n8n. La alerta de margen no fue entregada.`
      );
    }
  } catch (error) {
    console.error('[MarginAlert] Error de red al despachar alerta de margen crítico a n8n:', error);
  }
}
</file>

<file path="docs/adr/0001-adopcion-clerk-autenticacion.md">
# 1. Adopción de Clerk para Gestión de Identidad y Autenticación Delegada

* **Estado:** Aceptado
* **Fecha:** 2026-08-28
* **Decisores:** Dario Gimenez (DevOps/SM), Mauro Barreras (Backend), Federico Paal (Frontend)

## Contexto y Planteamiento del Problema
MargenX es un SaaS multiempresa con roles diferenciados (`ADMIN` y `COLLABORATOR`). Desarrollar un sistema de autenticación propio desde cero (tablas de passwords, hashing con bcrypt, rotación de refresh tokens y recuperación de contraseña) introduce riesgos de seguridad innecesarios y consume semanas de desarrollo que deben enfocarse en el núcleo de negocio (cálculo de márgenes).

## Opciones Consideradas
1. **Autenticación propia con JWT + Bcrypt en PostgreSQL:** Control total pero alta responsabilidad de seguridad y costo de mantenimiento.
2. **Supabase Auth:** Buena integración con PostgreSQL pero requería acoplar la base de datos a su ecosistema o lidiar con latencias de red en contenedores locales.
3. **Clerk:** Servicio especializado en identidad, SDK nativo para React 19 y Node/Express con verificación asimétrica de JWT.

## Decisión
Se decide adoptar **Clerk** como proveedor de identidad delegada (IdP).
* En el **Backend**, se utiliza `@clerk/backend` para verificar la firma del JWT en el middleware `authMiddleware.ts` y extraer el `sub` para vincularlo con el `authProviderId` del modelo `User` de Prisma.
* En el **Frontend**, se adopta `@clerk/clerk-react` para la gestión de sesiones y protección de rutas.

## Consecuencias
* **Positivas:**
  * Cero riesgo de filtración de contraseñas (no se almacenan hashes en PostgreSQL).
  * Soporte nativo para sesiones móviles y autenticación social sin código adicional.
  * Fácil extracción del rol y del `accountId` para el aislamiento multi-tenant.
* **Compromisos (Trade-offs):**
  * Dependencia de un servicio SaaS externo de terceros.
  * Obligatoriedad de sincronizar variables de entorno (`CLERK_SECRET_KEY` y `VITE_CLERK_PUBLISHABLE_KEY`) en todos los entornos (local, CI y Azure).

## Nota de vigencia (28/10/2026)

La decisión sigue vigente. Donde el texto dice "local, CI y Azure", hoy los entornos son local, CI y la VPS (ADR-002). Hay dos instancias de Clerk: la de desarrollo, usada en local, CI y `dev.margenx.tech`, y la de producción, que `deploy.yml` usa al construir desde `main` (`VITE_CLERK_PUBLISHABLE_KEY_PROD`).
</file>

<file path="docs/adr/0002-arquitectura-hibrida-vps.md">
# 2. Despliegue Consolidado 100% en VPS
* **Estado:** Aceptado (reemplaza al ADR-002 original: "Arquitectura Híbrida — Cómputo en Azure y Base de Datos en VPS")
* **Fecha:** 2026-09-12 (registrada con el PR #62, versión 0.2.0 del CHANGELOG)
* **Decisores:** Darío Giménez (DevOps/SM)

## Contexto y Planteamiento del Problema

La arquitectura híbrida original (ver ADR-002 previo) contemplaba el cómputo — Frontend y Backend — desplegado en Microsoft Azure App Service, y la persistencia — PostgreSQL y n8n — en una VPS propia. Tras avanzar con la implementación, el equipo evaluó que mantener dos proveedores de infraestructura distintos introducía complejidad operativa (dos paneles de administración, dos superficies de configuración de red) y latencia entre la capa de cómputo en la nube pública y la base de datos en la VPS, sin un beneficio claro que compensara ese costo dentro del alcance de la materia.

## Opciones Consideradas

1. **Mantener la arquitectura híbrida original (Azure + VPS).** Descartada por la complejidad operativa de administrar dos proveedores y la latencia entre capas.
2. **Migrar completamente a Azure (cómputo + base de datos administrada).** Descartada por el costo de una base de datos administrada (Azure Database for PostgreSQL Flexible Server) sostenido durante todo el semestre.
3. **Consolidar toda la infraestructura en la VPS propia, con doble entorno interno (staging/producción) diferenciado por subdominio.** ✅ Adoptada.

## Decisión

Se adopta el despliegue **100% consolidado en una única VPS propia**  Ubuntu 22.04 LTS, IP `<VPS_IP>`):

* **Persistencia y automatización:** PostgreSQL 16 y n8n corren en contenedores dentro de la red interna `margenx_network`.
* **Cómputo:** el frontend y el backend se dockerizan y se publican como imágenes inmutables en Docker Hub (`dgimenezdeveloper/margenx-backend` / `margenx-frontend`) mediante GitHub Actions. La VPS solo descarga (`docker compose pull`) y levanta (`up -d --no-deps`) esas imágenes — nunca clona código fuente ni corre `npm install`.
* **Doble entorno en el mismo servidor:** STAGING/DEV (rama `develop`, dominios `dev.margenx.tech` / `api-dev.margenx.tech`, base `margenx_dev`) y PRODUCCIÓN (rama `main`, dominios `margenx.tech` / `api.margenx.tech`, base `margenx_prod`).
* **Nginx** corre como reverse proxy nativo en el host de la VPS (no dockerizado), con certificados SSL de Let's Encrypt vía Certbot para los cuatro subdominios de la app más el de n8n.

## Consecuencias

**Positivas:**
* Costo de infraestructura adicional $0 (se preservan los créditos educativos de Azure para otros usos).
* Menor latencia entre la API y la base de datos, al compartir la misma red interna de contenedores.
* Entorno de staging real (`dev.margenx.tech`) para validar cambios de forma aislada antes de que lleguen a producción o se muestren en una demo de cátedra.
* Un solo proveedor de infraestructura que administrar, reduciendo la carga operativa del rol DevOps.

**Compromisos (Trade-offs):**
* Toda la responsabilidad de seguridad perimetral (firewall, gestión de certificados SSL, backups) recae exclusivamente en el equipo de DevOps, sin la red gestionada de un proveedor cloud.
* Un único punto de fallo físico (un solo servidor) sostiene ambos entornos — mitigado con backups automáticos diarios de PostgreSQL (ver Issue de backup en el backlog de DevOps).
</file>

<file path="backend/src/routes/cashShiftRoutes.test.ts">
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

/* Prisma simulado: la transacción interactiva recibe el mismo cliente. */
const db = vi.hoisted(() => {
  const client = {
    account: { findUnique: vi.fn() },
    cashShift: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    sale: { groupBy: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: typeof client) => unknown)(client) : Promise.all(arg as unknown[])
  );
  return client;
});
vi.mock('../lib/prisma', () => ({ prisma: db }));

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser | undefined;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, _res: unknown, next: () => void) => {
    req.user = currentUser;
    next();
  },
}));

import { cashShiftsRouter } from './salesModule';

const ACCOUNT = 'acc-panaderia-central';
const ADMIN: TestUser = { id: 'u-admin-panaderia', accountId: ACCOUNT, email: 'admin.panaderia@seed.example.test', role: 'ADMIN' };
const CAJERA: TestUser = { id: 'u-cajera-panaderia', accountId: ACCOUNT, email: 'cajera.panaderia@seed.example.test', role: 'COLLABORATOR' };
const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001';
const OTHER_SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000002';

function turno(overrides: Record<string, unknown> = {}) {
  return {
    id: SHIFT_ID,
    accountId: ACCOUNT,
    status: 'OPEN',
    openedById: CAJERA.id,
    openedAt: new Date('2026-11-24T10:00:00.000Z'),
    openingAmount: D('10000'),
    closedById: null,
    closedAt: null,
    expectedCash: null,
    expectedTransfer: null,
    expectedMercadoPago: null,
    countedCash: null,
    countedTransfer: null,
    countedMercadoPago: null,
    difference: null,
    openedBy: { email: CAJERA.email },
    closedBy: null,
    ...overrides,
  };
}

/* $25.000 en efectivo (9 ventas), una anulada de $3.000 y una transferencia de $8.400. */
const ventasDelTurno = [
  { cashShiftId: SHIFT_ID, paymentMethod: 'CASH', status: 'COMPLETED', _sum: { total: D('25000') }, _count: { _all: 9 } },
  { cashShiftId: SHIFT_ID, paymentMethod: 'CASH', status: 'VOIDED', _sum: { total: D('3000') }, _count: { _all: 1 } },
  { cashShiftId: SHIFT_ID, paymentMethod: 'TRANSFER', status: 'COMPLETED', _sum: { total: D('8400') }, _count: { _all: 2 } },
];

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cash-shifts', cashShiftsRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = CAJERA;
  db.account.findUnique.mockImplementation(({ select }: { select: Record<string, unknown> }) =>
    Promise.resolve(
      select.businessName
        ? { businessName: 'Panadería Central' }
        : { subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] }
    )
  );
  db.sale.groupBy.mockResolvedValue(ventasDelTurno);
});

describe('POST /api/cash-shifts/open', () => {
  it('el colaborador abre el turno con el monto inicial, en la cuenta de la sesión', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);
    db.cashShift.create.mockResolvedValue(turno());

    const res = await request(buildApp())
      .post('/api/cash-shifts/open')
      .send({ openingAmount: 10000, accountId: 'acc-quimica-gyj' });

    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toMatchObject({ status: 'OPEN', openingAmount: '10000.00', openedBy: CAJERA.email, salesCount: 0, expectedTotal: '10000.00' });
    const { data } = db.cashShift.create.mock.calls[0]![0];
    expect(data).toMatchObject({ accountId: ACCOUNT, openedById: CAJERA.id });
    expect(data.openingAmount.toFixed(2)).toBe('10000.00');
  });

  it('Escenario "Un turno por vez": con un turno abierto responde 409', async () => {
    db.cashShift.findFirst.mockResolvedValue({ id: SHIFT_ID });

    const res = await request(buildApp()).post('/api/cash-shifts/open').send({ openingAmount: 5000 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Ya hay un turno de caja abierto/);
    expect(db.cashShift.create).not.toHaveBeenCalled();
  });

  it('si dos personas abren a la vez, el índice único deja pasar una y la otra recibe 409', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);
    db.cashShift.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test', meta: {} })
    );

    expect((await request(buildApp()).post('/api/cash-shifts/open').send({ openingAmount: 5000 })).status).toBe(409);
  });

  it('un monto inicial inválido responde 400', async () => {
    const res = await request(buildApp()).post('/api/cash-shifts/open').send({ openingAmount: -100 });
    expect(res.status).toBe(400);
    expect(db.cashShift.findFirst).not.toHaveBeenCalled();
  });
});

describe('GET /api/cash-shifts/current', () => {
  it('devuelve el turno abierto con lo esperado hasta ahora, sin contar las anuladas', async () => {
    db.cashShift.findFirst.mockResolvedValue(turno());

    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(200);
    expect(res.body.shift).toMatchObject({ id: SHIFT_ID, salesCount: 11, voidedCount: 1, salesTotal: '33400.00', expectedTotal: '43400.00', difference: null });
    expect(res.body.shift.methods).toEqual([
      { paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: null, difference: null },
      { paymentMethod: 'TRANSFER', salesTotal: '8400.00', expected: '8400.00', counted: null, difference: null },
      { paymentMethod: 'MERCADO_PAGO', salesTotal: '0.00', expected: '0.00', counted: null, difference: null },
    ]);
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, status: 'OPEN' });
    expect(db.sale.groupBy.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, cashShiftId: SHIFT_ID });
  });

  it('sin turno abierto responde 200 con shift null (el 404 queda para el módulo apagado)', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ shift: null });
  });

  it('nunca expone costos ni márgenes', async () => {
    db.cashShift.findFirst.mockResolvedValue(turno());
    const res = await request(buildApp()).get('/api/cash-shifts/current');
    expect(JSON.stringify(res.body)).not.toMatch(/cost|margin/i);
  });
});

describe('POST /api/cash-shifts/:id/close', () => {
  const contado = { countedCash: 34500, countedTransfer: 8400, countedMercadoPago: 0 };

  beforeEach(() => {
    db.cashShift.findFirst.mockResolvedValue({ id: SHIFT_ID, status: 'OPEN', openingAmount: D('10000'), openedById: ADMIN.id, closedById: null });
    db.cashShift.updateMany.mockResolvedValue({ count: 1 });
    db.cashShift.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(
        turno({ ...data, status: 'CLOSED', closedById: CAJERA.id, closedAt: new Date('2026-11-24T20:00:00.000Z'), closedBy: { email: CAJERA.email } })
      )
    );
  });

  it('Escenario "Arqueo con diferencia": esperado $35.000, contado $34.500 y diferencia −$500', async () => {
    const res = await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'CLOSED', closedBy: CAJERA.email, expectedTotal: '43400.00', countedTotal: '42900.00', difference: '-500.00' });
    expect(res.body.methods[0]).toEqual({ paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: '34500.00', difference: '-500.00' });

    const { data } = db.cashShift.update.mock.calls[0]![0];
    expect(data.expectedCash.toFixed(2)).toBe('35000.00');
    expect(data.countedCash.toFixed(2)).toBe('34500.00');
    expect(data.difference.toFixed(2)).toBe('-500.00');
  });

  it('Escenario "Las anuladas no cuentan en lo esperado": la venta anulada de $3.000 queda afuera y se informa', async () => {
    const res = await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado);

    expect(res.body.voidedCount).toBe(1);
    expect(res.body.methods[0].expected).toBe('35000.00');
  });

  it('primero pasa el turno a CLOSED y recién después suma las ventas, todo en la cuenta de la sesión', async () => {
    await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado);

    expect(db.cashShift.updateMany).toHaveBeenCalledWith({
      where: { id: SHIFT_ID, accountId: ACCOUNT, status: 'OPEN' },
      data: expect.objectContaining({ status: 'CLOSED', closedById: CAJERA.id }),
    });
    expect(db.cashShift.updateMany.mock.invocationCallOrder[0]!).toBeLessThan(db.sale.groupBy.mock.invocationCallOrder[0]!);
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toEqual({ id: SHIFT_ID, accountId: ACCOUNT });
  });

  it('un turno ya cerrado responde 409, también si otro lo cerró al mismo tiempo', async () => {
    currentUser = ADMIN;
    db.cashShift.findFirst.mockResolvedValueOnce({ id: SHIFT_ID, status: 'CLOSED', openingAmount: D('10000'), openedById: CAJERA.id, closedById: CAJERA.id });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(409);

    db.cashShift.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(409);
    expect(db.cashShift.update).not.toHaveBeenCalled();
  });

  it('al colaborador, un turno cerrado donde no trabajó le responde 404; uno donde vendió, 409', async () => {
    db.cashShift.findFirst.mockResolvedValueOnce({ id: SHIFT_ID, status: 'CLOSED', openingAmount: D('10000'), openedById: ADMIN.id, closedById: ADMIN.id, _count: { sales: 0 } });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(404);

    db.cashShift.findFirst.mockResolvedValueOnce({ id: SHIFT_ID, status: 'CLOSED', openingAmount: D('10000'), openedById: ADMIN.id, closedById: ADMIN.id, _count: { sales: 3 } });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(409);
  });

  it('sin lo contado de los tres medios responde 400; un turno inexistente o un id inválido, 404', async () => {
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send({ countedCash: 34500 })).status).toBe(400);

    db.cashShift.findFirst.mockResolvedValueOnce(null);
    expect((await request(buildApp()).post(`/api/cash-shifts/${OTHER_SHIFT_ID}/close`).send(contado)).status).toBe(404);
    expect((await request(buildApp()).post('/api/cash-shifts/turno-1/close').send(contado)).status).toBe(404);
  });
});

describe('GET /api/cash-shifts y GET /api/cash-shifts/:id', () => {
  const cerrado = turno({
    status: 'CLOSED',
    openedById: ADMIN.id,
    openedBy: { email: ADMIN.email },
    closedById: ADMIN.id,
    closedBy: { email: ADMIN.email },
    closedAt: new Date('2026-11-24T20:00:00.000Z'),
    expectedCash: D('35000'),
    expectedTransfer: D('8400'),
    expectedMercadoPago: D('0'),
    countedCash: D('34500'),
    countedTransfer: D('8400'),
    countedMercadoPago: D('0'),
    difference: D('-500'),
  });

  it('el ADMIN ve el historial de la cuenta, con el arqueo guardado de cada turno', async () => {
    currentUser = ADMIN;
    db.cashShift.count.mockResolvedValue(1);
    db.cashShift.findMany.mockResolvedValue([cerrado]);

    const res = await request(buildApp()).get('/api/cash-shifts?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
    expect(res.body.data[0]).toMatchObject({ id: SHIFT_ID, status: 'CLOSED', difference: '-500.00', salesCount: 11, closedBy: ADMIN.email });
    expect(db.cashShift.findMany.mock.calls[0]![0]).toMatchObject({ where: { accountId: ACCOUNT }, orderBy: { openedAt: 'desc' }, skip: 0, take: 10 });
    expect(db.sale.groupBy.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, cashShiftId: { in: [SHIFT_ID] } });
  });

  it('el colaborador ve el turno abierto y los que abrió, cerró o en los que vendió', async () => {
    db.cashShift.count.mockResolvedValue(0);
    db.cashShift.findMany.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/cash-shifts');

    expect(res.body).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    expect(db.cashShift.findMany.mock.calls[0]![0].where).toEqual({
      accountId: ACCOUNT,
      OR: [{ status: 'OPEN' }, { openedById: CAJERA.id }, { closedById: CAJERA.id }, { sales: { some: { soldById: CAJERA.id } } }],
    });
    expect(db.sale.groupBy).not.toHaveBeenCalled();
  });

  it('el resumen de un turno cerrado usa lo guardado al cierre y lleva el nombre del comercio para imprimirlo', async () => {
    currentUser = ADMIN;
    db.cashShift.findFirst.mockResolvedValue(cerrado);

    const res = await request(buildApp()).get(`/api/cash-shifts/${SHIFT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ businessName: 'Panadería Central', expectedTotal: '43400.00', countedTotal: '42900.00', difference: '-500.00' });
    expect(db.account.findUnique).toHaveBeenCalledWith({ where: { id: ACCOUNT }, select: { businessName: true } });
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toEqual({ id: SHIFT_ID, accountId: ACCOUNT });
  });

  it('un turno que no existe, ajeno o con id inválido responde 404', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);

    expect((await request(buildApp()).get(`/api/cash-shifts/${OTHER_SHIFT_ID}`)).status).toBe(404);
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toMatchObject({ id: OTHER_SHIFT_ID, accountId: ACCOUNT });
    expect((await request(buildApp()).get('/api/cash-shifts/turno-1')).status).toBe(404);
  });
});
</file>

<file path="backend/src/routes/collaborators.test.ts">
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ClerkAPIResponseError } from '@clerk/backend/errors';
import { errorHandler } from '../middlewares/errorHandler';

const QUIMICA_ID = 'acc-quimica';
const PANADERIA_ID = 'acc-panaderia';

const clerk = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  getInvitationList: vi.fn(),
  revokeInvitation: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../lib/clerk', () => ({
  getClerkClient: () => ({
    invitations: {
      createInvitation: clerk.createInvitation,
      getInvitationList: clerk.getInvitationList,
      revokeInvitation: clerk.revokeInvitation,
    },
    users: { deleteUser: clerk.deleteUser },
  }),
}));

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
}));
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: db.findUnique,
      findFirst: db.findFirst,
      findMany: db.findMany,
      deleteMany: db.deleteMany,
    },
  },
}));

const dispatchInvitationEmail = vi.hoisted(() => vi.fn());
vi.mock('../services/invitationMailDispatcher', () => ({ dispatchInvitationEmail }));

type TestUser = {
  id: string;
  accountId: string;
  email: string;
  role: 'ADMIN' | 'COLLABORATOR';
  account?: { businessName: string };
};
let currentUser: TestUser;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, _res: unknown, next: () => void) => {
    req.user = currentUser;
    next();
  },
}));

import collaboratorsRouter from './collaborators';

const ADMIN_QUIMICA: TestUser = {
  id: 'u-admin-quimica',
  accountId: QUIMICA_ID,
  email: 'admin.quimica@seed.example.test',
  role: 'ADMIN',
  account: { businessName: 'Química GyJ' },
};
const COLLAB_QUIMICA: TestUser = {
  id: 'u-repositor-quimica',
  accountId: QUIMICA_ID,
  email: 'colab.quimica@seed.example.test',
  role: 'COLLABORATOR',
};

const ticketUrl = (id: string) => `https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=${id}`;

function invitation(id: string, email: string, accountId: string, createdAt = Date.UTC(2026, 10, 16, 12)) {
  return {
    id,
    emailAddress: email,
    publicMetadata: { accountId, role: 'COLLABORATOR' },
    createdAt,
    status: 'pending',
    url: ticketUrl(id),
  };
}

function clerkError(status: number, code: string) {
  return new ClerkAPIResponseError('Clerk error', {
    status,
    data: [{ code, message: code, long_message: code, meta: {} }],
  });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', collaboratorsRouter);
  app.use(errorHandler);
  return app;
}

describe('Rutas de colaboradores (/api/auth)', () => {
  const app = buildApp();
  const originalBaseUrl = process.env.APP_BASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = ADMIN_QUIMICA;
    process.env.APP_BASE_URL = 'https://dev.margenx.tech';
    clerk.getInvitationList.mockResolvedValue({ data: [], totalCount: 0 });
    dispatchInvitationEmail.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = originalBaseUrl;
  });

  describe('RBAC: el colaborador no gestiona el equipo', () => {
    it.each([
      ['post', '/api/auth/invitations'],
      ['get', '/api/auth/invitations'],
      ['delete', '/api/auth/invitations/inv_1'],
      ['get', '/api/auth/users'],
      ['delete', '/api/auth/users/u-otro'],
    ] as const)('%s %s responde 403', async (method, path) => {
      currentUser = COLLAB_QUIMICA;
      const res = await request(app)[method](path).send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Se requiere rol ADMIN/);
      expect(clerk.createInvitation).not.toHaveBeenCalled();
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
      expect(clerk.deleteUser).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/invitations', () => {
    it('crea la invitación sin el mail de Clerk, manda el mail de MargenX y responde 201', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(
        invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID)
      );

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: '  Cajera.Quimica@Seed.Example.Test ' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        invitation: {
          id: 'inv_cajera',
          email: 'cajera.quimica@seed.example.test',
          createdAt: '2026-11-16T12:00:00.000Z',
          url: ticketUrl('inv_cajera'),
        },
        emailSent: true,
      });
      expect(clerk.createInvitation).toHaveBeenCalledWith({
        emailAddress: 'cajera.quimica@seed.example.test',
        publicMetadata: { accountId: QUIMICA_ID, role: 'COLLABORATOR' },
        redirectUrl: 'https://dev.margenx.tech/login',
        notify: false,
      });
      expect(dispatchInvitationEmail).toHaveBeenCalledWith({
        email: 'cajera.quimica@seed.example.test',
        tradeName: 'Química GyJ',
        inviterEmail: 'admin.quimica@seed.example.test',
        invitationUrl: ticketUrl('inv_cajera'),
      });
    });

    it('si el mail no sale (n8n caído o sin configurar), la invitación queda y responde emailSent false', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID));
      dispatchInvitationEmail.mockResolvedValue(false);

      const res = await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(201);
      expect(res.body.emailSent).toBe(false);
      expect(res.body.invitation.url).toBe(ticketUrl('inv_cajera'));
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
    });

    it('si Clerk no devuelve el enlace, no intenta mandar el mail', async () => {
      db.findUnique.mockResolvedValue(null);
      const { url: _url, ...sinEnlace } = invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID);
      clerk.createInvitation.mockResolvedValue(sinEnlace);

      const res = await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ invitation: { url: null }, emailSent: false });
      expect(dispatchInvitationEmail).not.toHaveBeenCalled();
    });

    it('sin nombre de comercio en la sesión, el mail usa un nombre genérico', async () => {
      currentUser = { ...ADMIN_QUIMICA, account: undefined };
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID));

      await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@seed.example.test' });

      expect(dispatchInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({ tradeName: 'tu comercio' }));
    });

    it('sin APP_BASE_URL válida no manda redirectUrl (Clerk usa su portal)', async () => {
      process.env.APP_BASE_URL = 'dev.margenx.tech';
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(invitation('inv_1', 'cajera.quimica@seed.example.test', QUIMICA_ID));

      await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@seed.example.test' });

      expect(clerk.createInvitation.mock.calls[0]?.[0]).not.toHaveProperty('redirectUrl');
    });

    it('quita la barra final de APP_BASE_URL', async () => {
      process.env.APP_BASE_URL = 'https://margenx.tech/';
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(invitation('inv_1', 'cajera.quimica@seed.example.test', QUIMICA_ID));

      await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@seed.example.test' });

      expect(clerk.createInvitation.mock.calls[0]?.[0].redirectUrl).toBe('https://margenx.tech/login');
    });

    it.each([
      ['sin correo', {}],
      ['correo inválido', { email: 'cajera-quimica' }],
      ['correo no textual', { email: 42 }],
    ])('responde 400 con %s', async (_caso, body) => {
      const res = await request(app).post('/api/auth/invitations').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Ingresá un correo electrónico válido.');
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it.each([
      ['accountId', { email: 'cajera.quimica@seed.example.test', accountId: PANADERIA_ID }],
      ['role', { email: 'cajera.quimica@seed.example.test', role: 'ADMIN' }],
    ])('responde 400 si el cliente manda %s (la cuenta y el rol los fija el servidor)', async (_campo, body) => {
      const res = await request(app).post('/api/auth/invitations').send(body);

      expect(res.status).toBe(400);
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it('responde 409 si el correo ya tiene usuario en MargenX', async () => {
      db.findUnique.mockResolvedValue({ id: 'u-existente' });

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'colab.quimica@seed.example.test' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ese correo ya tiene un usuario en MargenX.');
      expect(db.findUnique).toHaveBeenCalledWith({
        where: { email: 'colab.quimica@seed.example.test' },
        select: { id: true },
      });
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it('responde 409 si ya hay una invitación pendiente para ese correo', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_previa', 'cajera.quimica@seed.example.test', QUIMICA_ID)],
        totalCount: 1,
      });

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ya hay una invitación pendiente para ese correo.');
      expect(clerk.getInvitationList).toHaveBeenCalledWith({
        status: 'pending',
        query: 'cajera.quimica@seed.example.test',
        limit: 500,
        offset: 0,
      });
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it('responde 409 si Clerk informa que el correo ya existe', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockRejectedValue(clerkError(422, 'form_identifier_exists'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ese correo ya tiene una cuenta o una invitación pendiente.');
    });

    it('responde 400 si Clerk rechaza el formato del correo', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockRejectedValue(clerkError(422, 'form_param_format_invalid'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Ingresá un correo electrónico válido.');
    });

    it('responde 502 si Clerk falla por otro motivo', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockRejectedValue(clerkError(500, 'internal_clerk_error'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(502);
      expect(res.body.error).toBe(
        'No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos.'
      );
    });

    it('responde 500 ante un error que no es de Clerk', async () => {
      db.findUnique.mockRejectedValue(new Error('base caída'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@seed.example.test' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/auth/invitations', () => {
    it('devuelve solo las invitaciones pendientes de la cuenta del ADMIN, recorriendo todas las páginas', async () => {
      const firstPage = [
        invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID),
        invitation('inv_panaderia', 'mostrador.panaderia@seed.example.test', PANADERIA_ID),
        ...Array.from({ length: 498 }, (_, i) => invitation(`inv_otra_${i}`, `colab${i}.panaderia@seed.example.test`, PANADERIA_ID)),
      ];
      const secondPage = [
        invitation('inv_repartidor', 'repartidor.quimica@seed.example.test', QUIMICA_ID),
        { ...invitation('inv_sin_meta', 'suelto.quimica@seed.example.test', QUIMICA_ID), publicMetadata: null },
      ];
      clerk.getInvitationList
        .mockResolvedValueOnce({ data: firstPage, totalCount: 502 })
        .mockResolvedValueOnce({ data: secondPage, totalCount: 502 });

      const res = await request(app).get('/api/auth/invitations');

      expect(res.status).toBe(200);
      expect(res.body.invitations.map((i: { id: string }) => i.id)).toEqual(['inv_cajera', 'inv_repartidor']);
      expect(res.body.invitations[0]).toEqual({
        id: 'inv_cajera',
        email: 'cajera.quimica@seed.example.test',
        createdAt: '2026-11-16T12:00:00.000Z',
        url: ticketUrl('inv_cajera'),
      });
      expect(clerk.getInvitationList).toHaveBeenNthCalledWith(1, { status: 'pending', limit: 500, offset: 0 });
      expect(clerk.getInvitationList).toHaveBeenNthCalledWith(2, { status: 'pending', limit: 500, offset: 500 });
    });

    it('responde 502 si Clerk no responde', async () => {
      clerk.getInvitationList.mockRejectedValue(clerkError(503, 'service_unavailable'));

      const res = await request(app).get('/api/auth/invitations');

      expect(res.status).toBe(502);
    });
  });

  describe('DELETE /api/auth/invitations/:id', () => {
    it('revoca una invitación pendiente de la propia cuenta', async () => {
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID)],
        totalCount: 1,
      });
      clerk.revokeInvitation.mockResolvedValue({});

      const res = await request(app).delete('/api/auth/invitations/inv_cajera');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invitación revocada correctamente.');
      expect(clerk.getInvitationList).toHaveBeenCalledWith({
        status: 'pending',
        query: 'inv_cajera',
        limit: 500,
        offset: 0,
      });
      expect(clerk.revokeInvitation).toHaveBeenCalledWith('inv_cajera');
    });

    it('responde 404 si la invitación es de otra cuenta, sin revocarla', async () => {
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_panaderia', 'mostrador.panaderia@seed.example.test', PANADERIA_ID)],
        totalCount: 1,
      });

      const res = await request(app).delete('/api/auth/invitations/inv_panaderia');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('La invitación no existe o ya no está pendiente.');
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
    });

    it('responde 404 si la invitación no existe o ya no está pendiente', async () => {
      const res = await request(app).delete('/api/auth/invitations/inv_inexistente');

      expect(res.status).toBe(404);
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
    });

    it('responde 404 si Clerk ya no la encuentra al revocar', async () => {
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_cajera', 'cajera.quimica@seed.example.test', QUIMICA_ID)],
        totalCount: 1,
      });
      clerk.revokeInvitation.mockRejectedValue(clerkError(404, 'resource_not_found'));

      const res = await request(app).delete('/api/auth/invitations/inv_cajera');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/auth/users', () => {
    it('lista los usuarios de la cuenta del ADMIN', async () => {
      const users = [
        { id: ADMIN_QUIMICA.id, email: ADMIN_QUIMICA.email, role: 'ADMIN', createdAt: '2026-08-30T10:00:00.000Z' },
        { id: COLLAB_QUIMICA.id, email: COLLAB_QUIMICA.email, role: 'COLLABORATOR', createdAt: '2026-10-02T10:00:00.000Z' },
      ];
      db.findMany.mockResolvedValue(users);

      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual(users);
      expect(db.findMany).toHaveBeenCalledWith({
        where: { accountId: QUIMICA_ID },
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    });
  });

  describe('DELETE /api/auth/users/:id', () => {
    const target = {
      id: COLLAB_QUIMICA.id,
      role: 'COLLABORATOR',
      authProviderId: 'user_repositor_quimica',
    };

    it('da de baja al colaborador en Clerk y en la base, acotado a la cuenta', async () => {
      db.findFirst.mockResolvedValue(target);
      clerk.deleteUser.mockResolvedValue({});
      db.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete(`/api/auth/users/${COLLAB_QUIMICA.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Colaborador dado de baja correctamente.');
      expect(db.findFirst).toHaveBeenCalledWith({
        where: { id: COLLAB_QUIMICA.id, accountId: QUIMICA_ID },
        select: { id: true, role: true, authProviderId: true },
      });
      expect(clerk.deleteUser).toHaveBeenCalledWith('user_repositor_quimica');
      expect(db.deleteMany).toHaveBeenCalledWith({ where: { id: COLLAB_QUIMICA.id, accountId: QUIMICA_ID } });
    });

    it('responde 422 si el ADMIN intenta darse de baja a sí mismo', async () => {
      const res = await request(app).delete(`/api/auth/users/${ADMIN_QUIMICA.id}`);

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('No podés darte de baja a vos mismo.');
      expect(db.findFirst).not.toHaveBeenCalled();
      expect(clerk.deleteUser).not.toHaveBeenCalled();
    });

    it('responde 404 si el usuario no existe o es de otra cuenta', async () => {
      db.findFirst.mockResolvedValue(null);

      const res = await request(app).delete('/api/auth/users/u-cajero-panaderia');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('El usuario no existe.');
      expect(clerk.deleteUser).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });

    it('responde 422 si el destino es otro ADMIN', async () => {
      db.findFirst.mockResolvedValue({ ...target, id: 'u-socio', role: 'ADMIN' });

      const res = await request(app).delete('/api/auth/users/u-socio');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Solo se pueden dar de baja colaboradores.');
      expect(clerk.deleteUser).not.toHaveBeenCalled();
    });

    it('si el usuario ya no existe en Clerk, igual lo borra de la base', async () => {
      db.findFirst.mockResolvedValue(target);
      clerk.deleteUser.mockRejectedValue(clerkError(404, 'resource_not_found'));
      db.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete(`/api/auth/users/${COLLAB_QUIMICA.id}`);

      expect(res.status).toBe(200);
      expect(db.deleteMany).toHaveBeenCalled();
    });

    it('si Clerk falla, responde 502 y no borra la fila (se puede reintentar)', async () => {
      db.findFirst.mockResolvedValue(target);
      clerk.deleteUser.mockRejectedValue(clerkError(500, 'internal_clerk_error'));

      const res = await request(app).delete(`/api/auth/users/${COLLAB_QUIMICA.id}`);

      expect(res.status).toBe(502);
      expect(db.deleteMany).not.toHaveBeenCalled();
    });
  });
});
</file>

<file path="backend/src/routes/collaborators.ts">
import { Router, Response } from 'express';
import { z } from 'zod';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { AppError } from '../middlewares/errorHandler';
import { prisma } from '../lib/prisma';
import { getClerkClient } from '../lib/clerk';
import { parseInvitationMetadata, type InvitationMetadata } from '../services/invitedUserProvisioning';
import { dispatchInvitationEmail } from '../services/invitationMailDispatcher';

/*
  Equipo de la cuenta: invitar colaboradores por mail, revocar invitaciones y dar de baja
  colaboradores (ADR-008). Todo es solo ADMIN y la cuenta sale siempre de req.user.
  Contrato en docs/api.md §3.
*/
const router = Router();
const adminOnly = [authMiddleware, requireRole(['ADMIN'])];

/** Tope de página de la Backend API de Clerk. */
const CLERK_PAGE_SIZE = 500;

const CLERK_UNAVAILABLE = 'No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos.';
const INVITATION_NOT_FOUND = 'La invitación no existe o ya no está pendiente.';
const INVALID_EMAIL = 'Ingresá un correo electrónico válido.';

const invitationBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  })
  .strict();

interface ClerkInvitation {
  id: string;
  emailAddress: string;
  publicMetadata: Record<string, unknown> | null;
  createdAt: number;
  url?: string;
}

/**
 * `url` es el enlace para aceptar la invitación: lo ve solo el ADMIN de la cuenta, para
 * copiarlo y mandarlo por otro canal si el mail no llega.
 */
function toInvitationResponse(invitation: ClerkInvitation) {
  return {
    id: invitation.id,
    email: invitation.emailAddress,
    createdAt: new Date(invitation.createdAt).toISOString(),
    url: invitation.url ?? null,
  };
}

function belongsToAccount(invitation: ClerkInvitation, accountId: string): boolean {
  const metadata: InvitationMetadata | null = parseInvitationMetadata(invitation.publicMetadata);
  return metadata?.accountId === accountId;
}

function isClerkNotFound(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.status === 404;
}

/** Traduce un error de Clerk a uno de dominio; los demás errores siguen al errorHandler (500). */
function toAppError(error: unknown): unknown {
  if (!isClerkAPIResponseError(error)) {
    return error;
  }
  const alreadyExists = error.errors.some(
    (detail) => detail.code.includes('duplicate') || detail.code.includes('identifier_exists')
  );
  if (alreadyExists) {
    return new AppError('Ese correo ya tiene una cuenta o una invitación pendiente.', 409);
  }
  // Clerk valida el correo más estricto que el formulario (por ejemplo, rechaza dominios reservados).
  if (error.errors.some((detail) => detail.code === 'form_param_format_invalid')) {
    return new AppError(INVALID_EMAIL, 400);
  }
  return new AppError(CLERK_UNAVAILABLE, 502);
}

/** Recorre todas las páginas de invitaciones pendientes (opcionalmente filtradas por correo o id). */
async function listPendingInvitations(query?: string): Promise<ClerkInvitation[]> {
  const invitations: ClerkInvitation[] = [];
  for (let offset = 0; ; offset += CLERK_PAGE_SIZE) {
    const page = await getClerkClient().invitations.getInvitationList({
      status: 'pending',
      ...(query ? { query } : {}),
      limit: CLERK_PAGE_SIZE,
      offset,
    });
    invitations.push(...page.data);
    if (page.data.length < CLERK_PAGE_SIZE || invitations.length >= page.totalCount) {
      return invitations;
    }
  }
}

/** `<APP_BASE_URL>/login`, o nada si la variable falta o no es http(s): Clerk usa entonces su portal. */
function invitationRedirectUrl(): string | undefined {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '');
  return base && /^https?:\/\//.test(base) ? `${base}/login` : undefined;
}

/*
  POST /api/auth/invitations
  Invita a un colaborador. Clerk crea la invitación sin su mail (notify: false) y MargenX manda
  el suyo por n8n (services/invitationMailDispatcher.ts). Si el mail no sale, la invitación igual
  queda y la respuesta lo indica con emailSent: false, para que el ADMIN copie el enlace.
  Al aceptarla, el primer inicio de sesión crea el User (services/invitedUserProvisioning.ts).
*/
router.post('/invitations', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = invitationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(INVALID_EMAIL, 400);
  }
  const { email } = parsed.data;
  const accountId = req.user!.accountId;

  // El correo es único en toda la base (User.email @unique): la consulta no se filtra por cuenta a propósito.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    throw new AppError('Ese correo ya tiene un usuario en MargenX.', 409);
  }

  try {
    const pending = await listPendingInvitations(email);
    if (pending.some((invitation) => invitation.emailAddress.toLowerCase() === email)) {
      throw new AppError('Ya hay una invitación pendiente para ese correo.', 409);
    }

    const redirectUrl = invitationRedirectUrl();
    const invitation = await getClerkClient().invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { accountId, role: 'COLLABORATOR' },
      ...(redirectUrl ? { redirectUrl } : {}),
      notify: false,
    });

    const emailSent = invitation.url
      ? await dispatchInvitationEmail({
          email,
          tradeName: req.user!.account?.businessName ?? 'tu comercio',
          inviterEmail: req.user!.email,
          invitationUrl: invitation.url,
        })
      : false;

    res.status(201).json({ invitation: toInvitationResponse(invitation), emailSent });
  } catch (error) {
    throw toAppError(error);
  }
});

/*
  GET /api/auth/invitations
  Invitaciones pendientes de la cuenta del ADMIN.
*/
router.get('/invitations', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const invitations = (await listPendingInvitations())
      .filter((invitation) => belongsToAccount(invitation, accountId))
      .map(toInvitationResponse);
    res.status(200).json({ invitations });
  } catch (error) {
    throw toAppError(error);
  }
});

/*
  DELETE /api/auth/invitations/:id
  Revoca una invitación pendiente de la propia cuenta (404 si es de otra cuenta o ya no está pendiente).
*/
router.delete('/invitations/:id', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const invitationId = String(req.params.id);
  const accountId = req.user!.accountId;
  try {
    const invitation = (await listPendingInvitations(invitationId)).find(
      (candidate) => candidate.id === invitationId && belongsToAccount(candidate, accountId)
    );
    if (!invitation) {
      throw new AppError(INVITATION_NOT_FOUND, 404);
    }
    await getClerkClient().invitations.revokeInvitation(invitation.id);
    res.status(200).json({ message: 'Invitación revocada correctamente.' });
  } catch (error) {
    if (isClerkNotFound(error)) {
      throw new AppError(INVITATION_NOT_FOUND, 404);
    }
    throw toAppError(error);
  }
});

/*
  GET /api/auth/users
  Usuarios activos de la cuenta del ADMIN (primero los administradores).
*/
router.get('/users', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { accountId: req.user!.accountId },
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  res.status(200).json({ users });
});

/*
  DELETE /api/auth/users/:id
  Baja de un colaborador. Borra también su usuario de Clerk: si quedara, sus publicMetadata
  lo volverían a dar de alta en el siguiente inicio de sesión.
*/
router.delete('/users/:id', ...adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.params.id);
  const accountId = req.user!.accountId;

  if (userId === req.user!.id) {
    throw new AppError('No podés darte de baja a vos mismo.', 422);
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, accountId },
    select: { id: true, role: true, authProviderId: true },
  });
  if (!target) {
    throw new AppError('El usuario no existe.', 404);
  }
  if (target.role !== 'COLLABORATOR') {
    throw new AppError('Solo se pueden dar de baja colaboradores.', 422);
  }

  try {
    await getClerkClient().users.deleteUser(target.authProviderId);
  } catch (error) {
    // Si ya no existe en Clerk, se completa la baja en la base (reintento de una baja a medias).
    if (!isClerkNotFound(error)) {
      throw toAppError(error);
    }
  }

  await prisma.user.deleteMany({ where: { id: target.id, accountId } });
  res.status(200).json({ message: 'Colaborador dado de baja correctamente.' });
});

export default router;
</file>

<file path="backend/src/routes/dashboard.test.ts">
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Prisma } from '@prisma/client';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

const authMiddlewareMock = vi.fn((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const role = (req.headers['x-role'] as string | undefined) === 'COLLABORATOR' ? 'COLLABORATOR' : 'ADMIN';
  req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role };
  next();
});

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (...args: Parameters<typeof authMiddlewareMock>) => authMiddlewareMock(...args),
}));

const ingredientCountMock = vi.fn();
const productFindManyMock = vi.fn();
const priceHistoryGroupByMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: { count: (...args: unknown[]) => ingredientCountMock(...args) },
    product: {
      findMany: (...args: unknown[]) => productFindManyMock(...args),
    },
    priceHistory: { groupBy: (...args: unknown[]) => priceHistoryGroupByMock(...args) },
  },
}));

import dashboardRouter from './dashboard';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  ingredientCountMock.mockReset();
  productFindManyMock.mockReset();
  priceHistoryGroupByMock.mockReset();
});

describe('GET /api/dashboard/metrics', () => {
  it('devuelve métricas consolidadas, buckets del histograma y mediana para la cuenta del administrador', async () => {
    ingredientCountMock.mockResolvedValue(10);
    productFindManyMock.mockResolvedValue([
      {
        marginPercent: new Prisma.Decimal('15.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
      {
        marginPercent: new Prisma.Decimal('25.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
      {
        marginPercent: new Prisma.Decimal('18.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
      {
        marginPercent: new Prisma.Decimal('30.00'),
        minMarginPercent: new Prisma.Decimal('20.00'),
        _count: { ingredients: 1 },
      },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([
      { ingredientId: 'ing-1' },
      { ingredientId: 'ing-2' },
      { ingredientId: 'ing-1' },
    ]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeIngredientsCount: 10,
      criticalProductsCount: 2,
      healthyProductsCount: 2,
      averageMarginPercent: 21.5,
      recentCostVariationsCount: 2,
      lossCount: 0,
      riskCount: 2,
      targetCount: 2,
      surplusCount: 0,
      draftCount: 0,
    });
    expect(productFindManyMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1' },
      select: {
        marginPercent: true,
        minMarginPercent: true,
        _count: { select: { ingredients: true } },
      },
    });
    expect(priceHistoryGroupByMock).toHaveBeenCalledWith({
      by: ['ingredientId'],
      where: {
        ingredient: { accountId: 'account-1' },
        changedAt: { gte: expect.any(Date) },
      },
    });
  });

  it('excluye productos sin receta de críticos, saludables y mediana pero los contabiliza en draftCount', async () => {
    ingredientCountMock.mockResolvedValue(10);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('-5.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('15.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('35.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('72.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 1 } },
      { marginPercent: new Prisma.Decimal('0.00'), minMarginPercent: new Prisma.Decimal('20.00'), _count: { ingredients: 0 } },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([{ ingredientId: 'ing-1' }, { ingredientId: 'ing-2' }, { ingredientId: 'ing-1' }]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeIngredientsCount: 10,
      criticalProductsCount: 2,
      healthyProductsCount: 2,
      averageMarginPercent: 25,
      recentCostVariationsCount: 2,
      lossCount: 1,
      riskCount: 1,
      targetCount: 1,
      surplusCount: 1,
      draftCount: 1,
    });
  });

  it('Gherkin "Buckets completos": con 339 productos (15 borradores), la suma de los cinco buckets es 339', async () => {
    ingredientCountMock.mockResolvedValue(218);
    const lossRows = Array.from({ length: 40 }, () => ({
      marginPercent: new Prisma.Decimal('-12.50'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 3 },
    }));
    const riskRows = Array.from({ length: 64 }, () => ({
      marginPercent: new Prisma.Decimal('22.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 4 },
    }));
    const targetRows = Array.from({ length: 130 }, () => ({
      marginPercent: new Prisma.Decimal('45.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 4 },
    }));
    const surplusRows = Array.from({ length: 90 }, () => ({
      marginPercent: new Prisma.Decimal('68.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 5 },
    }));
    const draftRows = Array.from({ length: 15 }, () => ({
      marginPercent: new Prisma.Decimal('0.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      _count: { ingredients: 0 },
    }));

    productFindManyMock.mockResolvedValue([...lossRows, ...riskRows, ...targetRows, ...surplusRows, ...draftRows]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    const { lossCount, riskCount, targetCount, surplusCount, draftCount } = res.body;
    expect(lossCount).toBe(40);
    expect(riskCount).toBe(64);
    expect(targetCount).toBe(130);
    expect(surplusCount).toBe(90);
    expect(draftCount).toBe(15);
    expect(lossCount + riskCount + targetCount + surplusCount + draftCount).toBe(339);
    expect(res.body.criticalProductsCount).toBe(104);
    expect(res.body.healthyProductsCount).toBe(220);
    expect(res.body.averageMarginPercent).toBe(45);
  });

  it('Gherkin "Umbral propio": un producto con margen 35% y mínimo 40% cae en riskCount aunque el umbral de cuenta sea 30%', async () => {
    ingredientCountMock.mockResolvedValue(5);
    productFindManyMock.mockResolvedValue([
      {
        marginPercent: new Prisma.Decimal('35.00'),
        minMarginPercent: new Prisma.Decimal('40.00'),
        _count: { ingredients: 2 },
      },
      {
        marginPercent: new Prisma.Decimal('35.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        _count: { ingredients: 2 },
      },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body.riskCount).toBe(1);
    expect(res.body.targetCount).toBe(1);
    expect(res.body.criticalProductsCount).toBe(1);
    expect(res.body.healthyProductsCount).toBe(1);
  });

  it('Gherkin "Precio extremo": un producto con precio $13 y costo $3.854 (-29546.15%) no domina el margen promedio', async () => {
    ingredientCountMock.mockResolvedValue(8);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('-29546.15'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 2 } },
      { marginPercent: new Prisma.Decimal('35.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 2 } },
      { marginPercent: new Prisma.Decimal('42.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 3 } },
      { marginPercent: new Prisma.Decimal('50.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 2 } },
      { marginPercent: new Prisma.Decimal('65.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 4 } },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body.lossCount).toBe(1);
    expect(res.body.targetCount).toBe(3);
    expect(res.body.surplusCount).toBe(1);
    expect(res.body.averageMarginPercent).toBe(42);
  });

  it('maneja catálogo vacío o compuesto únicamente por borradores sin error ni NaN', async () => {
    ingredientCountMock.mockResolvedValue(0);
    productFindManyMock.mockResolvedValue([
      { marginPercent: new Prisma.Decimal('0.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 0 } },
      { marginPercent: new Prisma.Decimal('0.00'), minMarginPercent: new Prisma.Decimal('30.00'), _count: { ingredients: 0 } },
    ]);
    priceHistoryGroupByMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/dashboard/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeIngredientsCount: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      recentCostVariationsCount: 0,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 2,
    });
  });

  it('devuelve 403 si el usuario no es ADMIN', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);
    app.use(errorHandler);

    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('x-role', 'COLLABORATOR');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
  });
});
</file>

<file path="backend/src/routes/internalReports.test.ts">
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AppError, errorHandler } from '../middlewares/errorHandler';

const getActiveReportAccountsMock = vi.fn();
const getWeeklyMarginReportBySlugMock = vi.fn();

vi.mock('../services/reportService', () => ({
  getActiveReportAccounts: (...args: unknown[]) => getActiveReportAccountsMock(...args),
  getWeeklyMarginReportBySlug: (...args: unknown[]) =>
    getWeeklyMarginReportBySlugMock(...args),
}));

import internalReportsRouter from './internalReports';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/internal/reports', internalReportsRouter);
  app.use(errorHandler);
  return app;
}

describe('rutas internas de reportes', () => {
  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'internal-test-secret';
    getActiveReportAccountsMock.mockReset();
    getWeeklyMarginReportBySlugMock.mockReset();
  });

  afterEach(() => {
    delete process.env.INTERNAL_WEBHOOK_SECRET;
  });

  it('rechaza solicitudes sin secreto o con secreto inválido', async () => {
    const app = buildApp();
    const noSecret = await request(app).get('/api/internal/reports/accounts');
    const badSecret = await request(app)
      .get('/api/internal/reports/weekly/panaderia-central')
      .set('x-margenx-webhook-secret', 'malo');

    expect(noSecret.status).toBe(401);
    expect(noSecret.body.error).toBe('Unauthorized');
    expect(badSecret.status).toBe(401);
    expect(getActiveReportAccountsMock).not.toHaveBeenCalled();
    expect(getWeeklyMarginReportBySlugMock).not.toHaveBeenCalled();
  });

  it('lista las cuentas activas', async () => {
    const accounts = [{
      id: 'acc-1',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      ownerEmail: 'admin.panaderia@seed.example.test',
    }];
    getActiveReportAccountsMock.mockResolvedValue(accounts);

    const response = await request(buildApp())
      .get('/api/internal/reports/accounts')
      .set('x-margenx-webhook-secret', 'internal-test-secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accounts });
  });

  it('propaga 404 para un slug inexistente o una cuenta inactiva', async () => {
    getWeeklyMarginReportBySlugMock.mockRejectedValue(
      new AppError('No existe una cuenta activa para el slug indicado.', 404)
    );

    const response = await request(buildApp())
      .get('/api/internal/reports/weekly/slug-inexistente')
      .set('x-margenx-webhook-secret', 'internal-test-secret');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('No existe una cuenta activa para el slug indicado.');
  });

  it('rechaza fechas inválidas y entrega el reporte por slug válido', async () => {
    const app = buildApp();
    const headers = { 'x-margenx-webhook-secret': 'internal-test-secret' };
    const invalid = await request(app)
      .get('/api/internal/reports/weekly/panaderia-central?from=no-fecha')
      .set(headers);
    expect(invalid.status).toBe(400);
    expect(getWeeklyMarginReportBySlugMock).not.toHaveBeenCalled();

    const report = { account: { slug: 'panaderia-central' }, catalogHealth: { totalProducts: 10 } };
    getWeeklyMarginReportBySlugMock.mockResolvedValue(report);
    const valid = await request(app)
      .get('/api/internal/reports/weekly/panaderia-central')
      .set(headers);

    expect(valid.status).toBe(200);
    expect(valid.body).toEqual(report);
    expect(getWeeklyMarginReportBySlugMock).toHaveBeenCalledWith('panaderia-central', {
      from: undefined,
      to: undefined,
    });
  });

  it('rechaza un parámetro de fecha repetido', async () => {
    const response = await request(buildApp())
      .get('/api/internal/reports/weekly/panaderia-central?from=2026-11-10&from=2026-11-11')
      .set('x-margenx-webhook-secret', 'internal-test-secret');

    expect(response.status).toBe(400);
  });
});
</file>

<file path="backend/src/routes/internalReports.ts">
import { Router, type Request, type Response } from 'express';
import { internalWebhookAuthMiddleware } from '../middlewares/internalWebhookAuth';
import { AppError } from '../middlewares/errorHandler';
import {
  getActiveReportAccounts,
  getWeeklyMarginReportBySlug,
  type ReportDateRangeOptions,
} from '../services/reportService';

const router = Router();

router.use(internalWebhookAuthMiddleware);

export function parseReportRangeQuery(query: Record<string, unknown>): ReportDateRangeOptions {
  const parseOptionalDate = (raw: unknown, field: 'from' | 'to'): Date | undefined => {
    if (raw === undefined || raw === '') return undefined;
    if (typeof raw !== 'string') {
      throw new AppError(`El parámetro "${field}" debe ser una fecha ISO válida.`, 400);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(`El parámetro "${field}" debe ser una fecha ISO válida.`, 400);
    }
    return parsed;
  };

  return {
    from: parseOptionalDate(query.from, 'from'),
    to: parseOptionalDate(query.to, 'to'),
  };
}

router.get('/accounts', async (_req: Request, res: Response) => {
  const accounts = await getActiveReportAccounts();
  return res.status(200).json({ accounts });
});

router.get('/weekly/:slug', async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug)?.trim() ?? '';

  if (!slug) {
    throw new AppError('El slug de la cuenta es obligatorio.', 400);
  }

  const range = parseReportRangeQuery(req.query as Record<string, unknown>);
  const report = await getWeeklyMarginReportBySlug(slug, range);
  return res.status(200).json(report);
});

export default router;
</file>

<file path="backend/src/routes/salesSummaryRoutes.test.ts">
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

const db = vi.hoisted(() => ({
  account: { findUnique: vi.fn() },
  sale: { count: vi.fn() },
  saleItem: { aggregate: vi.fn(), groupBy: vi.fn() },
}));
vi.mock('../lib/prisma', () => ({ prisma: db }));

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser | undefined;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, _res: unknown, next: () => void) => {
    req.user = currentUser;
    next();
  },
}));

import { salesRouter } from './salesModule';

const ACCOUNT = 'acc-panaderia-central';
const ADMIN: TestUser = { id: 'u-admin-panaderia', accountId: ACCOUNT, email: 'admin.panaderia@seed.example.test', role: 'ADMIN' };
const CAJERA: TestUser = { id: 'u-cajera-panaderia', accountId: ACCOUNT, email: 'cajera.panaderia@seed.example.test', role: 'COLLABORATOR' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales', salesRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Martes 24/11/2026, 12:00 de Argentina.
  vi.useFakeTimers({ now: new Date('2026-11-24T15:00:00.000Z'), toFake: ['Date'] });
  currentUser = ADMIN;
  db.account.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] });
  // Período actual: $100.000 en 41 ventas con $62.000 de costo. Anterior: $80.000 con $52.000.
  db.sale.count.mockResolvedValueOnce(41).mockResolvedValueOnce(35);
  db.saleItem.aggregate
    .mockResolvedValueOnce({ _sum: { lineTotal: D('100000'), lineCost: D('62000') } })
    .mockResolvedValueOnce({ _sum: { lineTotal: D('80000'), lineCost: D('52000') } });
  db.saleItem.groupBy.mockResolvedValue([
    { productId: 'p-medialunas', productName: 'Medialunas de manteca — docena (12 unidades)', _sum: { quantity: 4, lineTotal: D('54000'), lineCost: D('30000') } },
    { productId: 'p-pan', productName: 'Pan flauta — 1 kg', _sum: { quantity: 10, lineTotal: D('46000'), lineCost: D('32000') } },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/sales/summary (ganancia real)', () => {
  it('Escenario "Margen ponderado": la semana con $100.000 y $62.000 de costo da $38.000 y 38,00 %, comparada con la anterior', async () => {
    const res = await request(buildApp()).get('/api/sales/summary?period=week');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toMatchObject({
      period: 'week',
      from: '2026-11-18',
      to: '2026-11-24',
      salesCount: 41,
      salesTotal: '100000.00',
      costTotal: '62000.00',
      profit: '38000.00',
      marginPercent: '38.00',
      previous: { from: '2026-11-11', to: '2026-11-17', salesTotal: '80000.00', profit: '28000.00', marginPercent: '35.00' },
      change: { salesTotal: '25.00', profit: '35.71' },
    });
    expect(res.body.topSold[0]).toMatchObject({ productName: 'Pan flauta — 1 kg', quantity: 10 });
    expect(res.body.topProfit[0]).toMatchObject({ productName: 'Medialunas de manteca — docena (12 unidades)', profit: '24000.00' });
  });

  it('Escenario "Anuladas fuera": solo cuenta las ventas completadas de la cuenta de la sesión, en el rango del período', async () => {
    await request(buildApp()).get('/api/sales/summary?period=day&accountId=acc-quimica-gyj');

    const actual = { accountId: ACCOUNT, status: 'COMPLETED', soldAt: { gte: new Date('2026-11-24T03:00:00.000Z'), lt: new Date('2026-11-25T03:00:00.000Z') } };
    const anterior = { accountId: ACCOUNT, status: 'COMPLETED', soldAt: { gte: new Date('2026-11-23T03:00:00.000Z'), lt: new Date('2026-11-24T03:00:00.000Z') } };
    expect(db.sale.count).toHaveBeenCalledWith({ where: actual });
    expect(db.sale.count).toHaveBeenCalledWith({ where: anterior });
    expect(db.saleItem.aggregate).toHaveBeenCalledWith({ where: { sale: actual }, _sum: { lineTotal: true, lineCost: true } });
    expect(db.saleItem.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['productId', 'productName'], where: { sale: actual } }));
  });

  it('Escenario "Colaborador sin ganancia": al colaborador le responde 403 y no consulta nada', async () => {
    currentUser = CAJERA;

    const res = await request(buildApp()).get('/api/sales/summary');

    expect(res.status).toBe(403);
    expect(db.sale.count).not.toHaveBeenCalled();
    expect(db.saleItem.aggregate).not.toHaveBeenCalled();
  });

  it('un período inválido responde 400; sin período, usa la semana', async () => {
    expect((await request(buildApp()).get('/api/sales/summary?period=year')).status).toBe(400);
    const res = await request(buildApp()).get('/api/sales/summary');
    expect(res.body.period).toBe('week');
  });

  it('sin ventas en el período anterior, la variación va en null (no divide por cero)', async () => {
    db.sale.count.mockReset().mockResolvedValueOnce(41).mockResolvedValueOnce(0);
    db.saleItem.aggregate
      .mockReset()
      .mockResolvedValueOnce({ _sum: { lineTotal: D('100000'), lineCost: D('62000') } })
      .mockResolvedValueOnce({ _sum: { lineTotal: null, lineCost: null } });

    const res = await request(buildApp()).get('/api/sales/summary?period=week');

    expect(res.body.previous).toMatchObject({ salesCount: 0, salesTotal: '0.00', marginPercent: null });
    expect(res.body.change).toEqual({ salesTotal: null, profit: null });
  });

  it('con el módulo apagado responde 404, como el resto del módulo', async () => {
    db.account.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [] });
    expect((await request(buildApp()).get('/api/sales/summary')).status).toBe(404);
  });
});
</file>

<file path="backend/src/services/cashShiftService.test.ts">
import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import {
  MAX_CASH_AMOUNT,
  computeExpected,
  computeArqueo,
  parseCloseInput,
  parseOpeningAmount,
  parseShiftListQuery,
  summarizeSales,
} from './cashShiftService';

const D = (v: string | number) => new Prisma.Decimal(v);

function expectAppError(fn: () => unknown, status: number, message?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(status);
    if (message) expect((error as AppError).message).toMatch(message);
    return;
  }
  throw new Error('Se esperaba un AppError');
}

describe('parseOpeningAmount', () => {
  it('acepta el monto inicial como número o texto, con hasta 2 decimales', () => {
    expect(parseOpeningAmount({ openingAmount: 10000 }).toFixed(2)).toBe('10000.00');
    expect(parseOpeningAmount({ openingAmount: '2500.5' }).toFixed(2)).toBe('2500.50');
    expect(parseOpeningAmount({ openingAmount: 0 }).toFixed(2)).toBe('0.00');
  });

  it('rechaza con 400 un monto que falta, negativo, con 3 decimales o mayor al máximo', () => {
    expectAppError(() => parseOpeningAmount({}), 400, /monto inicial/);
    expectAppError(() => parseOpeningAmount({ openingAmount: -1 }), 400);
    expectAppError(() => parseOpeningAmount({ openingAmount: 10.555 }), 400);
    expectAppError(() => parseOpeningAmount({ openingAmount: '1e3' }), 400);
    expectAppError(() => parseOpeningAmount({ openingAmount: MAX_CASH_AMOUNT + 1 }), 400, /99\.999\.999,99/);
    expectAppError(() => parseOpeningAmount(null), 400);
  });
});

describe('parseCloseInput', () => {
  it('exige lo contado en los tres medios de pago', () => {
    const input = parseCloseInput({ countedCash: 34500, countedTransfer: '0', countedMercadoPago: 1200.5 });
    expect(input.CASH.toFixed(2)).toBe('34500.00');
    expect(input.TRANSFER.toFixed(2)).toBe('0.00');
    expect(input.MERCADO_PAGO.toFixed(2)).toBe('1200.50');

    expectAppError(() => parseCloseInput({ countedCash: 34500, countedTransfer: 0 }), 400, /Mercado Pago/);
    expectAppError(() => parseCloseInput({ countedCash: -5, countedTransfer: 0, countedMercadoPago: 0 }), 400, /efectivo/);
  });
});

describe('summarizeSales', () => {
  it('suma por medio de pago solo las ventas completadas y cuenta aparte las anuladas', () => {
    const summary = summarizeSales([
      { paymentMethod: 'CASH', status: 'COMPLETED', _sum: { total: D('25000') }, _count: { _all: 9 } },
      { paymentMethod: 'CASH', status: 'VOIDED', _sum: { total: D('3000') }, _count: { _all: 1 } },
      { paymentMethod: 'TRANSFER', status: 'COMPLETED', _sum: { total: D('8400') }, _count: { _all: 2 } },
    ]);

    expect(summary.byMethod.CASH.toFixed(2)).toBe('25000.00');
    expect(summary.byMethod.TRANSFER.toFixed(2)).toBe('8400.00');
    expect(summary.byMethod.MERCADO_PAGO.toFixed(2)).toBe('0.00');
    expect(summary.salesCount).toBe(11);
    expect(summary.voidedCount).toBe(1);
    expect(summary.salesTotal.toFixed(2)).toBe('33400.00');
  });
});

describe('Escenario "Arqueo con diferencia"', () => {
  it('$10.000 iniciales y $25.000 en efectivo, contando $34.500: esperado $35.000 y diferencia −$500', () => {
    const expected = computeExpected(D('10000'), { CASH: D('25000'), TRANSFER: D('0'), MERCADO_PAGO: D('0') });
    expect(expected.CASH.toFixed(2)).toBe('35000.00');

    const arqueo = computeArqueo(expected, { CASH: D('34500'), TRANSFER: D('0'), MERCADO_PAGO: D('0') });
    expect(arqueo.differenceByMethod.CASH.toFixed(2)).toBe('-500.00');
    expect(arqueo.expectedTotal.toFixed(2)).toBe('35000.00');
    expect(arqueo.countedTotal.toFixed(2)).toBe('34500.00');
    expect(arqueo.difference.toFixed(2)).toBe('-500.00');
  });

  it('el monto inicial va solo al efectivo; transferencia y Mercado Pago se arquean por separado', () => {
    const expected = computeExpected(D('10000'), { CASH: D('0'), TRANSFER: D('8400'), MERCADO_PAGO: D('1500.50') });
    expect(expected).toEqual({ CASH: D('10000'), TRANSFER: D('8400'), MERCADO_PAGO: D('1500.50') });

    const arqueo = computeArqueo(expected, { CASH: D('10000'), TRANSFER: D('8000'), MERCADO_PAGO: D('1600.50') });
    expect(arqueo.differenceByMethod.TRANSFER.toFixed(2)).toBe('-400.00');
    expect(arqueo.differenceByMethod.MERCADO_PAGO.toFixed(2)).toBe('100.00');
    // Un faltante en un medio y un sobrante en otro se compensan en el total, pero se ven por separado.
    expect(arqueo.difference.toFixed(2)).toBe('-300.00');
  });
});

describe('parseShiftListQuery', () => {
  it('pagina como el historial de ventas: una página o un límite inválidos usan los valores por defecto', () => {
    expect(parseShiftListQuery({})).toEqual({ page: 1, limit: 20 });
    expect(parseShiftListQuery({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10 });
    expect(parseShiftListQuery({ page: '0', limit: '500' })).toEqual({ page: 1, limit: 100 });
  });
});
</file>

<file path="backend/src/services/cashShiftService.ts">
import { Prisma, type CashShift, type PaymentMethod, type SaleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../utils/pagination';
import { PAYMENT_METHODS, type SaleActor } from './salesService';

/*
  Caja por turnos (ADR-010, docs/especificacion-funcional.md §13).
  Un solo turno abierto por cuenta (índice parcial único "CashShift_accountId_open_key").
  ADMIN y COLLABORATOR abren y cierran. Al cierre se guardan lo esperado y lo contado
  por medio de pago, y la diferencia total: el arqueo de un turno cerrado no cambia,
  porque con el turno cerrado tampoco se anulan ventas. El arqueo no tiene costos ni
  márgenes, así que es el mismo para los dos roles.
*/

const Decimal = Prisma.Decimal;
type DecimalType = Prisma.Decimal;
type ByMethod = Record<PaymentMethod, DecimalType>;

/** Tope de `Decimal(12,2)` acotado a un monto de caja razonable. */
export const MAX_CASH_AMOUNT = 99_999_999.99;
const AMOUNT_REGEX = /^\d{1,8}(\.\d{1,2})?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SHIFT_ALREADY_OPEN_MESSAGE = 'Ya hay un turno de caja abierto. Cerralo antes de abrir otro.';
export const SHIFT_ALREADY_CLOSED_MESSAGE = 'El turno ya está cerrado.';
export const SHIFT_NOT_FOUND_MESSAGE = 'El turno no existe.';

const METHOD_FIELDS: Record<PaymentMethod, { counted: string; label: string }> = {
  CASH: { counted: 'countedCash', label: 'en efectivo' },
  TRANSFER: { counted: 'countedTransfer', label: 'por transferencia' },
  MERCADO_PAGO: { counted: 'countedMercadoPago', label: 'por Mercado Pago' },
};

export interface ShiftListQuery {
  page: number;
  limit: number;
}

/** Una fila de `sale.groupBy` por medio de pago y estado. */
export interface SalesGroup {
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  _sum: { total: DecimalType | null };
  _count: { _all: number };
}

export interface SalesSummary {
  byMethod: ByMethod;
  salesCount: number;
  voidedCount: number;
  salesTotal: DecimalType;
}

export interface Arqueo {
  differenceByMethod: ByMethod;
  expectedTotal: DecimalType;
  countedTotal: DecimalType;
  difference: DecimalType;
}

type ShiftWithUsers = CashShift & {
  openedBy: { email: string } | null;
  closedBy: { email: string } | null;
};

const SHIFT_INCLUDE = {
  openedBy: { select: { email: true } },
  closedBy: { select: { email: true } },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function zeroByMethod(): ByMethod {
  return { CASH: new Decimal(0), TRANSFER: new Decimal(0), MERCADO_PAGO: new Decimal(0) };
}

function sum(values: DecimalType[]): DecimalType {
  return values.reduce((acc, value) => acc.plus(value), new Decimal(0));
}

function money(value: DecimalType): string {
  return value.toFixed(2);
}

/** Monto de caja: número o texto, de 0 a 99.999.999,99, con hasta 2 decimales. */
function parseAmount(raw: unknown, what: string): DecimalType {
  const text = typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!AMOUNT_REGEX.test(text)) {
    throw new AppError(
      `Indicá ${what}: un monto de 0 a $99.999.999,99, con hasta 2 decimales.`,
      400
    );
  }
  return new Decimal(text);
}

/** Cuerpo de `POST /api/cash-shifts/open`. */
export function parseOpeningAmount(body: unknown): DecimalType {
  return parseAmount(isRecord(body) ? body.openingAmount : undefined, 'el monto inicial de la caja');
}

/** Cuerpo de `POST /api/cash-shifts/:id/close`: lo contado en los tres medios de pago. */
export function parseCloseInput(body: unknown): ByMethod {
  const record = isRecord(body) ? body : {};
  const counted = zeroByMethod();
  for (const method of PAYMENT_METHODS) {
    const { counted: field, label } = METHOD_FIELDS[method];
    counted[method] = parseAmount(record[field], `lo contado ${label}`);
  }
  return counted;
}

export function parseShiftListQuery(query: Record<string, unknown>): ShiftListQuery {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const rawLimit = Number(query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  return { page, limit };
}

/** Ventas del turno por medio de pago. Las anuladas no suman: se cuentan aparte. */
export function summarizeSales(groups: SalesGroup[]): SalesSummary {
  const byMethod = zeroByMethod();
  let salesCount = 0;
  let voidedCount = 0;
  for (const group of groups) {
    if (group.status === 'VOIDED') {
      voidedCount += group._count._all;
      continue;
    }
    salesCount += group._count._all;
    byMethod[group.paymentMethod] = byMethod[group.paymentMethod].plus(group._sum.total ?? 0);
  }
  return { byMethod, salesCount, voidedCount, salesTotal: sum(Object.values(byMethod)) };
}

/** Lo esperado en caja: el monto inicial va al efectivo; los otros medios, solo sus ventas. */
export function computeExpected(openingAmount: DecimalType, salesByMethod: ByMethod): ByMethod {
  return {
    CASH: openingAmount.plus(salesByMethod.CASH),
    TRANSFER: salesByMethod.TRANSFER,
    MERCADO_PAGO: salesByMethod.MERCADO_PAGO,
  };
}

/** Diferencia (contado − esperado) por medio de pago y total. Negativa = falta plata. */
export function computeArqueo(expected: ByMethod, counted: ByMethod): Arqueo {
  const differenceByMethod = zeroByMethod();
  for (const method of PAYMENT_METHODS) {
    differenceByMethod[method] = counted[method].minus(expected[method]);
  }
  const expectedTotal = sum(Object.values(expected));
  const countedTotal = sum(Object.values(counted));
  return { differenceByMethod, expectedTotal, countedTotal, difference: countedTotal.minus(expectedTotal) };
}

/**
 * Resumen del turno para la API. Abierto: lo esperado se calcula con las ventas hasta ahora.
 * Cerrado: lo esperado y lo contado son los guardados al cierre.
 */
export function serializeShift(shift: ShiftWithUsers, summary: SalesSummary) {
  const isClosed =
    shift.status === 'CLOSED' &&
    shift.expectedCash !== null &&
    shift.expectedTransfer !== null &&
    shift.expectedMercadoPago !== null &&
    shift.countedCash !== null &&
    shift.countedTransfer !== null &&
    shift.countedMercadoPago !== null;

  const expected: ByMethod = isClosed
    ? { CASH: shift.expectedCash!, TRANSFER: shift.expectedTransfer!, MERCADO_PAGO: shift.expectedMercadoPago! }
    : computeExpected(shift.openingAmount, summary.byMethod);
  const counted: ByMethod | null = isClosed
    ? { CASH: shift.countedCash!, TRANSFER: shift.countedTransfer!, MERCADO_PAGO: shift.countedMercadoPago! }
    : null;
  const arqueo = counted ? computeArqueo(expected, counted) : null;

  return {
    id: shift.id,
    status: shift.status,
    openedAt: shift.openedAt.toISOString(),
    openedBy: shift.openedBy?.email ?? null,
    closedAt: shift.closedAt?.toISOString() ?? null,
    closedBy: shift.closedBy?.email ?? null,
    openingAmount: money(shift.openingAmount),
    salesCount: summary.salesCount,
    voidedCount: summary.voidedCount,
    salesTotal: money(summary.salesTotal),
    methods: PAYMENT_METHODS.map((method) => ({
      paymentMethod: method,
      salesTotal: money(summary.byMethod[method]),
      expected: money(expected[method]),
      counted: counted ? money(counted[method]) : null,
      difference: arqueo ? money(arqueo.differenceByMethod[method]) : null,
    })),
    expectedTotal: money(sum(Object.values(expected))),
    countedTotal: arqueo ? money(arqueo.countedTotal) : null,
    difference: arqueo ? money(arqueo.difference) : null,
  };
}

export type ShiftSummary = ReturnType<typeof serializeShift>;

/**
 * El ADMIN ve todos los turnos; el colaborador, "el arqueo de su turno" (especificación §13):
 * el abierto y los que abrió, cerró o en los que vendió.
 */
function visibleShiftsWhere(actor: SaleActor): Prisma.CashShiftWhereInput {
  if (actor.role === 'ADMIN') return { accountId: actor.accountId };
  return {
    accountId: actor.accountId,
    OR: [
      { status: 'OPEN' },
      { openedById: actor.id },
      { closedById: actor.id },
      { sales: { some: { soldById: actor.id } } },
    ],
  };
}

async function summaryOf(accountId: string, shiftId: string, client: Prisma.TransactionClient = prisma) {
  const groups = await client.sale.groupBy({
    by: ['paymentMethod', 'status'],
    where: { accountId, cashShiftId: shiftId },
    _sum: { total: true },
    _count: { _all: true },
  });
  return summarizeSales(groups);
}

function isOpenShiftConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function openShift(actor: SaleActor, openingAmount: DecimalType): Promise<ShiftSummary> {
  const existing = await prisma.cashShift.findFirst({
    where: { accountId: actor.accountId, status: 'OPEN' },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(SHIFT_ALREADY_OPEN_MESSAGE, 409);
  }

  try {
    const shift = await prisma.cashShift.create({
      data: { accountId: actor.accountId, openedById: actor.id, openingAmount },
      include: SHIFT_INCLUDE,
    });
    return serializeShift(shift, summarizeSales([]));
  } catch (error) {
    // Dos aperturas a la vez: el índice parcial único deja pasar solo una.
    if (isOpenShiftConflict(error)) throw new AppError(SHIFT_ALREADY_OPEN_MESSAGE, 409);
    throw error;
  }
}

/** El turno abierto de la cuenta con lo vendido hasta ahora, o `null` si no hay. */
export async function getCurrentShift(actor: SaleActor): Promise<ShiftSummary | null> {
  const shift = await prisma.cashShift.findFirst({
    where: { accountId: actor.accountId, status: 'OPEN' },
    include: SHIFT_INCLUDE,
  });
  if (!shift) return null;
  return serializeShift(shift, await summaryOf(actor.accountId, shift.id));
}

export async function findShift(actor: SaleActor, shiftId: string): Promise<ShiftSummary | null> {
  if (!UUID_REGEX.test(shiftId)) return null;
  const shift = await prisma.cashShift.findFirst({
    where: { id: shiftId, ...visibleShiftsWhere(actor) },
    include: SHIFT_INCLUDE,
  });
  if (!shift) return null;
  return serializeShift(shift, await summaryOf(actor.accountId, shift.id));
}

/**
 * Cierra el turno con el arqueo, en una transacción. Primero pasa el turno a CLOSED: esa
 * actualización espera a las ventas y anulaciones en curso (que toman un bloqueo compartido
 * sobre la fila) y frena las que llegan después. Recién entonces suma las ventas, así
 * ninguna queda afuera del arqueo.
 */
export async function closeShift(actor: SaleActor, shiftId: string, counted: ByMethod): Promise<ShiftSummary> {
  if (!UUID_REGEX.test(shiftId)) {
    throw new AppError(SHIFT_NOT_FOUND_MESSAGE, 404);
  }

  return prisma.$transaction(async (tx) => {
    const shift = await tx.cashShift.findFirst({
      where: { id: shiftId, accountId: actor.accountId },
      select: {
        id: true,
        status: true,
        openingAmount: true,
        openedById: true,
        closedById: true,
        _count: { select: { sales: { where: { soldById: actor.id } } } },
      },
    });
    if (!shift) {
      throw new AppError(SHIFT_NOT_FOUND_MESSAGE, 404);
    }
    if (shift.status === 'CLOSED') {
      // Al colaborador, un turno cerrado ajeno le responde igual que uno que no existe.
      const visible =
        actor.role === 'ADMIN' ||
        shift.openedById === actor.id ||
        shift.closedById === actor.id ||
        shift._count.sales > 0;
      throw new AppError(visible ? SHIFT_ALREADY_CLOSED_MESSAGE : SHIFT_NOT_FOUND_MESSAGE, visible ? 409 : 404);
    }

    const locked = await tx.cashShift.updateMany({
      where: { id: shift.id, accountId: actor.accountId, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date(), closedById: actor.id },
    });
    if (locked.count === 0) {
      throw new AppError(SHIFT_ALREADY_CLOSED_MESSAGE, 409);
    }

    const summary = await summaryOf(actor.accountId, shift.id, tx);
    const expected = computeExpected(shift.openingAmount, summary.byMethod);
    const arqueo = computeArqueo(expected, counted);

    const closed = await tx.cashShift.update({
      where: { id: shift.id },
      data: {
        expectedCash: expected.CASH,
        expectedTransfer: expected.TRANSFER,
        expectedMercadoPago: expected.MERCADO_PAGO,
        countedCash: counted.CASH,
        countedTransfer: counted.TRANSFER,
        countedMercadoPago: counted.MERCADO_PAGO,
        difference: arqueo.difference,
      },
      include: SHIFT_INCLUDE,
    });
    return serializeShift(closed, summary);
  });
}

export async function listShifts(actor: SaleActor, query: ShiftListQuery) {
  const where = visibleShiftsWhere(actor);
  const [total, shifts] = await prisma.$transaction([
    prisma.cashShift.count({ where }),
    prisma.cashShift.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: SHIFT_INCLUDE,
    }),
  ]);

  const groups = shifts.length
    ? await prisma.sale.groupBy({
        by: ['cashShiftId', 'paymentMethod', 'status'],
        where: { accountId: actor.accountId, cashShiftId: { in: shifts.map((shift) => shift.id) } },
        _sum: { total: true },
        _count: { _all: true },
      })
    : [];

  return {
    data: shifts.map((shift) =>
      serializeShift(shift, summarizeSales(groups.filter((group) => group.cashShiftId === shift.id)))
    ),
    meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
  };
}
</file>

<file path="backend/src/services/invitationMailDispatcher.test.ts">
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchInvitationEmail, type InvitationEmail } from './invitationMailDispatcher';

const INVITATION: InvitationEmail = {
  email: 'cajera.quimica@seed.example.test',
  tradeName: 'Química GyJ',
  inviterEmail: 'admin.quimica@seed.example.test',
  invitationUrl: 'https://possible-alpaca-7097.clerk.accounts.dev/v1/tickets/accept?ticket=ticket_quimica',
};

describe('dispatchInvitationEmail', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.N8N_INVITATION_WEBHOOK_URL = 'https://n8n.example.test/webhook/collaborator-invitation';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secreto-de-prueba';
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.N8N_INVITATION_WEBHOOK_URL;
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('despacha a n8n con el secreto, un timeout de 5 s, y devuelve true si n8n responde 2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://n8n.example.test/webhook/collaborator-invitation');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-margenx-webhook-secret': 'secreto-de-prueba',
    });
    expect(JSON.parse(init.body)).toEqual({ ...INVITATION, expiresInDays: 30 });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('devuelve false sin llamar a n8n si falta la URL del webhook (por ejemplo, en local)', async () => {
    delete process.env.N8N_INVITATION_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fail-closed: sin secreto no despacha y lo registra', async () => {
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('INTERNAL_WEBHOOK_SECRET'));
  });

  it('devuelve false si n8n responde con error, sin registrar el enlace de la invitación', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('500'));
    const logged = errorSpy.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('ticket_quimica');
  });

  it('devuelve false si falla la red o vence el timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));

    await expect(dispatchInvitationEmail(INVITATION)).resolves.toBe(false);
    const logged = errorSpy.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('ticket_quimica');
  });
});
</file>

<file path="backend/src/services/invitationMailDispatcher.ts">
/**
 * Mail de invitación de un colaborador (ADR-008).
 *
 * Clerk crea la invitación sin mandar su mail (`notify: false`) y el backend despacha el
 * enlace a n8n, que arma el mail en español con la plantilla de MargenX y lo envía por
 * Brevo desde la casilla verificada de margenx.tech (`infra/n8n/workflows/invitacion-colaborador.json`).
 * Igual que las alertas de margen (ADR-003), n8n solo recibe datos: no toca la base.
 *
 * Devuelve `true` solo si n8n confirmó el envío. Nunca lanza: si falla, la invitación igual
 * existe y el ADMIN puede copiar el enlace desde Perfil. El enlace no se registra en los logs.
 */
export interface InvitationEmail {
  email: string;
  tradeName: string;
  inviterEmail: string;
  invitationUrl: string;
}

/** Vencimiento de las invitaciones de Clerk (valor por defecto de `createInvitation`). */
export const INVITATION_EXPIRES_IN_DAYS = 30;

const DISPATCH_TIMEOUT_MS = 5000;

export async function dispatchInvitationEmail(invitation: InvitationEmail): Promise<boolean> {
  const webhookUrl = process.env.N8N_INVITATION_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();

  if (!webhookUrl) {
    return false;
  }
  if (!webhookSecret) {
    console.error('[InvitationMail] INTERNAL_WEBHOOK_SECRET no está configurado: no se despacha el mail de invitación.');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({ ...invitation, expiresInDays: INVITATION_EXPIRES_IN_DAYS }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[InvitationMail] n8n respondió HTTP ${response.status}: el mail de invitación no se envió.`);
      return false;
    }
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'desconocido';
    console.error(`[InvitationMail] No se pudo contactar a n8n (${reason}): el mail de invitación no se envió.`);
    return false;
  }
}
</file>

<file path="backend/src/services/invitedUserProvisioning.test.ts">
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';

const getUserMock = vi.fn();
vi.mock('../lib/clerk', () => ({
  getClerkClient: () => ({ users: { getUser: (...args: unknown[]) => getUserMock(...args) } }),
}));

const accountFindUniqueMock = vi.fn();
const userCreateMock = vi.fn();
const userFindUniqueMock = vi.fn();
vi.mock('../lib/prisma', () => ({
  prisma: {
    account: { findUnique: (...args: unknown[]) => accountFindUniqueMock(...args) },
    user: {
      create: (...args: unknown[]) => userCreateMock(...args),
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
  },
}));

import {
  AUTH_USER_SELECT,
  REJECTED_CACHE_MAX_ENTRIES,
  REJECTED_CACHE_TTL_MS,
  parseInvitationMetadata,
  provisionInvitedUser,
  resetRejectedProvisioningCache,
} from './invitedUserProvisioning';

const QUIMICA_ID = '30d00001-0000-4000-8000-000000000002';

function clerkUser(publicMetadata: unknown, email: string | null = 'Colab.Quimica@Seed.Example.Test') {
  return {
    id: 'user_repositor_quimica',
    publicMetadata,
    primaryEmailAddress: email === null ? null : { emailAddress: email },
  };
}

const createdUser = {
  id: 'u-repositor',
  accountId: QUIMICA_ID,
  email: 'colab.quimica@seed.example.test',
  role: 'COLLABORATOR',
  account: { id: QUIMICA_ID, businessName: 'Química GyJ', defaultMinMarginPercent: '35.00', slug: 'quimica-gyj' },
};

describe('parseInvitationMetadata', () => {
  it('acepta una invitación de colaborador con accountId', () => {
    expect(parseInvitationMetadata({ accountId: QUIMICA_ID, role: 'COLLABORATOR' })).toEqual({
      accountId: QUIMICA_ID,
      role: 'COLLABORATOR',
    });
  });

  it.each([
    ['sin metadatos', undefined],
    ['metadatos vacíos', {}],
    ['rol ADMIN (invitar administradores está fuera de alcance)', { accountId: QUIMICA_ID, role: 'ADMIN' }],
    ['sin rol', { accountId: QUIMICA_ID }],
    ['accountId vacío', { accountId: '', role: 'COLLABORATOR' }],
    ['accountId no textual', { accountId: 42, role: 'COLLABORATOR' }],
  ])('rechaza %s', (_caso, metadata) => {
    expect(parseInvitationMetadata(metadata)).toBeNull();
  });
});

describe('provisionInvitedUser', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    accountFindUniqueMock.mockReset();
    userCreateMock.mockReset();
    userFindUniqueMock.mockReset();
    resetRejectedProvisioningCache();
  });

  it('crea el User con la cuenta y el rol de la invitación, nunca desde el cliente', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockResolvedValue(createdUser);

    const user = await provisionInvitedUser('user_repositor_quimica');

    expect(user).toEqual(createdUser);
    expect(getUserMock).toHaveBeenCalledWith('user_repositor_quimica');
    expect(accountFindUniqueMock).toHaveBeenCalledWith({ where: { id: QUIMICA_ID }, select: { isActive: true } });
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        accountId: QUIMICA_ID,
        email: 'colab.quimica@seed.example.test',
        role: 'COLLABORATOR',
        authProviderId: 'user_repositor_quimica',
      },
      select: AUTH_USER_SELECT,
    });
  });

  it('no crea nada si los metadatos fueron manipulados (rol ADMIN)', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'ADMIN' }));

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si el usuario de Clerk no tiene invitación', async () => {
    getUserMock.mockResolvedValue(clerkUser({}));

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si no hay correo principal', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }, null));

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si la cuenta de la invitación no existe', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue(null);

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('no crea nada si la cuenta está inactiva', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: false });

    expect(await provisionInvitedUser('user_x')).toBeNull();
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it('devuelve null si Clerk no responde', async () => {
    getUserMock.mockRejectedValue(new Error('Clerk no disponible'));

    expect(await provisionInvitedUser('user_x')).toBeNull();
  });

  it('con dos pedidos simultáneos del primer inicio de sesión, devuelve el User que creó el otro', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    userFindUniqueMock.mockResolvedValue(createdUser);

    expect(await provisionInvitedUser('user_repositor_quimica')).toEqual(createdUser);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authProviderId: 'user_repositor_quimica' },
      select: AUTH_USER_SELECT,
    });
  });

  it('devuelve null si el correo ya pertenece a otro usuario', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    userFindUniqueMock.mockResolvedValue(null);

    expect(await provisionInvitedUser('user_x')).toBeNull();
  });

  it('propaga los errores de base que no son de unicidad', async () => {
    getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
    accountFindUniqueMock.mockResolvedValue({ isActive: true });
    userCreateMock.mockRejectedValue(new Error('conexión perdida'));

    await expect(provisionInvitedUser('user_x')).rejects.toThrow('conexión perdida');
  });

  describe('usuarios de Clerk sin invitación válida (ADR-008)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('no vuelve a consultar a Clerk por el mismo usuario hasta que vence el recuerdo', async () => {
      vi.useFakeTimers();
      getUserMock.mockResolvedValue(clerkUser({}));

      expect(await provisionInvitedUser('user_registro_publico')).toBeNull();
      expect(await provisionInvitedUser('user_registro_publico')).toBeNull();
      expect(getUserMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(REJECTED_CACHE_TTL_MS + 1);
      expect(await provisionInvitedUser('user_registro_publico')).toBeNull();
      expect(getUserMock).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['metadatos manipulados', () => getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'ADMIN' }))],
      [
        'cuenta inactiva',
        () => {
          getUserMock.mockResolvedValue(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
          accountFindUniqueMock.mockResolvedValue({ isActive: false });
        },
      ],
    ])('también recuerda el rechazo por %s', async (_caso, prepare) => {
      prepare();

      await provisionInvitedUser('user_x');
      await provisionInvitedUser('user_x');
      expect(getUserMock).toHaveBeenCalledTimes(1);
    });

    it('no recuerda los fallos de Clerk: el pedido siguiente vuelve a intentar', async () => {
      getUserMock.mockRejectedValueOnce(new Error('Clerk no disponible'));
      getUserMock.mockResolvedValueOnce(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
      accountFindUniqueMock.mockResolvedValue({ isActive: true });
      userCreateMock.mockResolvedValue(createdUser);

      expect(await provisionInvitedUser('user_repositor_quimica')).toBeNull();
      expect(await provisionInvitedUser('user_repositor_quimica')).toEqual(createdUser);
    });

    it('recordar a un usuario no afecta a otro con invitación válida', async () => {
      getUserMock.mockResolvedValueOnce(clerkUser({}));
      await provisionInvitedUser('user_registro_publico');

      getUserMock.mockResolvedValueOnce(clerkUser({ accountId: QUIMICA_ID, role: 'COLLABORATOR' }));
      accountFindUniqueMock.mockResolvedValue({ isActive: true });
      userCreateMock.mockResolvedValue(createdUser);
      expect(await provisionInvitedUser('user_repositor_quimica')).toEqual(createdUser);
    });

    it('tiene un tope de entradas: al llenarse descarta la más vieja', async () => {
      getUserMock.mockResolvedValue(clerkUser({}));
      for (let i = 0; i <= REJECTED_CACHE_MAX_ENTRIES; i += 1) {
        await provisionInvitedUser(`user_${i}`);
      }
      expect(getUserMock).toHaveBeenCalledTimes(REJECTED_CACHE_MAX_ENTRIES + 1);

      await provisionInvitedUser(`user_${REJECTED_CACHE_MAX_ENTRIES}`);
      expect(getUserMock).toHaveBeenCalledTimes(REJECTED_CACHE_MAX_ENTRIES + 1);
      await provisionInvitedUser('user_0');
      expect(getUserMock).toHaveBeenCalledTimes(REJECTED_CACHE_MAX_ENTRIES + 2);
    });
  });
});
</file>

<file path="backend/src/services/invitedUserProvisioning.ts">
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getClerkClient } from '../lib/clerk';
import { prisma } from '../lib/prisma';

/** Campos del usuario autenticado que el middleware deja en `req.user`. */
export const AUTH_USER_SELECT = {
  id: true,
  accountId: true,
  email: true,
  role: true,
  account: {
    select: {
      id: true,
      businessName: true,
      defaultMinMarginPercent: true,
      slug: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AuthUserRow = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

/**
 * Metadatos que `POST /api/auth/invitations` guarda en la invitación de Clerk y que Clerk
 * copia a `publicMetadata` del usuario al aceptarla. Solo los escribe el backend con la
 * clave secreta: el navegador no puede modificarlos (ADR-008).
 * El único rol invitable es COLLABORATOR: invitar a otro ADMIN es de la Fase 2 (ADR-007).
 */
const invitationMetadataSchema = z.object({
  accountId: z.string().trim().min(1).max(64),
  role: z.literal('COLLABORATOR'),
});

export type InvitationMetadata = z.infer<typeof invitationMetadataSchema>;

export function parseInvitationMetadata(metadata: unknown): InvitationMetadata | null {
  const parsed = invitationMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}

/**
 * Usuarios de Clerk sin invitación válida, recordados por un rato. Sin esto, cada pedido de un
 * usuario de Clerk sin fila en `User` (por ejemplo, alguien que se registró solo si la instancia
 * permite el alta pública) consultaría a Clerk y gastaría el cupo de su Backend API (ADR-008).
 * Los fallos de Clerk no se recuerdan: el pedido siguiente vuelve a intentar.
 * Vive en memoria de cada proceso; con varios procesos, cada uno recuerda por su cuenta.
 */
export const REJECTED_CACHE_TTL_MS = 5 * 60 * 1000;
export const REJECTED_CACHE_MAX_ENTRIES = 1000;

const rejectedUntil = new Map<string, number>();

function isRecentlyRejected(authProviderId: string): boolean {
  const until = rejectedUntil.get(authProviderId);
  if (until === undefined) {
    return false;
  }
  if (until > Date.now()) {
    return true;
  }
  rejectedUntil.delete(authProviderId);
  return false;
}

function rememberRejection(authProviderId: string): null {
  rejectedUntil.delete(authProviderId);
  if (rejectedUntil.size >= REJECTED_CACHE_MAX_ENTRIES) {
    // El Map conserva el orden de inserción: la primera clave es la más vieja.
    const oldest = rejectedUntil.keys().next().value;
    if (oldest !== undefined) {
      rejectedUntil.delete(oldest);
    }
  }
  rejectedUntil.set(authProviderId, Date.now() + REJECTED_CACHE_TTL_MS);
  return null;
}

/** Solo para pruebas. */
export function resetRejectedProvisioningCache(): void {
  rejectedUntil.clear();
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Primer inicio de sesión de un invitado: si el usuario de Clerk trae una invitación válida,
 * crea su `User` con la cuenta y el rol de la invitación. Devuelve `null` (el middleware
 * responde 401) cuando no hay invitación, los metadatos no son válidos, la cuenta no existe
 * o está inactiva, falta el correo o ese correo ya pertenece a otro usuario. Esos rechazos se
 * recuerdan `REJECTED_CACHE_TTL_MS` para no volver a consultar a Clerk en cada pedido.
 */
export async function provisionInvitedUser(authProviderId: string): Promise<AuthUserRow | null> {
  if (isRecentlyRejected(authProviderId)) {
    return null;
  }

  let clerkUser;
  try {
    clerkUser = await getClerkClient().users.getUser(authProviderId);
  } catch {
    return null;
  }

  const invitation = parseInvitationMetadata(clerkUser.publicMetadata);
  const email = clerkUser.primaryEmailAddress?.emailAddress.trim().toLowerCase();
  if (!invitation || !email) {
    return rememberRejection(authProviderId);
  }

  const account = await prisma.account.findUnique({
    where: { id: invitation.accountId },
    select: { isActive: true },
  });
  if (!account?.isActive) {
    return rememberRejection(authProviderId);
  }

  try {
    return await prisma.user.create({
      data: {
        accountId: invitation.accountId,
        email,
        role: invitation.role,
        authProviderId,
      },
      select: AUTH_USER_SELECT,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    // Dos pedidos simultáneos del primer inicio de sesión: el otro ya creó el User.
    // Si no lo encuentra por authProviderId, el correo es de otro usuario y no se da de alta.
    const existing = await prisma.user.findUnique({ where: { authProviderId }, select: AUTH_USER_SELECT });
    return existing ?? rememberRejection(authProviderId);
  }
}
</file>

<file path="backend/src/services/salesService.test.ts">
import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import {
  argentinaDayRange,
  buildSaleLines,
  parseSaleInput,
  parseSaleListQuery,
  parseVoidReason,
  serializeSale,
  type ProductForSale,
  type SaleWithItems,
} from './salesService';

const D = (v: string | number) => new Prisma.Decimal(v);

/** Productos de Panadería Central (docs/qa/seed-data-comercios.md). */
const MEDIALUNA: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a001',
  name: 'Medialuna de manteca',
  salePrice: D('900.00'),
  cost: D('301.35'),
  ingredientsCount: 4,
};
const CAFE: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a002',
  name: 'Café con leche',
  salePrice: D('1500.00'),
  cost: D('412.50'),
  ingredientsCount: 2,
};
const BORRADOR: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a003',
  name: 'Pan dulce (sin receta)',
  salePrice: D('8000.00'),
  cost: D('0'),
  ingredientsCount: 0,
};
const SIN_PRECIO: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a004',
  name: 'Bizcochitos de grasa',
  salePrice: D('0'),
  cost: D('1662.69'),
  ingredientsCount: 3,
};

function expectAppError(fn: () => unknown, status: number, message?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(status);
    if (message) expect((error as AppError).message).toMatch(message);
    return;
  }
  throw new Error('se esperaba un AppError');
}

describe('parseSaleInput', () => {
  it('acepta ítems y medio de pago, y suma las cantidades de un producto repetido', () => {
    const input = parseSaleInput({
      paymentMethod: 'CASH',
      items: [
        { productId: MEDIALUNA.id, quantity: 2 },
        { productId: CAFE.id, quantity: 1 },
        { productId: MEDIALUNA.id, quantity: 1 },
      ],
    });
    expect(input).toEqual({
      paymentMethod: 'CASH',
      items: [
        { productId: MEDIALUNA.id, quantity: 3 },
        { productId: CAFE.id, quantity: 1 },
      ],
    });
  });

  it.each([
    [{ items: [{ productId: MEDIALUNA.id, quantity: 1 }] }, /medio de pago/],
    [{ paymentMethod: 'TARJETA', items: [{ productId: MEDIALUNA.id, quantity: 1 }] }, /medio de pago/],
    [{ paymentMethod: 'CASH', items: [] }, /al menos un producto/],
    [{ paymentMethod: 'CASH' }, /al menos un producto/],
    [{ paymentMethod: 'CASH', items: [{ productId: 'medialuna', quantity: 1 }] }, /producto/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: 0 }] }, /cantidad/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: 1.5 }] }, /cantidad/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: 1000 }] }, /cantidad/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: '2' }] }, /cantidad/],
  ])('rechaza con 400 un cuerpo inválido: %j', (body, message) => {
    expectAppError(() => parseSaleInput(body), 400, message);
  });

  it('no acepta precio ni costo del cliente: los ignora', () => {
    const input = parseSaleInput({
      paymentMethod: 'TRANSFER',
      items: [{ productId: CAFE.id, quantity: 1, unitPrice: 1, unitCost: 0 }],
      total: 1,
      accountId: 'otra-cuenta',
    });
    expect(input).toEqual({ paymentMethod: 'TRANSFER', items: [{ productId: CAFE.id, quantity: 1 }] });
  });

  it('rechaza más de 50 productos distintos en una venta', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      productId: `6f1d2c3b-0000-4000-8000-${String(i).padStart(12, '0')}`,
      quantity: 1,
    }));
    expectAppError(() => parseSaleInput({ paymentMethod: 'CASH', items }), 400, /50/);
  });
});

describe('buildSaleLines: precio, costo y margen del momento (ADR-010)', () => {
  it('2 medialunas y 1 café: total, costo y margen de cada renglón con Decimal', () => {
    const { lines, total, totalCost } = buildSaleLines(
      [
        { productId: MEDIALUNA.id, quantity: 2 },
        { productId: CAFE.id, quantity: 1 },
      ],
      [MEDIALUNA, CAFE]
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ productId: MEDIALUNA.id, productName: 'Medialuna de manteca', quantity: 2 });
    expect(lines[0]!.unitPrice.toFixed(2)).toBe('900.00');
    expect(lines[0]!.unitCost.toFixed(2)).toBe('301.35');
    expect(lines[0]!.lineTotal.toFixed(2)).toBe('1800.00');
    expect(lines[0]!.lineCost.toFixed(2)).toBe('602.70');
    // (900 − 301,35) / 900 = 66,516… → 66,52 (ROUND_HALF_UP)
    expect(lines[0]!.marginPercent.toFixed(2)).toBe('66.52');
    // (1500 − 412,50) / 1500 = 72,5 %
    expect(lines[1]!.marginPercent.toFixed(2)).toBe('72.50');
    expect(total.toFixed(2)).toBe('3300.00');
    expect(totalCost.toFixed(2)).toBe('1015.20');
  });

  it('redondea el margen con ROUND_HALF_UP: 0,125 % se lleva a 0,13 %', () => {
    const producto: ProductForSale = { ...CAFE, salePrice: D('800.00'), cost: D('799.00') };
    const { lines } = buildSaleLines([{ productId: CAFE.id, quantity: 1 }], [producto]);
    expect(lines[0]!.marginPercent.toFixed(2)).toBe('0.13');
  });

  it('un producto que no está en la cuenta responde 404 sin decir de quién es', () => {
    expectAppError(
      () => buildSaleLines([{ productId: '6f1d2c3b-0000-4000-8000-0000000000ff', quantity: 1 }], [MEDIALUNA]),
      404,
      /no existe/
    );
  });

  it('un producto en borrador (sin receta) no se vende: 422', () => {
    expectAppError(
      () => buildSaleLines([{ productId: BORRADOR.id, quantity: 1 }], [BORRADOR]),
      422,
      /Pan dulce \(sin receta\).*borrador/
    );
  });

  it('un producto con precio en $0 no se vende: 422', () => {
    expectAppError(
      () => buildSaleLines([{ productId: SIN_PRECIO.id, quantity: 1 }], [SIN_PRECIO]),
      422,
      /Bizcochitos de grasa.*precio/
    );
  });
});

const VENTA: SaleWithItems = {
  id: '9f1c2a3b-0000-4000-8000-000000000001',
  accountId: 'acc-panaderia-central',
  cashShiftId: '7a1b2c3d-0000-4000-8000-000000000001',
  soldById: 'u-cajera-panaderia',
  ticketNumber: 42,
  soldAt: new Date('2026-11-24T12:30:00.000Z'),
  paymentMethod: 'CASH',
  total: D('3300'),
  status: 'COMPLETED',
  voidedAt: null,
  voidedById: null,
  voidReason: null,
  items: [
    {
      id: 'it-1',
      saleId: '9f1c2a3b-0000-4000-8000-000000000001',
      productId: MEDIALUNA.id,
      productName: 'Medialuna de manteca',
      quantity: 2,
      unitPrice: D('900'),
      unitCost: D('301.35'),
      marginPercent: D('66.52'),
      lineTotal: D('1800'),
      lineCost: D('602.7'),
    },
  ],
};

describe('serializeSale: el colaborador nunca recibe costos ni márgenes', () => {
  it('al ADMIN le devuelve costo, margen y costo total con dos decimales', () => {
    const body = serializeSale(VENTA, 'ADMIN', 'Panadería Central');
    expect(body).toMatchObject({
      id: VENTA.id,
      ticketNumber: 42,
      businessName: 'Panadería Central',
      paymentMethod: 'CASH',
      total: '3300.00',
      totalCost: '602.70',
      status: 'COMPLETED',
    });
    expect(body.items[0]).toEqual({
      productId: MEDIALUNA.id,
      productName: 'Medialuna de manteca',
      quantity: 2,
      unitPrice: '900.00',
      lineTotal: '1800.00',
      unitCost: '301.35',
      lineCost: '602.70',
      marginPercent: '66.52',
    });
  });

  it('al COLLABORATOR le devuelve cantidades y precios, sin ningún campo de costo o margen', () => {
    const body = serializeSale(VENTA, 'COLLABORATOR', 'Panadería Central');
    const texto = JSON.stringify(body);
    for (const campo of ['unitCost', 'lineCost', 'marginPercent', 'totalCost']) {
      expect(texto).not.toContain(campo);
    }
    expect(body.items[0]).toEqual({
      productId: MEDIALUNA.id,
      productName: 'Medialuna de manteca',
      quantity: 2,
      unitPrice: '900.00',
      lineTotal: '1800.00',
    });
  });
});

describe('parseSaleListQuery y argentinaDayRange', () => {
  it('pagina con 20 por defecto y tope de 100', () => {
    expect(parseSaleListQuery({})).toEqual({ page: 1, limit: 20 });
    expect(parseSaleListQuery({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 100 });
  });

  it('filtra por día de Argentina: 24/11 va de 00:00 a 24:00 en UTC−3', () => {
    expect(parseSaleListQuery({ date: '2026-11-24' }).date).toBe('2026-11-24');
    const { start, end } = argentinaDayRange('2026-11-24');
    expect(start.toISOString()).toBe('2026-11-24T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-25T03:00:00.000Z');
  });

  it('acepta el turno por su id', () => {
    expect(parseSaleListQuery({ cashShiftId: VENTA.cashShiftId }).cashShiftId).toBe(VENTA.cashShiftId);
  });

  it.each([
    [{ date: '24/11/2026' }, /fecha/],
    [{ date: '2026-02-30' }, /fecha/],
    [{ cashShiftId: 'turno-1' }, /turno/],
  ])('rechaza con 400 un filtro inválido: %j', (query, message) => {
    expectAppError(() => parseSaleListQuery(query), 400, message);
  });
});

describe('parseVoidReason', () => {
  it('exige un motivo de 3 a 200 caracteres y lo recorta', () => {
    expect(parseVoidReason({ reason: '  Cobré dos veces la misma venta  ' })).toBe('Cobré dos veces la misma venta');
    expectAppError(() => parseVoidReason({}), 400, /motivo/);
    expectAppError(() => parseVoidReason({ reason: 'no' }), 400, /motivo/);
    expectAppError(() => parseVoidReason({ reason: 'x'.repeat(201) }), 400, /200/);
  });
});
</file>

<file path="backend/src/services/salesSummaryService.test.ts">
import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import {
  argentinaDateOf,
  buildSummaryTotals,
  parseSummaryPeriod,
  rankProducts,
  summaryRange,
} from './salesSummaryService';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('parseSummaryPeriod', () => {
  it('acepta day, week y month; por defecto, week', () => {
    expect(parseSummaryPeriod({ period: 'day' })).toBe('day');
    expect(parseSummaryPeriod({ period: 'month' })).toBe('month');
    expect(parseSummaryPeriod({})).toBe('week');
  });

  it('rechaza otro período con 400', () => {
    expect(() => parseSummaryPeriod({ period: 'year' })).toThrow(AppError);
    try {
      parseSummaryPeriod({ period: ['day', 'week'] });
    } catch (error) {
      expect((error as AppError).statusCode).toBe(400);
    }
  });
});

describe('summaryRange: días calendario de Argentina (UTC−3)', () => {
  // Martes 24/11/2026 a las 22:30 de Argentina = miércoles 25/11 01:30 UTC.
  const ahora = new Date('2026-11-25T01:30:00.000Z');

  it('toma la fecha de Argentina, no la de UTC', () => {
    expect(argentinaDateOf(ahora)).toBe('2026-11-24');
  });

  it('day: hoy, y el período anterior es ayer', () => {
    const r = summaryRange('day', ahora);
    expect(r.start.toISOString()).toBe('2026-11-24T03:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-25T03:00:00.000Z');
    expect(r.previousStart.toISOString()).toBe('2026-11-23T03:00:00.000Z');
    expect(r).toMatchObject({ from: '2026-11-24', to: '2026-11-24', previousFrom: '2026-11-23', previousTo: '2026-11-23' });
  });

  it('week: hoy y los 6 días anteriores, como la ventana del reporte semanal; el anterior, los 7 de antes', () => {
    const r = summaryRange('week', ahora);
    expect(r).toMatchObject({ from: '2026-11-18', to: '2026-11-24', previousFrom: '2026-11-11', previousTo: '2026-11-17' });
    expect(r.start.toISOString()).toBe('2026-11-18T03:00:00.000Z');
    expect(r.previousEnd.toISOString()).toBe(r.start.toISOString());
  });

  it('month: hoy y los 29 días anteriores', () => {
    expect(summaryRange('month', ahora)).toMatchObject({ from: '2026-10-26', to: '2026-11-24', previousFrom: '2026-09-26', previousTo: '2026-10-25' });
  });
});

describe('buildSummaryTotals', () => {
  it('Escenario "Margen ponderado": $100.000 en ventas y $62.000 de costo → ganancia $38.000 y margen 38,00 %', () => {
    const totals = buildSummaryTotals({ salesCount: 41, salesTotal: D('100000'), costTotal: D('62000') });
    expect(totals).toEqual({ salesCount: 41, salesTotal: '100000.00', costTotal: '62000.00', profit: '38000.00', marginPercent: '38.00' });
  });

  it('el margen se redondea con ROUND_HALF_UP a 2 decimales', () => {
    // 1 / 3 = 33,333… → 33,33; 2 / 3 = 66,666… → 66,67
    expect(buildSummaryTotals({ salesCount: 1, salesTotal: D('3'), costTotal: D('2') }).marginPercent).toBe('33.33');
    expect(buildSummaryTotals({ salesCount: 1, salesTotal: D('3'), costTotal: D('1') }).marginPercent).toBe('66.67');
  });

  it('sin ventas, todo en cero y el margen en null (nunca divide por cero)', () => {
    expect(buildSummaryTotals({ salesCount: 0, salesTotal: null, costTotal: null })).toEqual({
      salesCount: 0,
      salesTotal: '0.00',
      costTotal: '0.00',
      profit: '0.00',
      marginPercent: null,
    });
  });

  it('una ganancia negativa (vender debajo del costo) da margen negativo', () => {
    expect(buildSummaryTotals({ salesCount: 2, salesTotal: D('1000'), costTotal: D('1250') })).toMatchObject({
      profit: '-250.00',
      marginPercent: '-25.00',
    });
  });
});

describe('rankProducts', () => {
  const grupos = [
    { productId: 'p-medialunas', productName: 'Medialunas de manteca — docena (12 unidades)', _sum: { quantity: 30, lineTotal: D('405000'), lineCost: D('132000') } },
    { productId: 'p-pan', productName: 'Pan flauta — 1 kg', _sum: { quantity: 80, lineTotal: D('346571.20'), lineCost: D('201000') } },
    { productId: 'p-tarta', productName: 'Tarta de ricota — 24 cm', _sum: { quantity: 6, lineTotal: D('168000'), lineCost: D('60000') } },
    { productId: null, productName: 'Prepizzas — x2 unidades (dado de baja)', _sum: { quantity: 12, lineTotal: D('43200'), lineCost: D('14000') } },
  ];

  it('ordena los más vendidos por unidades y los que más ganancia dejan por ganancia', () => {
    const { topSold, topProfit } = rankProducts(grupos, 3);
    expect(topSold.map((p) => p.productName)).toEqual([
      'Pan flauta — 1 kg',
      'Medialunas de manteca — docena (12 unidades)',
      'Prepizzas — x2 unidades (dado de baja)',
    ]);
    expect(topProfit.map((p) => [p.productName, p.profit])).toEqual([
      ['Medialunas de manteca — docena (12 unidades)', '273000.00'],
      ['Pan flauta — 1 kg', '145571.20'],
      ['Tarta de ricota — 24 cm', '108000.00'],
    ]);
  });

  it('cada producto trae unidades, ventas, ganancia y su margen; un producto dado de baja conserva su nombre', () => {
    const { topSold } = rankProducts(grupos, 5);
    expect(topSold.find((p) => p.productId === null)).toEqual({
      productId: null,
      productName: 'Prepizzas — x2 unidades (dado de baja)',
      quantity: 12,
      salesTotal: '43200.00',
      profit: '29200.00',
      marginPercent: '67.59',
    });
  });

  it('a igualdad de unidades, ordena por nombre para que el resultado sea estable', () => {
    const empate = [
      { productId: 'b', productName: 'Bizcochitos de grasa — 1 kg', _sum: { quantity: 5, lineTotal: D('16000'), lineCost: D('6000') } },
      { productId: 'a', productName: 'Alfajores de maicena', _sum: { quantity: 5, lineTotal: D('16000'), lineCost: D('6000') } },
    ];
    expect(rankProducts(empate, 5).topSold.map((p) => p.productId)).toEqual(['a', 'b']);
  });
});
</file>

<file path="backend/src/services/salesSummaryService.ts">
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { argentinaDayRange } from './salesService';

/*
  Ganancia real (ADR-010, docs/especificacion-funcional.md §13): ventas menos el costo
  congelado de cada renglón, y el margen ponderado por lo vendido (ganancia / ventas,
  sobre la venta como en ADR-004). Sin las ventas anuladas. Solo ADMIN.

  Períodos en días calendario de Argentina: day = hoy; week = hoy y los 6 anteriores
  (la misma ventana de 7 días del reporte semanal, ADR-009); month = hoy y los 29
  anteriores. El período anterior tiene el mismo largo y termina donde empieza el actual.
*/

const Decimal = Prisma.Decimal;
type DecimalType = Prisma.Decimal;

export const SUMMARY_PERIODS = ['day', 'week', 'month'] as const;
export type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];

const PERIOD_DAYS: Record<SummaryPeriod, number> = { day: 1, week: 7, month: 30 };
export const TOP_PRODUCTS_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

export interface SummaryRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  /** Primer y último día, AAAA-MM-DD en hora de Argentina. */
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export interface SummaryTotals {
  salesCount: number;
  salesTotal: string;
  costTotal: string;
  profit: string;
  /** Ganancia / ventas × 100, con 2 decimales; `null` si no hubo ventas. */
  marginPercent: string | null;
}

export interface RankedProduct {
  productId: string | null;
  productName: string;
  quantity: number;
  salesTotal: string;
  profit: string;
  marginPercent: string | null;
}

/** Fila de `saleItem.groupBy` por producto. */
export interface ProductGroup {
  productId: string | null;
  productName: string;
  _sum: { quantity: number | null; lineTotal: DecimalType | null; lineCost: DecimalType | null };
}

export function parseSummaryPeriod(query: Record<string, unknown>): SummaryPeriod {
  const raw = query.period ?? 'week';
  if (typeof raw !== 'string' || !(SUMMARY_PERIODS as readonly string[]).includes(raw)) {
    throw new AppError('El período tiene que ser day, week o month.', 400);
  }
  return raw as SummaryPeriod;
}

/** AAAA-MM-DD del día calendario de Argentina en que cae `date`. */
export function argentinaDateOf(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ARGENTINA_TIMEZONE }).format(date);
}

export function summaryRange(period: SummaryPeriod, now: Date = new Date()): SummaryRange {
  const days = PERIOD_DAYS[period];
  const today = argentinaDayRange(argentinaDateOf(now));
  const end = today.end;
  const start = new Date(end.getTime() - days * DAY_MS);
  const previousEnd = start;
  const previousStart = new Date(start.getTime() - days * DAY_MS);
  // El último día de un rango es el que empieza 24 h antes de su fin.
  const lastDay = (rangeEnd: Date) => argentinaDateOf(new Date(rangeEnd.getTime() - DAY_MS));
  return {
    start,
    end,
    previousStart,
    previousEnd,
    from: argentinaDateOf(start),
    to: lastDay(end),
    previousFrom: argentinaDateOf(previousStart),
    previousTo: lastDay(previousEnd),
  };
}

function marginOf(sales: DecimalType, profit: DecimalType): string | null {
  if (sales.lte(0)) return null;
  return profit.div(sales).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function buildSummaryTotals(input: {
  salesCount: number;
  salesTotal: DecimalType | null;
  costTotal: DecimalType | null;
}): SummaryTotals {
  const sales = new Decimal(input.salesTotal ?? 0);
  const cost = new Decimal(input.costTotal ?? 0);
  const profit = sales.minus(cost);
  return {
    salesCount: input.salesCount,
    salesTotal: sales.toFixed(2),
    costTotal: cost.toFixed(2),
    profit: profit.toFixed(2),
    marginPercent: marginOf(sales, profit),
  };
}

/** Los más vendidos (por unidades) y los que más ganancia dejan, `limit` de cada uno. */
export function rankProducts(groups: ProductGroup[], limit: number = TOP_PRODUCTS_LIMIT) {
  const products = groups.map((group) => {
    const sales = new Decimal(group._sum.lineTotal ?? 0);
    const profit = sales.minus(group._sum.lineCost ?? 0);
    return { group, sales, profit };
  });
  const byName = (a: { group: ProductGroup }, b: { group: ProductGroup }) =>
    a.group.productName.localeCompare(b.group.productName, 'es', { sensitivity: 'base' });
  const toRanked = ({ group, sales, profit }: (typeof products)[number]): RankedProduct => ({
    productId: group.productId,
    productName: group.productName,
    quantity: group._sum.quantity ?? 0,
    salesTotal: sales.toFixed(2),
    profit: profit.toFixed(2),
    marginPercent: marginOf(sales, profit),
  });

  const topSold = [...products]
    .sort((a, b) => (b.group._sum.quantity ?? 0) - (a.group._sum.quantity ?? 0) || byName(a, b))
    .slice(0, limit)
    .map(toRanked);
  const topProfit = [...products]
    .sort((a, b) => b.profit.comparedTo(a.profit) || byName(a, b))
    .slice(0, limit)
    .map(toRanked);
  return { topSold, topProfit };
}

/** Ventas completadas de la cuenta en el rango: las anuladas no cuentan. */
function completedSalesWhere(accountId: string, start: Date, end: Date): Prisma.SaleWhereInput {
  return { accountId, status: 'COMPLETED', soldAt: { gte: start, lt: end } };
}

async function totalsBetween(accountId: string, start: Date, end: Date): Promise<SummaryTotals> {
  const where = completedSalesWhere(accountId, start, end);
  const [salesCount, sums] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.saleItem.aggregate({ where: { sale: where }, _sum: { lineTotal: true, lineCost: true } }),
  ]);
  return buildSummaryTotals({ salesCount, salesTotal: sums._sum.lineTotal, costTotal: sums._sum.lineCost });
}

/** Ganancia real de un rango, con los dos rankings: la usan el resumen y el reporte semanal. */
export async function salesSummaryBetween(accountId: string, start: Date, end: Date) {
  const [totals, groups] = await Promise.all([
    totalsBetween(accountId, start, end),
    prisma.saleItem.groupBy({
      by: ['productId', 'productName'],
      where: { sale: completedSalesWhere(accountId, start, end) },
      _sum: { quantity: true, lineTotal: true, lineCost: true },
    }),
  ]);
  return { ...totals, ...rankProducts(groups) };
}

function change(current: string, previous: string): string | null {
  const before = new Decimal(previous);
  if (before.eq(0)) return null;
  return new Decimal(current).minus(before).div(before.abs()).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/** `GET /api/sales/summary`: el período pedido, su comparación con el anterior y los rankings. */
export async function getSalesSummary(accountId: string, period: SummaryPeriod, now: Date = new Date()) {
  const range = summaryRange(period, now);
  const [current, previous] = await Promise.all([
    salesSummaryBetween(accountId, range.start, range.end),
    totalsBetween(accountId, range.previousStart, range.previousEnd),
  ]);
  const { topSold, topProfit, ...totals } = current;
  return {
    period,
    from: range.from,
    to: range.to,
    ...totals,
    previous: { from: range.previousFrom, to: range.previousTo, ...previous },
    /** Variación porcentual contra el período anterior; `null` si el anterior fue 0. */
    change: {
      salesTotal: change(totals.salesTotal, previous.salesTotal),
      profit: change(totals.profit, previous.profit),
    },
    topSold,
    topProfit,
  };
}
</file>

<file path="docs/adr/0003-automatizacion-satelite-n8n.md">
# 3. Orquestador de Eventos Satélite n8n Desacoplado vía Webhooks

* **Estado:** Aceptado · Enmendado por ADR-005 (canal de ingesta) y ADR-009 (reporte semanal)
* **Fecha:** 2026-08-30
* **Decisores:** Dario Gimenez (DevOps/SM)

## Contexto y Planteamiento del Problema
MargenX necesita notificar por correo electrónico a los dueños de los comercios cuando un producto cae por debajo del margen mínimo esperado, además de generar y despachar un reporte semanal en formato PDF con la rentabilidad consolidada de su catálogo. Incorporar librerías pesadas de renderizado de PDFs (ej. Puppeteer / Chromium) o colas de envío de emails (BullMQ + Redis) dentro del monolito de Node/Express sobrecarga la memoria RAM de los contenedores de Azure y aumenta la complejidad del código.

## Opciones Consideradas
1. **Lógica pesada dentro del monolito:** Generar PDFs con Puppeteer y despachar emails con Nodemailer en el proceso principal de Node.js.
2. **Microservicio dedicado en Node:** Crear un segundo backend para PDFs y correos.
3. **Motor de orquestación Low-Code (n8n self-hosted):** Desplegar n8n en la VPS y comunicarlo con el backend mediante Webhooks asíncronos.

## Decisión
Se decide adoptar **n8n self-hosted** (`https://n8n.margenx.tech:5678`) como servicio satélite desacoplado:
* El Backend monolítico únicamente ejecuta la lógica de cálculo financiero y, si detecta un margen en riesgo, dispara una petición HTTP POST asíncrona hacia el Webhook de n8n (`margin.alert.triggered`).
* n8n recibe el evento, procesa la plantilla HTML y realiza el envío del correo SMTP.
* Para el reporte semanal, n8n ejecuta un disparador Cron los lunes a las 08:00 hs, consulta la API pública del backend (`GET /api/reports/margin-summary`), compila el PDF y lo envía al administrador.

## Consecuencias
* **Positivas:**
  * El backend monolítico de Express se mantiene 100% enfocado en reglas de negocio y transacciones de base de datos.
  * Modificaciones en el diseño del correo o del PDF se realizan visualmente en n8n sin requerir un nuevo deploy del backend.
  * Aislamiento de consumo de recursos: si la generación de un PDF consume CPU, no afecta la disponibilidad de la API REST.
* **Regla Inviolable de Arquitectura:**
  * **n8n nunca escribe directamente en la base de datos PostgreSQL de producción.** n8n solo lee a través de endpoints autorizados de la API y consume webhooks para orquestar notificaciones.

## Nota de vigencia (28/10/2026)

La decisión de usar n8n como satélite desacoplado y la regla de que **n8n nunca escribe directamente en la base de datos** siguen vigentes. Estas afirmaciones del texto original ya no describen el sistema:

* **Azure:** el despliegue es 100 % en la VPS (ADR-002). La justificación por la memoria de los contenedores se mantiene, aplicada a la VPS.
* **URL de n8n:** n8n escucha en `127.0.0.1:5678` y se publica por Nginx en `https://n8n.margenx.tech` (puerto 443), según `infra/vps/README.md`.
* **"n8n solo lee":** n8n también **envía** listas de precios al backend por `POST /api/webhooks/supplier-prices`, autenticado con `x-margenx-webhook-secret`. Toda escritura pasa por la API, que valida y aplica las reglas de negocio. El canal de ingesta y la cuarentena están en **ADR-005**.
* **Alerta de margen:** el backend envía el evento a la URL de `N8N_MARGIN_ALERT_WEBHOOK_URL` (`backend/src/services/marginAlertDispatcher.ts`, workflow `infra/n8n/workflows/alertas-margen.json`).
* **Reporte semanal en PDF (actualizado el 18/11/2026):** implementado en el Sprint 6 según **ADR-009**. n8n no consulta una API pública: pide el reporte ya calculado a `GET /api/internal/reports/accounts` y `GET /api/internal/reports/weekly/:slug` por la red interna de Docker, con `x-margenx-webhook-secret`, y Nginx niega `/api/internal/` desde Internet. El HTML se convierte a PDF con Gotenberg (`infra/n8n/workflows/reporte-semanal.json`). El endpoint `GET /api/reports/margin-summary` del texto original nunca existió.
</file>

<file path="docs/adr/0004-calculo-margen-ventas-vs-markup.md">
# 4. Adopción del Margen Comercial sobre Precio de Venta (Profit Margin) en lugar del Recargo sobre Costo (Markup)

* **Estado:** Aceptado
* **Fecha:** 2026-10-19
* **Decisores:** Darío Giménez, Leandro Herrera, equipo de desarrollo MargenX
* **Issue:** #180 (SPRINT4-DOCS-02)
* **Relacionado con:** `docs/qa/reporte-precision-sprint2.md` (issue #77), `backend/src/services/marginCalculator.ts` (issue #75)

## Contexto y Planteamiento del Problema

En la práctica comercial de una PyME es habitual confundir "ganar el 100 %" con duplicar el costo. Eso es un **markup** (recargo sobre costo) del 100 %, que equivale a un **margen** del 50 % sobre el precio de venta. Un comerciante que fija precios multiplicando su costo y luego lee un "margen" calculado sobre otra base obtiene números que no coinciden con los de su cabeza, y toma decisiones de precio con una rentabilidad distinta de la que cree tener.

MargenX debe elegir **una sola métrica rectora** para mostrar, alertar y comparar la rentabilidad de cada producto, y definir cómo conviven con ella los hábitos de quien piensa en recargos.

### Las dos fórmulas

Sea `C` el costo total de la receta y `V` el precio de venta:

* **Margen sobre ventas:** `Margen % = (V − C) / V × 100`
* **Markup sobre costo:** `Markup % = (V − C) / C × 100`

Se relacionan por `Margen = Markup / (1 + Markup)` (con ambos expresados como fracción) y, a la inversa, `Markup = Margen / (1 − Margen)`.

| Costo | Venta | Markup | Margen |
|---:|---:|---:|---:|
| $1.000 | $1.250 | 25 % | 20 % |
| $1.000 | $1.500 | 50 % | 33,3 % |
| $1.000 | $2.000 | 100 % | 50 % |
| $1.000 | $3.000 | 200 % | 66,7 % |

### Demostración de que el margen sobre ventas está acotado

Para `V > 0` y `C ≥ 0`:

`Margen = (V − C) / V = 1 − C / V`

Como `C / V ≥ 0`, resulta `Margen ≤ 1`, es decir **un margen sobre ventas nunca supera el 100 %**. El 100 % solo se alcanza con costo cero; con costo positivo es siempre menor. El otro extremo no está acotado: si `C > V` el margen es negativo y puede ser arbitrariamente bajo (venta a pérdida). En cambio, el markup no tiene techo (`C → 0` implica `Markup → ∞`), por lo que no sirve como indicador acotado ni comparable entre productos de distinto costo.

Además, `V` es el dinero que efectivamente entra a la caja: el margen sobre ventas responde directamente a "de cada $100 que cobro, ¿cuánto queda después de pagar los insumos?".

## Opciones Consideradas

1. **Markup sobre costo** como métrica rectora: coincide con cómo muchos comerciantes fijan el precio, pero no está acotado, no es comparable con el resto del mercado y se confunde con el margen.
2. **Mostrar ambas métricas con el mismo peso:** duplica la información, genera ambigüedad sobre cuál dispara las alertas y complica los umbrales (`minMarginPercent`).
3. **Margen sobre ventas como única métrica rectora**, ofreciendo ayudas de fijación de precio que no obliguen al usuario a convertir mentalmente entre bases. **(elegida)**

## Decisión

MargenX adopta el **margen bruto sobre el precio de venta** como métrica rectora de rentabilidad, y todo lo que dependa de ella (alertas, semáforo, umbral mínimo, dashboard) se calcula con esa fórmula.

Implementación vigente:

* **Cálculo** (`backend/src/services/marginCalculator.ts`): `calculateMarginAmount = V − C` y `calculateMarginPercent = (V − C) / V × 100`, con `Prisma.Decimal` y redondeo a 2 decimales. Si `V ≤ 0` o el producto no tiene ingredientes, el porcentaje es `0.00 %` para evitar la división por cero.
* **Umbral:** cada producto tiene `minMarginPercent` y la cuenta tiene `defaultMinMarginPercent` (30 % por defecto). Un producto es *crítico* cuando `marginPercent < minMarginPercent`; las alertas se emiten solo al **cruzar** el umbral (ver ADR-003).
* **Simulador de precio** (frontend): para quien razona con recargos, los botones **+5 %** y **+10 %** aplican un factor sobre el *precio de venta* y el botón **Sugerir X %** calcula el precio que logra un margen objetivo `m` con `V = C / (1 − m / 100)`. En todos los casos el margen mostrado se recalcula sobre el precio resultante, nunca sobre el costo.
* **Límites de validación:** `minMarginPercent` se valida en el backend a un máximo de 999,99 % (columna `Decimal(5,2)`), mientras que `marginPercent` se almacena como `Decimal(8,2)` y admite valores negativos de venta a pérdida. Cuando el usuario ingresa un objetivo de margen ≥ 100 % (no alcanzable sobre ventas) el simulador usa un factor de 0,5 como respaldo en lugar de dividir por cero o por un número negativo.

## Consecuencias

* **Positivas:**
  * Claridad contable: el dueño sabe qué porcentaje de cada $1.000 que ingresan a caja es ganancia bruta.
  * Una única base para umbrales, alertas, semáforo y reportes; los números son comparables entre productos.
  * Métrica acotada superiormente, lo que permite validar entradas y detectar errores de carga.
  * Coherencia con el estándar financiero y con las pruebas de precisión de `reporte-precision-sprint2.md`.
* **Negativas / a mitigar:**
  * Un comerciante habituado al markup puede esperar "100 %" para duplicar el costo y ver 50 %. *Mitigación:* el simulador sugiere el precio para un margen objetivo y la documentación de soporte (`support-docs-modal`) debe explicar la equivalencia con la tabla de este ADR.
  * El frontend calcula y muestra el margen con 1 decimal mientras el backend lo liquida con 2 (hallazgo §5 de `reporte-precision-sprint2.md`, diferencia máxima de 0,05 puntos porcentuales). *Mitigación:* es una **deuda conocida**: la unificación a 2 decimales se trata en el Sprint 5 (fuera del alcance de este ADR); hasta entonces la fuente de verdad es el valor del backend.
  * Los productos sin ingredientes muestran `0.00 %` aunque tengan precio; se interpreta como "sin costo cargado", no como rentabilidad nula.

## Nota posterior: volumen de ventas (ADR-010)

Desde el ADR-010 (22/11/2026), MargenX registra ventas en las cuentas que tienen el módulo de ventas. Cada renglón de venta guarda el precio, el costo y el margen del momento, calculados con la misma fórmula de este ADR (margen sobre el precio de venta). Eso permite un **margen ponderado por lo vendido** (ganancia / ventas), que hasta ahora no se podía calcular por falta de volumen de ventas. La decisión de este ADR no cambia: el margen teórico de cada producto sigue siendo el de la fórmula de arriba, y la ganancia real lo complementa.

## Revisión

| Concepto | Detalle |
|:---|:---|
| Fecha de la decisión | 2026-10-19 |
| Commit original | `e4af603` (directo a `develop`) |
| Issue de la decisión | #180 (cerrada sin rama ni PR) |
| Issue de regularización | #227 |
| PR de regularización | #228 |
| Revisores | Federico Paal |
</file>

<file path="docs/adr/0006-sesion-persistente-pwa.md">
# 6. Sesión persistente en la app instalada (PWA standalone) y URL de retorno tras el login

* **Estado:** Aceptado
* **Fecha:** 2026-11-02
* **Decisores:** Darío Giménez (Tech Lead / DevOps)
* **Issue:** #241 (SPRINT5-FE-04)
* **Relacionado con:** ADR-001 (Clerk), `frontend/src/lib/displayMode.ts`, `frontend/src/lib/returnUrl.ts`, `frontend/src/components/protected-route.tsx`, `frontend/src/hooks/useSessionSecurity.ts`, `frontend/src/app/login/page.tsx`, `infra/n8n/workflows/alertas-margen.json`

---

## Contexto y Planteamiento del Problema

Desde el Sprint 2 el frontend agrega dos cierres de sesión propios, además de los de Clerk:

1. **Cierre por inactividad de 30 minutos** (`useSessionSecurity`), medido con la última actividad guardada en `localStorage`.
2. **Cierre al cerrar el navegador:** si no existe la marca de sesión de la pestaña (`sessionStorage`) ni la cookie de sesión del navegador, la sesión de Clerk se considera huérfana y se cierra.

En el navegador común los dos tienen sentido: protegen una computadora compartida. En la app instalada en el celular (PWA en modo standalone) rompen el uso previsto. Cerrar la app equivale a cerrar el navegador, así que cada vez que el dueño del comercio toca **"Ajustar"** en el mail de alerta de margen tiene que volver a iniciar sesión y, como Clerk lo ve como un acceso nuevo, a pasar de nuevo la verificación. Además, el login siempre llevaba a `/dashboard` y se perdía el producto al que apuntaba el enlace.

## Decisión

### 1. Detección del modo instalado
La app se considera instalada si `matchMedia('(display-mode: standalone)')` coincide o si `navigator.standalone === true` (Safari de iOS). La detección vive en `isStandaloneMode()` (`frontend/src/lib/displayMode.ts`).

### 2. En la app instalada manda solo Clerk
En modo standalone **no corren** ni el cierre por cierre de navegador ni el cierre propio por 30 minutos de inactividad. La sesión dura lo que configure la instancia de Clerk. En el **navegador común** el comportamiento no cambia: siguen los dos cierres propios.

### 3. Configuración de sesión en el Clerk de producción
Valores configurados en la instancia de producción (cuenta empresarial, issue #238):

| Parámetro | Valor |
|---|---|
| Vida máxima de la sesión | **7 días**, el máximo que permite el plan Hobby de Clerk |
| Tiempo de inactividad en Clerk | Sin límite de inactividad configurado |
| Verificación por dispositivo nuevo | *No confirmada*: revisar en el dashboard de Clerk y completar esta fila |

Consecuencia práctica: en la app instalada, la sesión se mantiene hasta 7 días desde el inicio de sesión, aunque no se use. Pasado ese plazo, Clerk pide iniciar sesión de nuevo.

### 4. URL de retorno tras el login (navegador e instalada)
Cuando una pantalla protegida pide login, el destino viaja en `/login?redirect_url=<ruta>` (`buildLoginUrl`, `frontend/src/lib/returnUrl.ts`). La página de login lo usa en `SignIn` (`forceRedirectUrl`) y en su propia navegación. El destino también se guarda en `sessionStorage` porque los pasos internos de Clerk (por ejemplo, `/login/factor-one`) no conservan la query, y se borra al llegar a una pantalla protegida.

Solo se aceptan rutas internas del mismo origen: se rechazan URLs absolutas a otro dominio, `//dominio`, `/\dominio`, esquemas como `javascript:` y el propio `/login`. Un destino rechazado vuelve a `/dashboard`. Esto evita usar el login como redirección abierta.

### Alternativas descartadas
* **Quitar los cierres propios también en el navegador:** se descartó porque deja expuesta una sesión de 7 días en computadoras compartidas del comercio.
* **Mantener el cierre de 30 minutos en la app instalada:** se descartó porque quien toca "Ajustar" al día siguiente tendría que iniciar sesión igual, y el objetivo de la issue no se cumpliría.
* **Detectar la app instalada solo por el `start_url` del manifiesto:** se descartó porque depende de cómo se abrió la app y no cubre los enlaces externos, como el del mail.

## Consecuencias y Trade-offs

* **Positivas:**
  * El enlace "Ajustar" lleva directo al producto mientras la sesión de Clerk siga viva.
  * Con la sesión vencida, después del login (y de la verificación, si Clerk la pide) se vuelve al producto.
  * En el navegador común no cambia la duración de la sesión.
* **Costos y riesgos asumidos:**
  * Un celular con la app instalada y desbloqueado da acceso al comercio durante hasta 7 días. La protección pasa a ser el bloqueo del propio celular.
  * La duración real depende del plan de Clerk: si el plan cambia, hay que revisar este ADR.
  * Si el sistema operativo abre el enlace del mail en el navegador y no en la app instalada, rigen las reglas del navegador común. Ese comportamiento depende del sistema operativo y no del código.
  * La detección necesita que la app se instale con un manifiesto `display: standalone`. El manifiesto llega con la issue de PWA instalable; mientras tanto, la app agregada al inicio en iOS ya expone `navigator.standalone`.
</file>

<file path="docs/adr/0007-roles-fijos-vs-permisos-granulares.md">
# 7. Adopción de Modelo RBAC con Roles Fijos (ADMIN y COLLABORATOR) frente a Permisos Granulares

* **Estado:** Aceptado
* **Fecha:** 2026-11-06
* **Decisores:** Darío Giménez (Tech Lead / DevOps), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer)
* **Issue:** #254 (S5-DOCS-02)
* **Relacionado con:** ADR-001 (Clerk Authentication), `docs/especificacion-funcional.md` (§8), `backend/src/middlewares/rbac.ts`, `frontend/src/components/admin-only-route.tsx`

---

## Contexto y Planteamiento del Problema

MargenX opera como un SaaS multi-tenant destinado a PyMEs gastronómicas, fábricas de pastas y elaboradores químicos. En estos comercios conviven dos perfiles claramente diferenciados:
1. **El Dueño / Administrador:** Toma decisiones comerciales, negocia con proveedores, fija el margen objetivo de ganancia y absorbe las variaciones de materias primas.
2. **El Empleado de Salón / Cajero:** Atiende el mostrador, cobra al público y necesita conocer con exactitud el precio de venta actualizado de cada producto para no cobrar importes desfasados, pero **bajo ninguna circunstancia debe tener visibilidad sobre el costo real de elaboración, las fórmulas de las recetas ni el margen de ganancia neta del negocio**.

Durante el diseño de la plataforma se evaluaron dos alternativas para resolver el control de acceso:
- **Alternativa A (Permisos Granulares Configurables / Matriz IAM):** Crear tablas relacionales de roles personalizados, permisos por pantalla y asignación granular de banderas (`can_view_margins`, `can_edit_costs`, `can_manage_suppliers`) administradas por el dueño en una pantalla de configuración.
- **Alternativa B (Modelo de Roles Fijos Nativos: ADMIN y COLLABORATOR):** Establecer dos roles inmutables a nivel de dominio y delegar en el backend la sanitización estricta de datos financieros.

---

## Decisión

Se decide adoptar la **Alternativa B: Modelo RBAC con Dos Roles Fijos Nativos (`ADMIN` y `COLLABORATOR`)** para el alcance del MVP y la versión 1.0 de MargenX.

### Fundamentos Técnicos y de Dominio

1. **Simplicidad de Onboarding (Cero Fricción para la PyME):**
   Los comercios gastronómicos no disponen de personal de TI. Configurar una matriz de permisos de 20 casillas antes de incorporar a un empleado resulta en abandono de la herramienta. Con dos roles fijos, el dueño solo selecciona "Colaborador" al invitar al empleado y el sistema queda configurado de forma segura al instante.

2. **Blindaje Financiero de Doble Capa:**
   - **Capa 1 — Server-Side Obligatoria (Express):** El middleware `sanitizeFinancialData` intercepta toda respuesta saliente cuando el token JWT corresponde a `COLLABORATOR`, purga recursivamente los campos prohibidos (`cost`, `marginAmount`, `marginPercent`, `minMarginPercent`, `defaultMinMarginPercent`, `packagePrice`, `packageSize`, `quantity`, `suppliers`) y adjunta la cabecera `Cache-Control: private, no-store`. Por su parte, `blockCollaboratorMutations` rechaza cualquier método no seguro (`POST`, `PUT`, `DELETE`) con código `403 Forbidden`.
   - **Capa 2 — Client-Side React (SPA):** El componente `AdminOnlyRoute` redirige las rutas de administración (`/insumos`, `/proveedores`, `/proveedores/cuarentena`, `/productos/nuevo`) hacia `/productos`. El componente `MarginBadge` no monta nodos en el DOM si el usuario es colaborador, evitando fugas visuales o parpadeos.

3. **Postergación a Fase 2:**
   La matriz de permisos granulares por usuario (roles intermedios como *Encargado de Compras* con edición de insumos pero sin visibilidad de precios de venta) se difiere formalmente para la Fase 2 (versión comercial post-defensa académica).

---

## Consecuencias y Compensaciones (Trade-offs)

### Positivas
* **Seguridad Robusta:** Cero riesgo de fuga de datos en la red. Un colaborador malicioso que inspeccione la pestaña Network o el DOM del navegador solo encontrará nombres y precios finales de venta.
* **Mantenibilidad del Código:** La lógica de autorización está centralizada en un middleware unificado (`backend/src/middlewares/rbac.ts`) con 100% de cobertura de pruebas unitarias y validación continua en la suite E2E de Playwright (`rbac-security.spec.ts`).
* **Eficiencia de Persistencia:** El rol se almacena como un `ENUM ('ADMIN', 'COLLABORATOR')` en la tabla `User` de PostgreSQL y viaja en el JWT firmado asimétricamente por Clerk, sin requerir joins adicionales a tablas de permisos en cada solicitud.

### Costos Asumidos
* **Rigidez de Asignación:** Un empleado de confianza que reciba mercadería no puede actualizar costos por sí mismo sin ser promovido a `ADMIN` (lo que le otorgaría visibilidad total de los márgenes). Para este caso de uso, el comercio utiliza la ingesta desatendida por correo (`precios-<slug>@margenx.tech`), que no requiere intervención del colaborador.
</file>

<file path="docs/adr/0008-alta-de-colaboradores-por-invitacion.md">
# 8. Alta de Colaboradores por Invitación de Clerk con Alta en el Primer Inicio de Sesión

* **Estado:** Aceptado
* **Fecha:** 2026-11-16
* **Decisores:** Darío Giménez (Tech Lead). El alcance lo confirmó el equipo el 14/11/2026 para el Sprint 6.
* **Issue:** #395 (SPRINT6-BE-08)
* **Relacionado con:** ADR-001 (Clerk), ADR-003 (n8n satélite), ADR-007 (roles fijos), `docs/propuesta-proyecto.md` §13.1 (Concierge MVP), `docs/api.md` §3

---

## Contexto y Planteamiento del Problema

Hasta el Sprint 6, el alta de usuarios seguía el criterio *Concierge MVP* de la propuesta (§13.1): el equipo de MargenX creaba el usuario en Clerk y su fila en `User` (cuenta y rol) a mano. Para el dueño de un comercio, sumar a un empleado nuevo dependía del equipo.

Se necesita que el ADMIN invite a su personal desde la app sin abrir dos agujeros:

1. Que el cliente elija la cuenta o el rol del invitado (DoD §6: el `accountId` sale siempre del usuario autenticado).
2. Que un usuario dado de baja vuelva a entrar.

## Opciones Consideradas

1. **Tabla propia de invitaciones con tokens y mail desde n8n.** Control total, pero suma un modelo, una migración, el vencimiento de tokens y un flujo de mail propio en plena semana de congelamiento.
2. **Organizaciones de Clerk.** Resuelven invitaciones y membresías, pero duplican en Clerk el modelo de cuentas y roles que ya vive en PostgreSQL (`Account`, `User.role`), y obligan a migrar los usuarios existentes.
3. **Invitaciones de aplicación de Clerk con metadatos públicos, y alta en el primer inicio de sesión.** Clerk genera el enlace con ticket y verifica el correo; el backend fija la cuenta y el rol en `publicMetadata`, que solo se escribe con la clave secreta.

Para el mail se evaluaron dos variantes de la opción 3:

* **Mail de Clerk** (`notify: true`): sin código, pero en la instancia de desarrollo sale desde un dominio compartido (`accounts.dev`) con el prefijo "[Development]", en inglés y sin marca. En la prueba local llegó a spam.
* **Mail propio por n8n** (`notify: false`): el mismo canal de las alertas de margen (ADR-003): Brevo desde la casilla verificada de margenx.tech, en español y con la plantilla de MargenX.

## Decisión

Se adopta la **opción 3**.

* `POST /api/auth/invitations` (solo ADMIN) crea la invitación con `publicMetadata: { accountId, role: 'COLLABORATOR' }`, donde `accountId` sale de `req.user`, y `notify: false`. El cuerpo solo acepta `email`. El enlace lleva a `<APP_BASE_URL>/login`, que con el parámetro `__clerk_ticket` muestra el componente `<SignUp>` de Clerk, el que procesa el ticket.
* **El mail lo manda MargenX:** el backend despacha el enlace al webhook `collaborator-invitation` de n8n con el secreto compartido, y n8n lo envía por Brevo con la plantilla de MargenX. n8n solo acepta enlaces `https` de aceptación de Clerk y no toca la base (ADR-003).
* **Si el mail no sale, la invitación igual queda:** el backend responde `emailSent: false` y el ADMIN copia el enlace desde Perfil ("Copiar enlace") para mandarlo por WhatsApp u otro medio. El enlace se muestra solo al ADMIN de la cuenta y nunca se registra en los logs.
* Al aceptar, Clerk copia los metadatos al usuario. En su primera llamada a la API, `authMiddleware` no encuentra fila en `User`, lee los metadatos con la clave secreta (`services/invitedUserProvisioning.ts`) y crea el `User`. Solo lo crea si el rol es `COLLABORATOR` y la cuenta existe y está activa. En cualquier otro caso responde 401 como antes.
* `DELETE /api/auth/users/:id` borra el usuario **también en Clerk**. Si solo se borrara la fila, sus `publicMetadata` lo volverían a dar de alta en el siguiente inicio de sesión. Borrarlo en Clerk además cierra sus sesiones y elimina sus datos personales del proveedor.
* El único rol invitable es `COLLABORATOR`. Invitar a otro ADMIN y cambiar roles siguen en la Fase 2 (ADR-007).

## Consecuencias

### Positivas
* El dueño suma y quita empleados sin depender del equipo de MargenX.
* Sin migraciones ni tablas nuevas: la invitación vive en Clerk y la membresía sigue siendo la fila `User`.
* La cuenta y el rol nunca viajan desde el navegador: `publicMetadata` no se puede modificar desde el cliente de Clerk (a diferencia de `unsafeMetadata`).

### Costos Asumidos
* Un usuario de Clerk sin fila en `User` suma una llamada a la Backend API de Clerk (`users.getUser`) para ver si trae una invitación. Para el invitado pasa una sola vez, porque después ya tiene su fila. Un usuario sin invitación válida (por ejemplo, alguien que se registró solo) recibe 401 y el backend lo recuerda 5 minutos en memoria (hasta 1.000 usuarios por proceso) para no consultar a Clerk en cada pedido. Los fallos de Clerk no se recuerdan. Si se reactiva una cuenta, sus invitados pueden tardar hasta 5 minutos en poder entrar.
* Las invitaciones pendientes se listan desde Clerk y se filtran por `accountId` en el backend, porque la API de Clerk no filtra por metadatos. Con una sola instancia de Clerk por entorno, el listado recorre todas las pendientes de ese entorno (páginas de 500). Cada vez que un ADMIN abre Perfil, y al revocar, se recorren las pendientes de todas las cuentas, así que la cantidad de llamadas crece con el total de invitaciones del entorno. Con los comercios piloto no es un problema. Si crece la cantidad de comercios, conviene guardar el id de cada invitación con su `accountId` en la base.
* Si Clerk no responde, invitar, revocar y dar de baja devuelven 502 y no aplican cambios.
* El mail depende de que el workflow `invitacion-colaborador.json` esté publicado en n8n y de `N8N_INVITATION_WEBHOOK_URL` en cada backend. Sin eso, las invitaciones funcionan solo con "Copiar enlace".
* El enlace de aceptación es una credencial de alta: quien lo tenga entra como colaborador de esa cuenta hasta que se acepte, se revoque o venza. Por eso solo lo ve el ADMIN y no se registra.
* La instancia de Clerk tiene que estar en modo *Restricted*: solo se registra quien trae una invitación. El modo público también permite el alta por invitación, pero deja que cualquiera cree un usuario de Clerk. Ese usuario recibe 401 y no ve datos, pero cada usuario nuevo suma una consulta a la Backend API de Clerk.

### Alcance que sigue en Concierge MVP
La creación de **cuentas** (comercios) y de su primer ADMIN no cambia: la sigue haciendo el equipo, como indica la propuesta §13.1.
</file>

<file path="docs/adr/0009-reporte-semanal-pdf-n8n-gotenberg.md">
# 9. Reporte Semanal en PDF Generado en n8n con Gotenberg

* **Estado:** Aceptado
* **Fecha:** 2026-11-18
* **Decisores:** Darío Giménez (Tech Lead / DevOps). El reporte semanal en PDF se comprometió con el PO en la Entrega 6 y el equipo confirmó el alcance el 14/11/2026 para el Sprint 6.
* **Issue:** #391 (SPRINT6-DEVOPS-02). Endpoints del backend: #390.
* **Relacionado con:** ADR-002 (VPS), ADR-003 (n8n satélite, al que enmienda en el punto del reporte semanal), ADR-004 (cálculo de margen), `docs/api.md` §11, `infra/n8n/README.md`, `infra/vps/README.md` §10

---

## Contexto y Planteamiento del Problema

Cada lunes a las 08:00 (hora de Argentina), el ADMIN de cada comercio tiene que recibir un mail con el reporte de márgenes de la semana en PDF, para leerlo sin entrar a la app, reenviarlo o imprimirlo. Desde la app, el ADMIN también puede descargar el mismo PDF a pedido (`GET /api/reports/weekly.pdf`).

ADR-003 ya había decidido que el PDF lo genera n8n, pero con un endpoint público (`GET /api/reports/margin-summary`) que nunca existió y sin definir cómo se convierte el HTML a PDF. Restricciones:

* **n8n no tiene un nodo nativo para pasar de HTML a PDF**, y un nodo Code no puede importar librerías.
* **La memoria de la VPS es acotada** (SAD §4: techo del stack de ~3.3 GB sobre 8 GB). El backend tiene 512 MB por entorno y n8n 1024 MB con 768 MB de heap.
* **Los números tienen que ser los mismos que ve el panel:** el cálculo (con `Prisma.Decimal`) vive solo en el backend (ADR-003, ADR-004).
* **Un solo diseño:** el PDF del mail y el de la descarga tienen que ser idénticos.

## Opciones Consideradas

1. **PDF en el backend con `pdfkit`.** Sin dependencias del sistema, pero el diseño se dibuja con coordenadas, a mano, y no reutiliza la plantilla HTML de los mails. Cada cambio de diseño requiere un deploy del backend.
2. **PDF en el backend con Puppeteer.** HTML a PDF fiel, pero mete Chromium (~300 MB de imagen y cientos de MB de RAM por conversión) en el contenedor de 512 MB que atiende la API, dos veces (producción y staging). Una conversión pesada compite con los pedidos de los usuarios.
3. **Chromium dentro de la imagen de n8n, o un nodo de la comunidad.** Obliga a mantener una imagen propia de n8n o a confiar en un paquete de terceros con acceso a la instancia que guarda todas las credenciales.
4. **Gotenberg, un contenedor aparte que solo convierte.** API HTTP (`POST /forms/chromium/convert/html`) con Chromium adentro, mantenida y con imagen oficial. n8n le manda el HTML y recibe el PDF.

## Decisión

Se adopta la **opción 4**.

* **El backend calcula, n8n presenta.** `GET /api/internal/reports/accounts` y `GET /api/internal/reports/weekly/:slug` devuelven el reporte ya calculado. Las protege el secreto `x-margenx-webhook-secret` y Nginx las niega desde Internet (`location ^~ /api/internal/ { deny all; }`). n8n las llama **por la red interna de Docker** (`MARGENX_INTERNAL_API_URL`, `MARGENX_INTERNAL_DEV_API_URL`). n8n no lee la base ni recalcula márgenes (ADR-003).
* **Un solo generador.** El workflow `infra/n8n/workflows/reporte-semanal.json` tiene un único nodo Code (`Generar Reporte HTML`) y un único nodo de Gotenberg para los dos caminos: el disparador de los lunes y el webhook `report-pdf` que llama el backend para la descarga. El HTML usa la plantilla compartida de los mails (`infra/n8n/plantillas/mail-margenx.js`), extendida con una versión A4 (`mxDocumentoA4`: `@page`, encabezados de tabla que se repiten y filas que no se cortan).
* **Gotenberg** (`gotenberg/gotenberg:8.40.0`, versión fija) corre solo en `margenx_network`, sin puertos publicados, con 512 MB de límite y 128 MB de reserva. Chromium arranca con la primera conversión (`--chromium-auto-start=false`), se apaga tras 60 s sin uso (`--chromium-idle-shutdown-timeout=60s`) y convierte de a dos como máximo (`--chromium-max-concurrency=2`). n8n, además, le pide los PDF de a uno. Sin JavaScript (`--chromium-disable-javascript`) y solo puede leer el HTML recibido (`--chromium-allow-list=^file:///tmp/.*`): el HTML no puede descargar nada de la red.
* **Una cuenta que falla no frena a las demás.** Los pedidos al backend, la conversión y el envío continúan por su salida de error hacia un aviso a Discord (`DISCORD_WEBHOOK_URL`) con el slug, el paso y el código HTTP, sin correos ni datos personales.
* **Solo producción en el cron.** Staging se prueba con el disparador manual, que puede limitarse a un slug y a una casilla de prueba. El webhook `report-pdf` atiende a los dos backends, porque recibe el JSON ya calculado y no llama a la API.

## Consecuencias

### Positivas
* El backend no suma dependencias ni memoria: sigue respondiendo JSON.
* El diseño del PDF se cambia en el repositorio (plantilla y nodo Code) sin redeploy del backend, y la prueba `infra/n8n/tests/reporte-nodos.test.mjs` verifica en CI las secciones, el formato es-AR, los escapes y la plantilla.
* El PDF del mail y el de la descarga salen del mismo código y tienen el mismo contenido.

### Costos Asumidos
* **Memoria:** medido con la imagen 8.40.0 y un reporte de 3 páginas A4 (20 productos bajo el mínimo y 10 cambios de costo): 9 a 25 MB en reposo, un pico de 257 MB en la primera conversión y ~160 MB con Chromium encendido entre conversiones. A los 10 s de inactividad (en la prueba) Chromium se apagó y el contenedor volvió a 24 MB. La conversión tardó 0,6 s en frío y 0,26 s en caliente. Con el límite, el techo del stack sube de ~3.3 GB a ~3.8 GB (SAD §4). La medición en la VPS, con `docker stats` y `monitor-memory.sh`, se registra en el PR.
* **Un contenedor más que mantener.** La versión está fija: actualizarla es cambiar la etiqueta, probar una conversión y medir de nuevo.
* **n8n es un punto único:** si n8n o Gotenberg están caídos, el mail del lunes no sale (queda el aviso en Discord si n8n responde) y la descarga desde la app responde 503 con un mensaje genérico.
* **El webhook `report-pdf` es sincrónico:** el backend espera hasta 20 s. Con Chromium en frío la conversión tardó menos de 1 s en la prueba local.

### Alternativa descartada
Generar el PDF en el backend (opciones 1 y 2) se descarta por la memoria del contenedor de la API y porque obligaría a mantener dos diseños: el de los mails en n8n y el del PDF en el backend.
</file>

<file path="docs/adr/0010-modulo-de-ventas-y-control-de-modulos.md">
# 10. Módulo de Ventas con Ticket No Fiscal y Control de Módulos por Plan y por Cuenta

* **Estado:** Aceptado
* **Fecha:** 2026-11-22
* **Decisores:** Darío Giménez (Tech Lead). Lo propuso la docente en la clase del 21/11/2026 y el equipo acordó el alcance el 22/11/2026 (acta del Sprint 6, §5.4).
* **Issue:** #447 (SPRINT7-SALES-00). Lo implementan #448 (venta y ticket), #449 (turnos y caja) y #450 (ganancia real).
* **Relacionado con:** ADR-004 (margen sobre ventas), ADR-005 (costo vigente), ADR-007 (roles fijos), ADR-008 (alta de colaboradores), ADR-009 (reporte semanal), `docs/especificacion-funcional.md` §13; la hoja de ruta posterior a la cursada la publica #451

---

## Contexto y Planteamiento del Problema

MargenX calcula el margen **teórico** de cada producto: precio de venta contra el costo de su receta (ADR-004). Nada dice cuánto se vendió ni cuánto se ganó de verdad. Los comercios piloto anotan las ventas en un cuaderno o en una planilla.

En la clase del 21/11/2026, la docente propuso ofrecer al emprendedor una solución inmediata, vender y dar un ticket, como puerta de entrada al control de margen. Restricciones:

* **Congelamiento de funcionalidades el 28/11/2026 y entrega el 05/12/2026** (SAD §1 y §6). Lo que ya funciona no se puede poner en riesgo.
* **No todos los comercios lo van a usar desde el primer día.** Hace falta prenderlo por cuenta, y en la Fase 2 venderlo como parte de un plan.
* **El recorrido de cliente del 21/11** (`docs/qa/reporte-calidad-sprint7.md` §1.10) mostró que Compras sugeridas inventaba cantidades: sin stock, el pedido semanal suponía 1 bulto por insumo.
* **Facturar es un trámite fiscal** (ARCA, certificados, puntos de venta) que no entra en dos semanas.

## Opciones Consideradas

1. **No hacer nada en la cursada** y dejar las ventas para la Fase 2.
2. **Ventas completas con stock:** venta, descuento de insumos por receta, ingreso de mercadería y reposición. Exige una carga inicial de stock por comercio y cambia el dominio actual (insumos, recetas y compras).
3. **Ventas con ticket no fiscal, caja por turnos y ganancia real, detrás de un control de módulos.** No toca insumos, productos, proveedores ni el recálculo. Stock, compras con pedido y facturación quedan para la Fase 2.

## Decisión

Se adopta la **opción 3**.

* **Ticket no fiscal:** la venta registra los productos, las cantidades, el medio de pago (efectivo, transferencia o Mercado Pago, **solo registrado**, sin integración de cobro) y un número de ticket correlativo por cuenta. El ticket dice **"Comprobante no válido como factura"**. Es la puerta de entrada para quien hoy anota a mano.
* **Precio, costo y margen congelados en cada renglón de la venta.** Cada `SaleItem` guarda el precio unitario, el costo unitario y el margen **del momento de la venta**. Así, la ganancia histórica no cambia cuando cambia un costo (ADR-005). El margen se calcula sobre el precio de venta, como en ADR-004.
* **Caja por turnos:** un solo turno abierto por cuenta, con el monto inicial y, al cierre, lo esperado y lo contado por medio de pago. Una venta exige un turno abierto.
* **Ganancia real:** ventas menos costo congelado, y el margen ponderado por lo vendido (ganancia / ventas). Complementa al margen teórico de cada producto, no lo reemplaza.
* **Lo que no se borra:** una venta se anula, con su motivo, y queda en el historial. Si se da de baja a un colaborador (ADR-008), sus ventas y turnos quedan sin usuario, pero no se pierden.
* **El colaborador vende pero no ve costos ni márgenes** (ADR-007, `docs/especificacion-funcional.md` §8), igual que en el resto de la app.
* **Control de módulos por plan y por cuenta** (`backend/src/lib/features.ts`):
  * `PLAN_FEATURES`: los módulos que trae cada plan (`FREE`, `BASIC`, `PRO`, `BUSINESS`), sobre el `Account.subscriptionPlan` que ya existe. **Hoy ningún plan trae módulos:** qué plan incluye las ventas se decide en la v1.2, con el backoffice y los planes pagos. Esa asignación es una *propuesta* abierta, no una regla.
  * `AccountFeature`: excepciones por cuenta (prender o apagar un módulo para un comercio puntual).
  * `hasFeature`: primero la excepción de la cuenta y, si no hay, el plan. Un plan desconocido no trae módulos.
  * `requireFeature('sales')`: con el módulo apagado, las rutas `/api/sales` y `/api/cash-shifts` responden **404**, como si no existieran.
  * `GET /api/auth/me` informa los módulos de la cuenta en `user.features`, y el frontend los lee con un solo hook (`useFeatures`) para mostrar u ocultar el menú.
  * En la v1.0.0, el módulo está prendido solo en la cuenta Demo de staging. El 28/11 se decide si se prende en la cuenta Demo de producción (#450).
* **Compras sugeridas mide el impacto en el margen** de cambiar de proveedor. Sin stock no hay cantidades reales, así que la reposición con cantidades llega en la Fase 2, cuando exista el stock. La calculadora de bultos y el pedido semanal se quitan (#445, #446), y `POST /api/purchasing/order-preview` queda deprecado: se reutiliza para la reposición con stock o se elimina en la v1.1.
* **Pasan a la Fase 2** (la hoja de ruta con las versiones la publica #451):
  * **stock de insumos** descontado por receta desde las ventas, con carga inicial e ingreso de mercadería: exige datos iniciales por comercio y cambia el dominio de insumos y recetas;
  * **compras con pedido** a proveedores y **reposición** con cantidades: dependen del stock;
  * **facturación electrónica de ARCA**: trámites fiscales (certificados y puntos de venta) que no dependen del equipo.

## Consecuencias

* **Positivas:**
  * El comercio que hoy anota a mano tiene una razón inmediata para usar MargenX, y cada venta alimenta la ganancia real.
  * El módulo se activa por cuenta sin tocar a los demás comercios, y la misma tabla sirve para los planes de la Fase 2.
  * La migración es solo aditiva (tablas nuevas, ninguna columna existente cambia), así que el release v1.0.0 no depende del módulo: si el 28/11 no está listo, queda apagado.
  * El margen ponderado por lo vendido, que la especificación funcional daba como imposible por falta de volumen de ventas, pasa a ser calculable (nota en ADR-004).
* **Negativas / a mitigar:**
  * **El ticket no es una factura.** Un comercio que necesita facturar sigue usando su sistema fiscal. *Mitigación:* la leyenda en cada ticket y la aclaración en el manual.
  * **Sin stock, la venta no descuenta insumos.** La ganancia real es correcta (usa el costo de la receta), pero no hay control de faltantes. *Mitigación:* el stock es lo primero de la Fase 2 (v1.1).
  * **Un módulo más para probar antes de la entrega.** *Mitigación:* todo entra detrás del control de módulos y con la decisión del 28/11, que puede dejarlo apagado sin afectar el release.
  * **Las excepciones por cuenta se cargan a mano** (seed o SQL) hasta que exista el backoffice de la v1.2 (Concierge MVP, `docs/propuesta-proyecto.md` §13.1).
</file>

<file path="docs/adr/0011-costo-manual-con-presentacion-predeterminada.md">
# 11. Costo Manual de un Insumo con Presentación Predeterminada

* **Estado:** Aceptado
* **Fecha:** 2026-11-23
* **Decisores:** Darío Giménez (Tech Lead), al resolver la contradicción entre la issue #427 (SPRINT7-QA7-02) y ADR-005.
* **Issue:** #427. Origen: hallazgo RC-28 del recorrido de cliente del 21/11/2026 (`docs/qa/reporte-calidad-sprint7.md` §1) y la revisión de usabilidad del equipo.
* **Reemplaza en parte a:** ADR-005, en dos reglas: "Sobrescritura deliberada de ediciones manuales" y, para un caso nuevo, "todo insumo con proveedores asociados conserve siempre una presentación predeterminada activa". El resto de ADR-005 sigue vigente.

---

## Contexto y Planteamiento del Problema

ADR-005 establece que el costo de un insumo sale de su presentación predeterminada. También admite que el administrador edite el costo a mano: ese costo funciona como *override* temporal, y la próxima actualización de la presentación (una lista del proveedor o un cambio del bulto) lo pisa.

En el recorrido de cliente del 21/11/2026 eso apareció como un defecto (RC-28):

* El dueño cambia el costo de un insumo de $900 a $950 por kg. Se guarda, pero la presentación predeterminada sigue a $900 por kg y sigue siendo la predeterminada.
* Nada le avisa. Compras sugeridas y el reporte semanal comparan contra un costo que ya no sale de ningún proveedor, y la próxima lista vuelve a $900 sin que el dueño entienda por qué.

ADR-005 también exige que todo insumo con proveedores conserve una presentación predeterminada. Esa regla ya tenía una excepción: al dar de baja un proveedor, los insumos en los que era el predeterminado quedan sin predeterminado hasta que el dueño elija otro (`docs/manual-usuario/04-proveedores-y-listas.md`, "Desactivar o dar de baja").

## Opciones Consideradas

1. **Mantener el override temporal** y solo avisar. El aviso no resuelve la contradicción: el costo y la presentación siguen sin coincidir hasta la próxima lista.
2. **Ofrecer tres salidas:** las dos de la opción 3 más "guardar solo en el insumo" (el override de ADR-005). Suma una opción que el recorrido mostró que confunde.
3. **Pedir que el dueño elija qué hacer con la presentación**, con dos salidas: actualizar su precio o dejar de usarla como predeterminada. **(Elegida)**

## Decisión

Cuando el administrador cambia el costo de un insumo, el insumo tiene una presentación predeterminada y el costo nuevo no coincide con el costo unitario de esa presentación, `PUT /api/ingredients/:id`:

* **Sin decisión del dueño:** responde `409` con `code: "DEFAULT_PRESENTATION_MISMATCH"` y los datos de la presentación (proveedor, bulto, precio del bulto y costo unitario). No guarda nada.
* **`defaultPresentationAction: "update-presentation"`:** en la misma transacción que el costo, el precio del bulto pasa a `costo × tamaño del bulto`, redondeado a 2 decimales con `ROUND_HALF_UP` (ADR-004). La presentación sigue siendo la predeterminada, y el insumo guarda el costo unitario que da ese bulto (ADR-005), así que el costo y la presentación vuelven a coincidir. Con un bulto de tamaño con decimales, ese costo puede diferir en centavos del que cargó el dueño: con un pan de 0,5 kg, $12.090,25 dan un bulto de $6.045,13 y un costo de $12.090,26. Si el precio del bulto superaría $99.999.999,99 o daría $0,00, la API responde `422` y no guarda nada.
* **`defaultPresentationAction: "clear-default"`:** en la misma transacción, la presentación deja de ser la predeterminada. El insumo queda con el costo manual y **sin presentación predeterminada** hasta que el dueño elija otra. Es la segunda excepción a la regla de ADR-005, junto con la baja de un proveedor.

El override temporal de ADR-005 deja de existir para los insumos con presentación predeterminada. Sin presentación predeterminada, con el mismo costo o con un costo que coincide con el de la presentación, el costo se guarda como antes.

## Consecuencias

* **Positivas:**
  * El costo del insumo y el de su presentación predeterminada no se contradicen sin que el dueño lo decida.
  * La decisión queda en la base, en una sola transacción, con el historial de costos del insumo.
* **Negativas y deuda:**
  * Un insumo puede quedar sin presentación predeterminada aunque tenga proveedores. Hasta que el dueño elija otra, las listas de precios actualizan las presentaciones pero no el costo del insumo (ADR-005: solo la predeterminada mueve el costo).
  * El precio del bulto calculado con `update-presentation` puede diferir en centavos de la factura real del proveedor. Lo corrige la próxima lista.
  * Con un bulto de tamaño con decimales, `update-presentation` puede guardar un costo unos centavos distinto del que cargó el dueño. La ficha muestra el costo guardado en el aviso de éxito.
  * El cliente que edita el costo tiene que manejar el `409` nuevo. Hoy es solo la ficha del insumo en `/insumos`.
</file>

<file path="backend/src/routes/auth.ts">
import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';
import { getAccountFeatures } from '../lib/features';
import collaboratorsRouter from './collaborators';

const router = Router();

/*
  GET /api/auth/me
  Incluye `features`: los módulos prendidos para la cuenta (ADR-010). El colaborador
  también los recibe, porque usa el módulo de ventas aunque no vea costos.
*/
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const authUser = req.user!;
  const features = await getAccountFeatures(authUser.accountId);

  const user = authUser.role === 'COLLABORATOR' && authUser.account
    ? {
        ...authUser,
        account: {
          id: authUser.account.id,
          businessName: authUser.account.businessName,
        },
      }
    : authUser;

  res.status(200).json({ user: { ...user, features } });
});

/*
  PATCH /api/auth/account/margin
  Actualiza el margen global de la cuenta. Solo ADMIN.
*/
router.patch('/account/margin', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { defaultMinMarginPercent } = req.body;

  if (
    defaultMinMarginPercent === undefined ||
    typeof defaultMinMarginPercent !== 'number' ||
    defaultMinMarginPercent < 0 ||
    defaultMinMarginPercent > 100
  ) {
    throw new AppError('El margen debe ser un número válido entre 0 y 100.', 400);
  }

  const updatedAccount = await prisma.account.update({
    where: { id: req.user!.accountId },
    data: { defaultMinMarginPercent },
    select: {
      id: true,
      businessName: true,
      defaultMinMarginPercent: true,
    }
  });

  res.status(200).json({
    message: 'Margen global actualizado correctamente',
    account: updatedAccount,
  });
});

/*
  Equipo de la cuenta: /invitations y /users (routes/collaborators.ts, ADR-008).
*/
router.use(collaboratorsRouter);

export default router;
</file>

<file path="backend/src/routes/dashboard.ts">
import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { calculateCatalogHealthSummary } from '../services/marginCalculator';

const router = Router();

router.use(authMiddleware);

router.get('/metrics', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [activeIngredientsCount, productRows, recentCostVariations] = await Promise.all([
    prisma.ingredient.count({ where: { accountId } }),
    prisma.product.findMany({
      where: { accountId },
      select: {
        marginPercent: true,
        minMarginPercent: true,
        _count: { select: { ingredients: true } },
      },
    }),
    prisma.priceHistory.groupBy({
      by: ['ingredientId'],
      where: {
        ingredient: { accountId },
        changedAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const summary = calculateCatalogHealthSummary(
    productRows.map((product) => ({
      marginPercent: product.marginPercent,
      minMarginPercent: product.minMarginPercent,
      ingredientsCount: product._count?.ingredients ?? 0,
    }))
  );

  const recentCostVariationsCount = new Set(
    recentCostVariations.map((entry) => entry.ingredientId)
  ).size;

  const response = {
    activeIngredientsCount,
    criticalProductsCount: summary.criticalProductsCount,
    healthyProductsCount: summary.healthyProductsCount,
    averageMarginPercent: summary.averageMarginPercent,
    recentCostVariationsCount,
    lossCount: summary.lossCount,
    riskCount: summary.riskCount,
    targetCount: summary.targetCount,
    surplusCount: summary.surplusCount,
    draftCount: summary.draftCount,
  };

  return res.status(200).json(response);
});

export default router;
</file>

<file path="backend/src/routes/purchasing.test.ts">
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { AppError, errorHandler } from '../middlewares/errorHandler';

const authState = vi.hoisted(() => ({
  authenticated: true,
  role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR',
  accountId: 'account-1',
}));

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!authState.authenticated) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    req.user = {
      id: 'user-1',
      accountId: authState.accountId,
      email: 'admin@panaderia.example',
      role: authState.role,
    };
    next();
  },
}));

const getPurchasingSuggestionsMock = vi.fn();
const previewPurchasingOrderMock = vi.fn();
const getPurchasingMarginImpactMock = vi.fn();
const getIngredientMarginImpactMock = vi.fn();

vi.mock('../services/purchasingService', () => ({
  getPurchasingSuggestions: (...args: unknown[]) => getPurchasingSuggestionsMock(...args),
  previewPurchasingOrder: (...args: unknown[]) => previewPurchasingOrderMock(...args),
  getPurchasingMarginImpact: (...args: unknown[]) => getPurchasingMarginImpactMock(...args),
  getIngredientMarginImpact: (...args: unknown[]) => getIngredientMarginImpactMock(...args),
}));

import purchasingRouter from './purchasing';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/purchasing', purchasingRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  authState.authenticated = true;
  authState.role = 'ADMIN';
  authState.accountId = 'account-1';
  getPurchasingSuggestionsMock.mockReset();
  previewPurchasingOrderMock.mockReset();
  getPurchasingMarginImpactMock.mockReset();
  getIngredientMarginImpactMock.mockReset();
});

describe('GET /api/purchasing/suggestions', () => {
  it('devuelve 401 si no está autenticado', async () => {
    authState.authenticated = false;

    const res = await request(buildApp()).get('/api/purchasing/suggestions');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No autorizado');
    expect(getPurchasingSuggestionsMock).not.toHaveBeenCalled();
  });

  it('Gherkin "Seguridad": devuelve 403 si el usuario es COLLABORATOR', async () => {
    authState.role = 'COLLABORATOR';

    const res = await request(buildApp()).get('/api/purchasing/suggestions');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(getPurchasingSuggestionsMock).not.toHaveBeenCalled();
  });

  it('devuelve 200 con las sugerencias calculadas para el accountId del token', async () => {
    const mockPayload = {
      summary: {
        withSavingsCount: 1,
        alreadyBestPriceCount: 0,
        singleSupplierCount: 0,
        withoutEligibleSupplierCount: 0,
        withoutActiveDefaultCount: 0,
        quarantinedExcludedCount: 0,
      },
      byIngredient: [],
      bySupplier: [],
      alreadyBestPrice: [],
      singleSupplier: [],
      quarantinedExcluded: [],
    };
    getPurchasingSuggestionsMock.mockResolvedValue(mockPayload);

    const res = await request(buildApp()).get('/api/purchasing/suggestions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockPayload);
    expect(getPurchasingSuggestionsMock).toHaveBeenCalledWith('account-1');
  });
});

describe('POST /api/purchasing/order-preview', () => {
  it('devuelve 401 si no está autenticado', async () => {
    authState.authenticated = false;

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-1', packages: 2 }] });

    expect(res.status).toBe(401);
  });

  it('Gherkin "Seguridad": devuelve 403 si el usuario es COLLABORATOR', async () => {
    authState.role = 'COLLABORATOR';

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-1', packages: 2 }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('Gherkin "Seguridad": devuelve 404 si se solicita una presentación ajena o inexistente', async () => {
    previewPurchasingOrderMock.mockRejectedValue(
      new AppError('Una o más presentaciones solicitadas no existen.', 404)
    );

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-otra-cuenta', packages: 1 }] });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Una o más presentaciones solicitadas no existen.');
    expect(previewPurchasingOrderMock).toHaveBeenCalledWith('account-1', [
      { supplierIngredientId: 'si-otra-cuenta', packages: 1 },
    ]);
  });

  it('devuelve 200 con el preview agrupado cuando el payload es válido', async () => {
    const preview = {
      groups: [],
      total: '94254.70',
      totalSavings: '1000.00',
      totalPackages: 3,
      itemsCount: 2,
    };
    previewPurchasingOrderMock.mockResolvedValue(preview);

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({
        items: [
          { supplierIngredientId: '  si-1  ', packages: 2 },
          { supplierIngredientId: 'si-2', packages: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(preview);
    expect(previewPurchasingOrderMock).toHaveBeenCalledWith('account-1', [
      { supplierIngredientId: 'si-1', packages: 2 },
      { supplierIngredientId: 'si-2', packages: 1 },
    ]);
  });

  it.each([
    ['sin body', undefined],
    ['items vacío', { items: [] }],
    ['packages en cero', { items: [{ supplierIngredientId: 'si-1', packages: 0 }] }],
    ['packages negativo', { items: [{ supplierIngredientId: 'si-1', packages: -1 }] }],
    ['packages decimal', { items: [{ supplierIngredientId: 'si-1', packages: 1.5 }] }],
    ['packages string', { items: [{ supplierIngredientId: 'si-1', packages: '2' }] }],
    ['supplierIngredientId vacío', { items: [{ supplierIngredientId: '   ', packages: 1 }] }],
  ])('devuelve 400 ante payload inválido (%s)', async (_caso, payload) => {
    const req = request(buildApp()).post('/api/purchasing/order-preview');
    const res = payload === undefined ? await req : await req.send(payload);

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('rechaza con 400 cuando items supera el tope de 500 elementos', async () => {
    const items = Array.from({ length: 501 }, (_, i) => ({
      supplierIngredientId: `si-${i + 1}`,
      packages: 1,
    }));

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/500/);
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('rechaza con 400 cuando packages supera el tope de 100.000 bultos', async () => {
    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-1', packages: 100001 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100\.000/);
    expect(previewPurchasingOrderMock).not.toHaveBeenCalled();
  });

  it('devuelve 422 cuando el servicio rechaza una presentación en cuarentena o de proveedor inactivo', async () => {
    previewPurchasingOrderMock.mockRejectedValue(
      new AppError(
        'La presentación de "Harina 000" está en cuarentena y debe resolverse antes de pedirla.',
        422
      )
    );

    const res = await request(buildApp())
      .post('/api/purchasing/order-preview')
      .send({ items: [{ supplierIngredientId: 'si-quar', packages: 1 }] });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/cuarentena/i);
  });
});

describe('GET /api/purchasing/margin-impact', () => {
  it('devuelve 401 si no está autenticado', async () => {
    authState.authenticated = false;
    const res = await request(buildApp()).get('/api/purchasing/margin-impact');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 si es COLLABORATOR', async () => {
    authState.role = 'COLLABORATOR';
    const res = await request(buildApp()).get('/api/purchasing/margin-impact');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(getPurchasingMarginImpactMock).not.toHaveBeenCalled();
  });

  it('devuelve 200 con el accountId del token', async () => {
    const payload = { summary: { ingredientsWithAlternative: 1, productsAffected: 2, productsLeavingRiskOrLoss: 1 }, byIngredient: [] };
    getPurchasingMarginImpactMock.mockResolvedValue(payload);
    const res = await request(buildApp()).get('/api/purchasing/margin-impact');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
    expect(getPurchasingMarginImpactMock).toHaveBeenCalledWith('account-1');
  });
});

describe('GET /api/purchasing/margin-impact/:ingredientId', () => {
  it('devuelve 401 si no está autenticado', async () => {
    authState.authenticated = false;
    const res = await request(buildApp()).get('/api/purchasing/margin-impact/ing-1?supplierIngredientId=si-1');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 si es COLLABORATOR', async () => {
    authState.role = 'COLLABORATOR';
    const res = await request(buildApp()).get('/api/purchasing/margin-impact/ing-1?supplierIngredientId=si-1');
    expect(res.status).toBe(403);
  });

  it('devuelve 400 si falta supplierIngredientId', async () => {
    const res = await request(buildApp()).get('/api/purchasing/margin-impact/ing-1');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/supplierIngredientId/i);
  });

  it('propaga 404 y 422 del servicio', async () => {
    getIngredientMarginImpactMock.mockRejectedValueOnce(new AppError('Insumo no encontrado.', 404));
    let res = await request(buildApp()).get('/api/purchasing/margin-impact/ing-1?supplierIngredientId=si-1');
    expect(res.status).toBe(404);

    getIngredientMarginImpactMock.mockRejectedValueOnce(new AppError('La presentación ya es la predeterminada.', 422));
    res = await request(buildApp()).get('/api/purchasing/margin-impact/ing-1?supplierIngredientId=si-1');
    expect(res.status).toBe(422);
  });

  it('devuelve 200 con el impacto puntual', async () => {
    const payload = { ingredientId: 'ing-1', products: [] };
    getIngredientMarginImpactMock.mockResolvedValue(payload);
    const res = await request(buildApp()).get('/api/purchasing/margin-impact/ing-1?supplierIngredientId=si-1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
    expect(getIngredientMarginImpactMock).toHaveBeenCalledWith('account-1', 'ing-1', 'si-1');
  });
});
</file>

<file path="backend/src/routes/purchasing.ts">
import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';
import {
  getPurchasingSuggestions,
  previewPurchasingOrder,
  getPurchasingMarginImpact,
  getIngredientMarginImpact,
} from '../services/purchasingService';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

export const orderPreviewSchema = z.object({
  items: z
    .array(
      z.object({
        supplierIngredientId: z
          .string({ error: 'El campo "supplierIngredientId" debe ser un texto.' })
          .trim()
          .min(1, 'El campo "supplierIngredientId" es obligatorio.'),
        packages: z
          .number({ error: 'El campo "packages" debe ser un número entero.' })
          .int('El campo "packages" debe ser un número entero.')
          .positive('El campo "packages" debe ser mayor a cero.')
          .max(100000, 'El campo "packages" no puede superar los 100.000 bultos.'),
      }),
      { error: 'El campo "items" debe ser un array.' }
    )
    .min(1, 'El pedido debe incluir al menos un ítem.')
    .max(500, 'El pedido no puede superar los 500 ítems.'),
});

router.get('/suggestions', async (req: AuthenticatedRequest, res: Response) => {
  const suggestions = await getPurchasingSuggestions(req.user!.accountId);
  return res.status(200).json(suggestions);
});

router.post('/order-preview', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = orderPreviewSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(issue?.message ?? 'Payload inválido.', 400);
  }

  const preview = await previewPurchasingOrder(req.user!.accountId, parsed.data.items);
  return res.status(200).json(preview);
});

router.get('/margin-impact', async (req: AuthenticatedRequest, res: Response) => {
  const result = await getPurchasingMarginImpact(req.user!.accountId);
  return res.status(200).json(result);
});

router.get('/margin-impact/:ingredientId', async (req: AuthenticatedRequest, res: Response) => {
  const ingredientIdParam = req.params.ingredientId;
  const ingredientId = typeof ingredientIdParam === 'string' ? ingredientIdParam.trim() : '';
  if (!ingredientId) {
    throw new AppError('El parámetro "ingredientId" es obligatorio.', 400);
  }
  const rawSupplierIngredientId = req.query.supplierIngredientId;
  const supplierIngredientId =
    typeof rawSupplierIngredientId === 'string' ? rawSupplierIngredientId.trim() : '';

  if (!supplierIngredientId) {
    throw new AppError('El parámetro "supplierIngredientId" es obligatorio.', 400);
  }

  const result = await getIngredientMarginImpact(
    req.user!.accountId,
    ingredientId,
    supplierIngredientId
  );
  return res.status(200).json(result);
});

export default router;
</file>

<file path="backend/src/routes/reports.test.ts">
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { errorHandler } from '../middlewares/errorHandler';

const authState = vi.hoisted(() => ({
  authenticated: true,
  role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR',
  accountId: 'acc-panaderia',
}));

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!authState.authenticated) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    req.user = {
      id: 'user-1',
      accountId: authState.accountId,
      email: 'admin.panaderia@seed.example.test',
      role: authState.role,
    };
    next();
  },
}));

const buildWeeklyMarginReportMock = vi.fn();
vi.mock('../services/reportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/reportService')>();
  return {
    ...actual,
    buildWeeklyMarginReport: (...args: unknown[]) => buildWeeklyMarginReportMock(...args),
  };
});

import reportsRouter from './reports';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportsRouter);
  app.use(errorHandler);
  return app;
}

const SAMPLE_REPORT = {
  account: {
    id: 'acc-panaderia',
    businessName: 'Panadería Central',
    slug: 'panaderia-central',
    defaultMinMarginPercent: '30.00',
  },
  period: {
    from: '2026-11-10T03:00:00.000Z',
    to: '2026-11-17T03:00:00.000Z',
    timezone: 'America/Argentina/Buenos_Aires',
    fromFormatted: '10/11/2026',
    toFormatted: '17/11/2026',
  },
  generatedAt: '2026-11-17T15:00:00.000Z',
  catalogHealth: {
    totalProducts: 10,
    activeIngredientsCount: 10,
    criticalProductsCount: 1,
    healthyProductsCount: 9,
    averageMarginPercent: 60.5,
    lossCount: 0,
    riskCount: 1,
    targetCount: 4,
    surplusCount: 5,
    draftCount: 0,
  },
  belowMinimumProducts: { totalCount: 1, items: [] },
  weeklyCostChanges: { totalCount: 0, items: [] },
  quarantine: { totalCount: 0, items: [] },
  purchasingSavings: { totalCount: 0, items: [] },
  staleCosts: { totalCount: 0, thresholdDays: 30, items: [] },
};

describe('rutas de reportes para la app', () => {
  beforeEach(() => {
    authState.authenticated = true;
    authState.role = 'ADMIN';
    authState.accountId = 'acc-panaderia';
    process.env.N8N_REPORT_PDF_WEBHOOK_URL = 'https://n8n.example.test/webhook/report-pdf';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secreto-pdf-test';
    buildWeeklyMarginReportMock.mockReset();
    buildWeeklyMarginReportMock.mockResolvedValue(SAMPLE_REPORT);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.N8N_REPORT_PDF_WEBHOOK_URL;
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requiere autenticación y rol ADMIN para JSON y PDF', async () => {
    authState.authenticated = false;
    const unauthenticatedApp = buildApp();
    expect((await request(unauthenticatedApp).get('/api/reports/weekly')).status).toBe(401);
    expect((await request(unauthenticatedApp).get('/api/reports/weekly.pdf')).status).toBe(401);

    authState.authenticated = true;
    authState.role = 'COLLABORATOR';
    const collaboratorApp = buildApp();
    const jsonResponse = await request(collaboratorApp).get('/api/reports/weekly');
    const pdfResponse = await request(collaboratorApp).get('/api/reports/weekly.pdf');
    expect(jsonResponse.status).toBe(403);
    expect(jsonResponse.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(pdfResponse.status).toBe(403);
    expect(buildWeeklyMarginReportMock).not.toHaveBeenCalled();
  });

  it('devuelve el reporte JSON de la cuenta del usuario autenticado', async () => {
    const response = await request(buildApp()).get('/api/reports/weekly');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(SAMPLE_REPORT);
    expect(buildWeeklyMarginReportMock).toHaveBeenCalledWith('acc-panaderia', {
      from: undefined,
      to: undefined,
    });
  });

  it('devuelve PDF con encabezados de descarga y timeout de 20 segundos', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%MargenX Panaderia Central\n%%EOF');
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(buildApp()).get('/api/reports/weekly.pdf');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="margenx-reporte-2026-11-17.pdf"'
    );
    expect(response.headers['cache-control']).toBe('private, no-store');
    // La app y la API están en orígenes distintos: sin esta cabecera el navegador oculta el nombre del archivo.
    expect(response.headers['access-control-expose-headers']).toBe('Content-Disposition');
    expect(Buffer.from(response.body).toString('utf8')).toContain('%PDF-1.4');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://n8n.example.test/webhook/report-pdf');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-margenx-webhook-secret': 'secreto-pdf-test',
      },
    });
    expect(JSON.parse(init.body as string)).toEqual(SAMPLE_REPORT);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledWith(20_000);
  });

  it('traduce fallos de red, respuestas de error y contenido vacío en 503 genérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'))
    );
    const timeoutResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(timeoutResponse.status).toBe(503);
    expect(timeoutResponse.body.error).toBe(
      'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.'
    );
    expect(JSON.stringify(timeoutResponse.body)).not.toMatch(
      /TimeoutError|n8n\.example|secreto|ENOTFOUND/i
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })
    );
    const serverErrorResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(serverErrorResponse.status).toBe(503);
    expect(serverErrorResponse.body.error).not.toMatch(/500|n8n|Internal Server Error/i);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
      })
    );
    expect((await request(buildApp()).get('/api/reports/weekly.pdf')).status).toBe(503);
  });

  it('rechaza con 503 genérico si n8n responde 200 con JSON, HTML o contenido sin firma PDF', async () => {
    const jsonPayload = Buffer.from('{"message":"Workflow was started"}');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () =>
          jsonPayload.buffer.slice(
            jsonPayload.byteOffset,
            jsonPayload.byteOffset + jsonPayload.byteLength
          ),
      })
    );
    const jsonResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(jsonResponse.status).toBe(503);
    expect(jsonResponse.body.error).toBe(
      'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.'
    );
    expect(JSON.stringify(jsonResponse.body)).not.toMatch(/Workflow|json|n8n/i);

    const htmlPayload = Buffer.from('<html>Error de proxy</html>');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () =>
          htmlPayload.buffer.slice(
            htmlPayload.byteOffset,
            htmlPayload.byteOffset + htmlPayload.byteLength
          ),
      })
    );
    const htmlResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(htmlResponse.status).toBe(503);
    expect(htmlResponse.body.error).toBe(
      'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.'
    );
  });

  it('falla en modo cerrado y no llama a n8n si falta URL o secreto', async () => {
    delete process.env.N8N_REPORT_PDF_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const noUrl = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(noUrl.status).toBe(503);
    expect(noUrl.body.error).not.toMatch(/N8N_REPORT_PDF_WEBHOOK_URL/);
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.N8N_REPORT_PDF_WEBHOOK_URL = 'https://n8n.example.test/webhook/report-pdf';
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    const noSecret = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(noSecret.status).toBe(503);
    expect(noSecret.body.error).not.toMatch(/INTERNAL_WEBHOOK_SECRET/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
</file>

<file path="backend/src/routes/reports.ts">
import { Router, type Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';
import { buildWeeklyMarginReport, formatArgentinaIsoDate } from '../services/reportService';
import { parseReportRangeQuery } from './internalReports';

const router = Router();

const PDF_WEBHOOK_TIMEOUT_MS = 20_000;
const PDF_SIGNATURE = '%PDF-';
const PDF_UNAVAILABLE_MSG =
  'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.';

router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

router.get('/weekly', async (req: AuthenticatedRequest, res: Response) => {
  const range = parseReportRangeQuery(req.query as Record<string, unknown>);
  const report = await buildWeeklyMarginReport(req.user!.accountId, range);
  return res.status(200).json(report);
});

router.get('/weekly.pdf', async (req: AuthenticatedRequest, res: Response) => {
  const webhookUrl = process.env.N8N_REPORT_PDF_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();

  if (!webhookUrl || !webhookSecret) {
    console.error(
      '[WeeklyReportPDF] Falta N8N_REPORT_PDF_WEBHOOK_URL o INTERNAL_WEBHOOK_SECRET: generación PDF deshabilitada.'
    );
    throw new AppError(PDF_UNAVAILABLE_MSG, 503);
  }

  const range = parseReportRangeQuery(req.query as Record<string, unknown>);
  const report = await buildWeeklyMarginReport(req.user!.accountId, range);

  let pdfBuffer: Buffer;
  let responseContentType = '';
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(PDF_WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[WeeklyReportPDF] n8n respondió HTTP ${response.status} al generar el PDF de la cuenta ${req.user!.accountId}.`
      );
      throw new AppError(PDF_UNAVAILABLE_MSG, 503);
    }

    responseContentType = response.headers?.get('content-type')?.toLowerCase() ?? '';
    pdfBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const reason = error instanceof Error ? error.name : 'desconocido';
    console.error(`[WeeklyReportPDF] Error al contactar a n8n (${reason}).`);
    throw new AppError(PDF_UNAVAILABLE_MSG, 503);
  }

  const hasUnexpectedContentType =
    responseContentType !== '' &&
    !responseContentType.includes('application/pdf') &&
    !responseContentType.includes('application/octet-stream');
  const hasPdfSignature =
    pdfBuffer.subarray(0, PDF_SIGNATURE.length).toString('ascii') === PDF_SIGNATURE;

  if (pdfBuffer.length === 0 || hasUnexpectedContentType || !hasPdfSignature) {
    console.error(
      `[WeeklyReportPDF] n8n devolvió una respuesta inválida (bytes=${pdfBuffer.length}, contentType="${responseContentType || 'ausente'}").`
    );
    throw new AppError(PDF_UNAVAILABLE_MSG, 503);
  }

  const dateTag = formatArgentinaIsoDate(new Date(report.generatedAt));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="margenx-reporte-${dateTag}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  // La app y la API se publican en orígenes distintos: sin exponerla, el navegador no deja leer el nombre.
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  return res.status(200).send(pdfBuffer);
});

export default router;
</file>

<file path="backend/src/routes/salesRoutes.test.ts">
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

/* Prisma simulado: la transacción interactiva recibe el mismo cliente. */
const db = vi.hoisted(() => {
  const client = {
    account: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    sale: {
      aggregate: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  client.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: typeof client) => unknown)(client) : Promise.all(arg as unknown[])
  );
  return client;
});
vi.mock('../lib/prisma', () => ({ prisma: db }));

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser | undefined;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, _res: unknown, next: () => void) => {
    req.user = currentUser;
    next();
  },
}));

import { salesRouter } from './salesModule';

const ACCOUNT = 'acc-panaderia-central';
const ADMIN: TestUser = { id: 'u-admin-panaderia', accountId: ACCOUNT, email: 'admin.panaderia@seed.example.test', role: 'ADMIN' };
const CAJERA: TestUser = { id: 'u-cajera-panaderia', accountId: ACCOUNT, email: 'cajera.panaderia@seed.example.test', role: 'COLLABORATOR' };
const MEDIALUNA_ID = '6f1d2c3b-0000-4000-8000-00000000a001';
const CAFE_ID = '6f1d2c3b-0000-4000-8000-00000000a002';
const SALE_ID = '9f1c2a3b-0000-4000-8000-000000000001';
const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001';

const productos = [
  { id: MEDIALUNA_ID, name: 'Medialuna de manteca', salePrice: D('900'), cost: D('301.35'), _count: { ingredients: 4 } },
  { id: CAFE_ID, name: 'Café con leche', salePrice: D('1500'), cost: D('412.5'), _count: { ingredients: 2 } },
];

function ventaGuardada(overrides: Record<string, unknown> = {}) {
  return {
    id: SALE_ID,
    accountId: ACCOUNT,
    cashShiftId: SHIFT_ID,
    soldById: CAJERA.id,
    ticketNumber: 8,
    soldAt: new Date('2026-11-24T12:30:00.000Z'),
    paymentMethod: 'CASH',
    total: D('3300'),
    status: 'COMPLETED',
    voidedAt: null,
    voidedById: null,
    voidReason: null,
    account: { businessName: 'Panadería Central' },
    items: [
      { id: 'i1', saleId: SALE_ID, productId: CAFE_ID, productName: 'Café con leche', quantity: 1, unitPrice: D('1500'), unitCost: D('412.5'), marginPercent: D('72.5'), lineTotal: D('1500'), lineCost: D('412.5') },
      { id: 'i2', saleId: SALE_ID, productId: MEDIALUNA_ID, productName: 'Medialuna de manteca', quantity: 2, unitPrice: D('900'), unitCost: D('301.35'), marginPercent: D('66.52'), lineTotal: D('1800'), lineCost: D('602.7') },
    ],
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales', salesRouter);
  app.use(errorHandler);
  return app;
}

const ventaDeMostrador = {
  paymentMethod: 'CASH',
  items: [
    { productId: MEDIALUNA_ID, quantity: 2 },
    { productId: CAFE_ID, quantity: 1 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = CAJERA;
  db.account.findUnique.mockImplementation(({ select }: { select: Record<string, unknown> }) =>
    Promise.resolve(
      select.businessName
        ? { businessName: 'Panadería Central' }
        : { subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] }
    )
  );
  // Fila del turno abierto, tomada con bloqueo compartido (FOR SHARE).
  db.$queryRaw.mockResolvedValue([{ id: SHIFT_ID, status: 'OPEN' }]);
  db.product.findMany.mockResolvedValue(productos);
  db.sale.aggregate.mockResolvedValue({ _max: { ticketNumber: 7 } });
  db.sale.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(ventaGuardada({ ...data, items: ventaGuardada().items }))
  );
});

describe('POST /api/sales (Escenario "Venta con ticket")', () => {
  it('el colaborador vende 2 medialunas y 1 café en efectivo: ticket correlativo y sin costos en la respuesta', async () => {
    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ticketNumber: 8, total: '3300.00', paymentMethod: 'CASH', businessName: 'Panadería Central' });
    expect(JSON.stringify(res.body)).not.toMatch(/unitCost|lineCost|marginPercent|totalCost/);

    const data = db.sale.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ accountId: ACCOUNT, cashShiftId: SHIFT_ID, soldById: CAJERA.id, ticketNumber: 8, paymentMethod: 'CASH' });
    expect(data.total.toFixed(2)).toBe('3300.00');
    // Costo y margen congelados en cada renglón (Escenario "Costo congelado").
    const medialunas = data.items.create.find((l: { productId: string }) => l.productId === MEDIALUNA_ID);
    expect(medialunas.unitCost.toFixed(2)).toBe('301.35');
    expect(medialunas.marginPercent.toFixed(2)).toBe('66.52');
  });

  it('busca productos y turno solo en la cuenta de la sesión, aunque el cliente mande otra', async () => {
    await request(buildApp()).post('/api/sales').send({ ...ventaDeMostrador, accountId: 'acc-quimica-gyj' });

    const [sql, ...values] = db.$queryRaw.mock.calls[0]!;
    expect((sql as string[]).join('?')).toMatch(/"status" = 'OPEN'[\s\S]*FOR SHARE/);
    expect(values).toEqual([ACCOUNT]);
    expect(db.product.findMany.mock.calls[0]![0].where.accountId).toBe(ACCOUNT);
    expect(db.sale.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: ACCOUNT } }));
  });

  it('la primera venta de la cuenta es el ticket 1', async () => {
    db.sale.aggregate.mockResolvedValue({ _max: { ticketNumber: null } });
    await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(db.sale.create.mock.calls[0]![0].data.ticketNumber).toBe(1);
  });

  it('si otra venta tomó el mismo número a la vez, reintenta con el siguiente', async () => {
    const choque = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['accountId', 'ticketNumber'] },
    });
    db.sale.create.mockRejectedValueOnce(choque);
    db.sale.aggregate.mockResolvedValueOnce({ _max: { ticketNumber: 7 } }).mockResolvedValueOnce({ _max: { ticketNumber: 8 } });

    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);

    expect(res.status).toBe(201);
    expect(db.sale.create).toHaveBeenCalledTimes(2);
    expect(db.sale.create.mock.calls[1]![0].data.ticketNumber).toBe(9);
  });

  it('Escenario "Sin turno abierto": responde 409 y no registra nada', async () => {
    db.$queryRaw.mockResolvedValue([]);

    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/turno de caja abierto/);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it('un producto de otra cuenta responde 404 y uno en borrador 422', async () => {
    db.product.findMany.mockResolvedValueOnce([productos[0]]);
    let res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(res.status).toBe(404);

    db.product.findMany.mockResolvedValueOnce([productos[0], { ...productos[1], _count: { ingredients: 0 } }]);
    res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(res.status).toBe(422);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it('valida el cuerpo antes de tocar la base: 400', async () => {
    const res = await request(buildApp()).post('/api/sales').send({ paymentMethod: 'CASH', items: [] });
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('exige sesión: 401', async () => {
    currentUser = undefined;
    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/sales', () => {
  beforeEach(() => {
    db.sale.count.mockResolvedValue(1);
    db.sale.findMany.mockResolvedValue([
      { id: SALE_ID, ticketNumber: 8, soldAt: new Date('2026-11-24T12:30:00.000Z'), paymentMethod: 'CASH', total: D('3300'), status: 'COMPLETED', cashShiftId: SHIFT_ID, _count: { items: 2 } },
    ]);
  });

  it('Escenario "Colaborador sin costos": recibe solo sus ventas, sin costos', async () => {
    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [{ id: SALE_ID, ticketNumber: 8, soldAt: '2026-11-24T12:30:00.000Z', paymentMethod: 'CASH', total: '3300.00', status: 'COMPLETED', cashShiftId: SHIFT_ID, itemsCount: 2 }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    expect(db.sale.findMany.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, soldById: CAJERA.id });
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('el ADMIN ve las de toda la cuenta, filtradas por día de Argentina y por turno', async () => {
    currentUser = ADMIN;
    const res = await request(buildApp()).get(`/api/sales?date=2026-11-24&cashShiftId=${SHIFT_ID}&page=2&limit=10`);

    expect(res.status).toBe(200);
    expect(db.sale.findMany.mock.calls[0]![0]).toMatchObject({
      where: {
        accountId: ACCOUNT,
        cashShiftId: SHIFT_ID,
        soldAt: { gte: new Date('2026-11-24T03:00:00.000Z'), lt: new Date('2026-11-25T03:00:00.000Z') },
      },
      skip: 10,
      take: 10,
      orderBy: { soldAt: 'desc' },
    });
  });

  it('una fecha inválida responde 400', async () => {
    const res = await request(buildApp()).get('/api/sales?date=24-11-2026');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/sales/:id', () => {
  it('al ADMIN le devuelve el detalle con costo y margen congelados', async () => {
    currentUser = ADMIN;
    db.sale.findFirst.mockResolvedValue(ventaGuardada());

    const res = await request(buildApp()).get(`/api/sales/${SALE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.totalCost).toBe('1015.20');
    expect(res.body.items[1]).toMatchObject({ productName: 'Medialuna de manteca', unitCost: '301.35', marginPercent: '66.52' });
    expect(db.sale.findFirst.mock.calls[0]![0].where).toEqual({ id: SALE_ID, accountId: ACCOUNT });
  });

  it('al colaborador le devuelve el ticket sin costos y solo si la venta es suya', async () => {
    db.sale.findFirst.mockResolvedValue(ventaGuardada());

    const res = await request(buildApp()).get(`/api/sales/${SALE_ID}`);

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/unitCost|lineCost|marginPercent|totalCost/);
    expect(res.body.items[1]).toEqual({ productId: MEDIALUNA_ID, productName: 'Medialuna de manteca', quantity: 2, unitPrice: '900.00', lineTotal: '1800.00' });
    expect(db.sale.findFirst.mock.calls[0]![0].where).toEqual({ id: SALE_ID, accountId: ACCOUNT, soldById: CAJERA.id });
  });

  it('una venta que no existe, de otra cuenta o con id inválido responde 404', async () => {
    db.sale.findFirst.mockResolvedValue(null);
    expect((await request(buildApp()).get(`/api/sales/${SALE_ID}`)).status).toBe(404);
    expect((await request(buildApp()).get('/api/sales/ticket-8')).status).toBe(404);
  });
});

describe('POST /api/sales/:id/void', () => {
  const motivo = { reason: 'Cobré dos veces la misma venta' };

  beforeEach(() => {
    db.sale.findFirst.mockResolvedValue({ id: SALE_ID, status: 'COMPLETED', soldById: CAJERA.id, cashShiftId: SHIFT_ID });
    db.sale.updateMany.mockResolvedValue({ count: 1 });
    db.sale.findFirstOrThrow.mockResolvedValue(
      ventaGuardada({ status: 'VOIDED', voidedAt: new Date('2026-11-24T13:00:00.000Z'), voidReason: motivo.reason })
    );
  });

  it('el colaborador anula su venta del turno abierto: queda VOIDED con el motivo, sin borrar nada', async () => {
    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'VOIDED', voidReason: motivo.reason });
    expect(db.sale.updateMany).toHaveBeenCalledWith({
      where: { id: SALE_ID, accountId: ACCOUNT, status: 'COMPLETED' },
      data: expect.objectContaining({ status: 'VOIDED', voidedById: CAJERA.id, voidReason: motivo.reason }),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/unitCost|marginPercent/);
  });

  it('el colaborador no anula la venta de otro (404) ni una de un turno cerrado (403)', async () => {
    db.sale.findFirst.mockResolvedValueOnce({ id: SALE_ID, status: 'COMPLETED', soldById: 'u-otro', cashShiftId: SHIFT_ID });
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo)).status).toBe(404);

    db.$queryRaw.mockResolvedValueOnce([{ status: 'CLOSED' }]);
    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);
    expect(res.status).toBe(403);
    expect(db.sale.updateMany).not.toHaveBeenCalled();
  });

  it('el ADMIN anula la venta de otro usuario del turno abierto, con el turno bloqueado mientras anula', async () => {
    currentUser = ADMIN;

    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);

    expect(res.status).toBe(200);
    expect(db.sale.findFirst.mock.calls[0]![0].where).toEqual({ id: SALE_ID, accountId: ACCOUNT });
    const [sql, ...values] = db.$queryRaw.mock.calls[0]!;
    expect((sql as string[]).join('?')).toMatch(/FOR SHARE/);
    expect(values).toEqual([SHIFT_ID, ACCOUNT]);
  });

  it('Escenario "Turno cerrado": tampoco el ADMIN anula una venta de un turno cerrado (403)', async () => {
    currentUser = ADMIN;
    db.$queryRaw.mockResolvedValueOnce([{ status: 'CLOSED' }]);

    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/turno abierto/);
    expect(db.sale.updateMany).not.toHaveBeenCalled();
  });

  it('una venta ya anulada responde 409, también si otro la anuló al mismo tiempo', async () => {
    db.sale.findFirst.mockResolvedValueOnce({ id: SALE_ID, status: 'VOIDED', soldById: CAJERA.id, cashShiftId: SHIFT_ID });
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo)).status).toBe(409);

    db.sale.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo)).status).toBe(409);
  });

  it('sin motivo responde 400, y con id inválido 404', async () => {
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send({})).status).toBe(400);
    expect((await request(buildApp()).post('/api/sales/ticket-8/void').send(motivo)).status).toBe(404);
  });
});
</file>

<file path="backend/src/services/purchasingService.test.ts">
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { applyBatchIngredientCostChanges } from './marginCalculator';
const ingredientFindManyMock = vi.fn();
const ingredientFindFirstMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    ingredient: {
      findMany: (...args: unknown[]) => ingredientFindManyMock(...args),
      findFirst: (...args: unknown[]) => ingredientFindFirstMock(...args),
    },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
  },
}));

import {
  getPurchasingSuggestions,
  previewPurchasingOrder,
  getPurchasingMarginImpact,
  getIngredientMarginImpact,
} from './purchasingService';
import { AppError } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

function makePresentation(overrides: {
  id: string;
  supplierId: string;
  supplierName: string;
  ingredientId?: string;
  ingredientName?: string;
  unit?: string;
  packageSize: string;
  packagePrice: string;
  pendingPackagePrice?: string | null;
  isDefault?: boolean;
  isQuarantined?: boolean;
  quarantineReason?: string | null;
  isActive?: boolean;
  supplierCode?: string | null;
}) {
  return {
    id: overrides.id,
    supplierId: overrides.supplierId,
    ingredientId: overrides.ingredientId ?? 'ing-harina',
    supplierCode: overrides.supplierCode ?? null,
    rawDescription: null,
    packageSize: D(overrides.packageSize),
    packageUnit: overrides.unit ?? 'kg',
    packagePrice: D(overrides.packagePrice),
    pendingPackagePrice: overrides.pendingPackagePrice ? D(overrides.pendingPackagePrice) : null,
    isDefault: overrides.isDefault ?? false,
    isQuarantined: overrides.isQuarantined ?? false,
    quarantinedAt: overrides.isQuarantined ? new Date('2026-11-15T10:00:00.000Z') : null,
    quarantineReason: overrides.quarantineReason ?? null,
    supplier: {
      id: overrides.supplierId,
      accountId: 'account-1',
      name: overrides.supplierName,
      contactPhone: null,
      email: null,
      address: null,
      isActive: overrides.isActive ?? true,
    },
    ingredient: {
      id: overrides.ingredientId ?? 'ing-harina',
      name: overrides.ingredientName ?? 'Harina 000',
      unit: overrides.unit ?? 'kg',
      currentCost: D('900.00'),
    },
  };
}

beforeEach(() => {
  ingredientFindManyMock.mockReset();
  ingredientFindFirstMock.mockReset();
  supplierIngredientFindManyMock.mockReset();
});

describe('purchasingService.getPurchasingSuggestions', () => {
  it('Gherkin "Ahorro por insumo": Harina $900/kg (Molino Cañuelas) vs $880/kg (Distribuidora del Centro) -> ahorro $20/kg (2,22 %)', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-molino',
            supplierId: 'sup-molino',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
            supplierCode: 'MC-990',
          }),
          makePresentation({
            id: 'si-centro',
            supplierId: 'sup-centro',
            supplierName: 'Distribuidora del Centro',
            packageSize: '25.000',
            packagePrice: '22000.00',
            isDefault: false,
            supplierCode: '5521',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(ingredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        select: expect.objectContaining({
          suppliers: expect.objectContaining({
            where: { supplier: { accountId: 'account-1' } },
          }),
        }),
      })
    );
    expect(result.summary).toEqual({
      withSavingsCount: 1,
      alreadyBestPriceCount: 0,
      singleSupplierCount: 0,
      withoutEligibleSupplierCount: 0,
      withoutActiveDefaultCount: 0,
      quarantinedExcludedCount: 0,
    });
    expect(result.byIngredient).toEqual([
      expect.objectContaining({
        ingredientId: 'ing-harina',
        ingredientName: 'Harina 000',
        unit: 'kg',
        currentCost: '900.00',
        savingsPerUnit: '20.00',
        savingsPercent: '2.22',
        packageSavings: '500.00',
        defaultPresentation: expect.objectContaining({
          supplierId: 'sup-molino',
          unitCost: '900.00',
        }),
        cheapestPresentation: expect.objectContaining({
          supplierIngredientId: 'si-centro',
          supplierId: 'sup-centro',
          supplierCode: '5521',
          unitCost: '880.00',
        }),
      }),
    ]);
    expect(result.bySupplier).toHaveLength(1);
    expect(result.bySupplier[0]).toMatchObject({
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      itemsCount: 1,
      totalPackageSavings: '500.00',
    });
  });

  it('Gherkin "Cuarentena y proveedores inactivos": excluye presentaciones en cuarentena o de proveedores inactivos y las informa aparte', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-molino',
            supplierId: 'sup-molino',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-quar',
            supplierId: 'sup-quar',
            supplierName: 'Proveedor Cuarentena',
            packageSize: '25.000',
            packagePrice: '10000.00',
            pendingPackagePrice: '5000.00',
            isQuarantined: true,
            quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
          }),
          makePresentation({
            id: 'si-inact',
            supplierId: 'sup-inact',
            supplierName: 'Proveedor Inactivo',
            packageSize: '25.000',
            packagePrice: '12500.00',
            isActive: false,
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient).toEqual([]);
    expect(result.bySupplier).toEqual([]);
    expect(result.summary).toEqual({
      withSavingsCount: 0,
      alreadyBestPriceCount: 0,
      singleSupplierCount: 1,
      withoutEligibleSupplierCount: 0,
      withoutActiveDefaultCount: 0,
      quarantinedExcludedCount: 1,
    });
    expect(result.quarantinedExcluded).toEqual([
      expect.objectContaining({
        supplierIngredientId: 'si-quar',
        supplierName: 'Proveedor Cuarentena',
        ingredientName: 'Harina 000',
        packagePrice: '10000.00',
        pendingPackagePrice: '5000.00',
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
      }),
    ]);
  });

  it('empate de precios con la predeterminada: clasifica como alreadyBestPrice sin sugerir cambio', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-azucar',
        name: 'Azúcar común',
        unit: 'kg',
        currentCost: D('1140.00'),
        suppliers: [
          makePresentation({
            id: 'si-alt',
            supplierId: 'sup-alt',
            supplierName: 'Alternativo',
            ingredientId: 'ing-azucar',
            ingredientName: 'Azúcar común',
            packageSize: '10.000',
            packagePrice: '11400.00',
            isDefault: false,
          }),
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Predeterminado',
            ingredientId: 'ing-azucar',
            ingredientName: 'Azúcar común',
            packageSize: '25.000',
            packagePrice: '28500.00',
            isDefault: true,
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient).toEqual([]);
    expect(result.summary.alreadyBestPriceCount).toBe(1);
    expect(result.alreadyBestPrice).toHaveLength(1);
    expect(result.alreadyBestPrice[0]).toMatchObject({
      ingredientId: 'ing-azucar',
      unitCost: '1140.00',
    });
  });

  it('empate entre dos no predeterminadas más baratas: desempata por menor precio del bulto y nombre', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-grande',
            supplierId: 'sup-grande',
            supplierName: 'Alpha Mayorista',
            packageSize: '50.000',
            packagePrice: '44000.00',
          }),
          makePresentation({
            id: 'si-chico',
            supplierId: 'sup-chico',
            supplierName: 'Beta Distribuidora',
            packageSize: '25.000',
            packagePrice: '22000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient[0]?.cheapestPresentation.supplierId).toBe('sup-chico');
  });

  it('empate en unitCost y packagePrice entre dos no predeterminadas: desempata alfabéticamente por proveedor', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('900.00'),
        suppliers: [
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Molino Cañuelas',
            packageSize: '50.000',
            packagePrice: '45000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-zeta',
            supplierId: 'sup-zeta',
            supplierName: 'Zeta Distribuidora',
            packageSize: '25.000',
            packagePrice: '22000.00',
          }),
          makePresentation({
            id: 'si-alfa',
            supplierId: 'sup-alfa',
            supplierName: 'Alfa Mayorista',
            packageSize: '25.000',
            packagePrice: '22000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient[0]?.cheapestPresentation.supplierId).toBe('sup-alfa');
  });

  it('redondeo ROUND_HALF_UP con decimales periódicos (10000 / 3 = 3333.33)', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-ricota',
        name: 'Ricota',
        unit: 'kg',
        currentCost: D('4000.00'),
        suppliers: [
          makePresentation({
            id: 'si-def',
            supplierId: 'sup-def',
            supplierName: 'Don Roque',
            ingredientId: 'ing-ricota',
            ingredientName: 'Ricota',
            packageSize: '5.000',
            packagePrice: '20000.00',
            isDefault: true,
          }),
          makePresentation({
            id: 'si-barato',
            supplierId: 'sup-barato',
            supplierName: 'Lácteos Sur',
            ingredientId: 'ing-ricota',
            ingredientName: 'Ricota',
            packageSize: '3.000',
            packagePrice: '10000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.byIngredient[0]).toMatchObject({
      savingsPerUnit: '666.67',
      savingsPercent: '16.67',
      packageSavings: '2000.00',
      cheapestPresentation: expect.objectContaining({ unitCost: '3333.33' }),
    });
  });

  it('clasifica insumos sin proveedores elegibles e insumos con >=2 elegibles sin default activo', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-sin-prov',
        name: 'Sal fina',
        unit: 'kg',
        currentCost: D('470.00'),
        suppliers: [],
      },
      {
        id: 'ing-sin-default',
        name: 'Levadura',
        unit: 'kg',
        currentCost: D('6000.00'),
        suppliers: [
          makePresentation({
            id: 'si-inactivo-def',
            supplierId: 'sup-inact',
            supplierName: 'Inactivo',
            ingredientId: 'ing-sin-default',
            ingredientName: 'Levadura',
            packageSize: '10.000',
            packagePrice: '60000.00',
            isDefault: true,
            isActive: false,
          }),
          makePresentation({
            id: 'si-a',
            supplierId: 'sup-a',
            supplierName: 'Prov A',
            ingredientId: 'ing-sin-default',
            ingredientName: 'Levadura',
            packageSize: '10.000',
            packagePrice: '55000.00',
          }),
          makePresentation({
            id: 'si-b',
            supplierId: 'sup-b',
            supplierName: 'Prov B',
            ingredientId: 'ing-sin-default',
            ingredientName: 'Levadura',
            packageSize: '10.000',
            packagePrice: '58000.00',
          }),
        ],
      },
    ]);

    const result = await getPurchasingSuggestions('account-1');

    expect(result.summary.withoutEligibleSupplierCount).toBe(1);
    expect(result.summary.withoutActiveDefaultCount).toBe(1);
    expect(result.byIngredient).toEqual([]);
  });
});

describe('purchasingService.previewPurchasingOrder', () => {
  it('Gherkin "Pedido sugerido": agrupa en dos proveedores con subtotales, total y ahorro con Decimal', async () => {
    const harinaCentro = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
      supplierCode: '5521',
    });
    const mantecaMarjuanc = makePresentation({
      id: 'si-manteca-marjuanc',
      supplierId: 'sup-marjuanc',
      supplierName: 'Distribuidora MarJuanC Alimentos',
      ingredientId: 'ing-manteca',
      ingredientName: 'Manteca en bloque',
      packageSize: '5.000',
      packagePrice: '50254.70',
      isDefault: true,
      supplierCode: 'CRE101',
    });

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaCentro, mantecaMarjuanc])
      .mockResolvedValueOnce([
        {
          id: 'si-harina-default',
          ingredientId: 'ing-harina',
          packageSize: D('50.000'),
          packagePrice: D('45000.00'),
        },
        {
          id: 'si-manteca-marjuanc',
          ingredientId: 'ing-manteca',
          packageSize: D('5.000'),
          packagePrice: D('50254.70'),
        },
      ]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
      { supplierIngredientId: 'si-manteca-marjuanc', packages: 1 },
    ]);

    expect(result.itemsCount).toBe(2);
    expect(result.totalPackages).toBe(3);
    expect(result.total).toBe('94254.70');
    expect(result.totalSavings).toBe('1000.00');
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toMatchObject({
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      subtotal: '44000.00',
      savings: '1000.00',
    });
    expect(result.groups[1]).toMatchObject({
      supplierId: 'sup-marjuanc',
      supplierName: 'Distribuidora MarJuanC Alimentos',
      subtotal: '50254.70',
      savings: '0.00',
    });
    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: { in: ['si-harina-centro', 'si-manteca-marjuanc'] },
          supplier: { accountId: 'account-1' },
          ingredient: { accountId: 'account-1' },
        },
      })
    );
    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          ingredientId: { in: ['ing-harina', 'ing-manteca'] },
          isDefault: true,
          isQuarantined: false,
          supplier: { accountId: 'account-1', isActive: true },
        },
      })
    );
  });

  it('rechaza con 404 si alguna presentación no existe o pertenece a otra cuenta y filtra por accountId', async () => {
    supplierIngredientFindManyMock.mockImplementationOnce(
      async ({
        where,
      }: {
        where?: {
          id?: { in?: string[] };
          supplier?: { accountId?: string };
          ingredient?: { accountId?: string };
        };
      }) => {
        const foreignRow = makePresentation({
          id: 'si-ajeno',
          supplierId: 'sup-ajeno',
          supplierName: 'Proveedor Cuenta B',
          packageSize: '25.000',
          packagePrice: '20000.00',
        });
        const matchesId = !where?.id?.in || where.id.in.includes(foreignRow.id);
        const matchesSupplierAccount =
          !where?.supplier?.accountId || where.supplier.accountId === 'account-2';
        const matchesIngredientAccount =
          !where?.ingredient?.accountId || where.ingredient.accountId === 'account-2';

        return matchesId && matchesSupplierAccount && matchesIngredientAccount ? [foreignRow] : [];
      }
    );

    await expect(
      previewPurchasingOrder('account-1', [{ supplierIngredientId: 'si-ajeno', packages: 1 }])
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where:
          {
            id: { in: ['si-ajeno'] },
            supplier: { accountId: 'account-1' },
            ingredient: { accountId: 'account-1' },
          },
      })
    );
  });

  it('rechaza con 400 si se repite el mismo supplierIngredientId', async () => {
    await expect(
      previewPurchasingOrder('account-1', [
        { supplierIngredientId: 'si-1', packages: 1 },
        { supplierIngredientId: 'si-1', packages: 2 },
      ])
    ).rejects.toBeInstanceOf(AppError);
    expect(supplierIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('rechaza con 422 si el proveedor está inactivo o la presentación está en cuarentena', async () => {
    supplierIngredientFindManyMock.mockResolvedValueOnce([
      makePresentation({
        id: 'si-inact',
        supplierId: 'sup-inact',
        supplierName: 'Inactivo',
        packageSize: '10.000',
        packagePrice: '1000.00',
        isActive: false,
      }),
    ]);

    await expect(
      previewPurchasingOrder('account-1', [{ supplierIngredientId: 'si-inact', packages: 1 }])
    ).rejects.toMatchObject({ statusCode: 422 });

    supplierIngredientFindManyMock.mockResolvedValueOnce([
      makePresentation({
        id: 'si-quar',
        supplierId: 'sup-quar',
        supplierName: 'Cuarentena',
        packageSize: '10.000',
        packagePrice: '1000.00',
        isQuarantined: true,
      }),
    ]);

    await expect(
      previewPurchasingOrder('account-1', [{ supplierIngredientId: 'si-quar', packages: 1 }])
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('si no hay presentación predeterminada activa para un insumo, calcula ahorro 0.00 sin fallar', async () => {
    supplierIngredientFindManyMock
      .mockResolvedValueOnce([
        makePresentation({
          id: 'si-1',
          supplierId: 'sup-1',
          supplierName: 'Prov 1',
          packageSize: '10.000',
          packagePrice: '10000.00',
          isDefault: false,
        }),
      ])
      .mockResolvedValueOnce([]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-1', packages: 2 },
    ]);

    expect(result.total).toBe('20000.00');
    expect(result.totalSavings).toBe('0.00');
    expect(result.groups[0]?.items[0]?.defaultUnitCost).toBeNull();
  });

  it('si la presentación predeterminada está en cuarentena, informa defaultUnitCost: null y savings: "0.00"', async () => {
    const harinaAlternativa = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
    });
    const defaultEnCuarentena = {
      id: 'si-harina-def',
      ingredientId: 'ing-harina',
      packageSize: D('50.000'),
      packagePrice: D('45000.00'),
      isDefault: true,
      isQuarantined: true,
      supplier: { accountId: 'account-1', isActive: true },
    };

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaAlternativa])
      .mockImplementationOnce(
        async ({
          where,
        }: {
          where?: {
            isQuarantined?: boolean;
            supplier?: { accountId?: string; isActive?: boolean };
          };
        }) => {
          const matchesQuarantine =
            where?.isQuarantined === undefined ||
            where.isQuarantined === defaultEnCuarentena.isQuarantined;
          const matchesActive =
            where?.supplier?.isActive === undefined ||
            where.supplier.isActive === defaultEnCuarentena.supplier.isActive;
          return matchesQuarantine && matchesActive ? [defaultEnCuarentena] : [];
        }
      );

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
    ]);

    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          ingredientId: { in: ['ing-harina'] },
          isDefault: true,
          isQuarantined: false,
          supplier: { accountId: 'account-1', isActive: true },
        },
      })
    );
    expect(result.total).toBe('44000.00');
    expect(result.totalSavings).toBe('0.00');
    expect(result.groups[0]?.savings).toBe('0.00');
    expect(result.groups[0]?.items[0]).toMatchObject({
      defaultUnitCost: null,
      savings: '0.00',
    });
  });

  it('si la presentación predeterminada pertenece a un proveedor inactivo, informa defaultUnitCost: null y savings: "0.00"', async () => {
    const harinaAlternativa = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
    });
    const defaultProveedorInactivo = {
      id: 'si-harina-def',
      ingredientId: 'ing-harina',
      packageSize: D('50.000'),
      packagePrice: D('45000.00'),
      isDefault: true,
      isQuarantined: false,
      supplier: { accountId: 'account-1', isActive: false },
    };

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaAlternativa])
      .mockImplementationOnce(
        async ({
          where,
        }: {
          where?: {
            isQuarantined?: boolean;
            supplier?: { accountId?: string; isActive?: boolean };
          };
        }) => {
          const matchesQuarantine =
            where?.isQuarantined === undefined ||
            where.isQuarantined === defaultProveedorInactivo.isQuarantined;
          const matchesActive =
            where?.supplier?.isActive === undefined ||
            where.supplier.isActive === defaultProveedorInactivo.supplier.isActive;
          return matchesQuarantine && matchesActive ? [defaultProveedorInactivo] : [];
        }
      );

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
    ]);

    expect(supplierIngredientFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          ingredientId: { in: ['ing-harina'] },
          isDefault: true,
          isQuarantined: false,
          supplier: { accountId: 'account-1', isActive: true },
        },
      })
    );
    expect(result.total).toBe('44000.00');
    expect(result.totalSavings).toBe('0.00');
    expect(result.groups[0]?.savings).toBe('0.00');
    expect(result.groups[0]?.items[0]).toMatchObject({
      defaultUnitCost: null,
      savings: '0.00',
    });
  });

  it('agrupa múltiples ítems del mismo proveedor sumando subtotal, ahorro y bultos en un único grupo', async () => {
    const harinaCentro = makePresentation({
      id: 'si-harina-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '25.000',
      packagePrice: '22000.00',
      supplierCode: '5521',
    });
    const azucarCentro = makePresentation({
      id: 'si-azucar-centro',
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      ingredientId: 'ing-azucar',
      ingredientName: 'Azúcar común',
      packageSize: '10.000',
      packagePrice: '11000.00',
      supplierCode: 'AZ-10',
    });

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaCentro, azucarCentro])
      .mockResolvedValueOnce([
        {
          id: 'si-harina-def',
          ingredientId: 'ing-harina',
          packageSize: D('50.000'),
          packagePrice: D('45000.00'),
        },
        {
          id: 'si-azucar-def',
          ingredientId: 'ing-azucar',
          packageSize: D('10.000'),
          packagePrice: D('11400.00'),
        },
      ]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-centro', packages: 2 },
      { supplierIngredientId: 'si-azucar-centro', packages: 3 },
    ]);

    expect(result.itemsCount).toBe(2);
    expect(result.totalPackages).toBe(5);
    expect(result.total).toBe('77000.00');
    expect(result.totalSavings).toBe('2200.00');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      supplierId: 'sup-centro',
      subtotal: '77000.00',
      savings: '2200.00',
    });
    expect(result.groups[0]?.items.map((item) => item.ingredientName)).toEqual([
      'Azúcar común',
      'Harina 000',
    ]);
  });

  it('informa ahorro negativo (sobrecosto) cuando se elige una presentación más cara que la predeterminada', async () => {
    const harinaCara = makePresentation({
      id: 'si-harina-cara',
      supplierId: 'sup-makro',
      supplierName: 'Mayorista Makro',
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      packageSize: '10.000',
      packagePrice: '9500.00',
    });

    supplierIngredientFindManyMock
      .mockResolvedValueOnce([harinaCara])
      .mockResolvedValueOnce([
        {
          id: 'si-harina-def',
          ingredientId: 'ing-harina',
          packageSize: D('50.000'),
          packagePrice: D('45000.00'),
        },
      ]);

    const result = await previewPurchasingOrder('account-1', [
      { supplierIngredientId: 'si-harina-cara', packages: 2 },
    ]);

    expect(result.total).toBe('19000.00');
    expect(result.totalSavings).toBe('-1000.00');
    expect(result.groups[0]).toMatchObject({
      subtotal: '19000.00',
      savings: '-1000.00',
    });
    expect(result.groups[0]?.items[0]?.savings).toBe('-1000.00');
  });
});

describe('purchasingService.getPurchasingMarginImpact & getIngredientMarginImpact', () => {
  it('calcula dos productos con margen actual y proyectado exacto', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: D('900.00'),
      suppliers: [
        { id: 'si-molino', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-molino', name: 'Molino Cañuelas', isActive: true } },
        { id: 'si-centro', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-medialunas', name: 'Medialunas x 12', salePrice: D('6000.00'), minMarginPercent: D('35.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('2.000'), ingredient: { id: 'ing-harina', currentCost: D('900.00') } },
          { ingredientId: 'ing-manteca', quantity: D('0.250'), ingredient: { id: 'ing-manteca', currentCost: D('8600.00') } },
        ] } },
        { product: { id: 'prod-pan', name: 'Pan flauta', salePrice: D('4000.00'), minMarginPercent: D('50.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('900.00') } },
          { ingredientId: 'ing-sal', quantity: D('0.010'), ingredient: { id: 'ing-sal', currentCost: D('110000.00') } },
        ] } },
      ],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.summary).toEqual({ ingredientsWithAlternative: 1, productsAffected: 2, productsLeavingRiskOrLoss: 0 });
    const item = res.byIngredient[0]!;
    expect(item.currentCost).toBe('900.00');
    expect(item.unitCostDifference).toBe('20.00');
    expect(item.alternativePresentation.unitCost).toBe('880.00');

    const medialunas = item.products.find((p) => p.productId === 'prod-medialunas')!;
    expect(medialunas.currentRecipeCost).toBe('3950.00');
    expect(medialunas.projectedRecipeCost).toBe('3910.00');
    expect(medialunas.currentMarginPercent).toBe('34.17');
    expect(medialunas.projectedMarginPercent).toBe('34.83');
    expect(medialunas.currentBucket).toBe('risk');

    const pan = item.products.find((p) => p.productId === 'prod-pan')!;
    expect(pan.currentRecipeCost).toBe('2000.00');
    expect(pan.projectedRecipeCost).toBe('1980.00');
  });

  it('usa el costo manual vigente y proyecta una sola alternativa', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: D('950.00'),
      suppliers: [
        { id: 'si-molino', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-molino', name: 'Molino Cañuelas', isActive: true } },
        { id: 'si-centro', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', isActive: true } },
      ],
      products: [{ product: { id: 'prod-pan', name: 'Pan flauta', salePrice: D('4000.00'), minMarginPercent: D('50.00'), ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('950.00') } },
      ] } }],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    const item = res.byIngredient[0]!;
    expect(item.unitCostDifference).toBe('70.00');
    expect(item.products[0]!.currentRecipeCost).toBe('950.00');
    expect(item.products[0]!.projectedRecipeCost).toBe('880.00');
  });

  it('proyecta productos compartidos de forma aislada y cuenta una sola vez en summary', async () => {
    const makeIngredient = (id: string, name: string, currentCost: string, def: string, alt: string, defPrice: string, altPrice: string) => ({
      id, name, unit: 'kg', currentCost: D(currentCost),
      suppliers: [
        { id: def, packageSize: D(id === 'ing-manteca' ? '5.000' : '10.000'), packagePrice: D(defPrice), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        { id: alt, packageSize: D(id === 'ing-manteca' ? '5.000' : '10.000'), packagePrice: D(altPrice), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Prov 2', isActive: true } },
      ],
      products: [{ product: { id: 'prod-torta', name: 'Torta Especial', salePrice: D('10000.00'), minMarginPercent: D('40.00'), ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('1000.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { id: 'ing-manteca', currentCost: D('8000.00') } },
      ] } }],
    });

    ingredientFindManyMock.mockResolvedValue([
      makeIngredient('ing-harina', 'Harina', '1000.00', 'si-h-def', 'si-h-alt', '10000.00', '8000.00'),
      makeIngredient('ing-manteca', 'Manteca', '8000.00', 'si-m-def', 'si-m-alt', '40000.00', '30000.00'),
    ]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.summary.productsAffected).toBe(1);
    expect(res.byIngredient.find((i) => i.ingredientId === 'ing-harina')!.products[0]!.projectedRecipeCost).toBe('4800.00');
    expect(res.byIngredient.find((i) => i.ingredientId === 'ing-manteca')!.products[0]!.projectedRecipeCost).toBe('4000.00');
  });

  it('Gherkin "Producto que sale de En riesgo": detecta risk->target y loss->surplus y cuenta productos distintos', async () => {
    const sharedProduct = {
      id: 'prod-rescatado',
      name: 'Medialunas especiales',
      salePrice: D('10000.00'),
      minMarginPercent: D('35.00'),
      ingredients: [
        { ingredientId: 'ing-harina', quantity: D('2.000'), ingredient: { id: 'ing-harina', currentCost: D('1000.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { id: 'ing-manteca', currentCost: D('9400.00') } },
      ],
    };
    const lossProduct = {
      id: 'prod-perdida',
      name: 'Tarta de cacao',
      salePrice: D('1000.00'),
      minMarginPercent: D('30.00'),
      ingredients: [
        { ingredientId: 'ing-cacao', quantity: D('1.000'), ingredient: { id: 'ing-cacao', currentCost: D('1100.00') } },
      ],
    };

    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-harina',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-h-def', packageSize: D('10.000'), packagePrice: D('10000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Molino A', isActive: true } },
          { id: 'si-h-alt', packageSize: D('10.000'), packagePrice: D('8500.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Molino B', isActive: true } },
        ],
        products: [{ product: sharedProduct }],
      },
      {
        id: 'ing-manteca',
        name: 'Manteca',
        unit: 'kg',
        currentCost: D('9400.00'),
        suppliers: [
          { id: 'si-m-def', packageSize: D('5.000'), packagePrice: D('47000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Lácteos A', isActive: true } },
          { id: 'si-m-alt', packageSize: D('5.000'), packagePrice: D('43000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-3', name: 'Lácteos B', isActive: true } },
        ],
        products: [{ product: sharedProduct }],
      },
      {
        id: 'ing-cacao',
        name: 'Cacao',
        unit: 'kg',
        currentCost: D('1100.00'),
        suppliers: [
          { id: 'si-c-alt', packageSize: D('1.000'), packagePrice: D('350.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-4', name: 'Cacao Sur', isActive: true } },
        ],
        products: [{ product: lossProduct }],
      },
    ]);

    const res = await getPurchasingMarginImpact('account-1');

    expect(res.summary).toEqual({
      ingredientsWithAlternative: 3,
      productsAffected: 2,
      productsLeavingRiskOrLoss: 2,
    });

    const harina = res.byIngredient.find((i) => i.ingredientId === 'ing-harina')!;
    expect(harina.productsLeavingRiskOrLossCount).toBe(1);
    expect(harina.products[0]).toMatchObject({
      productId: 'prod-rescatado',
      currentMarginPercent: '33.00',
      projectedMarginPercent: '36.00',
      currentBucket: 'risk',
      projectedBucket: 'target',
    });

    const cacao = res.byIngredient.find((i) => i.ingredientId === 'ing-cacao')!;
    expect(cacao.defaultPresentation).toBeNull();
    expect(cacao.products[0]).toMatchObject({
      productId: 'prod-perdida',
      currentMarginPercent: '-10.00',
      projectedMarginPercent: '65.00',
      currentBucket: 'loss',
      projectedBucket: 'surplus',
    });
  });

  it('ordena byIngredient (salen de riesgo/pérdida -> mayor suba de margen -> diferencia -> nombre) y desempata alternativas', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-b', name: 'Bicarbonato', unit: 'kg', currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-b-alt', packageSize: D('10.000'), packagePrice: D('9000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        ],
        products: [{ product: { id: 'p-b', name: 'Prod B', salePrice: D('2000.00'), minMarginPercent: D('20.00'), ingredients: [
          { ingredientId: 'ing-b', quantity: D('1.000'), ingredient: { id: 'ing-b', currentCost: D('1000.00') } },
        ] } }], // +5.00% margen, diff 100.00, no sale de risk/loss
      },
      {
        id: 'ing-c', name: 'Canela', unit: 'kg', currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-c-grande', packageSize: D('10.000'), packagePrice: D('8000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-alfa', name: 'Alfa', isActive: true } },
          { id: 'si-c-chico-z', packageSize: D('5.000'), packagePrice: D('4000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-z', name: 'Zeta', isActive: true } },
          { id: 'si-c-chico-a', packageSize: D('5.000'), packagePrice: D('4000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-a', name: 'Beta', isActive: true } },
        ],
        products: [{ product: { id: 'p-c', name: 'Prod C', salePrice: D('4000.00'), minMarginPercent: D('20.00'), ingredients: [
          { ingredientId: 'ing-c', quantity: D('1.000'), ingredient: { id: 'ing-c', currentCost: D('1000.00') } },
        ] } }], // +5.00% margen, diff 200.00 (> Bicarbonato)
      },
      {
        id: 'ing-a', name: 'Anís', unit: 'kg', currentCost: D('1000.00'),
        suppliers: [
          { id: 'si-a-alt', packageSize: D('10.000'), packagePrice: D('9600.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        ],
        products: [{ product: { id: 'p-a', name: 'Prod A', salePrice: D('2000.00'), minMarginPercent: D('51.00'), ingredients: [
          { ingredientId: 'ing-a', quantity: D('1.000'), ingredient: { id: 'ing-a', currentCost: D('1000.00') } },
        ] } }], // 50% -> 52% (+2.00% pero sale de risk -> target)
      },
    ]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.byIngredient.map((i) => i.ingredientId)).toEqual(['ing-a', 'ing-c', 'ing-b']);
    expect(res.byIngredient[1]!.alternativePresentation.supplierIngredientId).toBe('si-c-chico-a');
  });

  it('excluye cuarentena y proveedores inactivos incluso cuando no hay alternativas válidas', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'),
      suppliers: [
        { id: 'si-quar', packageSize: D('1.000'), packagePrice: D('500.00'), isDefault: false, isQuarantined: true, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
        { id: 'si-inact', packageSize: D('1.000'), packagePrice: D('500.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Prov 2', isActive: false } },
      ],
      products: [],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.byIngredient).toHaveLength(0);
  });

  it('excluye borradores reales cuando el insumo sí tiene una alternativa válida más barata', async () => {
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'),
      suppliers: [
        { id: 'si-alt', packageSize: D('1.000'), packagePrice: D('800.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-draft', name: 'Borrador', salePrice: D('0.00'), minMarginPercent: D('30.00'), ingredients: [] } },
        { product: { id: 'prod-real', name: 'Pan', salePrice: D('2000.00'), minMarginPercent: D('30.00'), ingredients: [
          { ingredientId: 'ing-1', quantity: D('1.000'), ingredient: { id: 'ing-1', currentCost: D('1000.00') } },
        ] } },
      ],
    }]);

    const res = await getPurchasingMarginImpact('account-1');
    expect(res.summary.productsAffected).toBe(1);
    expect(res.byIngredient[0]!.products.map((p) => p.productId)).toEqual(['prod-real']);
  });

  it('mantiene paridad exacta de redondeo por renglón contra el recálculo real en cascada', async () => {
    // 10.04 * 0.125 = 1.255 -> redondea a 1.26 por renglón (2 renglones = 2.52, no 2.51).
    const altUnitCost = D('10.04');
    ingredientFindManyMock.mockResolvedValue([{
      id: 'ing-1', name: 'Esencia', unit: 'l', currentCost: D('20.00'),
      suppliers: [
        { id: 'si-alt', packageSize: D('1.000'), packagePrice: D('10.04'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov 1', isActive: true } },
      ],
      products: [{ product: { id: 'prod-1', name: 'Budín', salePrice: D('10.00'), minMarginPercent: D('30.00'), ingredients: [
        { ingredientId: 'ing-1', quantity: D('0.125'), ingredient: { id: 'ing-1', currentCost: D('20.00') } },
        { ingredientId: 'ing-2', quantity: D('0.125'), ingredient: { id: 'ing-2', currentCost: D('10.04') } },
      ] } }],
    }]);

    const impactRes = await getPurchasingMarginImpact('account-1');
    const projected = impactRes.byIngredient[0]!.products[0]!;

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([{ productId: 'prod-1' }]) },
      product: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'prod-1', name: 'Budín', salePrice: D('10.00'), minMarginPercent: D('30.00'), cost: D('3.76'), marginPercent: D('62.40'),
          ingredients: [
            { ingredientId: 'ing-1', quantity: D('0.125'), ingredient: { id: 'ing-1', currentCost: D('20.00') } },
            { ingredientId: 'ing-2', quantity: D('0.125'), ingredient: { id: 'ing-2', currentCost: D('10.04') } },
          ],
        }]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const batchRes = await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('20.00'), newCost: altUnitCost },
    ]);

    expect(projected.projectedRecipeCost).toBe('2.52');
    expect(projected.projectedRecipeCost).toBe(batchRes.affectedProducts[0]!.newCost.toFixed(2));
    expect(projected.projectedMarginPercent).toBe(batchRes.affectedProducts[0]!.currentMarginPercent.toFixed(2));
  });

  it('getIngredientMarginImpact: devuelve 404 para insumo/presentación inexistente y 422 para cuarentena, proveedor inactivo o predeterminada', async () => {
    ingredientFindFirstMock.mockResolvedValueOnce(null);
    await expect(getIngredientMarginImpact('account-1', 'ing-x', 'si-x')).rejects.toMatchObject({ statusCode: 404 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-x')).rejects.toMatchObject({ statusCode: 404 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [{ id: 'si-def', packageSize: D('1.000'), packagePrice: D('1000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Prov', isActive: true } }], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-def')).rejects.toMatchObject({ statusCode: 422 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [{ id: 'si-quar', packageSize: D('1.000'), packagePrice: D('800.00'), isDefault: false, isQuarantined: true, supplier: { id: 'sup-1', name: 'Prov', isActive: true } }], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-quar')).rejects.toMatchObject({ statusCode: 422 });

    ingredientFindFirstMock.mockResolvedValueOnce({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: D('1000.00'), suppliers: [{ id: 'si-inact', packageSize: D('1.000'), packagePrice: D('800.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Prov Inactivo', isActive: false } }], products: [] });
    await expect(getIngredientMarginImpact('account-1', 'ing-1', 'si-inact')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('getIngredientMarginImpact: calcula el impacto puntual, excluye borradores y ordena por suba de margen', async () => {
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-harina',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: D('950.00'),
      suppliers: [
        { id: 'si-def', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-1', name: 'Molino Cañuelas', isActive: true } },
        { id: 'si-alt', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Distribuidora del Centro', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-draft', name: 'Borrador', salePrice: D('0.00'), minMarginPercent: D('30.00'), ingredients: [] } },
        { product: { id: 'prod-pan', name: 'Pan flauta', salePrice: D('4000.00'), minMarginPercent: D('50.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('950.00') } },
        ] } },
        { product: { id: 'prod-medialunas', name: 'Medialunas', salePrice: D('2000.00'), minMarginPercent: D('55.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('950.00') } },
        ] } },
      ],
    });

    const res = await getIngredientMarginImpact('account-1', 'ing-harina', 'si-alt');

    expect(res).toMatchObject({
      ingredientId: 'ing-harina',
      currentCost: '950.00',
      unitCostDifference: '70.00',
      defaultPresentation: { supplierIngredientId: 'si-def', supplierName: 'Molino Cañuelas', unitCost: '900.00' },
      alternativePresentation: { supplierIngredientId: 'si-alt', supplierName: 'Distribuidora del Centro', unitCost: '880.00' },
      productsAffectedCount: 2,
      productsLeavingRiskOrLossCount: 1,
    });
    expect(res.products.map((p) => p.productId)).toEqual(['prod-medialunas', 'prod-pan']);
    expect(res.products[0]).toMatchObject({
      currentRecipeCost: '950.00',
      projectedRecipeCost: '880.00',
      currentMarginPercent: '52.50',
      projectedMarginPercent: '56.00',
      currentBucket: 'risk',
      projectedBucket: 'target',
    });
  });

  it('getIngredientMarginImpact: si la predeterminada está en cuarentena devuelve defaultPresentation null y admite alternativa más cara', async () => {
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-harina',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: D('800.00'),
      suppliers: [
        { id: 'si-def-quar', packageSize: D('10.000'), packagePrice: D('8000.00'), isDefault: true, isQuarantined: true, supplier: { id: 'sup-1', name: 'Molino', isActive: true } },
        { id: 'si-cara', packageSize: D('10.000'), packagePrice: D('9000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-2', name: 'Alternativo', isActive: true } },
      ],
      products: [
        { product: { id: 'prod-pan', name: 'Pan', salePrice: D('2000.00'), minMarginPercent: D('30.00'), ingredients: [
          { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('800.00') } },
        ] } },
      ],
    });

    const res = await getIngredientMarginImpact('account-1', 'ing-harina', 'si-cara');

    expect(res.defaultPresentation).toBeNull();
    expect(res.unitCostDifference).toBe('-100.00');
    expect(res.productsLeavingRiskOrLossCount).toBe(0);
    expect(res.products[0]).toMatchObject({
      currentMarginPercent: '60.00',
      projectedMarginPercent: '55.00',
      currentBucket: 'target',
      projectedBucket: 'target',
    });
  });
});

describe('margin-impact: aislamiento por cuenta y margen en $ ([RV476-I1], [RV476-I2])', () => {
  type ConsultaImpacto = {
    where: unknown;
    select: { suppliers: { where: { supplier: unknown } }; products: { where: { product: unknown } } };
  };

  const harinaConAlternativa = {
    id: 'ing-harina', name: 'Harina 000', unit: 'kg', currentCost: D('900.00'),
    suppliers: [
      { id: 'si-molino', packageSize: D('50.000'), packagePrice: D('45000.00'), isDefault: true, isQuarantined: false, supplier: { id: 'sup-molino', name: 'Molino Cañuelas', isActive: true } },
      { id: 'si-centro', packageSize: D('25.000'), packagePrice: D('22000.00'), isDefault: false, isQuarantined: false, supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', isActive: true } },
    ],
    products: [
      { product: { id: 'prod-medialunas', name: 'Medialunas x 12', salePrice: D('6000.00'), minMarginPercent: D('35.00'), ingredients: [
        { ingredientId: 'ing-harina', quantity: D('2.000'), ingredient: { id: 'ing-harina', currentCost: D('900.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.250'), ingredient: { id: 'ing-manteca', currentCost: D('8600.00') } },
      ] } },
    ],
  };

  it('el resumen solo consulta insumos, presentaciones y productos de la cuenta del token', async () => {
    ingredientFindManyMock.mockResolvedValue([]);

    await getPurchasingMarginImpact('account-quimica');

    const consulta = ingredientFindManyMock.mock.calls.at(-1)?.[0] as ConsultaImpacto;
    expect(consulta.where).toEqual({ accountId: 'account-quimica' });
    expect(consulta.select.suppliers.where.supplier).toMatchObject({ accountId: 'account-quimica' });
    expect(consulta.select.products.where.product).toMatchObject({ accountId: 'account-quimica' });
  });

  it('el detalle busca el insumo, la presentación y los productos solo en la cuenta del token: el de otra cuenta da 404', async () => {
    ingredientFindFirstMock.mockResolvedValue(null);

    await expect(getIngredientMarginImpact('account-quimica', 'ing-harina', 'si-centro')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Insumo no encontrado.',
    });

    const consulta = ingredientFindFirstMock.mock.calls.at(-1)?.[0] as ConsultaImpacto;
    expect(consulta.where).toEqual({ id: 'ing-harina', accountId: 'account-quimica' });
    expect(consulta.select.suppliers.where.supplier).toMatchObject({ accountId: 'account-quimica' });
    expect(consulta.select.products.where.product).toMatchObject({ accountId: 'account-quimica' });
  });

  it('informa el margen en $ por unidad vendida, actual y con la alternativa, en el resumen y en el detalle', async () => {
    ingredientFindManyMock.mockResolvedValue([harinaConAlternativa]);
    ingredientFindFirstMock.mockResolvedValue(harinaConAlternativa);

    const resumen = await getPurchasingMarginImpact('account-1');
    const detalle = await getIngredientMarginImpact('account-1', 'ing-harina', 'si-centro');

    // 6000 − 3950 = 2050 hoy; 6000 − 3910 = 2090 con la harina a $880/kg.
    for (const medialunas of [resumen.byIngredient[0]!.products[0]!, detalle.products[0]!]) {
      expect(medialunas).toMatchObject({ currentMarginAmount: '2050.00', projectedMarginAmount: '2090.00' });
    }
  });
});
</file>

<file path="backend/src/services/purchasingService.ts">
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  classifyProductHealthBucket,
  HealthBucket,
  calculateUnitCost,
} from './marginCalculator';

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

export interface PurchasingPresentationSummary {
  supplierIngredientId: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string | null;
  rawDescription: string | null;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  unitCost: string;
}

export interface IngredientPurchasingSuggestion {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentCost: string;
  defaultPresentation: PurchasingPresentationSummary;
  cheapestPresentation: PurchasingPresentationSummary;
  savingsPerUnit: string;
  savingsPercent: string;
  packageSavings: string;
}

export interface SupplierSuggestionItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierIngredientId: string;
  supplierCode: string | null;
  rawDescription: string | null;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  unitCost: string;
  defaultUnitCost: string;
  defaultSupplierName: string;
  savingsPerUnit: string;
  savingsPercent: string;
  packageSavings: string;
}

export interface SupplierSuggestionGroup {
  supplierId: string;
  supplierName: string;
  contactPhone: string | null;
  email: string | null;
  address: string | null;
  itemsCount: number;
  totalPackageSavings: string;
  items: SupplierSuggestionItem[];
}

export interface AlreadyBestPriceItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  unitCost: string;
  defaultPresentation: PurchasingPresentationSummary;
}

export interface SingleSupplierItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  presentation: PurchasingPresentationSummary;
}

export interface QuarantinedExcludedItem {
  supplierIngredientId: string;
  supplierId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierName: string;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  pendingPackagePrice: string | null;
  quarantineReason: string | null;
  quarantinedAt: string | null;
  isDefault: boolean;
}

export interface PurchasingSuggestionsResponse {
  summary: {
    withSavingsCount: number;
    alreadyBestPriceCount: number;
    singleSupplierCount: number;
    withoutEligibleSupplierCount: number;
    withoutActiveDefaultCount: number;
    quarantinedExcludedCount: number;
  };
  byIngredient: IngredientPurchasingSuggestion[];
  bySupplier: SupplierSuggestionGroup[];
  alreadyBestPrice: AlreadyBestPriceItem[];
  singleSupplier: SingleSupplierItem[];
  quarantinedExcluded: QuarantinedExcludedItem[];
}

export interface OrderPreviewItemInput {
  supplierIngredientId: string;
  packages: number;
}

export interface OrderPreviewLine {
  supplierIngredientId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierCode: string | null;
  rawDescription: string | null;
  packageSize: string;
  packageUnit: string;
  packagePrice: string;
  unitCost: string;
  packages: number;
  totalQuantity: string;
  subtotal: string;
  defaultUnitCost: string | null;
  savings: string;
}

export interface OrderPreviewSupplierGroup {
  supplierId: string;
  supplierName: string;
  contactPhone: string | null;
  email: string | null;
  address: string | null;
  subtotal: string;
  savings: string;
  items: OrderPreviewLine[];
}

export interface OrderPreviewResponse {
  groups: OrderPreviewSupplierGroup[];
  total: string;
  totalSavings: string;
  totalPackages: number;
  itemsCount: number;
}

export interface MarginImpactProduct {
  productId: string;
  productName: string;
  salePrice: string;
  minMarginPercent: string;
  currentRecipeCost: string;
  projectedRecipeCost: string;
  currentMarginAmount: string;
  projectedMarginAmount: string;
  currentMarginPercent: string;
  projectedMarginPercent: string;
  currentBucket: HealthBucket;
  projectedBucket: HealthBucket;
}

export interface MarginImpactDefaultPresentation {
  supplierIngredientId: string;
  supplierName: string;
  unitCost: string;
}

export interface MarginImpactAlternativePresentation {
  supplierIngredientId: string;
  supplierName: string;
  unitCost: string;
}

export interface IngredientMarginImpact {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentCost: string;
  defaultPresentation: MarginImpactDefaultPresentation | null;
  alternativePresentation: MarginImpactAlternativePresentation;
  unitCostDifference: string;
  productsAffectedCount: number;
  productsLeavingRiskOrLossCount: number;
  products: MarginImpactProduct[];
}

export interface MarginImpactSummary {
  ingredientsWithAlternative: number;
  productsAffected: number;
  productsLeavingRiskOrLoss: number;
}

export interface PurchasingMarginImpactResponse {
  summary: MarginImpactSummary;
  byIngredient: IngredientMarginImpact[];
}

function toPresentationSummary(
  row: {
    id: string;
    supplierId: string;
    supplierCode: string | null;
    rawDescription: string | null;
    packageSize: Prisma.Decimal;
    packageUnit: string;
    packagePrice: Prisma.Decimal;
    supplier: { name: string };
  },
  unitCost: Prisma.Decimal
): PurchasingPresentationSummary {
  return {
    supplierIngredientId: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    supplierCode: row.supplierCode ?? null,
    rawDescription: row.rawDescription ?? null,
    packageSize: new Prisma.Decimal(String(row.packageSize)).toString(),
    packageUnit: row.packageUnit,
    packagePrice: new Prisma.Decimal(String(row.packagePrice)).toFixed(2),
    unitCost: unitCost.toFixed(2),
  };
}

export async function getPurchasingSuggestions(
  accountId: string
): Promise<PurchasingSuggestionsResponse> {
  const ingredients = await prisma.ingredient.findMany({
    where: { accountId },
    select: {
      id: true,
      name: true,
      unit: true,
      currentCost: true,
      suppliers: {
        where: { supplier: { accountId } },
        select: {
          id: true,
          supplierId: true,
          ingredientId: true,
          supplierCode: true,
          rawDescription: true,
          packageSize: true,
          packageUnit: true,
          packagePrice: true,
          pendingPackagePrice: true,
          isDefault: true,
          isQuarantined: true,
          quarantinedAt: true,
          quarantineReason: true,
          supplier: {
            select: {
              id: true,
              accountId: true,
              name: true,
              contactPhone: true,
              email: true,
              address: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const byIngredient: IngredientPurchasingSuggestion[] = [];
  const alreadyBestPrice: AlreadyBestPriceItem[] = [];
  const singleSupplier: SingleSupplierItem[] = [];
  const quarantinedExcluded: QuarantinedExcludedItem[] = [];
  const supplierGroupsMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      contactPhone: string | null;
      email: string | null;
      address: string | null;
      totalPackageSavings: Prisma.Decimal;
      items: SupplierSuggestionItem[];
    }
  >();

  let withoutEligibleSupplierCount = 0;
  let withoutActiveDefaultCount = 0;

  for (const ingredient of ingredients) {
    const activeRows = ingredient.suppliers.filter((row) => row.supplier.isActive);

    for (const row of activeRows) {
      if (row.isQuarantined) {
        quarantinedExcluded.push({
          supplierIngredientId: row.id,
          supplierId: row.supplierId,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          supplierName: row.supplier.name,
          packageSize: new Prisma.Decimal(String(row.packageSize)).toString(),
          packageUnit: row.packageUnit,
          packagePrice: new Prisma.Decimal(String(row.packagePrice)).toFixed(2),
          pendingPackagePrice:
            row.pendingPackagePrice !== null && row.pendingPackagePrice !== undefined
              ? new Prisma.Decimal(String(row.pendingPackagePrice)).toFixed(2)
              : null,
          quarantineReason: row.quarantineReason ?? null,
          quarantinedAt: row.quarantinedAt ? row.quarantinedAt.toISOString() : null,
          isDefault: row.isDefault,
        });
      }
    }

    const eligible = activeRows
      .filter((row) => !row.isQuarantined)
      .map((row) => ({
        row,
        unitCost: calculateUnitCost(
          new Prisma.Decimal(String(row.packagePrice)),
          new Prisma.Decimal(String(row.packageSize))
        ),
      }));

    if (eligible.length === 0) {
      withoutEligibleSupplierCount += 1;
      continue;
    }

    if (eligible.length === 1) {
      const only = eligible[0];
      if (only) {
        singleSupplier.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          presentation: toPresentationSummary(only.row, only.unitCost),
        });
      }
      continue;
    }

    const activeDefault = eligible.find((entry) => entry.row.isDefault);
    if (!activeDefault) {
      withoutActiveDefaultCount += 1;
      continue;
    }

    const sorted = [...eligible].sort((a, b) => {
      const costCmp = a.unitCost.comparedTo(b.unitCost);
      if (costCmp !== 0) return costCmp;
      if (a.row.isDefault !== b.row.isDefault) return a.row.isDefault ? -1 : 1;
      const pkgCmp = new Prisma.Decimal(String(a.row.packagePrice)).comparedTo(
        new Prisma.Decimal(String(b.row.packagePrice))
      );
      if (pkgCmp !== 0) return pkgCmp;
      const nameCmp = a.row.supplier.name.localeCompare(b.row.supplier.name, 'es', {
        sensitivity: 'base',
      });
      if (nameCmp !== 0) return nameCmp;
      return a.row.id.localeCompare(b.row.id);
    });

    const cheapest = sorted[0];
    if (!cheapest) continue;

    if (cheapest.unitCost.gte(activeDefault.unitCost)) {
      alreadyBestPrice.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        unitCost: activeDefault.unitCost.toFixed(2),
        defaultPresentation: toPresentationSummary(activeDefault.row, activeDefault.unitCost),
      });
      continue;
    }

    const savingsPerUnit = activeDefault.unitCost
      .sub(cheapest.unitCost)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const savingsPercent = savingsPerUnit
      .div(activeDefault.unitCost)
      .mul(HUNDRED)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const cheapestPackageSize = new Prisma.Decimal(String(cheapest.row.packageSize));
    const cheapestPackagePrice = new Prisma.Decimal(String(cheapest.row.packagePrice));
    const rawPackageSavings = activeDefault.unitCost
      .mul(cheapestPackageSize)
      .sub(cheapestPackagePrice)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const packageSavings = rawPackageSavings.lt(ZERO) ? ZERO : rawPackageSavings;

    const defaultSummary = toPresentationSummary(activeDefault.row, activeDefault.unitCost);
    const cheapestSummary = toPresentationSummary(cheapest.row, cheapest.unitCost);

    byIngredient.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      currentCost: new Prisma.Decimal(String(ingredient.currentCost)).toFixed(2),
      defaultPresentation: defaultSummary,
      cheapestPresentation: cheapestSummary,
      savingsPerUnit: savingsPerUnit.toFixed(2),
      savingsPercent: savingsPercent.toFixed(2),
      packageSavings: packageSavings.toFixed(2),
    });

    const existingGroup = supplierGroupsMap.get(cheapest.row.supplierId) ?? {
      supplierId: cheapest.row.supplierId,
      supplierName: cheapest.row.supplier.name,
      contactPhone: cheapest.row.supplier.contactPhone ?? null,
      email: cheapest.row.supplier.email ?? null,
      address: cheapest.row.supplier.address ?? null,
      totalPackageSavings: ZERO,
      items: [],
    };

    existingGroup.totalPackageSavings = existingGroup.totalPackageSavings.add(packageSavings);
    existingGroup.items.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      supplierIngredientId: cheapest.row.id,
      supplierCode: cheapest.row.supplierCode ?? null,
      rawDescription: cheapest.row.rawDescription ?? null,
      packageSize: cheapestPackageSize.toString(),
      packageUnit: cheapest.row.packageUnit,
      packagePrice: cheapestPackagePrice.toFixed(2),
      unitCost: cheapest.unitCost.toFixed(2),
      defaultUnitCost: activeDefault.unitCost.toFixed(2),
      defaultSupplierName: activeDefault.row.supplier.name,
      savingsPerUnit: savingsPerUnit.toFixed(2),
      savingsPercent: savingsPercent.toFixed(2),
      packageSavings: packageSavings.toFixed(2),
    });

    supplierGroupsMap.set(cheapest.row.supplierId, existingGroup);
  }

  const bySupplier: SupplierSuggestionGroup[] = [...supplierGroupsMap.values()]
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'es', { sensitivity: 'base' }))
    .map((group) => ({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      contactPhone: group.contactPhone,
      email: group.email,
      address: group.address,
      itemsCount: group.items.length,
      totalPackageSavings: group.totalPackageSavings.toFixed(2),
      items: [...group.items].sort((a, b) =>
        a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' })
      ),
    }));

  quarantinedExcluded.sort((a, b) => {
    const ingCmp = a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
    if (ingCmp !== 0) return ingCmp;
    return a.supplierName.localeCompare(b.supplierName, 'es', { sensitivity: 'base' });
  });

  return {
    summary: {
      withSavingsCount: byIngredient.length,
      alreadyBestPriceCount: alreadyBestPrice.length,
      singleSupplierCount: singleSupplier.length,
      withoutEligibleSupplierCount,
      withoutActiveDefaultCount,
      quarantinedExcludedCount: quarantinedExcluded.length,
    },
    byIngredient,
    bySupplier,
    alreadyBestPrice,
    singleSupplier,
    quarantinedExcluded,
  };
}

export async function previewPurchasingOrder(
  accountId: string,
  items: OrderPreviewItemInput[]
): Promise<OrderPreviewResponse> {
  if (items.length === 0) {
    throw new AppError('El pedido debe incluir al menos un ítem.', 400);
  }

  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.supplierIngredientId)) {
      throw new AppError('No se puede repetir la misma presentación en el pedido.', 400);
    }
    seenIds.add(item.supplierIngredientId);
  }

  const requestedIds = items.map((item) => item.supplierIngredientId);

  const presentations = await prisma.supplierIngredient.findMany({
    where: {
      id: { in: requestedIds },
      supplier: { accountId },
      ingredient: { accountId },
    },
    select: {
      id: true,
      supplierId: true,
      ingredientId: true,
      supplierCode: true,
      rawDescription: true,
      packageSize: true,
      packageUnit: true,
      packagePrice: true,
      isDefault: true,
      isQuarantined: true,
      supplier: {
        select: {
          id: true,
          name: true,
          contactPhone: true,
          email: true,
          address: true,
          isActive: true,
        },
      },
      ingredient: {
        select: {
          id: true,
          name: true,
          unit: true,
          currentCost: true,
        },
      },
    },
  });

  if (presentations.length !== requestedIds.length) {
    throw new AppError('Una o más presentaciones solicitadas no existen.', 404);
  }

  for (const presentation of presentations) {
    if (!presentation.supplier.isActive) {
      throw new AppError(
        `El proveedor "${presentation.supplier.name}" está inactivo y no admite pedidos.`,
        422
      );
    }
    if (presentation.isQuarantined) {
      throw new AppError(
        `La presentación de "${presentation.ingredient.name}" está en cuarentena y debe resolverse antes de pedirla.`,
        422
      );
    }
  }

  const presentationById = new Map(presentations.map((p) => [p.id, p]));
  const ingredientIds = [...new Set(presentations.map((p) => p.ingredientId))];

  const defaultPresentations = await prisma.supplierIngredient.findMany({
    where: {
      ingredientId: { in: ingredientIds },
      isDefault: true,
      isQuarantined: false,
      supplier: { accountId, isActive: true },
    },
    select: {
      id: true,
      ingredientId: true,
      packageSize: true,
      packagePrice: true,
    },
  });

  const defaultByIngredient = new Map(defaultPresentations.map((d) => [d.ingredientId, d]));

  const groupsMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      contactPhone: string | null;
      email: string | null;
      address: string | null;
      subtotal: Prisma.Decimal;
      savings: Prisma.Decimal;
      items: OrderPreviewLine[];
    }
  >();

  let total = ZERO;
  let totalSavings = ZERO;
  let totalPackages = 0;

  for (const requestItem of items) {
    const presentation = presentationById.get(requestItem.supplierIngredientId);
    if (!presentation) {
      throw new AppError('Una o más presentaciones solicitadas no existen.', 404);
    }

    const packageSize = new Prisma.Decimal(String(presentation.packageSize));
    const packagePrice = new Prisma.Decimal(String(presentation.packagePrice));
    const unitCost = calculateUnitCost(packagePrice, packageSize);
    const packagesDecimal = new Prisma.Decimal(requestItem.packages);

    const lineSubtotal = packagePrice
      .mul(packagesDecimal)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const totalQuantity = packageSize
      .mul(packagesDecimal)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

    const defaultRow = defaultByIngredient.get(presentation.ingredientId);
    let defaultUnitCost: Prisma.Decimal | null = null;
    let lineSavings = ZERO;

    if (defaultRow) {
      defaultUnitCost = calculateUnitCost(
        new Prisma.Decimal(String(defaultRow.packagePrice)),
        new Prisma.Decimal(String(defaultRow.packageSize))
      );

      if (presentation.id !== defaultRow.id && !unitCost.equals(defaultUnitCost)) {
        const baselineCost = defaultUnitCost
          .mul(packageSize)
          .mul(packagesDecimal)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        lineSavings = baselineCost
          .sub(lineSubtotal)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      }
    }

    const group = groupsMap.get(presentation.supplierId) ?? {
      supplierId: presentation.supplierId,
      supplierName: presentation.supplier.name,
      contactPhone: presentation.supplier.contactPhone ?? null,
      email: presentation.supplier.email ?? null,
      address: presentation.supplier.address ?? null,
      subtotal: ZERO,
      savings: ZERO,
      items: [],
    };

    group.subtotal = group.subtotal.add(lineSubtotal);
    group.savings = group.savings.add(lineSavings);
    group.items.push({
      supplierIngredientId: presentation.id,
      ingredientId: presentation.ingredientId,
      ingredientName: presentation.ingredient.name,
      unit: presentation.ingredient.unit,
      supplierCode: presentation.supplierCode ?? null,
      rawDescription: presentation.rawDescription ?? null,
      packageSize: packageSize.toString(),
      packageUnit: presentation.packageUnit,
      packagePrice: packagePrice.toFixed(2),
      unitCost: unitCost.toFixed(2),
      packages: requestItem.packages,
      totalQuantity: totalQuantity.toString(),
      subtotal: lineSubtotal.toFixed(2),
      defaultUnitCost: defaultUnitCost ? defaultUnitCost.toFixed(2) : null,
      savings: lineSavings.toFixed(2),
    });

    groupsMap.set(presentation.supplierId, group);
    total = total.add(lineSubtotal);
    totalSavings = totalSavings.add(lineSavings);
    totalPackages += requestItem.packages;
  }

  const groups: OrderPreviewSupplierGroup[] = [...groupsMap.values()]
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'es', { sensitivity: 'base' }))
    .map((group) => ({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      contactPhone: group.contactPhone,
      email: group.email,
      address: group.address,
      subtotal: group.subtotal.toFixed(2),
      savings: group.savings.toFixed(2),
      items: [...group.items].sort((a, b) =>
        a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' })
      ),
    }));

  return {
    groups,
    total: total.toFixed(2),
    totalSavings: totalSavings.toFixed(2),
    totalPackages,
    itemsCount: items.length,
  };
}

export async function getPurchasingMarginImpact(accountId: string): Promise<PurchasingMarginImpactResponse> {
  const ingredients = await prisma.ingredient.findMany({
    where: { accountId },
    select: {
      id: true, name: true, unit: true, currentCost: true,
      suppliers: {
        where: { supplier: { accountId, isActive: true }, isQuarantined: false },
        select: { id: true, packageSize: true, packagePrice: true, isDefault: true, isQuarantined: true, supplier: { select: { id: true, name: true, isActive: true } } },
      },
      products: {
        where: { product: { accountId, ingredients: { some: {} } } },
        select: { product: { select: {
          id: true, name: true, salePrice: true, minMarginPercent: true,
          ingredients: { select: { ingredientId: true, quantity: true, ingredient: { select: { id: true, currentCost: true } } } },
        } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const byIngredient: IngredientMarginImpact[] = [];
  const affectedProductIds = new Set<string>();
  const leavingRiskOrLossProductIds = new Set<string>();

  for (const ingredient of ingredients) {
    const currentCost = new Prisma.Decimal(String(ingredient.currentCost));
    const defaultRow = ingredient.suppliers.find((row) => row.isDefault);
    let defaultPresentation: MarginImpactDefaultPresentation | null = null;
    if (defaultRow) {
      const unitCost = calculateUnitCost(new Prisma.Decimal(String(defaultRow.packagePrice)), new Prisma.Decimal(String(defaultRow.packageSize)));
      defaultPresentation = { supplierIngredientId: defaultRow.id, supplierName: defaultRow.supplier.name, unitCost: unitCost.toFixed(2) };
    }

    const candidates = ingredient.suppliers
      .filter((row) => !row.isDefault && !row.isQuarantined && row.supplier.isActive !== false)
      .map((row) => ({
        row,
        unitCost: calculateUnitCost(new Prisma.Decimal(String(row.packagePrice)), new Prisma.Decimal(String(row.packageSize))),
      })).filter((entry) => entry.unitCost.lt(currentCost));
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => {
      const costCmp = a.unitCost.comparedTo(b.unitCost); if (costCmp !== 0) return costCmp;
      const pkgCmp = new Prisma.Decimal(String(a.row.packagePrice)).comparedTo(new Prisma.Decimal(String(b.row.packagePrice))); if (pkgCmp !== 0) return pkgCmp;
      const nameCmp = a.row.supplier.name.localeCompare(b.row.supplier.name, 'es', { sensitivity: 'base' }); if (nameCmp !== 0) return nameCmp;
      return a.row.id.localeCompare(b.row.id);
    });

    const bestAlternative = candidates[0]!;
    const unitCostDifference = currentCost.sub(bestAlternative.unitCost).toFixed(2);
    const seenProductIds = new Set<string>();
    const productsImpact: MarginImpactProduct[] = [];
    let productsLeavingRiskOrLossCount = 0;

    for (const rel of ingredient.products) {
      const product = rel.product;
      if (!product || seenProductIds.has(product.id) || product.ingredients.length === 0) continue;
      seenProductIds.add(product.id);
      const salePrice = new Prisma.Decimal(String(product.salePrice));
      const minMarginPercent = new Prisma.Decimal(String(product.minMarginPercent));
      const currentRecipeCost = calculateRecipeTotal(product.ingredients.map((pi) => ({ quantity: new Prisma.Decimal(String(pi.quantity)), unitCost: new Prisma.Decimal(String(pi.ingredient.currentCost)) })));
      const projectedRecipeCost = calculateRecipeTotal(product.ingredients.map((pi) => ({ quantity: new Prisma.Decimal(String(pi.quantity)), unitCost: pi.ingredientId === ingredient.id ? bestAlternative.unitCost : new Prisma.Decimal(String(pi.ingredient.currentCost)) })));
      const currentMarginAmount = calculateMarginAmount(salePrice, currentRecipeCost);
      const projectedMarginAmount = calculateMarginAmount(salePrice, projectedRecipeCost);
      const currentMarginPercent = calculateMarginPercent(salePrice, currentRecipeCost);
      const projectedMarginPercent = calculateMarginPercent(salePrice, projectedRecipeCost);
      const currentBucket = classifyProductHealthBucket(currentMarginPercent, minMarginPercent, product.ingredients.length);
      const projectedBucket = classifyProductHealthBucket(projectedMarginPercent, minMarginPercent, product.ingredients.length);

      if ((currentBucket === 'risk' || currentBucket === 'loss') && (projectedBucket === 'target' || projectedBucket === 'surplus')) {
        productsLeavingRiskOrLossCount += 1;
        leavingRiskOrLossProductIds.add(product.id);
      }
      affectedProductIds.add(product.id);
      productsImpact.push({
        productId: product.id,
        productName: product.name,
        salePrice: salePrice.toFixed(2),
        minMarginPercent: minMarginPercent.toFixed(2),
        currentRecipeCost: currentRecipeCost.toFixed(2),
        projectedRecipeCost: projectedRecipeCost.toFixed(2),
        currentMarginAmount: currentMarginAmount.toFixed(2),
        projectedMarginAmount: projectedMarginAmount.toFixed(2),
        currentMarginPercent: currentMarginPercent.toFixed(2),
        projectedMarginPercent: projectedMarginPercent.toFixed(2),
        currentBucket,
        projectedBucket,
      });
    }

    productsImpact.sort((a, b) => {
      const diffA = new Prisma.Decimal(a.projectedMarginPercent).sub(new Prisma.Decimal(a.currentMarginPercent));
      const diffB = new Prisma.Decimal(b.projectedMarginPercent).sub(new Prisma.Decimal(b.currentMarginPercent));
      const diffCmp = diffB.comparedTo(diffA); if (diffCmp !== 0) return diffCmp;
      return a.productName.localeCompare(b.productName, 'es', { sensitivity: 'base' });
    });

    byIngredient.push({
      ingredientId: ingredient.id, ingredientName: ingredient.name, unit: ingredient.unit, currentCost: currentCost.toFixed(2),
      defaultPresentation,
      alternativePresentation: { supplierIngredientId: bestAlternative.row.id, supplierName: bestAlternative.row.supplier.name, unitCost: bestAlternative.unitCost.toFixed(2) },
      unitCostDifference, productsAffectedCount: productsImpact.length,
      productsLeavingRiskOrLossCount, products: productsImpact,
    });
  }

  byIngredient.sort((a, b) => {
    if (b.productsLeavingRiskOrLossCount !== a.productsLeavingRiskOrLossCount) return b.productsLeavingRiskOrLossCount - a.productsLeavingRiskOrLossCount;
    const maxIncA = a.products.reduce((max, p) => { const diff = new Prisma.Decimal(p.projectedMarginPercent).sub(new Prisma.Decimal(p.currentMarginPercent)); return diff.gt(max) ? diff : max; }, new Prisma.Decimal(0));
    const maxIncB = b.products.reduce((max, p) => { const diff = new Prisma.Decimal(p.projectedMarginPercent).sub(new Prisma.Decimal(p.currentMarginPercent)); return diff.gt(max) ? diff : max; }, new Prisma.Decimal(0));
    const incCmp = maxIncB.comparedTo(maxIncA); if (incCmp !== 0) return incCmp;
    const diffCmp = new Prisma.Decimal(b.unitCostDifference).comparedTo(new Prisma.Decimal(a.unitCostDifference)); if (diffCmp !== 0) return diffCmp;
    return a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
  });

  return { summary: { ingredientsWithAlternative: byIngredient.length, productsAffected: affectedProductIds.size, productsLeavingRiskOrLoss: leavingRiskOrLossProductIds.size }, byIngredient };
}

export async function getIngredientMarginImpact(
  accountId: string,
  ingredientId: string,
  supplierIngredientId: string
): Promise<IngredientMarginImpact> {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, accountId },
    select: {
      id: true,
      name: true,
      unit: true,
      currentCost: true,
      suppliers: {
        where: { supplier: { accountId } },
        select: {
          id: true,
          packageSize: true,
          packagePrice: true,
          isDefault: true,
          isQuarantined: true,
          supplier: { select: { id: true, name: true, isActive: true } },
        },
      },
      products: {
        where: { product: { accountId, ingredients: { some: {} } } },
        select: {
          product: {
            select: {
              id: true,
              name: true,
              salePrice: true,
              minMarginPercent: true,
              ingredients: {
                select: {
                  ingredientId: true,
                  quantity: true,
                  ingredient: { select: { id: true, currentCost: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ingredient) throw new AppError('Insumo no encontrado.', 404);

  const targetPresentation = ingredient.suppliers.find((row) => row.id === supplierIngredientId);
  if (!targetPresentation) throw new AppError('Presentación no encontrada.', 404);
  if (targetPresentation.isQuarantined) {
    throw new AppError('La presentación está en cuarentena y debe resolverse antes de evaluarla.', 422);
  }
  if (!targetPresentation.supplier.isActive) {
    throw new AppError(
      `El proveedor "${targetPresentation.supplier.name}" está inactivo y no admite pedidos.`,
      422
    );
  }
  if (targetPresentation.isDefault) {
    throw new AppError('La presentación ya es la predeterminada del insumo.', 422);
  }

  const alternativeUnitCost = calculateUnitCost(
    new Prisma.Decimal(String(targetPresentation.packagePrice)),
    new Prisma.Decimal(String(targetPresentation.packageSize))
  );

  const defaultRow = ingredient.suppliers.find(
    (row) => row.isDefault && !row.isQuarantined && row.supplier.isActive
  );
  let defaultPresentation: MarginImpactDefaultPresentation | null = null;
  if (defaultRow) {
    const defaultUnitCost = calculateUnitCost(
      new Prisma.Decimal(String(defaultRow.packagePrice)),
      new Prisma.Decimal(String(defaultRow.packageSize))
    );
    defaultPresentation = {
      supplierIngredientId: defaultRow.id,
      supplierName: defaultRow.supplier.name,
      unitCost: defaultUnitCost.toFixed(2),
    };
  }

  const currentCost = new Prisma.Decimal(String(ingredient.currentCost));
  const unitCostDifference = currentCost.sub(alternativeUnitCost).toFixed(2);
  const seenProductIds = new Set<string>();
  const productsImpact: MarginImpactProduct[] = [];
  let productsLeavingRiskOrLossCount = 0;

  for (const rel of ingredient.products) {
    const product = rel.product;
    if (!product || seenProductIds.has(product.id) || product.ingredients.length === 0) continue;
    seenProductIds.add(product.id);

    const salePrice = new Prisma.Decimal(String(product.salePrice));
    const minMarginPercent = new Prisma.Decimal(String(product.minMarginPercent));
    const currentRecipeCost = calculateRecipeTotal(
      product.ingredients.map((pi) => ({
        quantity: new Prisma.Decimal(String(pi.quantity)),
        unitCost: new Prisma.Decimal(String(pi.ingredient.currentCost)),
      }))
    );
    const projectedRecipeCost = calculateRecipeTotal(
      product.ingredients.map((pi) => ({
        quantity: new Prisma.Decimal(String(pi.quantity)),
        unitCost: pi.ingredientId === ingredient.id
          ? alternativeUnitCost
          : new Prisma.Decimal(String(pi.ingredient.currentCost)),
      }))
    );
    const currentMarginAmount = calculateMarginAmount(salePrice, currentRecipeCost);
    const projectedMarginAmount = calculateMarginAmount(salePrice, projectedRecipeCost);
    const currentMarginPercent = calculateMarginPercent(salePrice, currentRecipeCost);
    const projectedMarginPercent = calculateMarginPercent(salePrice, projectedRecipeCost);
    const currentBucket = classifyProductHealthBucket(
      currentMarginPercent,
      minMarginPercent,
      product.ingredients.length
    );
    const projectedBucket = classifyProductHealthBucket(
      projectedMarginPercent,
      minMarginPercent,
      product.ingredients.length
    );

    if (
      (currentBucket === 'risk' || currentBucket === 'loss') &&
      (projectedBucket === 'target' || projectedBucket === 'surplus')
    ) {
      productsLeavingRiskOrLossCount += 1;
    }

    productsImpact.push({
      productId: product.id,
      productName: product.name,
      salePrice: salePrice.toFixed(2),
      minMarginPercent: minMarginPercent.toFixed(2),
      currentRecipeCost: currentRecipeCost.toFixed(2),
      projectedRecipeCost: projectedRecipeCost.toFixed(2),
      currentMarginPercent: currentMarginPercent.toFixed(2),
      projectedMarginPercent: projectedMarginPercent.toFixed(2),
      currentBucket,
      projectedBucket,
      currentMarginAmount: currentMarginAmount.toFixed(2),
      projectedMarginAmount: projectedMarginAmount.toFixed(2),
    });
  }

  productsImpact.sort((a, b) => {
    const diffA = new Prisma.Decimal(a.projectedMarginPercent).sub(new Prisma.Decimal(a.currentMarginPercent));
    const diffB = new Prisma.Decimal(b.projectedMarginPercent).sub(new Prisma.Decimal(b.currentMarginPercent));
    const diffCmp = diffB.comparedTo(diffA);
    if (diffCmp !== 0) return diffCmp;
    return a.productName.localeCompare(b.productName, 'es', { sensitivity: 'base' });
  });

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    currentCost: currentCost.toFixed(2),
    defaultPresentation,
    alternativePresentation: {
      supplierIngredientId: targetPresentation.id,
      supplierName: targetPresentation.supplier.name,
      unitCost: alternativeUnitCost.toFixed(2),
    },
    unitCostDifference,
    productsAffectedCount: productsImpact.length,
    productsLeavingRiskOrLossCount,
    products: productsImpact,
  };
}
</file>

<file path="backend/src/services/reportService.test.ts">
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const accountFindUniqueMock = vi.fn();
const accountFindManyMock = vi.fn();
const productFindManyMock = vi.fn();
const ingredientFindManyMock = vi.fn();
const priceHistoryFindManyMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();
const getPurchasingSuggestionsMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
      findMany: (...args: unknown[]) => accountFindManyMock(...args),
    },
    product: { findMany: (...args: unknown[]) => productFindManyMock(...args) },
    ingredient: { findMany: (...args: unknown[]) => ingredientFindManyMock(...args) },
    priceHistory: { findMany: (...args: unknown[]) => priceHistoryFindManyMock(...args) },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
  },
}));

const getAccountFeaturesMock = vi.fn();
const salesSummaryBetweenMock = vi.fn();
vi.mock('../lib/features', () => ({
  getAccountFeatures: (...args: unknown[]) => getAccountFeaturesMock(...args),
}));
vi.mock('./salesSummaryService', () => ({
  salesSummaryBetween: (...args: unknown[]) => salesSummaryBetweenMock(...args),
}));

vi.mock('./purchasingService', () => ({
  getPurchasingSuggestions: (...args: unknown[]) => getPurchasingSuggestionsMock(...args),
}));

import {
  buildWeeklyMarginReport,
  formatArgentinaIsoDate,
  getActiveReportAccounts,
  getWeeklyMarginReportBySlug,
} from './reportService';

const D = (value: string | number) => new Prisma.Decimal(value);
const BASE_ACCOUNT = {
  id: '30a00000-0000-4000-8000-000000000001',
  businessName: 'Panadería Central',
  slug: 'panaderia-central',
  isActive: true,
  defaultMinMarginPercent: D('30.00'),
};
const EMPTY_SUGGESTIONS = {
  summary: {
    withSavingsCount: 0,
    alreadyBestPriceCount: 0,
    singleSupplierCount: 0,
    withoutEligibleSupplierCount: 0,
    withoutActiveDefaultCount: 0,
    quarantinedExcludedCount: 0,
  },
  byIngredient: [],
  bySupplier: [],
  alreadyBestPrice: [],
  singleSupplier: [],
  quarantinedExcluded: [],
};
const FROM = new Date('2026-11-10T03:00:00.000Z');
const TO = new Date('2026-11-17T03:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  accountFindUniqueMock.mockResolvedValue(BASE_ACCOUNT);
  productFindManyMock.mockResolvedValue([]);
  ingredientFindManyMock.mockResolvedValue([]);
  priceHistoryFindManyMock.mockResolvedValue([]);
  supplierIngredientFindManyMock.mockResolvedValue([]);
  getPurchasingSuggestionsMock.mockResolvedValue(EMPTY_SUGGESTIONS);
  getAccountFeaturesMock.mockResolvedValue({ sales: false });
});

describe('getActiveReportAccounts', () => {
  it('lista cuentas activas y el correo del primer ADMIN o null', async () => {
    accountFindManyMock.mockResolvedValue([
      {
        id: BASE_ACCOUNT.id,
        slug: BASE_ACCOUNT.slug,
        businessName: BASE_ACCOUNT.businessName,
        users: [{ email: 'admin.panaderia@seed.example.test' }],
      },
      {
        id: '30a00000-0000-4000-8000-000000000002',
        slug: 'quimica-gyj',
        businessName: 'Química GyJ',
        users: [],
      },
    ]);

    await expect(getActiveReportAccounts()).resolves.toEqual([
      {
        id: BASE_ACCOUNT.id,
        slug: BASE_ACCOUNT.slug,
        businessName: BASE_ACCOUNT.businessName,
        ownerEmail: 'admin.panaderia@seed.example.test',
      },
      {
        id: '30a00000-0000-4000-8000-000000000002',
        slug: 'quimica-gyj',
        businessName: 'Química GyJ',
        ownerEmail: null,
      },
    ]);
    expect(accountFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        businessName: true,
        users: {
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { email: true },
        },
      },
      orderBy: { businessName: 'asc' },
    });
  });
});

describe('buildWeeklyMarginReport', () => {
  it('devuelve 404 para cuentas inexistentes o inactivas y 400 para un rango inválido', async () => {
    accountFindUniqueMock.mockResolvedValueOnce(null);
    await expect(buildWeeklyMarginReport('missing-id', { from: FROM, to: TO }))
      .rejects.toMatchObject({ statusCode: 404 });

    accountFindUniqueMock.mockResolvedValueOnce({ ...BASE_ACCOUNT, isActive: false });
    await expect(buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO }))
      .rejects.toMatchObject({ statusCode: 404 });

    await expect(buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: TO, to: FROM }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(
      buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: new Date(Number.NaN), to: TO })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('devuelve el contrato vacío y establece el período y las secciones del reporte', async () => {
    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.account).toEqual({
      id: BASE_ACCOUNT.id,
      businessName: BASE_ACCOUNT.businessName,
      slug: BASE_ACCOUNT.slug,
      defaultMinMarginPercent: '30.00',
    });
    expect(report.period).toEqual({
      from: FROM.toISOString(),
      to: TO.toISOString(),
      timezone: 'America/Argentina/Buenos_Aires',
      fromFormatted: '10/11/2026',
      toFormatted: '17/11/2026',
    });
    expect(report.generatedAt).toBe(TO.toISOString());
    expect(report.catalogHealth).toEqual({
      totalProducts: 0,
      activeIngredientsCount: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 0,
    });
    expect(report.belowMinimumProducts).toEqual({ totalCount: 0, items: [] });
    expect(report.weeklyCostChanges).toEqual({ totalCount: 0, items: [] });
    expect(report.quarantine).toEqual({ totalCount: 0, items: [] });
    expect(report.purchasingSavings).toEqual({ totalCount: 0, items: [] });
    expect(report.staleCosts).toEqual({ totalCount: 0, thresholdDays: 30, items: [] });
  });

  it('comparte los buckets y la mediana del dashboard y limita los productos bajo el mínimo a 20', async () => {
    const product = (id: string, margin: string, ingredientsCount: number) => ({
      id,
      name: `Producto ${id}`,
      salePrice: D('900.00'),
      cost: D('1200.00'),
      marginPercent: D(margin),
      minMarginPercent: D('30.00'),
      _count: { ingredients: ingredientsCount },
    });

    productFindManyMock.mockResolvedValue([
      ...Array.from({ length: 40 }, (_, i) => product(`loss-${i}`, String(-40 + i * 0.5), 3)),
      ...Array.from({ length: 64 }, (_, i) => product(`risk-${i}`, '22.00', 4)),
      ...Array.from({ length: 130 }, (_, i) => product(`target-${i}`, '45.00', 4)),
      ...Array.from({ length: 90 }, (_, i) => product(`surplus-${i}`, '68.00', 5)),
      ...Array.from({ length: 15 }, (_, i) => product(`draft-${i}`, '0.00', 0)),
    ]);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.catalogHealth).toMatchObject({
      totalProducts: 339,
      lossCount: 40,
      riskCount: 64,
      targetCount: 130,
      surplusCount: 90,
      draftCount: 15,
      criticalProductsCount: 104,
      healthyProductsCount: 220,
      averageMarginPercent: 45,
    });
    expect(report.belowMinimumProducts.totalCount).toBe(104);
    expect(report.belowMinimumProducts.items).toHaveLength(20);
    expect(report.belowMinimumProducts.items[0]).toEqual({
      productId: 'loss-0',
      name: 'Producto loss-0',
      salePrice: '900.00',
      cost: '1200.00',
      marginPercent: '-40.00',
      minMarginPercent: '30.00',
      suggestedSalePrice: '1714.29',
      status: 'loss',
    });
  });

  it('aplica precio sugerido alternativo para mínimo de margen igual o superior a 100%', async () => {
    productFindManyMock.mockResolvedValue([
      {
        id: 'p-100',
        name: 'Producto objetivo extremo',
        salePrice: D('600.00'),
        cost: D('500.00'),
        marginPercent: D('16.67'),
        minMarginPercent: D('100.00'),
        _count: { ingredients: 1 },
      },
    ]);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });
    expect(report.belowMinimumProducts.items[0]?.suggestedSalePrice).toBe('1000.00');
  });

  it('ordena cambios de costo por variación absoluta y expone hasta diez', async () => {
    priceHistoryFindManyMock.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        id: `ph-${i + 1}`,
        ingredientId: `ing-${i + 1}`,
        oldCost: D('1000.00'),
        newCost: D(i === 5 ? '400.00' : String(1000 + (i + 1) * 50)),
        changedAt: new Date(`2026-11-12T12:${String(i).padStart(2, '0')}:00.000Z`),
        ingredient: {
          id: `ing-${i + 1}`,
          name: `Insumo ${i + 1}`,
          unit: 'kg',
          _count: { products: i + 1 },
        },
      }))
    );

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.weeklyCostChanges.totalCount).toBe(12);
    expect(report.weeklyCostChanges.items).toHaveLength(10);
    expect(report.weeklyCostChanges.items[0]).toMatchObject({
      ingredientId: 'ing-12',
      variationPercent: '60.00',
      affectedProductsCount: 12,
    });
    expect(report.weeklyCostChanges.items[1]).toMatchObject({
      ingredientId: 'ing-6',
      variationPercent: '-60.00',
      affectedProductsCount: 6,
    });
  });

  it('calcula los costos unitarios y variación de cuarentena y limita a los cinco más antiguos', async () => {
    supplierIngredientFindManyMock.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({
        id: `q-${i + 1}`,
        supplierId: `sup-${i + 1}`,
        ingredientId: `ing-${i + 1}`,
        packageSize: D('25.000'),
        packageUnit: 'kg',
        packagePrice: D('10000.00'),
        pendingPackagePrice: D(String(16000 + i * 1000)),
        quarantinedAt: new Date(`2026-11-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`),
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
        isDefault: true,
        ingredient: { id: `ing-${i + 1}`, name: `Insumo ${i + 1}`, unit: 'kg' },
        supplier: { id: `sup-${i + 1}`, name: `Proveedor ${i + 1}` },
      }))
    );

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.quarantine.totalCount).toBe(7);
    expect(report.quarantine.items).toHaveLength(5);
    expect(report.quarantine.items[0]).toMatchObject({
      supplierIngredientId: 'q-1',
      ingredientName: 'Insumo 1',
      supplierName: 'Proveedor 1',
      currentUnitCost: '400.00',
      proposedUnitCost: '640.00',
      variationPercent: '60.00',
    });
  });

  it('ordena las oportunidades de ahorro de compras por ahorro de paquete', async () => {
    const suggestions = Array.from({ length: 7 }, (_, i) => ({
      ingredientId: `ing-${i + 1}`,
      ingredientName: `Insumo ${i + 1}`,
      unit: 'kg',
      currentCost: '1000.00',
      defaultPresentation: {
        supplierIngredientId: `si-def-${i + 1}`,
        supplierId: 'sup-def',
        supplierName: 'Proveedor Actual',
        supplierCode: null,
        rawDescription: null,
        packageSize: '25',
        packageUnit: 'kg',
        packagePrice: '25000.00',
        unitCost: '1000.00',
      },
      cheapestPresentation: {
        supplierIngredientId: `si-best-${i + 1}`,
        supplierId: 'sup-best',
        supplierName: 'Proveedor Más Barato',
        supplierCode: null,
        rawDescription: null,
        packageSize: '25',
        packageUnit: 'kg',
        packagePrice: '20000.00',
        unitCost: '800.00',
      },
      savingsPerUnit: '200.00',
      savingsPercent: '20.00',
      packageSavings: `${(i + 1) * 500}.00`,
    }));
    getPurchasingSuggestionsMock.mockResolvedValue({
      ...EMPTY_SUGGESTIONS,
      byIngredient: suggestions,
    });

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.purchasingSavings.totalCount).toBe(7);
    expect(report.purchasingSavings.items).toHaveLength(5);
    expect(report.purchasingSavings.items[0]).toMatchObject({
      ingredientId: 'ing-7',
      packageSavings: '3500.00',
      bestSupplierName: 'Proveedor Más Barato',
    });
  });

  it('detecta costos con más de 30 días usando PriceHistory y updatedAt de respaldo', async () => {
    ingredientFindManyMock.mockResolvedValue([
      {
        id: 'ing-old-history',
        name: 'Levadura',
        unit: 'kg',
        currentCost: D('6000.00'),
        updatedAt: new Date('2026-11-16T00:00:00.000Z'),
        priceHistory: [{ changedAt: new Date('2026-10-01T03:00:00.000Z') }],
      },
      {
        id: 'ing-old-no-history',
        name: 'Sal fina',
        unit: 'kg',
        currentCost: D('472.26'),
        updatedAt: new Date('2026-10-10T03:00:00.000Z'),
        priceHistory: [],
      },
      {
        id: 'ing-fresh',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: D('736.25'),
        updatedAt: new Date('2026-11-01T03:00:00.000Z'),
        priceHistory: [{ changedAt: new Date('2026-11-10T03:00:00.000Z') }],
      },
    ]);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report.catalogHealth.activeIngredientsCount).toBe(3);
    expect(report.staleCosts.totalCount).toBe(2);
    expect(report.staleCosts.items).toEqual([
      {
        ingredientId: 'ing-old-history',
        name: 'Levadura',
        unit: 'kg',
        currentCost: '6000.00',
        lastUpdatedAt: '2026-10-01T03:00:00.000Z',
        daysWithoutUpdate: 47,
      },
      {
        ingredientId: 'ing-old-no-history',
        name: 'Sal fina',
        unit: 'kg',
        currentCost: '472.26',
        lastUpdatedAt: '2026-10-10T03:00:00.000Z',
        daysWithoutUpdate: 38,
      },
    ]);
    expect(ingredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: BASE_ACCOUNT.id },
        select: expect.objectContaining({
          priceHistory: {
            where: { changedAt: { lte: TO } },
            orderBy: { changedAt: 'desc' },
            take: 1,
            select: { changedAt: true },
          },
        }),
      })
    );
  });

  it('resuelve cuentas activas por slug y rechaza las inexistentes o inactivas', async () => {
    accountFindUniqueMock.mockResolvedValueOnce(null);
    await expect(getWeeklyMarginReportBySlug('no-existe'))
      .rejects.toMatchObject({ statusCode: 404 });

    accountFindUniqueMock.mockResolvedValueOnce({ id: BASE_ACCOUNT.id, isActive: false });
    await expect(getWeeklyMarginReportBySlug(BASE_ACCOUNT.slug))
      .rejects.toMatchObject({ statusCode: 404 });

    accountFindUniqueMock
      .mockResolvedValueOnce({ id: BASE_ACCOUNT.id, isActive: true })
      .mockResolvedValueOnce(BASE_ACCOUNT);
    const report = await getWeeklyMarginReportBySlug(BASE_ACCOUNT.slug, { from: FROM, to: TO });
    expect(report.account.slug).toBe(BASE_ACCOUNT.slug);
  });
});

describe('formatArgentinaIsoDate', () => {
  it('formatea la fecha AAAA-MM-DD según el huso horario de Argentina', () => {
    expect(formatArgentinaIsoDate(new Date('2026-11-18T01:00:00.000Z'))).toBe('2026-11-17');
  });
});

describe('buildWeeklyMarginReport - aislamiento por cuenta (#390)', () => {
  it('cada consulta del reporte se acota a la cuenta pedida', async () => {
    await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    // Productos: costos, márgenes, buckets y mediana
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: BASE_ACCOUNT.id } })
    );
    // Insumos: costos sin actualizar
    expect(ingredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: BASE_ACCOUNT.id } })
    );
    // Cambios de costo de la semana
    expect(priceHistoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ingredient: { accountId: BASE_ACCOUNT.id } }),
      })
    );
    // Precios retenidos en cuarentena
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ingredient: { accountId: BASE_ACCOUNT.id },
          isQuarantined: true,
        }),
      })
    );
    // Oportunidades de ahorro
    expect(getPurchasingSuggestionsMock).toHaveBeenCalledWith(BASE_ACCOUNT.id);
  });
});

describe('buildWeeklyMarginReport - sección de ventas (#450)', () => {
  const semana = {
    salesCount: 41,
    salesTotal: '100000.00',
    costTotal: '62000.00',
    profit: '38000.00',
    marginPercent: '38.00',
    topSold: [{ productId: 'p-pan', productName: 'Pan flauta — 1 kg', quantity: 10, salesTotal: '46000.00', profit: '14000.00', marginPercent: '30.43' }],
    topProfit: [{ productId: 'p-medialunas', productName: 'Medialunas de manteca — docena (12 unidades)', quantity: 4, salesTotal: '54000.00', profit: '24000.00', marginPercent: '44.44' }],
  };

  it('Escenario "Reporte sin módulo": una cuenta sin el módulo de ventas no trae la sección ni consulta las ventas', async () => {
    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(report).not.toHaveProperty('sales');
    expect(getAccountFeaturesMock).toHaveBeenCalledWith(BASE_ACCOUNT.id);
    expect(salesSummaryBetweenMock).not.toHaveBeenCalled();
  });

  it('con el módulo, trae la ganancia real del mismo período del reporte', async () => {
    getAccountFeaturesMock.mockResolvedValue({ sales: true });
    salesSummaryBetweenMock.mockResolvedValue(semana);

    const report = await buildWeeklyMarginReport(BASE_ACCOUNT.id, { from: FROM, to: TO });

    expect(salesSummaryBetweenMock).toHaveBeenCalledWith(BASE_ACCOUNT.id, FROM, TO);
    expect(report.sales).toEqual(semana);
  });
});
</file>

<file path="backend/src/services/reportService.ts">
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  calculateCatalogHealthSummary,
  calculateSuggestedSalePrice,
  classifyProductHealthBucket,
  type CatalogHealthSummary,
} from './marginCalculator';
import { getPurchasingSuggestions } from './purchasingService';
import { getAccountFeatures } from '../lib/features';
import { salesSummaryBetween, type RankedProduct, type SummaryTotals } from './salesSummaryService';

const Decimal = Prisma.Decimal;
const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
const WEEKLY_WINDOW_DAYS = 7;
const STALE_COST_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BELOW_MIN_LIMIT = 20;
const COST_CHANGES_LIMIT = 10;
const QUARANTINE_LIMIT = 5;
const SAVINGS_LIMIT = 5;
const STALE_COSTS_LIMIT = 20;

export interface ReportAccountSummary {
  id: string;
  slug: string;
  businessName: string;
  ownerEmail: string | null;
}

export interface ReportDateRangeOptions {
  from?: Date;
  to?: Date;
}

export interface BelowMinimumProductReportItem {
  productId: string;
  name: string;
  salePrice: string;
  cost: string;
  marginPercent: string;
  minMarginPercent: string;
  suggestedSalePrice: string;
  status: 'loss' | 'risk';
}

export interface WeeklyCostChangeReportItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  oldCost: string;
  newCost: string;
  variationPercent: string;
  changedAt: string;
  affectedProductsCount: number;
}

export interface QuarantineReportItem {
  supplierIngredientId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  currentPackagePrice: string;
  pendingPackagePrice: string;
  currentUnitCost: string;
  proposedUnitCost: string;
  variationPercent: string;
  quarantineReason: string;
  quarantinedAt: string | null;
  isDefault: boolean;
}

export interface PurchasingSavingReportItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentSupplierName: string;
  currentUnitCost: string;
  bestSupplierName: string;
  bestUnitCost: string;
  packageSize: string;
  packagePrice: string;
  savingsPerUnit: string;
  savingsPercent: string;
  packageSavings: string;
}

export interface StaleCostReportItem {
  ingredientId: string;
  name: string;
  unit: string;
  currentCost: string;
  lastUpdatedAt: string;
  daysWithoutUpdate: number;
}

/** Ganancia real del período del reporte: solo viene si la cuenta tiene el módulo de ventas (ADR-010). */
export type WeeklySalesSection = SummaryTotals & {
  topSold: RankedProduct[];
  topProfit: RankedProduct[];
};

export interface WeeklyMarginReport {
  account: {
    id: string;
    businessName: string;
    slug: string;
    defaultMinMarginPercent: string;
  };
  period: {
    from: string;
    to: string;
    timezone: string;
    fromFormatted: string;
    toFormatted: string;
  };
  generatedAt: string;
  catalogHealth: CatalogHealthSummary & {
    activeIngredientsCount: number;
  };
  belowMinimumProducts: {
    totalCount: number;
    items: BelowMinimumProductReportItem[];
  };
  weeklyCostChanges: {
    totalCount: number;
    items: WeeklyCostChangeReportItem[];
  };
  quarantine: {
    totalCount: number;
    items: QuarantineReportItem[];
  };
  purchasingSavings: {
    totalCount: number;
    items: PurchasingSavingReportItem[];
  };
  staleCosts: {
    totalCount: number;
    thresholdDays: number;
    items: StaleCostReportItem[];
  };
  /** Solo con el módulo de ventas prendido; si no, el campo no viene. */
  sales?: WeeklySalesSection;
}

function formatArgentinaDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ARGENTINA_TIMEZONE,
  }).format(date);
}

/** Devuelve la fecha YYYY-MM-DD en la zona horaria de Argentina. */
export function formatArgentinaIsoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ARGENTINA_TIMEZONE,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error('No se pudo formatear la fecha en la zona horaria de Argentina.');
  }

  return `${year}-${month}-${day}`;
}

export async function getActiveReportAccounts(): Promise<ReportAccountSummary[]> {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      businessName: true,
      users: {
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { email: true },
      },
    },
    orderBy: { businessName: 'asc' },
  });

  return accounts.map((account) => ({
    id: account.id,
    slug: account.slug,
    businessName: account.businessName,
    ownerEmail: account.users[0]?.email ?? null,
  }));
}

export async function getWeeklyMarginReportBySlug(
  slug: string,
  options?: ReportDateRangeOptions
): Promise<WeeklyMarginReport> {
  const account = await prisma.account.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!account || !account.isActive) {
    throw new AppError('No existe una cuenta activa para el slug indicado.', 404);
  }

  return buildWeeklyMarginReport(account.id, options);
}

export async function buildWeeklyMarginReport(
  accountId: string,
  options?: ReportDateRangeOptions
): Promise<WeeklyMarginReport> {
  const to = options?.to ? new Date(options.to) : new Date();
  const from = options?.from
    ? new Date(options.from)
    : new Date(to.getTime() - WEEKLY_WINDOW_DAYS * MS_PER_DAY);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new AppError('El rango de fechas del reporte es inválido.', 400);
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      businessName: true,
      slug: true,
      isActive: true,
      defaultMinMarginPercent: true,
    },
  });

  if (!account || !account.isActive) {
    throw new AppError('Cuenta no encontrada o inactiva.', 404);
  }

  const staleCutoff = new Date(to.getTime() - STALE_COST_DAYS * MS_PER_DAY);
  const [products, ingredients, weeklyPriceHistory, quarantinedRows, purchasingSuggestions] =
    await Promise.all([
      prisma.product.findMany({
        where: { accountId },
        select: {
          id: true,
          name: true,
          salePrice: true,
          cost: true,
          marginPercent: true,
          minMarginPercent: true,
          _count: { select: { ingredients: true } },
        },
      }),
      prisma.ingredient.findMany({
        where: { accountId },
        select: {
          id: true,
          name: true,
          unit: true,
          currentCost: true,
          updatedAt: true,
          priceHistory: {
            where: { changedAt: { lte: to } },
            orderBy: { changedAt: 'desc' },
            take: 1,
            select: { changedAt: true },
          },
        },
      }),
      prisma.priceHistory.findMany({
        where: {
          ingredient: { accountId },
          changedAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          ingredientId: true,
          oldCost: true,
          newCost: true,
          changedAt: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
              _count: { select: { products: true } },
            },
          },
        },
        orderBy: { changedAt: 'desc' },
      }),
      prisma.supplierIngredient.findMany({
        where: {
          ingredient: { accountId },
          isQuarantined: true,
        },
        select: {
          id: true,
          supplierId: true,
          ingredientId: true,
          packageSize: true,
          packageUnit: true,
          packagePrice: true,
          pendingPackagePrice: true,
          quarantinedAt: true,
          quarantineReason: true,
          isDefault: true,
          ingredient: { select: { id: true, name: true, unit: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: [{ quarantinedAt: 'asc' }, { id: 'asc' }],
      }),
      getPurchasingSuggestions(accountId),
    ]);

  const healthSummary = calculateCatalogHealthSummary(
    products.map((product) => ({
      marginPercent: product.marginPercent,
      minMarginPercent: product.minMarginPercent,
      ingredientsCount: product._count?.ingredients ?? 0,
    }))
  );

  const belowMinimumCandidates: Array<{
    id: string;
    name: string;
    salePrice: Prisma.Decimal;
    cost: Prisma.Decimal;
    marginPercent: Prisma.Decimal;
    minMarginPercent: Prisma.Decimal;
    status: 'loss' | 'risk';
  }> = [];

  for (const product of products) {
    const ingredientsCount = product._count?.ingredients ?? 0;
    const marginPercent = new Decimal(product.marginPercent ?? 0);
    const minMarginPercent = new Decimal(product.minMarginPercent ?? 0);
    const bucket = classifyProductHealthBucket(marginPercent, minMarginPercent, ingredientsCount);

    if (bucket === 'loss' || bucket === 'risk') {
      belowMinimumCandidates.push({
        id: product.id,
        name: product.name,
        salePrice: new Decimal(product.salePrice ?? 0),
        cost: new Decimal(product.cost ?? 0),
        marginPercent,
        minMarginPercent,
        status: bucket,
      });
    }
  }

  belowMinimumCandidates.sort((a, b) => {
    const marginCmp = a.marginPercent.comparedTo(b.marginPercent);
    if (marginCmp !== 0) return marginCmp;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  const belowMinimumItems: BelowMinimumProductReportItem[] = belowMinimumCandidates
    .slice(0, BELOW_MIN_LIMIT)
    .map((item) => ({
      productId: item.id,
      name: item.name,
      salePrice: item.salePrice.toFixed(2),
      cost: item.cost.toFixed(2),
      marginPercent: item.marginPercent.toFixed(2),
      minMarginPercent: item.minMarginPercent.toFixed(2),
      suggestedSalePrice: calculateSuggestedSalePrice(item.cost, item.minMarginPercent).toFixed(2),
      status: item.status,
    }));

  const costChangeCandidates = weeklyPriceHistory.map((row) => {
    const oldCost = new Decimal(String(row.oldCost));
    const newCost = new Decimal(String(row.newCost));
    const variationPercent = oldCost.gt(ZERO)
      ? newCost.sub(oldCost).div(oldCost).mul(HUNDRED).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : ZERO;

    return {
      id: row.id,
      ingredientId: row.ingredientId,
      ingredientName: row.ingredient.name,
      unit: row.ingredient.unit,
      oldCost,
      newCost,
      variationPercent,
      absVariation: variationPercent.abs(),
      changedAt: row.changedAt,
      affectedProductsCount: row.ingredient._count?.products ?? 0,
    };
  });

  costChangeCandidates.sort((a, b) => {
    const variationCmp = b.absVariation.comparedTo(a.absVariation);
    if (variationCmp !== 0) return variationCmp;
    const dateCmp = b.changedAt.getTime() - a.changedAt.getTime();
    if (dateCmp !== 0) return dateCmp;
    return a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
  });

  const weeklyCostChangeItems: WeeklyCostChangeReportItem[] = costChangeCandidates
    .slice(0, COST_CHANGES_LIMIT)
    .map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      unit: item.unit,
      oldCost: item.oldCost.toFixed(2),
      newCost: item.newCost.toFixed(2),
      variationPercent: item.variationPercent.toFixed(2),
      changedAt: item.changedAt.toISOString(),
      affectedProductsCount: item.affectedProductsCount,
    }));

  const quarantineItems: QuarantineReportItem[] = quarantinedRows
    .slice(0, QUARANTINE_LIMIT)
    .map((row) => {
      const currentPackagePrice = new Decimal(String(row.packagePrice));
      const pendingPackagePrice = new Decimal(
        String(row.pendingPackagePrice ?? row.packagePrice)
      );
      const packageSize = new Decimal(String(row.packageSize));
      const currentUnitCost = packageSize.gt(ZERO)
        ? currentPackagePrice.div(packageSize).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : ZERO;
      const proposedUnitCost = packageSize.gt(ZERO)
        ? pendingPackagePrice.div(packageSize).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : ZERO;
      const variationPercent = currentPackagePrice.gt(ZERO)
        ? pendingPackagePrice
            .sub(currentPackagePrice)
            .div(currentPackagePrice)
            .mul(HUNDRED)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : ZERO;

      return {
        supplierIngredientId: row.id,
        ingredientId: row.ingredientId,
        ingredientName: row.ingredient.name,
        unit: row.ingredient.unit,
        supplierId: row.supplierId,
        supplierName: row.supplier.name,
        currentPackagePrice: currentPackagePrice.toFixed(2),
        pendingPackagePrice: pendingPackagePrice.toFixed(2),
        currentUnitCost: currentUnitCost.toFixed(2),
        proposedUnitCost: proposedUnitCost.toFixed(2),
        variationPercent: variationPercent.toFixed(2),
        quarantineReason: row.quarantineReason ?? 'SIN_MOTIVO',
        quarantinedAt: row.quarantinedAt ? row.quarantinedAt.toISOString() : null,
        isDefault: row.isDefault,
      };
    });

  const sortedSavings = [...purchasingSuggestions.byIngredient].sort((a, b) => {
    const packageCmp = new Decimal(b.packageSavings).comparedTo(new Decimal(a.packageSavings));
    if (packageCmp !== 0) return packageCmp;
    const percentCmp = new Decimal(b.savingsPercent).comparedTo(new Decimal(a.savingsPercent));
    if (percentCmp !== 0) return percentCmp;
    return a.ingredientName.localeCompare(b.ingredientName, 'es', { sensitivity: 'base' });
  });

  const purchasingSavingItems: PurchasingSavingReportItem[] = sortedSavings
    .slice(0, SAVINGS_LIMIT)
    .map((item) => ({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      unit: item.unit,
      currentSupplierName: item.defaultPresentation.supplierName,
      currentUnitCost: item.defaultPresentation.unitCost,
      bestSupplierName: item.cheapestPresentation.supplierName,
      bestUnitCost: item.cheapestPresentation.unitCost,
      packageSize: item.cheapestPresentation.packageSize,
      packagePrice: item.cheapestPresentation.packagePrice,
      savingsPerUnit: item.savingsPerUnit,
      savingsPercent: item.savingsPercent,
      packageSavings: item.packageSavings,
    }));

  const staleCandidates: Array<{
    id: string;
    name: string;
    unit: string;
    currentCost: Prisma.Decimal;
    lastUpdatedAt: Date;
    daysWithoutUpdate: number;
  }> = [];

  // Ingredient no tiene createdAt ni costUpdatedAt: si nunca tuvo PriceHistory hasta `to`,
  // se toma `updatedAt` como fecha de referencia (limitación conocida ante ediciones de nombre).
  for (const ingredient of ingredients) {
    const lastUpdatedAt = ingredient.priceHistory[0]?.changedAt ?? ingredient.updatedAt;
    if (lastUpdatedAt.getTime() < staleCutoff.getTime()) {
      const daysWithoutUpdate = Math.floor(
        (to.getTime() - lastUpdatedAt.getTime()) / MS_PER_DAY
      );
      staleCandidates.push({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentCost: new Decimal(String(ingredient.currentCost)),
        lastUpdatedAt,
        daysWithoutUpdate,
      });
    }
  }

  staleCandidates.sort((a, b) => {
    const dateCmp = a.lastUpdatedAt.getTime() - b.lastUpdatedAt.getTime();
    if (dateCmp !== 0) return dateCmp;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  // Ventas de la semana (ADR-010): mismo período del reporte, solo con el módulo prendido.
  const features = await getAccountFeatures(accountId);
  const salesSection: WeeklySalesSection | null = features.sales ? await salesSummaryBetween(accountId, from, to) : null;

  const staleCostItems: StaleCostReportItem[] = staleCandidates
    .slice(0, STALE_COSTS_LIMIT)
    .map((item) => ({
      ingredientId: item.id,
      name: item.name,
      unit: item.unit,
      currentCost: item.currentCost.toFixed(2),
      lastUpdatedAt: item.lastUpdatedAt.toISOString(),
      daysWithoutUpdate: item.daysWithoutUpdate,
    }));

  return {
    account: {
      id: account.id,
      businessName: account.businessName,
      slug: account.slug,
      defaultMinMarginPercent: new Decimal(account.defaultMinMarginPercent).toFixed(2),
    },
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: ARGENTINA_TIMEZONE,
      fromFormatted: formatArgentinaDate(from),
      toFormatted: formatArgentinaDate(to),
    },
    generatedAt: to.toISOString(),
    catalogHealth: {
      ...healthSummary,
      activeIngredientsCount: ingredients.length,
    },
    belowMinimumProducts: {
      totalCount: belowMinimumCandidates.length,
      items: belowMinimumItems,
    },
    weeklyCostChanges: {
      totalCount: costChangeCandidates.length,
      items: weeklyCostChangeItems,
    },
    quarantine: {
      totalCount: quarantinedRows.length,
      items: quarantineItems,
    },
    purchasingSavings: {
      totalCount: purchasingSuggestions.byIngredient.length,
      items: purchasingSavingItems,
    },
    staleCosts: {
      totalCount: staleCandidates.length,
      thresholdDays: STALE_COST_DAYS,
      items: staleCostItems,
    },
    ...(salesSection ? { sales: salesSection } : {}),
  };
}
</file>

<file path="backend/src/services/salesService.ts">
import { Prisma, type PaymentMethod, type Role, type Sale, type SaleItem } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../utils/pagination';
import { calculateMarginPercent } from './marginCalculator';

/*
  Venta con ticket no fiscal (ADR-010, docs/especificacion-funcional.md §13).
  Cada renglón guarda el precio, el costo y el margen DEL MOMENTO de la venta, así
  la ganancia histórica no cambia cuando cambia un costo (ADR-005). El precio y el
  costo salen siempre de la base, nunca del cliente.
*/

const Decimal = Prisma.Decimal;
type DecimalType = Prisma.Decimal;

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['CASH', 'TRANSFER', 'MERCADO_PAGO'];
export const MAX_SALE_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 999;
const MAX_TICKET_ATTEMPTS = 3;
const VOID_REASON_MIN = 3;
const VOID_REASON_MAX = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
/** Argentina no tiene horario de verano: el día va de 00:00 a 24:00 en UTC−3. */
const ARGENTINA_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

export const NO_OPEN_SHIFT_MESSAGE = 'No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.';
export const CLOSED_SHIFT_VOID_MESSAGE =
  'Solo se pueden anular ventas del turno abierto. El turno de esta venta ya se cerró y su arqueo no cambia.';

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface SaleInput {
  paymentMethod: PaymentMethod;
  items: SaleItemInput[];
}

export interface ProductForSale {
  id: string;
  name: string;
  salePrice: DecimalType;
  cost: DecimalType;
  ingredientsCount: number;
}

export interface SaleLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: DecimalType;
  unitCost: DecimalType;
  marginPercent: DecimalType;
  lineTotal: DecimalType;
  lineCost: DecimalType;
}

export type SaleWithItems = Sale & { items: SaleItem[] };

export interface SaleListQuery {
  page: number;
  limit: number;
  date?: string;
  cashShiftId?: string;
}

/** El vendedor que pide la operación: la cuenta sale siempre de la sesión (DoD §6). */
export interface SaleActor {
  id: string;
  accountId: string;
  role: Role;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Valida el cuerpo de `POST /api/sales`. Solo toma producto, cantidad y medio de pago. */
export function parseSaleInput(body: unknown): SaleInput {
  const data = isRecord(body) ? body : {};
  const paymentMethod = data.paymentMethod;
  if (typeof paymentMethod !== 'string' || !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    throw new AppError('Elegí el medio de pago: efectivo, transferencia o Mercado Pago.', 400);
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new AppError('La venta tiene que tener al menos un producto.', 400);
  }

  const quantities = new Map<string, number>();
  for (const raw of data.items) {
    const item = isRecord(raw) ? raw : {};
    const productId = item.productId;
    if (typeof productId !== 'string' || !UUID_REGEX.test(productId)) {
      throw new AppError('Cada renglón tiene que indicar un producto válido.', 400);
    }
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new AppError(`La cantidad de cada producto tiene que ser un número entero entre 1 y ${MAX_ITEM_QUANTITY}.`, 400);
    }
    const accumulated = (quantities.get(productId) ?? 0) + quantity;
    if (accumulated > MAX_ITEM_QUANTITY) {
      throw new AppError(`La cantidad de cada producto tiene que ser un número entero entre 1 y ${MAX_ITEM_QUANTITY}.`, 400);
    }
    quantities.set(productId, accumulated);
  }

  if (quantities.size > MAX_SALE_ITEMS) {
    throw new AppError(`Una venta puede tener hasta ${MAX_SALE_ITEMS} productos distintos.`, 400);
  }

  return {
    paymentMethod: paymentMethod as PaymentMethod,
    items: [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
  };
}

/**
 * Arma los renglones con el precio y el costo vigentes del producto. Rechaza los productos
 * que no son de la cuenta (404), los borradores sin receta y los que tienen precio en $0 (422).
 */
export function buildSaleLines(
  items: SaleItemInput[],
  products: ProductForSale[]
): { lines: SaleLine[]; total: DecimalType; totalCost: DecimalType } {
  const byId = new Map(products.map((product) => [product.id, product]));
  let total = new Decimal(0);
  let totalCost = new Decimal(0);

  const lines = items.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product) {
      throw new AppError('Uno de los productos de la venta no existe.', 404);
    }
    if (product.ingredientsCount === 0) {
      throw new AppError(`"${product.name}" está en borrador (no tiene receta) y no se puede vender.`, 422);
    }
    if (product.salePrice.lte(0)) {
      throw new AppError(`"${product.name}" no tiene precio de venta cargado y no se puede vender.`, 422);
    }

    const unitPrice = product.salePrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const unitCost = product.cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const lineTotal = unitPrice.mul(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const lineCost = unitCost.mul(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    total = total.add(lineTotal);
    totalCost = totalCost.add(lineCost);

    return {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      unitCost,
      marginPercent: calculateMarginPercent(unitPrice, unitCost),
      lineTotal,
      lineCost,
    };
  });

  return { lines, total, totalCost };
}

const money = (value: DecimalType) => new Decimal(value).toFixed(2);

/** Respuesta de una venta. Al COLLABORATOR no le llega ningún campo de costo ni de margen. */
export function serializeSale(sale: SaleWithItems, role: Role, businessName: string) {
  const isAdmin = role === 'ADMIN';
  const totalCost = sale.items.reduce((sum, item) => sum.add(item.lineCost), new Decimal(0));

  return {
    id: sale.id,
    ticketNumber: sale.ticketNumber,
    businessName,
    soldAt: sale.soldAt.toISOString(),
    paymentMethod: sale.paymentMethod,
    total: money(sale.total),
    ...(isAdmin ? { totalCost: money(totalCost) } : {}),
    status: sale.status,
    cashShiftId: sale.cashShiftId,
    voidedAt: sale.voidedAt ? sale.voidedAt.toISOString() : null,
    voidReason: sale.voidReason,
    items: sale.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
      ...(isAdmin
        ? { unitCost: money(item.unitCost), lineCost: money(item.lineCost), marginPercent: money(item.marginPercent) }
        : {}),
    })),
  };
}

function isValidIsoDate(text: string): boolean {
  if (!ISO_DATE_REGEX.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

/** Rango de un día calendario de Argentina, para filtrar por `soldAt`. */
export function argentinaDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00${ARGENTINA_OFFSET}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Filtros de `GET /api/sales`: página, día (AAAA-MM-DD, hora de Argentina) y turno. */
export function parseSaleListQuery(query: Record<string, unknown>): SaleListQuery {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const rawLimit = Number(query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const result: SaleListQuery = { page, limit };

  if (query.date !== undefined) {
    if (typeof query.date !== 'string' || !isValidIsoDate(query.date)) {
      throw new AppError('La fecha tiene que tener el formato AAAA-MM-DD.', 400);
    }
    result.date = query.date;
  }
  if (query.cashShiftId !== undefined) {
    if (typeof query.cashShiftId !== 'string' || !UUID_REGEX.test(query.cashShiftId)) {
      throw new AppError('El turno indicado no es válido.', 400);
    }
    result.cashShiftId = query.cashShiftId;
  }
  return result;
}

/** Motivo obligatorio de una anulación. */
export function parseVoidReason(body: unknown): string {
  const raw = isRecord(body) && typeof body.reason === 'string' ? body.reason.trim() : '';
  if (raw.length < VOID_REASON_MIN) {
    throw new AppError('Escribí el motivo de la anulación.', 400);
  }
  if (raw.length > VOID_REASON_MAX) {
    throw new AppError(`El motivo puede tener hasta ${VOID_REASON_MAX} caracteres.`, 400);
  }
  return raw;
}

function isTicketNumberConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  return fields.some((field) => field.includes('ticketNumber'));
}

/**
 * Registra una venta en una sola transacción: turno abierto, precios y costos vigentes,
 * número de ticket correlativo por cuenta y renglones congelados. Si dos ventas toman el
 * mismo número a la vez, el índice único lo rechaza y se reintenta con el siguiente.
 */
export async function createSale(actor: SaleActor, input: SaleInput): Promise<SaleWithItems> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Bloqueo compartido sobre la fila del turno hasta el fin de la transacción: el cierre
        // (que actualiza esa fila) espera a que termine la venta, y una venta que llega
        // durante un cierre espera y encuentra el turno cerrado. Así ninguna venta queda
        // afuera de un arqueo ya calculado.
        const [shift] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "CashShift"
          WHERE "accountId" = ${actor.accountId} AND "status" = 'OPEN'
          FOR SHARE`;
        if (!shift) {
          throw new AppError(NO_OPEN_SHIFT_MESSAGE, 409);
        }

        const products = await tx.product.findMany({
          where: { accountId: actor.accountId, id: { in: input.items.map((item) => item.productId) } },
          select: { id: true, name: true, salePrice: true, cost: true, _count: { select: { ingredients: true } } },
        });
        const { lines, total } = buildSaleLines(
          input.items,
          products.map((product) => ({
            id: product.id,
            name: product.name,
            salePrice: product.salePrice,
            cost: product.cost,
            ingredientsCount: product._count.ingredients,
          }))
        );

        const last = await tx.sale.aggregate({
          where: { accountId: actor.accountId },
          _max: { ticketNumber: true },
        });

        return tx.sale.create({
          data: {
            accountId: actor.accountId,
            cashShiftId: shift.id,
            soldById: actor.id,
            ticketNumber: (last._max.ticketNumber ?? 0) + 1,
            paymentMethod: input.paymentMethod,
            total,
            items: { create: lines },
          },
          include: { items: true },
        });
      });
    } catch (error) {
      if (attempt < MAX_TICKET_ATTEMPTS && isTicketNumberConflict(error)) continue;
      throw error;
    }
  }
}

/** El colaborador solo ve sus ventas; el ADMIN, las de toda la cuenta. */
function visibleSalesWhere(actor: SaleActor): Prisma.SaleWhereInput {
  return actor.role === 'ADMIN'
    ? { accountId: actor.accountId }
    : { accountId: actor.accountId, soldById: actor.id };
}

export async function listSales(actor: SaleActor, query: SaleListQuery) {
  const where: Prisma.SaleWhereInput = { ...visibleSalesWhere(actor) };
  if (query.date) {
    const { start, end } = argentinaDayRange(query.date);
    where.soldAt = { gte: start, lt: end };
  }
  if (query.cashShiftId) {
    where.cashShiftId = query.cashShiftId;
  }

  const [total, sales] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { soldAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        ticketNumber: true,
        soldAt: true,
        paymentMethod: true,
        total: true,
        status: true,
        cashShiftId: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    data: sales.map((sale) => ({
      id: sale.id,
      ticketNumber: sale.ticketNumber,
      soldAt: sale.soldAt.toISOString(),
      paymentMethod: sale.paymentMethod,
      total: money(sale.total),
      status: sale.status,
      cashShiftId: sale.cashShiftId,
      itemsCount: sale._count.items,
    })),
    meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
  };
}

/** Una venta con sus renglones, o `null` si no existe o el usuario no puede verla. */
export async function findSale(actor: SaleActor, saleId: string) {
  if (!UUID_REGEX.test(saleId)) return null;
  return prisma.sale.findFirst({
    where: { id: saleId, ...visibleSalesWhere(actor) },
    include: { items: { orderBy: { productName: 'asc' } }, account: { select: { businessName: true } } },
  });
}

/**
 * Anula una venta con su motivo; no borra nada. Solo mientras el turno de la venta siga
 * abierto, para que el arqueo de un turno cerrado no cambie nunca. El ADMIN anula
 * cualquier venta del turno; el colaborador, solo las suyas.
 */
export async function voidSale(actor: SaleActor, saleId: string, reason: string) {
  if (!UUID_REGEX.test(saleId)) {
    throw new AppError('La venta no existe.', 404);
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, accountId: actor.accountId },
      select: { id: true, status: true, soldById: true, cashShiftId: true },
    });
    // A un colaborador, la venta de otro usuario le responde igual que una que no existe.
    if (!sale || (actor.role !== 'ADMIN' && sale.soldById !== actor.id)) {
      throw new AppError('La venta no existe.', 404);
    }
    if (sale.status === 'VOIDED') {
      throw new AppError('La venta ya está anulada.', 409);
    }
    // Mismo bloqueo compartido que la venta: un cierre en curso espera a la anulación.
    const [shift] = await tx.$queryRaw<Array<{ status: string }>>`
      SELECT "status" FROM "CashShift"
      WHERE "id" = ${sale.cashShiftId} AND "accountId" = ${actor.accountId}
      FOR SHARE`;
    if (shift?.status !== 'OPEN') {
      throw new AppError(CLOSED_SHIFT_VOID_MESSAGE, 403);
    }

    const updated = await tx.sale.updateMany({
      where: { id: sale.id, accountId: actor.accountId, status: 'COMPLETED' },
      data: { status: 'VOIDED', voidedAt: new Date(), voidedById: actor.id, voidReason: reason },
    });
    if (updated.count === 0) {
      throw new AppError('La venta ya está anulada.', 409);
    }

    return tx.sale.findFirstOrThrow({
      where: { id: sale.id, accountId: actor.accountId },
      include: { items: { orderBy: { productName: 'asc' } }, account: { select: { businessName: true } } },
    });
  });
}
</file>

<file path="docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md">
# 5. Costo Vigente de Insumos, Retención en Cuarentena y Canal de Ingesta Desatendida

* **Estado:** Aceptado. Dos reglas reemplazadas en parte por [ADR-011](0011-costo-manual-con-presentacion-predeterminada.md): la sobrescritura de ediciones manuales y la presentación predeterminada obligatoria, para el costo manual de un insumo con presentación predeterminada.
* **Fecha:** 2026-10-27
* **Decisores:** Darío Giménez (Tech Lead / DevOps), Mauricio Barreras (Lead Backend), Federico Paal (Lead Frontend), Leandro Herrera (QA Engineer)
* **Issue:** #234 (SPRINT5-DOCS-01)
* **Relacionado con:** ADR-003 (n8n Webhooks), ADR-004 (Margen sobre Ventas), `docs/especificacion-funcional.md` (§4, §5, §10), `backend/src/routes/suppliers.ts`, `backend/src/routes/webhooks.ts`

---

## Contexto y Planteamiento del Problema

MargenX protege la rentabilidad de las PyMEs manufactureras y gastronómicas recalculando automáticamente el costo y margen de sus recetas ante variaciones en las materias primas. Sin embargo, en el escenario operativo real:
1. **Múltples presentaciones y proveedores:** Un insumo (ej. *Harina 000*) puede ser provisto por diferentes mayoristas en bultos de distinto tamaño (bolsas de 25 kg, 50 kg o packs fraccionados), con precios dispares. Se requiere definir sin ambigüedad **cuál es el costo que alimenta el cálculo de las recetas** en cada momento.
2. **Volatilidad y errores en listas de proveedores:** Las listas mayoristas reenviadas pueden contener errores tipográficos graves (ej. saltos de coma decimal, precios en cero o aumentos especulativos del 200%). Aplicar estos cambios de forma ciega corrompe el cálculo de márgenes y genera falsas alarmas financieras masivas.
3. **Fricción de carga y polución de catálogo:** Los mayoristas envían catálogos con miles de artículos que el comercio no consume. La ingesta no debe requerir que el usuario pase datos a mano ni debe llenar la base de datos de insumos irrelevantes.

---

## Decisiones de Arquitectura y Dominio

### 1. Regla del Costo Vigente y Proveedor Predeterminado
* El costo activo de un insumo (`Ingredient.currentCost`) utilizado por el motor de costeo de recetas (`marginCalculator.ts`) **proviene estrictamente de la presentación marcada como predeterminada (`SupplierIngredient.isDefault = true`)**.
* **Fórmula de costo unitario:**
  $$\text{unitCost} = \frac{\text{packagePrice}}{\text{packageSize}} \quad (\text{redondeo } \text{ROUND\_HALF\_UP} \text{ a 2 decimales con } Prisma.Decimal)$$
* **Sobrescritura deliberada de ediciones manuales:** Si el Administrador edita a mano `Ingredient.currentCost` desde `/insumos`, ese costo opera como *override* temporal. La próxima actualización legítima proveniente de la presentación predeterminada (sea por ingesta de lista o actualización del empaque) **sobrescribe el costo manual**, garantizando coherencia con la compra física.
* **Unicidad de presentación y estado predeterminado:** Existe como máximo una presentación por par proveedor-insumo (`@@unique([supplierId, ingredientId])`). La regla de negocio exige que todo insumo con proveedores asociados conserve siempre una presentación predeterminada activa. El borrado de una presentación predeterminada está bloqueado (HTTP 409) si existen otras alternativas para el mismo insumo; el usuario debe elegir otra presentación como predeterminada antes de eliminarla. Si es la única presentación, se permite borrarla.

### 2. Bandeja de Cuarentena Preventiva de Precios Anómalos
Para evitar distorsiones en las recetas ante listas con errores o saltos bruscos de precios, el backend aplica un buffer de retención transaccional previo a impactar `Ingredient.currentCost`:
* **Criterios de retención en Cuarentena:**
  1. `VARIACION_MAYOR_50_POR_CIENTO`: Cuando el costo unitario propuesto varía más de un **50 %** en valor absoluto ($|\Delta\%| > 50\%$) respecto del costo vigente.
  2. `COSTO_UNITARIO_INSUFICIENTE`: Cuando el costo unitario resultante es menor o igual a **$0,01** ($\le \$0.01$) o no puede ser liquidado numéricamente.
* **Mecánica de retención:** El precio propuesto se almacena en `SupplierIngredient.pendingPackagePrice`, fijando `isQuarantined = true`, `quarantinedAt = now()` y el motivo en `quarantineReason`. El campo `packagePrice` y el costo del insumo (`currentCost`) **permanecen intactos**, preservando las recetas existentes.
* **Resolución de Cuarentena:**
  * **Liberar (`POST /api/suppliers/quarantine/:id/release`):** El Administrador valida la suba. Se consolida `packagePrice = pendingPackagePrice`, se limpia la cuarentena y, si es la presentación predeterminada (`isDefault = true`), se actualiza `Ingredient.currentCost` y se dispara el recálculo en cascada (`applyIngredientCostChange`).
  * **Rechazar (`POST /api/suppliers/quarantine/:id/reject`):** El Administrador descarta la anomalía. Se purga `pendingPackagePrice = null` y se desmarca la cuarentena. El insumo mantiene su costo vigente seguro. En esta fase del MVP, el rechazo **no emite notificaciones salientes** al proveedor ni al dueño (funcionalidad de Fase 2).
* **Auto-recuperación:** Si una ingesta posterior trae un precio que coincide con el valor vigente activo, la presentación sale de cuarentena automáticamente.

### 3. Canal de Ingesta Desatendida "Zero-Click" y Filtro Anti-Pollution
El flujo de importación opera desacoplado del monolito mediante el satélite n8n:
1. **Entrada de correo perimetral:** El dueño reenvía la lista del distribuidor (Excel/CSV) a `precios-<slug>@margenx.tech` (o alias virtuales compatibles `precios+<slug>@`).
2. **Enrutamiento Cloudflare + Gmail:** Cloudflare Email Routing (regla Catch-All `*@margenx.tech`) entrega el mensaje en la casilla central de Gmail.
3. **Orquestación en n8n:** El nodo IMAP IDLE captura el adjunto, normaliza encabezados heterogéneos y despacha un lote JSON autenticado al webhook `POST /api/webhooks/supplier-prices` con la cabecera `x-margenx-webhook-secret` (validada con `crypto.timingSafeEqual`).
4. **Filtro Anti-Pollution (Regla de Descarte Estricto):** La lista **nunca crea insumos**. El backend busca coincidencias de `supplierCode` sobre la cuenta:
   - Códigos no vinculados se descartan con motivo `NOT_FOUND`.
   - Códigos de proveedores inactivos se descartan con `INACTIVE_SUPPLIER`.
   - Códigos que coinciden con más de un proveedor activo se descartan como `AMBIGUOUS`.
5. **Cierre transaccional y reporte:** Las filas válidas no anómalas actualizan el catálogo; las anómalas van a cuarentena. n8n recibe el consolidado y despacha un correo de resumen ejecutivo al Administrador mediante Brevo SMTP Relay.

### 4. Integridad Referencial y Borrado Seguro
* En PostgreSQL, las relaciones secundarias cuelgan con `onDelete: Cascade` para permitir el purgado completo y seguro de organizaciones (`Account`) sin violaciones de clave foránea.
* A nivel de aplicación, `DELETE /api/ingredients/:id` intercepta dependencias: si el insumo está vinculado a una o más recetas en `ProductIngredient`, **aborta la operación respondiendo HTTP 409 Conflict** con el arreglo `productsAffected`, impidiendo la pérdida accidental de fichas técnicas.
* A nivel de presentación, `DELETE /api/suppliers/:id/ingredients/:ingredientId` evita dejar el insumo sin un costo base confiable: si la presentación a borrar es la predeterminada y el insumo tiene al menos otra presentación, aborta la operación con `HTTP 409 Conflict` solicitando que el usuario designe otra como predeterminada primero.

---

## Puntos de Implementación en el Código Fuente

Esta decisión arquitectónica se materializa en los siguientes puntos críticos del backend:

1. **Liberación de Cuarentena con Recálculo en Cascada:**
   * Archivo: `backend/src/routes/suppliers.ts`
   * Handler: `router.post('/quarantine/:id/release')`
   * Detalle: Comprueba `quarantined.isDefault`, actualiza `Ingredient.currentCost = unitCost` y ejecuta `applyIngredientCostChange`.
2. **Homologación y Conmutación de Proveedor Predeterminado (Upsert):**
   * Archivo: `backend/src/routes/suppliers.ts`
   * Handler: `router.post('/:id/ingredients')`
   * Detalle: Desmarca defaults previos mediante `updateMany({ where: { ingredientId, id: { not: ... } }, data: { isDefault: false } })`, actualiza el costo unitario del insumo y liquida la cascada transaccional.
3. **Ingesta Batch con Filtro Anti-Pollution y Retención de Cuarentena:**
   * Archivo: `backend/src/routes/webhooks.ts`
   * Handler: `router.post('/supplier-prices')`
   * Detalle: Evalúa variación $>50\%$ y costo $\le \$0.01$, retiene en `pendingPackagePrice` o actualiza `Ingredient.currentCost` disparando `applyIngredientCostChange` para ítems con `mapped.isDefault`.

---

## Consecuencias y Compensaciones (Trade-offs)

### Positivas
* **Cero Polución:** La base de datos queda completamente blindada contra catálogos masivos basura de distribuidores.
* **Estabilidad de Recetas:** Ningún error tipográfico del proveedor distorsiona márgenes ni dispara falsas alarmas de rentabilidad sin revisión humana previa.
* **Determinismo:** El costo de costeo es único y auditable; las decisiones del comerciante sobre su proveedor habitual quedan registradas de forma trazable y el sistema previene activamente el borrado accidental del proveedor predeterminado.

### Negativas / Deuda Asumida
* **Rechazo silencioso en cuarentena:** Al rechazar un precio anómalo no se genera una notificación externa al proveedor. Queda como propuesta para la Fase 2.
* **Monopresentación:** No es posible registrar dos tamaños de empaque distintos (ej. bolsa 25 kg y pack 5 kg) del mismo proveedor para un mismo insumo debido a la restricción relacional `@@unique([supplierId, ingredientId])`.
</file>

<file path="backend/src/routes/auth.test.ts">
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRouter from './auth';
import { prisma } from '../lib/prisma';
import { errorHandler } from '../middlewares/errorHandler';

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const features = vi.hoisted(() => ({ getAccountFeatures: vi.fn() }));
vi.mock('../lib/features', () => ({ getAccountFeatures: features.getAccountFeatures }));

let mockUser: any = {
  id: 'user-1',
  accountId: 'acc-1',
  email: 'admin@test.com',
  role: 'ADMIN',
  account: {
    id: 'acc-1',
    businessName: 'Panadería Central',
    defaultMinMarginPercent: 30,
    slug: 'panaderia-central',
  },
};

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

describe('Routes: Auth (/api/auth)', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    features.getAccountFeatures.mockResolvedValue({ sales: false });
    mockUser = {
      id: 'user-1',
      accountId: 'acc-1',
      email: 'admin@test.com',
      role: 'ADMIN',
      account: {
        id: 'acc-1',
        businessName: 'Panadería Central',
        defaultMinMarginPercent: 30,
        slug: 'panaderia-central',
      },
    };

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  describe('GET /api/auth/me', () => {
    it('retorna el usuario completo para rol ADMIN', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.account.defaultMinMarginPercent).toBe(30);
      expect(res.body.user.account.slug).toBe('panaderia-central');
    });

    it('sanitiza defaultMinMarginPercent para rol COLLABORATOR', async () => {
      mockUser = {
        id: 'user-2',
        accountId: 'acc-1',
        email: 'colab@test.com',
        role: 'COLLABORATOR',
        account: {
          id: 'acc-1',
          businessName: 'Panadería Central',
          defaultMinMarginPercent: 30,
          slug: 'panaderia-central',
        },
      };

      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('COLLABORATOR');
      expect(res.body.user.account.id).toBe('acc-1');
      expect(res.body.user.account.businessName).toBe('Panadería Central');
      expect(res.body.user.account.defaultMinMarginPercent).toBeUndefined();
      expect(res.body.user.account.slug).toBeUndefined();
      expect(res.body.user.features).toEqual({ sales: false });
    });

    it('informa features.sales = false para una cuenta sin el módulo de ventas (ADR-010)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user.features).toEqual({ sales: false });
      expect(features.getAccountFeatures).toHaveBeenCalledWith('acc-1');
    });

    it('informa features.sales = true para la cuenta Demo con la excepción prendida', async () => {
      mockUser = {
        id: '31d00001-0000-4000-8000-000000000001',
        accountId: '31a00000-0000-4000-8000-000000000001',
        email: 'demo-admin@margenx.tech',
        role: 'ADMIN',
        account: {
          id: '31a00000-0000-4000-8000-000000000001',
          businessName: 'Demo MargenX',
          defaultMinMarginPercent: 30,
          slug: 'demo-margenx',
        },
      };
      features.getAccountFeatures.mockResolvedValue({ sales: true });

      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user.features).toEqual({ sales: true });
      expect(features.getAccountFeatures).toHaveBeenCalledWith('31a00000-0000-4000-8000-000000000001');
    });

    it('el colaborador recibe los módulos de su cuenta: vende aunque no vea costos', async () => {
      mockUser = { ...mockUser, id: 'user-2', role: 'COLLABORATOR', email: 'colab@test.com' };
      features.getAccountFeatures.mockResolvedValue({ sales: true });

      const res = await request(app).get('/api/auth/me');

      expect(res.body.user.features).toEqual({ sales: true });
      expect(res.body.user.account.defaultMinMarginPercent).toBeUndefined();
    });
  });

  describe('PATCH /api/auth/account/margin', () => {
    it('bloquea a usuarios con rol COLLABORATOR con status 403', async () => {
      mockUser.role = 'COLLABORATOR';
      const res = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 40 });

      expect(res.status).toBe(403);
    });

    it('rechaza porcentaje no numérico o ausente con 400', async () => {
      const res1 = await request(app)
        .patch('/api/auth/account/margin')
        .send({});
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 'invalid' });
      expect(res2.status).toBe(400);
    });

    it('rechaza porcentajes menores a 0 o mayores a 100 con 400', async () => {
      const resNeg = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: -5 });
      expect(resNeg.status).toBe(400);

      const resMax = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 105 });
      expect(resMax.status).toBe(400);
    });

    it('actualiza el margen global de la cuenta exitosamente con 200', async () => {
      vi.mocked(prisma.account.update).mockResolvedValueOnce({
        id: 'acc-1',
        businessName: 'Panadería Central',
        defaultMinMarginPercent: 45 as any,
      } as any);

      const res = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 45 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Margen global actualizado correctamente');
      expect(res.body.account.defaultMinMarginPercent).toBe(45);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { defaultMinMarginPercent: 45 },
        select: {
          id: true,
          businessName: true,
          defaultMinMarginPercent: true,
        },
      });
    });
  });

  describe('Equipo de la cuenta (routes/collaborators.ts)', () => {
    it('monta GET /api/auth/users bajo el router de autenticación', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);

      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ users: [] });
    });
  });
});
</file>

<file path="backend/src/routes/salesModule.test.ts">
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middlewares/errorHandler';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), findOpenShift: vi.fn() }));
vi.mock('../lib/prisma', () => ({
  prisma: { account: { findUnique: db.findUnique }, cashShift: { findFirst: db.findOpenShift } },
}));

const MODULE_OFF = { subscriptionPlan: 'FREE', features: [] };
const MODULE_ON = { subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] };
const accountQuery = (accountId: string) => expect.objectContaining({ where: { id: accountId } });

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser | undefined;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    if (!currentUser) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    req.user = currentUser;
    next();
  },
}));

import { salesRouter, cashShiftsRouter } from './salesModule';

const PANADERIA: TestUser = {
  id: 'u-admin-panaderia',
  accountId: 'acc-panaderia-central',
  email: 'admin.panaderia@seed.example.test',
  role: 'ADMIN',
};
const CAJERA_PANADERIA: TestUser = {
  id: 'u-cajera-panaderia',
  accountId: 'acc-panaderia-central',
  email: 'cajera.panaderia@seed.example.test',
  role: 'COLLABORATOR',
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales', salesRouter);
  app.use('/api/cash-shifts', cashShiftsRouter);
  app.use(errorHandler);
  return app;
}

describe('Módulo de ventas apagado (ADR-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = PANADERIA;
    db.findUnique.mockResolvedValue(MODULE_OFF);
  });

  it.each([
    ['GET', '/api/sales'],
    ['GET', '/api/sales/9f1c2a3b-0000-4000-8000-000000000001'],
    ['POST', '/api/sales'],
    ['POST', '/api/sales/9f1c2a3b-0000-4000-8000-000000000001/void'],
    ['GET', '/api/cash-shifts/current'],
    ['POST', '/api/cash-shifts/open'],
    ['POST', '/api/cash-shifts/9f1c2a3b-0000-4000-8000-000000000002/close'],
  ])('%s %s responde 404 si la cuenta no tiene el módulo', async (method, path) => {
    const app = buildApp();
    const res = method === 'GET' ? await request(app).get(path) : await request(app).post(path).send({});

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recurso no encontrado.' });
    expect(db.findUnique).toHaveBeenCalledWith(accountQuery('acc-panaderia-central'));
  });

  it('también responde 404 al colaborador de una cuenta sin el módulo', async () => {
    currentUser = CAJERA_PANADERIA;

    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(404);
  });

  it('exige sesión antes de consultar el módulo', async () => {
    currentUser = undefined;

    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });
});

describe('Módulo de ventas prendido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = PANADERIA;
    db.findUnique.mockResolvedValue(MODULE_ON);
    db.findOpenShift.mockResolvedValue(null);
  });

  it('pasa la compuerta del módulo: las rutas de la caja llegan a su router', async () => {
    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ shift: null });
    expect(db.findUnique).toHaveBeenCalledWith(accountQuery('acc-panaderia-central'));
  });
});
</file>

<file path="backend/src/routes/webhooks.test.ts">
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';

const accountFindUniqueMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();
const supplierIngredientUpdateMock = vi.fn();
const ingredientFindUniqueMock = vi.fn();
const ingredientUpdateMock = vi.fn();
const transactionMock = vi.fn(async (callback: (tx: any) => Promise<void>, _options?: unknown) => callback({
  supplierIngredient: { update: supplierIngredientUpdateMock },
  ingredient: {
    findUnique: ingredientFindUniqueMock,
    update: ingredientUpdateMock,
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
    },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
    },
    $transaction: (callback: (tx: any) => Promise<void>, options?: unknown) => transactionMock(callback, options),
  },
}));

vi.mock('../services/marginCalculator', () => ({
  calculateUnitCost: (price: Prisma.Decimal, packageSize: Prisma.Decimal) => {
    return price.div(packageSize).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  },
  applyIngredientCostChange: vi.fn().mockResolvedValue({
    affectedProductsCount: 0,
    affectedProducts: [],
    criticalProducts: [],
  }),
  applyBatchIngredientCostChanges: vi.fn().mockResolvedValue({
    affectedProductsCount: 0,
    affectedProducts: [],
    criticalProducts: [],
  }),
}));

import * as marginCalculator from '../services/marginCalculator';
import webhooksRouter from './webhooks';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use('/api/webhooks', express.json({ limit: '5mb' }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api/webhooks', webhooksRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/webhooks/supplier-prices', () => {
  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';
    accountFindUniqueMock.mockReset();
    supplierIngredientFindManyMock.mockReset();
    supplierIngredientUpdateMock.mockReset();
    ingredientFindUniqueMock.mockReset();
    ingredientUpdateMock.mockReset();
    vi.mocked(marginCalculator.applyBatchIngredientCostChanges).mockReset();
    vi.mocked(marginCalculator.applyBatchIngredientCostChanges).mockResolvedValue({
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    });
    transactionMock.mockClear();
  });

  it('acepta una lista de 1,2 MB dentro del límite del webhook y no responde 500', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-OK',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-OK', description: 'x'.repeat(1_200_000), price: 1100 }],
      });

    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(res.body).toMatchObject({
      received: 1,
      account: {
        tradeName: 'Panadería Central',
        ownerEmail: 'admin@panaderia.example',
      },
    });
  });

  it('devuelve 413 cuando la lista supera el límite de tamaño del webhook', async () => {
    const hugeDescription = 'x'.repeat(6 * 1024 * 1024);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-TOO-LARGE', description: hugeDescription, price: 1234 }],
      });

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      error: expect.stringContaining('demasiado grande'),
    });
    expect(res.body.error).toContain('Divid');
  });

  it('deduplica el payload y devuelve ownerEmail en la respuesta', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-990',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [
          { code: 'MC-990', price: 1100 },
          { code: 'MC-990', price: 1200 },
          { code: 'NO-EXISTE', price: 999 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.duplicates).toBe(1);
    expect(res.body.received).toBe(3);
    expect(res.body.updated).toBe(1);
    expect(res.body.account).toEqual({
      tradeName: 'Panadería Central',
      ownerEmail: 'admin@panaderia.example',
    });
    expect(res.body.discardedCodes).toContainEqual({ code: 'NO-EXISTE', reason: 'NOT_FOUND' });
    expect(res.body.received).toBe(
      res.body.updated + res.body.unchanged + res.body.quarantined + res.body.duplicates + res.body.discarded
    );
  });

  it('marca como AMBIGUOUS cuando un código existe en más de un proveedor activo', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-a',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-AMB',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
      {
        id: 'si-b',
        supplierId: 'supplier-2',
        ingredientId: 'ing-2',
        supplierCode: 'MC-AMB',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1200'),
        isDefault: false,
        isQuarantined: false,
        ingredient: { id: 'ing-2', accountId: 'acc-123', currentCost: new Prisma.Decimal('24') },
        supplier: { id: 'supplier-2', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-AMB', price: 2100 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.discarded).toBe(1);
    expect(res.body.discardedCodes).toContainEqual({ code: 'MC-AMB', reason: 'AMBIGUOUS' });
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('no ejecuta la cascada cuando el precio no cambió', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-unchanged',
        supplierId: 'supplier-1',
        ingredientId: 'ing-unchanged',
        supplierCode: 'MC-UNCHANGED',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-unchanged', accountId: 'acc-123', currentCost: new Prisma.Decimal('20') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-UNCHANGED', price: 1000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.unchanged).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(marginCalculator.applyBatchIngredientCostChanges).not.toHaveBeenCalled();
  });

  it('eventos en cuarentena se contabilizan por la presentación previa y retienen el precio propuesto sin pisar el vigente', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-q1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-q1',
        supplierCode: 'MC-Q1',
        packageSize: new Prisma.Decimal('10'),
        packagePrice: new Prisma.Decimal('100'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-q1', accountId: 'acc-123', currentCost: new Prisma.Decimal('10') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-Q1', price: 1000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.quarantined).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-q1' },
      data: expect.objectContaining({
        pendingPackagePrice: new Prisma.Decimal('1000'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
        packagePrice: new Prisma.Decimal('100'),
      }),
    });
  });

  it('rechaza la solicitud si falta el secreto interno', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('rechaza la solicitud si el secreto interno es incorrecto y no ejecuta procesamiento', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'secreto-incorrecto')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando no existe una cuenta activa para el slug indicado', async () => {
    accountFindUniqueMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'slug-inexistente',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No existe una cuenta activa para el slug indicado.');
  });

  it('rechaza un payload mayor a 5000 items con 400 Bad Request', async () => {
    const items = Array.from({ length: 5001 }, (_, index) => ({
      code: `SKU-${index + 1}`,
      description: `Producto ${index + 1}`,
      price: 15.5 + index,
    }));

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('5000');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('descarta silenciosamente los artículos no mapeados y actualiza solo los coincidentes', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('35') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'supplier-1',
        ingredientId: 'ing-1',
        supplierCode: 'MC-990',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('70000'),
        isDefault: true,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('35') },
      },
    ]);

    const items = [
      { code: 'MC-990', description: 'Harina 50kg', price: 1750 },
      { code: 'ART-001', description: 'Producto ajeno 1', price: 99 },
      { code: 'ART-002', description: 'Producto ajeno 2', price: 150 },
    ];

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items,
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(3);
    expect(res.body.updated).toBe(0);
    expect(res.body.discarded).toBe(2);
    expect(res.body.duplicates).toBe(0);
    expect(res.body.unchanged).toBe(0);
    expect(res.body.quarantined).toBe(1);
    expect(res.body.criticalProductsAlerts).toEqual([]);
    expect(res.body.discardedCodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ART-001', reason: 'NOT_FOUND' }),
        expect.objectContaining({ code: 'ART-002', reason: 'NOT_FOUND' }),
      ])
    );
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith({
      where: {
        supplierCode: { in: ['MC-990', 'ART-001', 'ART-002'], mode: 'insensitive' },
        ingredient: { accountId: 'acc-123' },
      },
      include: {
        ingredient: true,
        supplier: true,
      },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-1' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('70000'),
        pendingPackagePrice: new Prisma.Decimal('1750'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientFindUniqueMock).not.toHaveBeenCalled();
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyBatchIngredientCostChanges).not.toHaveBeenCalled();
  });

  it('retiene en cuarentena un cambio anómalo que supera el 50% de variación', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('100') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-quarantine',
        supplierId: 'supplier-1',
        ingredientId: 'ing-2',
        supplierCode: 'MC-CUARENTINA',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('10000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-2', accountId: 'acc-123', currentCost: new Prisma.Decimal('100') },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-CUARENTINA', description: 'Manteca', price: 50000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);
    expect(res.body.quarantined).toBe(1);
    expect(res.body.discarded).toBe(0);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-quarantine' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('10000'),
        pendingPackagePrice: new Prisma.Decimal('50000'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyBatchIngredientCostChanges).not.toHaveBeenCalled();
  });

  it('retiene en cuarentena una caída anómala cuando la variación supera el 50% en valor absoluto', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('10000') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-drop',
        supplierId: 'supplier-1',
        ingredientId: 'ing-drop',
        supplierCode: 'MC-DROP',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('10000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-drop', accountId: 'acc-123', currentCost: new Prisma.Decimal('10000') },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-DROP', description: 'Manteca', price: 3000 }],
      });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-drop' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('10000'),
        pendingPackagePrice: new Prisma.Decimal('3000'),
        isQuarantined: true,
        quarantineReason: expect.any(String),
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyBatchIngredientCostChanges).not.toHaveBeenCalled();
  });

  it('cuarentena el precio si el costo unitario calculado es inválido y no rompe el lote', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('10000') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-zero-unit',
        supplierId: 'supplier-1',
        ingredientId: 'ing-zero',
        supplierCode: 'MC-ZERO',
        packageSize: new Prisma.Decimal('10'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-zero', accountId: 'acc-123', currentCost: new Prisma.Decimal('10000') },
      },
    ]);

    const calcSpy = vi.spyOn(marginCalculator, 'calculateUnitCost').mockImplementation(() => {
      throw new Error('El costo unitario calculado debe ser mayor a cero.');
    });

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-ZERO', description: 'Manteca', price: 1 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.quarantined).toBe(1);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-zero-unit' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('1000'),
        pendingPackagePrice: new Prisma.Decimal('1'),
        isQuarantined: true,
        quarantineReason: 'COSTO_UNITARIO_INSUFICIENTE',
        quarantinedAt: expect.any(Date),
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    calcSpy.mockRestore();
  });

  it('limpia la cuarentena cuando llega el mismo precio vigente y había un pendiente', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);
    ingredientFindUniqueMock.mockResolvedValue({ currentCost: new Prisma.Decimal('100') });
    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-same',
        supplierId: 'supplier-1',
        ingredientId: 'ing-same',
        supplierCode: 'MC-SAME',
        packageSize: new Prisma.Decimal('50'),
        packagePrice: new Prisma.Decimal('1000'),
        pendingPackagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: true,
        quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
        quarantinedAt: new Date('2026-10-20T12:00:00.000Z'),
        ingredient: { id: 'ing-same', accountId: 'acc-123', currentCost: new Prisma.Decimal('100') },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'MC-SAME', description: 'Manteca', price: 1000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.unchanged).toBe(1);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'si-same' },
      data: expect.objectContaining({
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      }),
    });
  });
  it('agrupa múltiples insumos por defecto y llama a applyBatchIngredientCostChanges una sola vez', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });

    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-1',
        supplierId: 'sup-1',
        ingredientId: 'ing-1',
        supplierCode: 'CODE-1',
        packageSize: new Prisma.Decimal('10'),
        packagePrice: new Prisma.Decimal('1000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-1', accountId: 'acc-123', currentCost: new Prisma.Decimal('100') },
        supplier: { id: 'sup-1', isActive: true },
      },
      {
        id: 'si-2',
        supplierId: 'sup-1',
        ingredientId: 'ing-2',
        supplierCode: 'CODE-2',
        packageSize: new Prisma.Decimal('5'),
        packagePrice: new Prisma.Decimal('500'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-2', accountId: 'acc-123', currentCost: new Prisma.Decimal('100') },
        supplier: { id: 'sup-1', isActive: true },
      },
    ]);

    vi.mocked(marginCalculator.applyBatchIngredientCostChanges).mockResolvedValueOnce({
      affectedProductsCount: 2,
      affectedProducts: [],
      criticalProducts: [
        {
          productId: 'prod-1',
          productName: 'Pan Flauta',
          previousCost: new Prisma.Decimal('500'),
          newCost: new Prisma.Decimal('600'),
          currentMarginPercent: new Prisma.Decimal('15.00'),
          minMarginPercent: new Prisma.Decimal('30.00'),
        },
      ],
    });

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [
          { code: 'CODE-1', price: 1100 },
          { code: 'CODE-2', price: 550 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    // Se debe llamar exactamente 1 vez con los dos insumos agrupados
    expect(marginCalculator.applyBatchIngredientCostChanges).toHaveBeenCalledTimes(1);
    expect(marginCalculator.applyBatchIngredientCostChanges).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ ingredientId: 'ing-1' }),
        expect.objectContaining({ ingredientId: 'ing-2' }),
      ])
    );
    expect(res.body.criticalProductsAlerts).toHaveLength(1);
    expect(res.body.criticalProductsAlerts[0]).toMatchObject({
      productId: 'prod-1',
      productName: 'Pan Flauta',
      currentMarginPercent: '15.00',
    });
  });

  it('reconoce el código del proveedor de forma insensible a mayúsculas/minúsculas (HAR-000 en BD vs har-000 en lote)', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });

    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-harina',
        supplierId: 'supplier-1',
        ingredientId: 'ing-harina',
        supplierCode: 'HAR-000', // Almacenado en mayúsculas
        packageSize: new Prisma.Decimal('25'),
        packagePrice: new Prisma.Decimal('18000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-harina', accountId: 'acc-123', currentCost: new Prisma.Decimal('720') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'har-000', price: 18500 }], // Enviado en minúsculas
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(1);
    expect(res.body.updated).toBe(1);
    expect(res.body.discarded).toBe(0);
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          supplierCode: { in: ['har-000'], mode: 'insensitive' },
        }),
      })
    );
  });

  it('Gherkin Escenario "Falla a mitad": si falla el recálculo del lote no responde 200 y la transacción se revierte', async () => {
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin@panaderia.example' }],
    });

    supplierIngredientFindManyMock.mockResolvedValue([
      {
        id: 'si-manteca',
        supplierId: 'supplier-1',
        ingredientId: 'ing-manteca',
        supplierCode: 'MAN-500',
        packageSize: new Prisma.Decimal('1'),
        packagePrice: new Prisma.Decimal('10000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-manteca', accountId: 'acc-123', currentCost: new Prisma.Decimal('10000') },
        supplier: { id: 'supplier-1', isActive: true },
      },
      {
        id: 'si-azucar',
        supplierId: 'supplier-1',
        ingredientId: 'ing-azucar',
        supplierCode: 'AZU-001',
        packageSize: new Prisma.Decimal('1'),
        packagePrice: new Prisma.Decimal('3000'),
        isDefault: true,
        isQuarantined: false,
        ingredient: { id: 'ing-azucar', accountId: 'acc-123', currentCost: new Prisma.Decimal('3000') },
        supplier: { id: 'supplier-1', isActive: true },
      },
    ]);

    vi.mocked(marginCalculator.applyBatchIngredientCostChanges).mockRejectedValueOnce(
      new Error('Fallo simulado al guardar Medialunas x12')
    );

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items: [
          { code: 'MAN-500', price: 16000 },
          { code: 'AZU-001', price: 3300 },
        ],
      });

    expect(res.status).toBe(500);
    expect(res.body.updated).toBeUndefined();
    expect(res.body.criticalProductsAlerts).toBeUndefined();
    expect(marginCalculator.applyBatchIngredientCostChanges).toHaveBeenCalledTimes(1);
    // El error sale del callback de $transaction: Prisma revierte todas las escrituras del lote.
    await expect(transactionMock.mock.results[0]?.value).rejects.toThrow(
      'Fallo simulado al guardar Medialunas x12'
    );
  });
});

/* ------------------------------------------------------------------ */
/* #439 ([RV422-I1]): el precio se redondea a 2 decimales             */
/* ------------------------------------------------------------------ */
describe('POST /api/webhooks/supplier-prices - precio redondeado a 2 decimales (#439)', () => {
  // Harina 000 en bolsa de 25 kg a $18.406,39 (packagePrice es Decimal(10, 2) en la base).
  const presentacion = (isDefault: boolean) => ({
    id: 'si-harina-25',
    supplierId: 'supplier-molinera',
    ingredientId: 'ing-harina-000',
    supplierCode: 'HAR-000-25',
    packageSize: new Prisma.Decimal('25'),
    packagePrice: new Prisma.Decimal('18406.39'),
    isDefault,
    isQuarantined: false,
    ingredient: { id: 'ing-harina-000', accountId: 'acc-123', currentCost: new Prisma.Decimal('736.26') },
    supplier: { id: 'supplier-molinera', isActive: true },
  });

  const enviar = (price: number) =>
    request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({ accountSlug: 'panaderia-central', items: [{ code: 'HAR-000-25', price }] });

  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';
    accountFindUniqueMock.mockReset();
    supplierIngredientFindManyMock.mockReset();
    supplierIngredientUpdateMock.mockReset();
    vi.mocked(marginCalculator.applyBatchIngredientCostChanges).mockClear();
    accountFindUniqueMock.mockResolvedValue({
      id: 'acc-123',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      isActive: true,
      users: [{ email: 'admin.panaderia@seed.example.test' }],
    });
  });

  it('Escenario "Precio igual con más decimales": 18406.387654 contra 18406,39 responde unchanged: 1 y no recalcula', async () => {
    supplierIngredientFindManyMock.mockResolvedValue([presentacion(true)]);

    const res = await enviar(18406.387654);

    expect(res.status).toBe(200);
    expect(res.body.unchanged).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
    expect(marginCalculator.applyBatchIngredientCostChanges).not.toHaveBeenCalled();
  });

  it('redondea con ROUND_HALF_UP, como la columna: 18406.385 es 18406,39 y no cuenta como cambio', async () => {
    supplierIngredientFindManyMock.mockResolvedValue([presentacion(false)]);

    const res = await enviar(18406.385);

    expect(res.body.unchanged).toBe(1);
    expect(res.body.updated).toBe(0);
  });

  it('Escenario "Precio distinto": 18406.4 responde updated: 1 y guarda el precio con 2 decimales', async () => {
    supplierIngredientFindManyMock.mockResolvedValue([presentacion(false)]);

    const res = await enviar(18406.4);

    expect(res.body.updated).toBe(1);
    expect(res.body.unchanged).toBe(0);
    const data = (supplierIngredientUpdateMock.mock.calls[0]![0] as { data: { packagePrice: Prisma.Decimal } }).data;
    expect(data.packagePrice.toFixed(2)).toBe('18406.40');
  });

  it('un precio con más decimales se guarda redondeado, igual que lo guardaría la base', async () => {
    supplierIngredientFindManyMock.mockResolvedValue([presentacion(false)]);

    await enviar(18500.4567);

    const data = (supplierIngredientUpdateMock.mock.calls[0]![0] as { data: { packagePrice: Prisma.Decimal } }).data;
    expect(data.packagePrice.equals(new Prisma.Decimal('18500.46'))).toBe(true);
  });
});
</file>

<file path="backend/src/routes/webhooks.ts">
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  applyBatchIngredientCostChanges,
  calculateUnitCost,
  type CriticalMarginProduct,
} from '../services/marginCalculator';

const router = Router();

/**
 * POST /api/webhooks/supplier-prices
 * Webhook de ingesta por proveedor.
 *
 * Contrato de integración con n8n / sistema satélite que reenvía listas de precios
 * recibidas por correo o WhatsApp. El backend valida el secreto compartido, resuelve
 * cada `supplierCode` dentro de la cuenta y del proveedor correcto, descarta filas sin
 * mapeo y conserva un resumen fiable de qué se actualizó, quedó sin cambios, pasó a
 * cuarentena o fue descartado.
 *
 * El diseño está alineado con la documentación del proyecto en /docs:
 * - la identificación del proveedor es implícita por `supplierCode`
 * - las listas no crean nuevos insumos ni contaminan el catálogo
 * - los cambios de costo solo se ejecutan si el valor es real y válido
 * - n8n conserva la lógica de ensamblado del resumen final y de las alertas
 *
 * Payload esperado:
 * {
 *   accountSlug: string,
 *   items: [{ code: string, description?: string, price: number }]
 * }
 * 
 * 200 OK | 400 Payload inválido | 401 No autorizado | 404 Slug inexistente/inactivo
 */
export const supplierPricesIngestSchema = z.object({
  accountSlug: z.string().trim().min(2),
  items: z.array(
    z.object({
      code: z.string().trim().min(1),
      description: z.string().optional(),
      price: z.coerce.number().positive(),
    })
  ).min(1).max(5000),
});

/**
 * Valida la cabecera `x-margenx-webhook-secret` del servicio satélite.
 *
 * Se usa `timingSafeEqual` para evitar ataques de timing en la autenticación
 * inter-servicio. El patrón es fail-closed: si falta o es incorrecto, el webhook
 * responde 401 y no procesa ninguna solicitud.
 */
function hasValidInternalSecret(req: Request): boolean {
  const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET ?? '';
  const incomingSecret = req.get('x-margenx-webhook-secret') ?? '';

  if (!expectedSecret || !incomingSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(incomingSecret);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

/**
 * Procesa la ingesta masiva de precios de un proveedor.
 *
 * Flujo de negocio:
 * 1. valida autenticación interna
 * 2. valida el payload
 * 3. resuelve la cuenta activa por `accountSlug`
 * 4. deduplica items por `code` dentro del mismo lote
 * 5. busca coincidencias de `supplierCode` dentro de la cuenta
 * 6. descarta filas sin mapping, proveedor inactivo o ambiguas
 * 7. compara el precio contra la presentación vigente para decidir:
 *    - mismo precio => `unchanged`
 *    - precio anómalo => `quarantined`
 *    - precio válido => `updated`
 * 8. si aplica, recalcula `Ingredient.currentCost` y dispara la cascada de productos
 * 9. responde un resumen veraz para que n8n construya el correo y el dashboard
 *
 * La lógica respeta la arquitectura definida en /docs:
 * - no crea nuevos insumos
 * - no mezcla proveedores distintos dentro de la misma cuenta
 * - no recalcula si no hubo cambio
 * - no sobreescribe precios en cuarentena
 */
router.post('/supplier-prices', async (req: Request, res: Response) => {
  const startedAt = Date.now();

  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = supplierPricesIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({
      error: issue?.message ?? 'Payload inválido.',
    });
  }

  const { accountSlug, items } = parsed.data;

  const account = await prisma.account.findUnique({
    where: { slug: accountSlug },
    include: {
      users: {
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { email: true },
      },
    },
  });

  if (!account || !account.isActive) {
    throw new AppError('No existe una cuenta activa para el slug indicado.', 404);
  }

  const dedupedItems = new Map<string, (typeof items)[number]>();
  let duplicates = 0;

  for (const item of items) {
    if (dedupedItems.has(item.code)) {
      duplicates += 1;
    }
    dedupedItems.set(item.code, item);
  }

  const uniqueItems = [...dedupedItems.values()];
  const incomingCodes = uniqueItems.map((item) => item.code);
  const mappedRows = await prisma.supplierIngredient.findMany({
    where: {
      supplierCode: { in: incomingCodes, mode: 'insensitive' },
      ingredient: { accountId: account.id },
    },
    include: {
      ingredient: true,
      supplier: true,
    },
  });

  const mappedByCode = new Map<string, typeof mappedRows>();
  for (const row of mappedRows) {
    const key = row.supplierCode?.trim().toLowerCase() ?? '';
    if (!key) continue;
    const bucket = mappedByCode.get(key) ?? [];
    bucket.push(row);
    mappedByCode.set(key, bucket);
  }

  const discardedCodes: Array<{ code: string; reason: string }> = [];
  const criticalProductsAlerts: Array<{
    productId?: string;
    productName?: string;
    previousCost?: string;
    newCost?: string;
    currentMarginPercent?: string;
    minMarginPercent?: string;
  }> = [];

  let updated = 0;
  let unchanged = 0;
  let quarantined = 0;
  let discarded = 0;

  await prisma.$transaction(async (tx: any) => {
    const defaultIngredientChanges: Array<{
      ingredientId: string;
      previousCost: Prisma.Decimal;
      newCost: Prisma.Decimal;
    }> = [];

    for (const item of uniqueItems) {
      const lookupKey = item.code.trim().toLowerCase();
      const rows = mappedByCode.get(lookupKey) ?? [];
      const activeRows = rows.filter((row) => row.supplier?.isActive !== false);

      if (rows.length === 0) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'NOT_FOUND' });
        continue;
      }

      if (activeRows.length === 0) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'INACTIVE_SUPPLIER' });
        continue;
      }

      if (new Set(activeRows.map((row) => row.supplierId)).size > 1) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'AMBIGUOUS' });
        continue;
      }

      const mapped = activeRows[0];
      if (!mapped) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'AMBIGUOUS' });
        continue;
      }

      // packagePrice es Decimal(10, 2): se redondea igual que la columna (ROUND_HALF_UP) antes de comparar y de
      // guardar. Si no, 18406.387654 contra 18406,39 contaba como cambio y recalculaba por nada (#439, [RV422-I1]).
      const newPrice = new Prisma.Decimal(String(item.price)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const previousPackagePrice = mapped.packagePrice;
      let previousUnitCost: Prisma.Decimal;
      let newUnitCost: Prisma.Decimal | null = null;
      let shouldQuarantine = false;
      let quarantineReason = 'VARIACION_MAYOR_50_POR_CIENTO';

      try {
        previousUnitCost = calculateUnitCost(previousPackagePrice, mapped.packageSize);
      } catch (_error) {
        previousUnitCost = new Prisma.Decimal('0');
      }

      try {
        newUnitCost = calculateUnitCost(newPrice, mapped.packageSize);
      } catch (_error) {
        shouldQuarantine = true;
        quarantineReason = 'COSTO_UNITARIO_INSUFICIENTE';
      }

      const zero = new Prisma.Decimal('0');
      const threshold = new Prisma.Decimal('50');
      const variation = previousUnitCost.gt(zero) && newUnitCost
        ? newUnitCost.sub(previousUnitCost).div(previousUnitCost).mul(100).abs()
        : new Prisma.Decimal('1000');

      const isSamePrice = newPrice.equals(previousPackagePrice);
      if (isSamePrice) {
        if (mapped.isQuarantined) {
          await tx.supplierIngredient.update({
            where: { id: mapped.id },
            data: {
              pendingPackagePrice: null,
              isQuarantined: false,
              quarantinedAt: null,
              quarantineReason: null,
            },
          });
        }
        unchanged += 1;
        continue;
      }

      if (!shouldQuarantine && newUnitCost) {
        shouldQuarantine = newUnitCost.lte(new Prisma.Decimal('0.01')) || variation.gt(threshold);
      }
      if (shouldQuarantine && quarantineReason === 'VARIACION_MAYOR_50_POR_CIENTO' && newUnitCost?.lte(new Prisma.Decimal('0.01'))) {
        quarantineReason = 'COSTO_UNITARIO_INSUFICIENTE';
      }

      await tx.supplierIngredient.update({
        where: { id: mapped.id },
        data: shouldQuarantine
          ? {
            packagePrice: previousPackagePrice,
            pendingPackagePrice: newPrice,
            isQuarantined: true,
            quarantinedAt: new Date(),
            quarantineReason,
          }
          : {
            packagePrice: newPrice,
            pendingPackagePrice: null,
            isQuarantined: false,
            quarantinedAt: null,
            quarantineReason: null,
          },
      });

      if (shouldQuarantine) {
        quarantined += 1;
        continue;
      }

      if (mapped.isDefault) {
        const ingredientSnapshot = await tx.ingredient.findUnique({
          where: { id: mapped.ingredientId },
          select: { currentCost: true },
        });
        const previousCost = ingredientSnapshot?.currentCost ?? mapped.ingredient.currentCost;

        if (!newUnitCost) {
          quarantined += 1;
          continue;
        }

        await tx.ingredient.update({
          where: { id: mapped.ingredientId },
          data: { currentCost: newUnitCost },
        });

        defaultIngredientChanges.push({
          ingredientId: mapped.ingredientId,
          previousCost,
          newCost: newUnitCost,
        });
      }

      updated += 1;
    }

    // Recálculo masivo en lote para todos los insumos por defecto actualizados
    if (defaultIngredientChanges.length > 0) {
      const { criticalProducts } = await applyBatchIngredientCostChanges(
        tx,
        defaultIngredientChanges
      );

      criticalProductsAlerts.push(
        ...criticalProducts.map((product: CriticalMarginProduct) => ({
          productId: product.productId,
          productName: product.productName,
          previousCost: product.previousCost.toFixed(2),
          newCost: product.newCost.toFixed(2),
          currentMarginPercent: product.currentMarginPercent.toFixed(2),
          minMarginPercent: product.minMarginPercent.toFixed(2),
        }))
      );
    }
  }, { timeout: 30000 });

  const responseBody = {
    received: items.length,
    updated,
    unchanged,
    quarantined,
    duplicates,
    discarded,
    discardedCodes: discardedCodes.slice(0, 100),
    account: {
      tradeName: account.businessName ?? account.slug,
      ownerEmail: account.users?.[0]?.email ?? null,
    },
    criticalProductsAlerts,
  };

  console.info(JSON.stringify({
    accountId: account.id,
    received: responseBody.received,
    updated: responseBody.updated,
    unchanged: responseBody.unchanged,
    quarantined: responseBody.quarantined,
    duplicates: responseBody.duplicates,
    discarded: responseBody.discarded,
    durationMs: Date.now() - startedAt,
  }));

  return res.status(200).json(responseBody);
});

export default router;
</file>

<file path="backend/src/services/marginCalculator.test.ts">
import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
  classifyProductHealthBucket,
  calculateMedianMarginPercent,
  calculateCatalogHealthSummary,
  calculateSuggestedSalePrice,
  applyIngredientCostChange,
  applyBatchIngredientCostChanges,
} from './marginCalculator';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('calculateItemCost', () => {
  it('calcula el costo exacto sin artefactos de punto flotante', () => {
    const result = calculateItemCost(D('0.125'), D('742.98'));
    expect(result.toFixed(2)).toBe('92.87');
    expect(result.toString()).not.toContain('92.8725000');
  });

  it('soporta cantidades mínimas (0.001)', () => {
    expect(calculateItemCost(D('0.001'), D('100')).toFixed(2)).toBe('0.10');
  });

  it('soporta valores monetarios altos sin pérdida de precisión', () => {
    expect(calculateItemCost(D('12'), D('999999.99')).toFixed(2)).toBe('11999999.88');
  });

  it('retorna 0.00 si la cantidad es <= 0', () => {
    expect(calculateItemCost(D('0'), D('100')).toFixed(2)).toBe('0.00');
    expect(calculateItemCost(D('-5'), D('100')).toFixed(2)).toBe('0.00');
  });

  it('retorna 0.00 si el costo unitario es <= 0', () => {
    expect(calculateItemCost(D('5'), D('0')).toFixed(2)).toBe('0.00');
    expect(calculateItemCost(D('5'), D('-10')).toFixed(2)).toBe('0.00');
  });
});

describe('calculateRecipeTotal', () => {
  it('retorna 0.00 si la lista está vacía (producto sin ingredientes)', () => {
    expect(calculateRecipeTotal([]).toFixed(2)).toBe('0.00');
  });

  it('retorna 0.00 si items no es un array', () => {
    // @ts-expect-error — probando robustez ante input inválido en runtime
    expect(calculateRecipeTotal(null).toFixed(2)).toBe('0.00');
  });

  it('suma el costo de múltiples ítems', () => {
    const total = calculateRecipeTotal([
      { quantity: D('0.125'), unitCost: D('742.98') }, // 92.87
      { quantity: D('2'), unitCost: D('10.50') },       // 21.00
    ]);
    expect(total.toFixed(2)).toBe('113.87');
  });

  it('ignora ítems con cantidad inválida dentro de la receta', () => {
    const total = calculateRecipeTotal([
      { quantity: D('2'), unitCost: D('10') },  // 20.00
      { quantity: D('0'), unitCost: D('999') }, // inválido, no suma
    ]);
    expect(total.toFixed(2)).toBe('20.00');
  });
});

describe('calculateMarginAmount', () => {
  it('retorna 0.00 sin ingredientes (totalCost = 0), sin importar el precio', () => {
    // Caso reportado por QA: antes daba 50.00
    expect(calculateMarginAmount(D('50.00'), D('0.00')).toFixed(2)).toBe('0.00');
  });

  it('calcula el margen normalmente cuando hay costo', () => {
    expect(calculateMarginAmount(D('100'), D('60')).toFixed(2)).toBe('40.00');
  });

  it('permite margen negativo cuando salePrice es menor al costo (borrador en $0)', () => {
    // Gherkin: costo $1500, precio $0 => -$1500.00
    expect(calculateMarginAmount(D('0'), D('1500')).toFixed(2)).toBe('-1500.00');
  });

  it('soporta valores monetarios altos', () => {
    expect(calculateMarginAmount(D('999999.99'), D('500000.01')).toFixed(2)).toBe('499999.98');
  });
});

describe('calculateMarginPercent', () => {
  it('retorna 0.00% si salePrice <= 0, sin excepción', () => {
    // Gherkin: costo $1500, precio $0 => 0.00%, no Infinity/NaN
    const result = calculateMarginPercent(D('0'), D('1500'));
    expect(result.toFixed(2)).toBe('0.00');
    expect(result.isFinite()).toBe(true);
  });

  it('retorna 0.00% si salePrice es negativo', () => {
    expect(calculateMarginPercent(D('-10'), D('100')).toFixed(2)).toBe('0.00');
  });

  it('retorna 0.00% sin ingredientes (totalCost = 0)', () => {
    expect(calculateMarginPercent(D('100'), D('0')).toFixed(2)).toBe('0.00');
  });

  it('calcula el porcentaje normalmente', () => {
    expect(calculateMarginPercent(D('100'), D('60')).toFixed(2)).toBe('40.00');
  });

  it('redondea correctamente números periódicos (1/3)', () => {
    // (300-100)/300*100 = 66.666...% -> 66.67
    expect(calculateMarginPercent(D('300'), D('100')).toFixed(2)).toBe('66.67');
  });

  it('soporta valores monetarios altos', () => {
    expect(calculateMarginPercent(D('1000000'), D('250000')).toFixed(2)).toBe('75.00');
  });

  it('soporta márgenes negativos y positivos extremos sin romper el parseo', () => {
    expect(calculateMarginPercent(D('2'), D('100')).toFixed(2)).toBe('-4900.00');
    expect(calculateMarginPercent(D('1000000'), D('200000')).toFixed(2)).toBe('80.00');
  });
});

describe('calculateUnitCost', () => {
  it('calcula 35000 / 50 = 700', () => {
    expect(calculateUnitCost(D('35000'), D('50')).toString()).toBe('700');
  });

  it('consulta oldCost a DB cuando previousCost es null en applyIngredientCostChange (Líneas 129-132)', async () => {
    const mockTx = {
      ingredient: {
        findUnique: vi.fn().mockResolvedValue({ currentCost: new Prisma.Decimal('100') }),
      },
      priceHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
      productIngredient: { findMany: vi.fn().mockResolvedValue([]) },
      product: { findUnique: vi.fn(), update: vi.fn() },
    };

    // previousCost es null, forzamos la llamada a la DB
    await applyIngredientCostChange(mockTx, 'ing-1', null, new Prisma.Decimal('120'));

    expect(mockTx.ingredient.findUnique).toHaveBeenCalled();
    expect(mockTx.priceHistory.create).toHaveBeenCalled();
  });

  it('redondea 10000 / 3 con HALF_UP a 3333.33', () => {
    expect(calculateUnitCost(D('10000'), D('3')).toString()).toBe('3333.33');
  });

  it('resuelve presentación fraccionaria 0.5 kg por $1.250 = 2500', () => {
    expect(calculateUnitCost(D('1250'), D('0.5')).toString()).toBe('2500');
  });

  it('lanza un error si packageSize es 0 o negativo', () => {
    expect(() => calculateUnitCost(D('100'), D('0'))).toThrow(/mayor a cero/i);
    expect(() => calculateUnitCost(D('100'), D('-1'))).toThrow(/mayor a cero/i);
  });

  it('lanza un error si el resultado redondeado queda en 0.00', () => {
    expect(() => calculateUnitCost(D('0.01'), D('100'))).toThrow(/mayor a cero/i);
  });

  describe('Casos de frontera (Issue #277 / Reporte Sprint 4 §3.2)', () => {
    it('lanza error cuando packagePrice <= 0 en calculateUnitCost (Líneas 59-60)', () => {
      expect(() =>
        calculateUnitCost(new Prisma.Decimal(0), new Prisma.Decimal(10))
      ).toThrow('El campo "packagePrice" debe ser mayor a cero.');

      expect(() =>
        calculateUnitCost(new Prisma.Decimal(-50), new Prisma.Decimal(10))
      ).toThrow('El campo "packagePrice" debe ser mayor a cero.');
    });

    it('lanza error cuando unitCost excede MAX_MONEY_VALUE en calculateUnitCost (Líneas 67-68)', () => {
      const hugePrice = new Prisma.Decimal('999999999999');
      const tinySize = new Prisma.Decimal('0.001');
      expect(() => calculateUnitCost(hugePrice, tinySize)).toThrow(
        'El costo unitario calculado no puede superar $99.999.999,99.'
      );
    });

    it('registra priceHistory cuando oldCost difiere de newCost en applyIngredientCostChange (Líneas 129-132)', async () => {
      const mockTx = {
        ingredient: {
          findUnique: vi.fn().mockResolvedValue({ currentCost: new Prisma.Decimal('100') }),
        },
        priceHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
        productIngredient: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        product: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      };

      await applyIngredientCostChange(
        mockTx,
        'ing-1',
        new Prisma.Decimal('100'),
        new Prisma.Decimal('120')
      );

      expect(mockTx.priceHistory.create).toHaveBeenCalledWith({
        data: {
          ingredientId: 'ing-1',
          oldCost: new Prisma.Decimal('100'),
          newCost: new Prisma.Decimal('120'),
        },
      });
    });
  });
});

describe('applyBatchIngredientCostChanges', () => {
  it('retorna 0 afectados si la lista de cambios está vacía o no es un array', async () => {
    const mockTx = {
      ingredient: { findUnique: vi.fn() },
      priceHistory: { create: vi.fn() },
      productIngredient: { findMany: vi.fn() },
      product: { findMany: vi.fn(), update: vi.fn() },
    };

    const res1 = await applyBatchIngredientCostChanges(mockTx, []);
    expect(res1.affectedProductsCount).toBe(0);
    expect(res1.criticalProducts).toEqual([]);
    expect(mockTx.productIngredient.findMany).not.toHaveBeenCalled();

    // @ts-expect-error probando robustez ante input inválido
    const res2 = await applyBatchIngredientCostChanges(mockTx, null);
    expect(res2.affectedProductsCount).toBe(0);
  });

  it('no registra PriceHistory si oldCost es igual a newCost', async () => {
    const mockTx = {
      priceHistory: { create: vi.fn() },
      productIngredient: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('100'), newCost: D('100') },
    ]);

    expect(mockTx.priceHistory.create).not.toHaveBeenCalled();
  });

  it('Gherkin Escenario "Producto compartido": recalcula una sola vez consolidando 3 insumos y genera 1 sola alerta', async () => {
    const productTorta = {
      id: 'prod-torta',
      name: 'Torta Especial',
      salePrice: D('15000.00'),
      minMarginPercent: D('30.00'),
      cost: D('5300.00'),
      marginPercent: D('64.67'),
      ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { currentCost: D('1000.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { currentCost: D('8000.00') } },
        { ingredientId: 'ing-azucar', quantity: D('0.300'), ingredient: { currentCost: D('1000.00') } },
      ],
    };

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: {
        findMany: vi.fn().mockResolvedValue([
          { productId: 'prod-torta' },
          { productId: 'prod-torta' },
          { productId: 'prod-torta' },
        ]),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([productTorta]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const changes = [
      { ingredientId: 'ing-harina', previousCost: D('1000.00'), newCost: D('2500.00') },
      { ingredientId: 'ing-manteca', previousCost: D('8000.00'), newCost: D('16000.00') },
      { ingredientId: 'ing-azucar', previousCost: D('1000.00'), newCost: D('3000.00') },
    ];

    const result = await applyBatchIngredientCostChanges(mockTx, changes);

    expect(mockTx.priceHistory.create).toHaveBeenCalledTimes(3);

    expect(mockTx.productIngredient.findMany).toHaveBeenCalledWith({
      where: { ingredientId: { in: ['ing-harina', 'ing-manteca', 'ing-azucar'] } },
      select: { productId: true },
    });

    expect(mockTx.product.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['prod-torta'] } },
      include: expect.any(Object),
    });

    expect(mockTx.product.update).toHaveBeenCalledTimes(1);
    expect(mockTx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-torta' },
      data: {
        cost: D('11400.00'),
        marginAmount: D('3600.00'),
        marginPercent: D('24.00'),
      },
    });

    expect(result.affectedProductsCount).toBe(1);
    expect(result.affectedProducts).toHaveLength(1);
    expect(result.criticalProducts).toHaveLength(1);
    expect(result.criticalProducts[0]).toMatchObject({
      productId: 'prod-torta',
      productName: 'Torta Especial',
      newCost: D('11400.00'),
      currentMarginPercent: D('24.00'),
    });
  });

  it('consulta las recetas de todos los productos afectados con un único findMany', async () => {
    const pan = {
      id: 'prod-pan',
      name: 'Pan Francés',
      salePrice: D('2000.00'),
      minMarginPercent: D('30.00'),
      cost: D('1000.00'),
      marginPercent: D('50.00'),
      ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { id: 'ing-harina', currentCost: D('1000.00') } },
      ],
    };

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([{ productId: 'prod-pan' }]) },
      product: {
        findMany: vi.fn().mockResolvedValue([pan]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-harina', previousCost: D('1000.00'), newCost: D('1200.00') },
    ]);

    expect(mockTx.product.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['prod-pan'] } } })
    );
    expect(mockTx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-pan' },
      data: { cost: D('1200.00'), marginAmount: D('800.00'), marginPercent: D('40.00') },
    });
    expect(result.affectedProductsCount).toBe(1);
  });

  it('Gherkin Escenario "Falla a mitad": propaga el error al guardar un producto del lote para que la transacción se revierta', async () => {
    const product = (id: string, name: string) => ({
      id,
      name,
      salePrice: D('15000.00'),
      minMarginPercent: D('30.00'),
      cost: D('5000.00'),
      marginPercent: D('66.67'),
      ingredients: [
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { id: 'ing-manteca', currentCost: D('10000.00') } },
      ],
    });

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: {
        findMany: vi.fn().mockResolvedValue([{ productId: 'prod-medialunas' }, { productId: 'prod-croissant' }]),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([
          product('prod-medialunas', 'Medialunas x12'),
          product('prod-croissant', 'Croissant x6'),
        ]),
        update: vi
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('Fallo simulado al guardar Croissant x6')),
      },
    };

    await expect(
      applyBatchIngredientCostChanges(mockTx, [
        { ingredientId: 'ing-manteca', previousCost: D('10000.00'), newCost: D('16000.00') },
      ])
    ).rejects.toThrow('Fallo simulado al guardar Croissant x6');

    // El primer producto se escribió dentro de la transacción; al propagarse el error,
    // Prisma revierte también esa escritura.
    expect(mockTx.product.update).toHaveBeenCalledTimes(2);
  });

  it('no marca producto como crítico si ya venía por debajo del margen mínimo (sin cruce)', async () => {
    const productBajo = {
      id: 'prod-bajo',
      name: 'Pan Económico',
      salePrice: D('1000.00'),
      minMarginPercent: D('30.00'),
      cost: D('800.00'),
      marginPercent: D('20.00'),
      ingredients: [
        { ingredientId: 'ing-1', quantity: D('1.000'), ingredient: { currentCost: D('800.00') } },
      ],
    };

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([{ productId: 'prod-bajo' }]) },
      product: {
        findMany: vi.fn().mockResolvedValue([productBajo]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('800.00'), newCost: D('900.00') },
    ]);

    expect(result.affectedProductsCount).toBe(1);
    expect(result.criticalProducts).toHaveLength(0);
  });
  it('Gherkin Escenario "Lista grande": procesa 300 insumos que afectan a 40 productos compartidos recalculando cada producto una sola vez', async () => {
    // 1. Generamos 300 insumos con variación de costo
    const INGREDIENT_COUNT = 300;
    const PRODUCT_COUNT = 40;

    const changes = Array.from({ length: INGREDIENT_COUNT }, (_, i) => ({
      ingredientId: `ing-${i + 1}`,
      previousCost: D('100.00'),
      newCost: D('150.00'),
    }));

    // 2. Generamos 40 productos donde cada uno utiliza entre 10 y 15 insumos del lote (alta compartición)
    const mockRelations: Array<{ productId: string }> = [];
    const mockProducts = Array.from({ length: PRODUCT_COUNT }, (_, pIdx) => {
      const pId = `prod-${pIdx + 1}`;
      // Asignamos 10 insumos por producto de forma entrelazada para simular recetas complejas
      const productIngredients = Array.from({ length: 10 }, (_, iIdx) => {
        const ingIndex = ((pIdx * 7 + iIdx * 11) % INGREDIENT_COUNT) + 1;
        const ingId = `ing-${ingIndex}`;
        mockRelations.push({ productId: pId });
        return {
          ingredientId: ingId,
          quantity: D('0.250'),
          ingredient: { currentCost: D('100.00') },
        };
      });

      return {
        id: pId,
        name: `Producto Terminado ${pIdx + 1}`,
        salePrice: D('5000.00'),
        minMarginPercent: D('30.00'),
        cost: D('250.00'),
        marginPercent: D('95.00'),
        ingredients: productIngredients,
      };
    });

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue(mockRelations) },
      product: {
        findMany: vi.fn().mockResolvedValue(mockProducts),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const startTime = performance.now();
    const result = await applyBatchIngredientCostChanges(mockTx, changes);
    const durationMs = performance.now() - startTime;

    // Aserción 1: Debe consultar las relaciones una sola vez
    expect(mockTx.productIngredient.findMany).toHaveBeenCalledTimes(1);

    // Aserción 2: Debe consultar las recetas de los 40 productos en UN SOLO findMany
    expect(mockTx.product.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining(mockProducts.map((p) => p.id)) } },
      include: expect.any(Object),
    });

    // Aserción 3: Cada producto se actualiza exactamente 1 vez (40 llamadas a update, NO 300 * N)
    expect(mockTx.product.update).toHaveBeenCalledTimes(PRODUCT_COUNT);

    // Aserción 4: El resultado total refleja exactamente los 40 productos afectados
    expect(result.affectedProductsCount).toBe(PRODUCT_COUNT);
    expect(result.affectedProducts).toHaveLength(PRODUCT_COUNT);

    // Aserción 5: El tiempo total de procesamiento en memoria debe ser sumamente veloz (< 100 ms)
    expect(durationMs).toBeLessThan(100);
  });
});

describe('classifyProductHealthBucket', () => {
  it('clasifica borradores cuando ingredientsCount <= 0 sin importar su margen', () => {
    expect(classifyProductHealthBucket(D('50.00'), D('30.00'), 0)).toBe('draft');
    expect(classifyProductHealthBucket(D('-10.00'), D('30.00'), 0)).toBe('draft');
  });

  it('clasifica en loss cuando el margen es estrictamente negativo', () => {
    expect(classifyProductHealthBucket(D('-0.01'), D('30.00'), 2)).toBe('loss');
    expect(classifyProductHealthBucket(D('-29546.15'), D('30.00'), 1)).toBe('loss');
  });

  it('clasifica en risk usando el minMarginPercent propio del producto', () => {
    expect(classifyProductHealthBucket(D('0.00'), D('30.00'), 1)).toBe('risk');
    expect(classifyProductHealthBucket(D('35.00'), D('40.00'), 2)).toBe('risk');
    expect(classifyProductHealthBucket(D('62.00'), D('65.00'), 3)).toBe('risk');
  });

  it('clasifica en target entre minMarginPercent y 60% inclusive', () => {
    expect(classifyProductHealthBucket(D('30.00'), D('30.00'), 1)).toBe('target');
    expect(classifyProductHealthBucket(D('35.00'), D('30.00'), 2)).toBe('target');
    expect(classifyProductHealthBucket(D('60.00'), D('30.00'), 2)).toBe('target');
  });

  it('clasifica en surplus cuando supera 60% y cumple su propio mínimo', () => {
    expect(classifyProductHealthBucket(D('60.01'), D('30.00'), 2)).toBe('surplus');
    expect(classifyProductHealthBucket(D('73.21'), D('65.00'), 5)).toBe('surplus');
  });
});

describe('calculateMedianMarginPercent', () => {
  it('retorna 0.00 si no hay productos activos', () => {
    expect(calculateMedianMarginPercent([]).toFixed(2)).toBe('0.00');
  });

  it('calcula la mediana exacta con cantidad impar y no muta el arreglo original', () => {
    const input = [D('55.00'), D('-29546.15'), D('42.50')];
    expect(calculateMedianMarginPercent(input).toFixed(2)).toBe('42.50');
    expect(input.map((d) => d.toString())).toEqual(['55', '-29546.15', '42.5']);
  });

  it('calcula la mediana con cantidad par aplicando redondeo ROUND_HALF_UP a 2 decimales', () => {
    expect(calculateMedianMarginPercent([D('15.00'), D('25.00'), D('18.00'), D('30.00')]).toFixed(2)).toBe('21.50');
    expect(calculateMedianMarginPercent([D('10.00'), D('33.33'), D('33.34'), D('60.00')]).toFixed(2)).toBe('33.34');
  });
});

describe('calculateCatalogHealthSummary', () => {
  it('clasifica los cinco buckets y calcula la mediana excluyendo borradores', () => {
    expect(
      calculateCatalogHealthSummary([
        { marginPercent: D('-10.00'), minMarginPercent: D('30.00'), ingredientsCount: 2 },
        { marginPercent: D('15.00'), minMarginPercent: D('30.00'), ingredientsCount: 1 },
        { marginPercent: D('40.00'), minMarginPercent: D('30.00'), ingredientsCount: 3 },
        { marginPercent: D('70.00'), minMarginPercent: D('30.00'), ingredientsCount: 2 },
        { marginPercent: D('0.00'), minMarginPercent: D('30.00'), ingredientsCount: 0 },
      ])
    ).toEqual({
      totalProducts: 5,
      criticalProductsCount: 2,
      healthyProductsCount: 2,
      averageMarginPercent: 27.5,
      lossCount: 1,
      riskCount: 1,
      targetCount: 1,
      surplusCount: 1,
      draftCount: 1,
    });
  });

  it('devuelve los contadores y la mediana en cero con un catálogo vacío', () => {
    expect(calculateCatalogHealthSummary([])).toEqual({
      totalProducts: 0,
      criticalProductsCount: 0,
      healthyProductsCount: 0,
      averageMarginPercent: 0,
      lossCount: 0,
      riskCount: 0,
      targetCount: 0,
      surplusCount: 0,
      draftCount: 0,
    });
  });
});

describe('calculateSuggestedSalePrice', () => {
  it('calcula el precio para alcanzar el margen mínimo y redondea a dos decimales', () => {
    expect(calculateSuggestedSalePrice(D('700.00'), D('30.00')).toFixed(2)).toBe('1000.00');
    expect(calculateSuggestedSalePrice(D('1000.00'), D('35.00')).toFixed(2)).toBe('1538.46');
  });

  it('usa el factor de respaldo 0.5 cuando el margen mínimo es al menos 100%', () => {
    expect(calculateSuggestedSalePrice(D('500.00'), D('100.00')).toFixed(2)).toBe('1000.00');
    expect(calculateSuggestedSalePrice(D('500.00'), D('150.00')).toFixed(2)).toBe('1000.00');
  });

  it('devuelve cero cuando el costo no es positivo', () => {
    expect(calculateSuggestedSalePrice(D('0.00'), D('30.00')).toFixed(2)).toBe('0.00');
    expect(calculateSuggestedSalePrice(D('-10.00'), D('30.00')).toFixed(2)).toBe('0.00');
  });
});
</file>

<file path="backend/src/services/marginCalculator.ts">
import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

type DecimalType = Prisma.Decimal;

const ZERO = new Decimal(0);
const ONE = new Decimal(1);
const HUNDRED = new Decimal(100);
const FALLBACK_MARGIN_FACTOR = new Decimal('0.5');
const MAX_MONEY_VALUE = new Decimal('99999999.99');
const MIN_MONEY_VALUE = new Decimal('-99999999.99');
// El campo de margen porcentual en Prisma admite hasta 8 enteros + 2 decimales.
// Un literal como '999.999.99' es inválido para Decimal.js y rompe la carga del módulo.
const MAX_PERCENT_VALUE = new Decimal('999999.99');
const MIN_PERCENT_VALUE = new Decimal('-999999.99');

export interface ProductCostImpact {
  productId: string;
  productName: string;
  previousCost: DecimalType;
  newCost: DecimalType;
  currentMarginPercent: DecimalType;
  minMarginPercent: DecimalType;
}

export interface CriticalMarginProduct extends ProductCostImpact { }

export type HealthBucket = 'loss' | 'risk' | 'target' | 'surplus' | 'draft';

const SURPLUS_MARGIN_THRESHOLD = new Decimal(60);

function clampDecimal(value: DecimalType, min: DecimalType, max: DecimalType): DecimalType {
  if (value.lessThan(min)) return min;
  if (value.greaterThan(max)) return max;
  return value;
}

/** Redondea a 2 decimales con ROUND_HALF_UP (estándar para moneda). */
function roundMoney(value: DecimalType): DecimalType {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
/**
 * Calculadora pura de costos y márgenes usando Prisma.Decimal
 * Todas las salidas quedan redondeadas a 2 decimales con ROUND_HALF_UP
 */
/**
 * Costo de un ítem de receta = cantidad usada × costo unitario.
 * Cantidad o costo inválidos (<= 0) no aportan costo.
 */
export function calculateItemCost(quantity: DecimalType, unitCost: DecimalType): DecimalType {
  if (quantity.lte(0) || unitCost.lte(0)) return roundMoney(ZERO);
  return roundMoney(unitCost.mul(quantity));
}

/**
 * Costo unitario derivado de la presentación mayorista del proveedor.
 * packagePrice / packageSize, redondeado a 2 decimales con ROUND_HALF_UP.
 */
export function calculateUnitCost(packagePrice: DecimalType, packageSize: DecimalType): DecimalType {
  if (packageSize.lte(0)) {
    throw new Error('El campo "packageSize" debe ser mayor a cero.');
  }

  if (packagePrice.lte(0)) {
    throw new Error('El campo "packagePrice" debe ser mayor a cero.');
  }

  const unitCost = packagePrice.div(packageSize).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (unitCost.lte(0)) {
    throw new Error('El costo unitario calculado debe ser mayor a cero.');
  }
  if (unitCost.greaterThan(MAX_MONEY_VALUE)) {
    throw new Error('El costo unitario calculado no puede superar $99.999.999,99.');
  }

  return unitCost;
}

/**
 * Costo total de una receta = suma de calculateItemCost de cada ítem.
 * Sin ítems (producto sin ingredientes) => 0.00.
 */
export function calculateRecipeTotal(
  items: Array<{ quantity: DecimalType; unitCost: DecimalType }>
): DecimalType {
  if (!Array.isArray(items) || items.length === 0) return roundMoney(ZERO);

  const total = items.reduce(
    (acc, item) => acc.add(calculateItemCost(item.quantity, item.unitCost)),
    ZERO
  );
  const rounded = roundMoney(total);
  return clampDecimal(rounded, MIN_MONEY_VALUE, MAX_MONEY_VALUE);
}

/**
 * Margen nominal = salePrice - totalCost.
 * Sin ingredientes (totalCost === 0) => 0.00, sin importar salePrice.
 * OJO: si HAY ingredientes pero salePrice es 0 (borrador), el margen da
 * negativo a propósito — ver Gherkin: costo $1500, venta $0 => -$1500.00.
 * A diferencia de calculateMarginPercent, acá NO se guarda por salePrice<=0.
 */
export function calculateMarginAmount(salePrice: DecimalType, totalCost: DecimalType): DecimalType {
  if (totalCost.isZero()) return roundMoney(ZERO);
  const margin = roundMoney(salePrice.sub(totalCost));
  return clampDecimal(margin, MIN_MONEY_VALUE, MAX_MONEY_VALUE);
}

/**
 * Margen porcentual = (salePrice - totalCost) / salePrice × 100.
 * salePrice <= 0 o sin ingredientes => 0.00% (evita división por cero).
 */
export function calculateMarginPercent(salePrice: DecimalType, totalCost: DecimalType): DecimalType {
  if (salePrice.lte(0) || totalCost.isZero()) return roundMoney(ZERO);
  const percent = roundMoney(salePrice.sub(totalCost).div(salePrice).mul(100));
  return clampDecimal(percent, MIN_PERCENT_VALUE, MAX_PERCENT_VALUE);
}

/**
 * Clasifica un producto en su bucket de salud financiera usando su propio
 * `minMarginPercent` (no el umbral global de la cuenta):
 * - draft: sin ingredientes en su receta
 * - loss: con receta y marginPercent < 0
 * - risk: con receta y 0 <= marginPercent < minMarginPercent
 * - target: con receta y minMarginPercent <= marginPercent <= 60
 * - surplus: con receta y marginPercent >= minMarginPercent y marginPercent > 60
 */
export function classifyProductHealthBucket(
  marginPercent: DecimalType,
  minMarginPercent: DecimalType,
  ingredientsCount: number
): HealthBucket {
  if (ingredientsCount <= 0) return 'draft';
  if (marginPercent.lessThan(ZERO)) return 'loss';
  if (marginPercent.lessThan(minMarginPercent)) return 'risk';
  if (marginPercent.lessThanOrEqualTo(SURPLUS_MARGIN_THRESHOLD)) return 'target';
  return 'surplus';
}

/**
 * Calcula la mediana del margen porcentual de los productos activos (no borradores).
 * Medida robusta frente a precios o costos extremos mal cargados.
 * Devuelve 0.00 si la lista está vacía.
 */
export function calculateMedianMarginPercent(margins: DecimalType[]): DecimalType {
  if (!Array.isArray(margins) || margins.length === 0) {
    return roundMoney(ZERO);
  }

  const sorted = [...margins].sort((a, b) => a.comparedTo(b));
  const mid = Math.floor(sorted.length / 2);
  const middle = sorted[mid] ?? ZERO;

  if (sorted.length % 2 === 1) {
    return roundMoney(middle);
  }

  const lower = sorted[mid - 1] ?? ZERO;
  return roundMoney(lower.add(middle).div(2));
}

export interface CatalogProductHealthInput {
  marginPercent: DecimalType | string | number | null | undefined;
  minMarginPercent: DecimalType | string | number | null | undefined;
  ingredientsCount: number;
}

export interface CatalogHealthSummary {
  totalProducts: number;
  criticalProductsCount: number;
  healthyProductsCount: number;
  averageMarginPercent: number;
  lossCount: number;
  riskCount: number;
  targetCount: number;
  surplusCount: number;
  draftCount: number;
}

/** Resume la salud del catálogo con las reglas usadas por el dashboard. */
export function calculateCatalogHealthSummary(
  productRows: CatalogProductHealthInput[]
): CatalogHealthSummary {
  let lossCount = 0;
  let riskCount = 0;
  let targetCount = 0;
  let surplusCount = 0;
  let draftCount = 0;
  const activeMargins: DecimalType[] = [];

  for (const product of productRows) {
    const marginPercent = new Decimal(product.marginPercent ?? 0);
    const minMarginPercent = new Decimal(product.minMarginPercent ?? 0);
    const bucket = classifyProductHealthBucket(
      marginPercent,
      minMarginPercent,
      product.ingredientsCount
    );

    switch (bucket) {
      case 'draft':
        draftCount += 1;
        break;
      case 'loss':
        lossCount += 1;
        activeMargins.push(marginPercent);
        break;
      case 'risk':
        riskCount += 1;
        activeMargins.push(marginPercent);
        break;
      case 'target':
        targetCount += 1;
        activeMargins.push(marginPercent);
        break;
      case 'surplus':
        surplusCount += 1;
        activeMargins.push(marginPercent);
        break;
    }
  }

  return {
    totalProducts: productRows.length,
    criticalProductsCount: lossCount + riskCount,
    healthyProductsCount: targetCount + surplusCount,
    averageMarginPercent: calculateMedianMarginPercent(activeMargins).toNumber(),
    lossCount,
    riskCount,
    targetCount,
    surplusCount,
    draftCount,
  };
}

/** Calcula el precio requerido para alcanzar el margen mínimo objetivo. */
export function calculateSuggestedSalePrice(
  cost: DecimalType,
  minMarginPercent: DecimalType
): DecimalType {
  if (cost.lte(ZERO)) {
    return roundMoney(ZERO);
  }

  const factor = minMarginPercent.lt(HUNDRED)
    ? ONE.sub(minMarginPercent.div(HUNDRED))
    : FALLBACK_MARGIN_FACTOR;
  return clampDecimal(roundMoney(cost.div(factor)), ZERO, MAX_MONEY_VALUE);
}

export interface IngredientCostChangeResult {
  affectedProductsCount: number;
  affectedProducts: ProductCostImpact[];
  criticalProducts: CriticalMarginProduct[];
}

export interface IngredientCostUpdateInput {
  ingredientId: string;
  previousCost: DecimalType | null;
  newCost: DecimalType;
}

const productRecalculationInclude = {
  ingredients: {
    include: {
      ingredient: { select: { id: true, currentCost: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductForRecalculation = Prisma.ProductGetPayload<{
  include: typeof productRecalculationInclude;
}>;

/**
 * Recálculo masivo transaccional en lote:
 * 1. Registra PriceHistory para cada insumo modificado.
 * 2. Busca todos los productos afectados en una única consulta findMany.
 * 3. Recalcula cada receta una sola vez consolidando todos los nuevos costos del lote.
 * 4. Evalúa alertas de quiebre de margen mínimo una única vez por producto.
 */
export async function applyBatchIngredientCostChanges(
  tx: any,
  changes: IngredientCostUpdateInput[]
): Promise<IngredientCostChangeResult> {
  if (!Array.isArray(changes) || changes.length === 0) {
    return {
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    };
  }

  // 1. Deduplicar por ingredientId y registrar PriceHistory para variaciones reales
  const changesByIngredient = new Map<string, IngredientCostUpdateInput>();
  for (const change of changes) {
    changesByIngredient.set(change.ingredientId, change);
  }

  const effectiveChangesMap = new Map<string, DecimalType>();

  for (const change of changesByIngredient.values()) {
    const { ingredientId, previousCost, newCost } = change;
    let oldCost = previousCost;

    if (oldCost === null || oldCost === undefined) {
      const ingredientFinder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
      if (ingredientFinder && typeof ingredientFinder === 'function') {
        const found = await ingredientFinder.call(tx.ingredient, {
          where: { id: ingredientId },
          select: { currentCost: true },
        });
        oldCost = found?.currentCost ?? null;
      }
    }

    if (oldCost && !oldCost.equals(newCost)) {
      await tx.priceHistory.create({
        data: {
          ingredientId,
          oldCost,
          newCost,
        },
      });
    }

    effectiveChangesMap.set(ingredientId, newCost);
  }

  const ingredientIds = [...effectiveChangesMap.keys()];
  if (ingredientIds.length === 0) {
    return {
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    };
  }

  // 2. Consulta única de relaciones para obtener todos los productos afectados sin duplicados
  const affectedRelations = await tx.productIngredient.findMany({
    where: { ingredientId: { in: ingredientIds } },
    select: { productId: true },
  });

  const uniqueProductIds = [...new Set(affectedRelations.map((a: { productId: string }) => a.productId))];
  if (uniqueProductIds.length === 0) {
    return {
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    };
  }

  // 3. Consulta única de las recetas de todos los productos afectados
  const products: ProductForRecalculation[] = await tx.product.findMany({
    where: { id: { in: uniqueProductIds } },
    include: productRecalculationInclude,
  });

  const affectedProducts: ProductCostImpact[] = [];
  const criticalProducts: CriticalMarginProduct[] = [];

  // 4. Recálculo único por producto consolidando todos los insumos modificados
  for (const product of products) {
    const safeMinMarginPercent = product.minMarginPercent ?? ZERO;
    const previousProductCost = product.cost ?? ZERO;
    const previousMarginPercent = product.marginPercent ?? ZERO;

    const nextCost = calculateRecipeTotal(
      product.ingredients.map((pi) => {
        const updatedCost = effectiveChangesMap.get(pi.ingredientId);
        const unitCost = updatedCost !== undefined ? updatedCost : (pi.ingredient?.currentCost ?? ZERO);
        return {
          quantity: pi.quantity,
          unitCost,
        };
      })
    );

    const nextMarginAmount = calculateMarginAmount(product.salePrice, nextCost);
    const nextMarginPercent = calculateMarginPercent(product.salePrice, nextCost);

    await tx.product.update({
      where: { id: product.id },
      data: {
        cost: nextCost,
        marginAmount: nextMarginAmount,
        marginPercent: nextMarginPercent,
      },
    });

    const productImpact: ProductCostImpact = {
      productId: product.id,
      productName: product.name ?? 'Producto',
      previousCost: previousProductCost,
      newCost: nextCost,
      currentMarginPercent: nextMarginPercent,
      minMarginPercent: safeMinMarginPercent,
    };

    affectedProducts.push(productImpact);

    const crossedMinimumMargin =
      previousMarginPercent.greaterThanOrEqualTo(safeMinMarginPercent) &&
      nextMarginPercent.lessThan(safeMinMarginPercent);

    if (crossedMinimumMargin) {
      criticalProducts.push(productImpact);
    }
  }

  return {
    affectedProductsCount: affectedProducts.length,
    affectedProducts,
    criticalProducts,
  };
}

/**
 * Mantiene compatibilidad total con llamadas unitarias delegando en el método por lote.
 */
export async function applyIngredientCostChange(
  tx: any,
  ingredientId: string,
  previousCost: DecimalType | null,
  newCost: DecimalType
): Promise<IngredientCostChangeResult> {
  return applyBatchIngredientCostChanges(tx, [
    { ingredientId, previousCost, newCost },
  ]);
}

export default {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
  classifyProductHealthBucket,
  calculateMedianMarginPercent,
  calculateCatalogHealthSummary,
  calculateSuggestedSalePrice,
  applyIngredientCostChange,
  applyBatchIngredientCostChanges,
};
</file>

<file path="backend/src/routes/products.test.ts">
// src/routes/products.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Prisma } from '@prisma/client';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

let currentUserRole: 'ADMIN' | 'COLLABORATOR' = 'ADMIN';

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role: currentUserRole };
    next();
  },
}));

const productFindManyMock = vi.fn();
const productCountMock = vi.fn();
const productFindFirstMock = vi.fn();
const productDeleteManyMock = vi.fn();

const txIngredientFindManyMock = vi.fn();
const txProductCreateMock = vi.fn();
const txProductFindFirstMock = vi.fn();
const txProductUpdateMock = vi.fn();
const txProductIngredientDeleteManyMock = vi.fn();
const txProductIngredientCountMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => productFindManyMock(...args),
      count: (...args: unknown[]) => productCountMock(...args),
      findFirst: (...args: unknown[]) => productFindFirstMock(...args),
      deleteMany: (...args: unknown[]) => productDeleteManyMock(...args),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const tx = {
        ingredient: {
          findMany: (...args: unknown[]) => txIngredientFindManyMock(...args),
        },
        product: {
          create: (...args: unknown[]) => txProductCreateMock(...args),
          findFirst: (...args: unknown[]) => txProductFindFirstMock(...args),
          update: (...args: unknown[]) => txProductUpdateMock(...args),
        },
        productIngredient: {
          deleteMany: (...args: unknown[]) => txProductIngredientDeleteManyMock(...args),
          count: (...args: unknown[]) => txProductIngredientCountMock(...args),
        },
      };
      return fn(tx);
    },
  },
}));

import productsRouter from './products';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);
  app.use(errorHandler);
  return app;
}

function setAuthRole(role: 'ADMIN' | 'COLLABORATOR') {
  currentUserRole = role;
}

beforeEach(() => {
  setAuthRole('ADMIN');
  productFindManyMock.mockReset();
  productCountMock.mockReset();
  productFindFirstMock.mockReset();
  productDeleteManyMock.mockReset();
  txIngredientFindManyMock.mockReset();
  txProductCreateMock.mockReset();
  txProductFindFirstMock.mockReset();
  txProductUpdateMock.mockReset();
  txProductIngredientDeleteManyMock.mockReset();
  txProductIngredientCountMock.mockReset();
});

/** Forma de los datos que el router pasa a `product.update({ data })`. */
interface ProductUpdateData {
  name?: Prisma.Decimal | string;
  searchName?: string;
  salePrice: Prisma.Decimal;
  minMarginPercent: Prisma.Decimal;
  cost: Prisma.Decimal;
  marginAmount: Prisma.Decimal;
  marginPercent: Prisma.Decimal;
}

/**
 * Devuelve el `data` de la primera llamada a product.update, fallando el
 * test con un mensaje claro si nunca se llamó. Evita el error 2532 de
 * `noUncheckedIndexedAccess` sin recurrir a `!` en cada aserción.
 */
function firstUpdateData(): ProductUpdateData {
  const call = txProductUpdateMock.mock.calls[0];
  expect(call).toBeDefined();
  return (call as [{ data: ProductUpdateData }])[0].data;
}

describe('schema Prisma y migración', () => {
  // Recorre todas las migraciones en orden, no solo la última: así la prueba no se
  // rompe cuando se agrega una migración nueva, pero sí falla si alguna posterior
  // borra los índices (por ejemplo, un `prisma migrate dev` que no los conoce).
  const migrationDir = join(__dirname, '../../prisma/migrations');
  const allMigrationsSql = readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((dir) => readFileSync(join(migrationDir, dir, 'migration.sql'), 'utf8'))
    .join('\n');

  it.each(['Product', 'Supplier', 'Ingredient'])(
    'crea el índice único (accountId, lower(name)) de %s y ninguna migración posterior lo borra',
    (model) => {
      const indexName = `${model}_accountId_lower_name_key`;
      const createSql = `CREATE UNIQUE INDEX "${indexName}" ON "${model}"("accountId", lower("name"));`;

      const createdAt = allMigrationsSql.lastIndexOf(createSql);
      expect(createdAt).toBeGreaterThanOrEqual(0);
      expect(allMigrationsSql.indexOf(`DROP INDEX "${indexName}"`, createdAt)).toBe(-1);
      expect(allMigrationsSql.indexOf(`DROP INDEX IF EXISTS "${indexName}"`, createdAt)).toBe(-1);
    }
  );

  it('la auditoría previa de duplicados cubre las tres tablas y es de solo lectura', () => {
    const auditSql = readFileSync(join(__dirname, '../../prisma/sql/auditar-nombres-duplicados.sql'), 'utf8');
    const statements = auditSql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');

    for (const model of ['Supplier', 'Ingredient', 'Product']) {
      expect(statements).toContain(`FROM "${model}" t`);
    }
    expect(statements.match(/GROUP BY a\.slug, lower\(t\."name"\) HAVING count\(\*\) > 1/g)).toHaveLength(3);
    expect(statements).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\b/i);
  });

  it('documenta en schema.prisma que la unicidad case-insensitive vive en la migración SQL', () => {
    const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

    expect(schema).toContain('La unicidad case-insensitive por cuenta se garantiza con el índice funcional UNIQUE');
    for (const model of ['Product', 'Supplier', 'Ingredient']) {
      expect(schema).toContain(
        `CREATE UNIQUE INDEX "${model}_accountId_lower_name_key" ON "${model}"("accountId", lower("name"));`
      );
    }
  });

  it('todos los seeds y rutas de alta/edición completan searchName usando normalizeSearchText', () => {
    const seedFiles = ['seed.ts', 'seed-demo.ts', 'seed-volumen.ts'];
    for (const file of seedFiles) {
      const content = readFileSync(join(__dirname, '../../prisma', file), 'utf8');
      expect(content, `${file} debe importar normalizeSearchText`).toContain('normalizeSearchText');
      expect(content, `${file} debe completar searchName`).toContain('searchName:');
    }

    const volumen = readFileSync(join(__dirname, '../../prisma/seed-volumen.ts'), 'utf8');
    expect(volumen.match(/searchName:\s*normalizeSearchText\(/g)).toHaveLength(4);
  });
});

describe('GET /api/products - paginación', () => {
  it('devuelve data y meta correctos con page/limit/sortBy/order válidos', async () => {
    productFindManyMock.mockResolvedValue(new Array(2).fill({ id: 'p1', name: 'Prod' }));
    productCountMock.mockResolvedValue(5);

    const res = await request(buildApp()).get('/api/products?page=1&limit=2&sortBy=name&order=desc');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ total: 5, page: 1, limit: 2, totalPages: 3 });
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        orderBy: { name: 'desc' },
        skip: 0,
        take: 2,
      })
    );
  });
});

describe('GET /api/products - Búsqueda por nombre (search)', () => {
  it('aplica la condición OR con variantes diacríticas cuando se envía search', async () => {
    productFindManyMock.mockResolvedValue([
      {
        id: 'p-1',
        name: 'Medialunas de manteca',
        salePrice: new Prisma.Decimal('13500.00'),
        cost: new Prisma.Decimal('3616.25'),
        marginAmount: new Prisma.Decimal('9883.75'),
        marginPercent: new Prisma.Decimal('73.21'),
        minMarginPercent: new Prisma.Decimal('65.00'),
        ingredients: [],
      },
    ]);
    productCountMock.mockResolvedValue(1);

    const res = await request(buildApp()).get('/api/products?search=medialuna');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Medialunas de manteca');
    expect(res.body.meta.total).toBe(1);

    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'account-1',
          OR: [
            { searchName: { contains: 'medialuna', mode: 'insensitive' } },
            { name: { contains: 'medialuna', mode: 'insensitive' } },
          ],
        }),
      })
    );
    expect(productCountMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        accountId: 'account-1',
        OR: [
          { searchName: { contains: 'medialuna', mode: 'insensitive' } },
          { name: { contains: 'medialuna', mode: 'insensitive' } },
        ],
      }),
    });
  });

  it('encuentra productos reales buscando sin tildes ("jabon liquido", "canoncitos", "pan de campo")', async () => {
    const cases = [
      { search: 'pan de campo', name: 'Pan de Campo', normalized: 'pan de campo' },
      { search: 'jabon liquido', name: 'Jabón líquido (Ariel/Skip/Ace) — 1 L', normalized: 'jabon liquido' },
      { search: 'canoncitos', name: 'Cañoncitos con dulce de leche', normalized: 'canoncitos' },
    ];

    for (const c of cases) {
      productFindManyMock.mockResolvedValueOnce([
        { id: 'p-c', name: c.name, searchName: c.normalized, salePrice: new Prisma.Decimal('1000') },
      ]);
      productCountMock.mockResolvedValueOnce(1);

      const res = await request(buildApp()).get(`/api/products?search=${encodeURIComponent(c.search)}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe(c.name);
    }
  });

  it('combina search con page, limit, sortBy y order', async () => {
    productFindManyMock.mockResolvedValue([]);
    productCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get(
      '/api/products?search=pan&page=2&limit=5&sortBy=salePrice&order=desc'
    );

    expect(res.status).toBe(200);
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'account-1',
          OR: expect.any(Array),
        }),
        orderBy: { salePrice: 'desc' },
        skip: 5,
        take: 5,
      })
    );
    expect(res.body.meta).toEqual({ total: 0, page: 2, limit: 5, totalPages: 0 });
  });

  it('Escenario Aislamiento: la búsqueda no filtra productos de otra cuenta', async () => {
    productFindManyMock.mockResolvedValue([]);
    productCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/products?search=Detergente');

    expect(res.status).toBe(200);
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'account-1', // Aislamiento garantizado por el token
        }),
      })
    );
  });

  it('Sanitización RBAC: un COLLABORATOR puede buscar pero no recibe costos ni márgenes', async () => {
    setAuthRole('COLLABORATOR');

    productFindManyMock.mockResolvedValue([
      {
        id: 'p-1',
        name: 'Pan de Campo',
        salePrice: new Prisma.Decimal('4500.00'),
        cost: new Prisma.Decimal('1800.00'),
        marginAmount: new Prisma.Decimal('2700.00'),
        marginPercent: new Prisma.Decimal('60.00'),
        minMarginPercent: new Prisma.Decimal('40.00'),
        ingredients: [{ ingredientId: 'ing-1', quantity: new Prisma.Decimal('1.000') }],
      },
    ]);
    productCountMock.mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/products?search=campo')
      .set('x-role', 'COLLABORATOR');

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('Pan de Campo');
    expect(res.body.data[0].salePrice).toBe('4500');
    // Campos purgados por sanitizeFinancialData
    expect(res.body.data[0]).not.toHaveProperty('cost');
    expect(res.body.data[0]).not.toHaveProperty('marginAmount');
    expect(res.body.data[0]).not.toHaveProperty('marginPercent');
    expect(res.body.data[0]).not.toHaveProperty('minMarginPercent');
  });
});

describe('POST /api/products', () => {
  it('crea un producto calculando costo y márgenes cuando hay receta', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('10') },
    ]);
    txProductCreateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '20.00' });

    const payload = {
      name: 'Prod',
      salePrice: '30.00',
      minMarginPercent: '10',
      ingredients: [{ ingredientId: 'ing-1', quantity: '2' }],
    };

    const res = await request(buildApp()).post('/api/products').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.product).toEqual({ id: 'p1', name: 'Prod', cost: '20.00' });
    expect(txIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 'account-1', id: { in: ['ing-1'] } } })
    );
  });
  it('permite salePrice = 0 en un producto borrador sin receta', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-borrador',
      name: 'Producto borrador',
      cost: '0.00',
      marginAmount: '0.00',
      marginPercent: '0.00',
    });

    const payload = {
      name: 'Producto borrador',
      salePrice: '0',
      minMarginPercent: '0',
      ingredients: [],
    };

    const res = await request(buildApp()).post('/api/products').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.product.marginAmount).toBe('0.00');
    expect(res.body.product.marginPercent).toBe('0.00');

    const createCall = txProductCreateMock.mock.calls[0] as [{
      data: {
        salePrice: Prisma.Decimal;
        cost: Prisma.Decimal;
        marginAmount: Prisma.Decimal;
        marginPercent: Prisma.Decimal;
      };
    }];
    const createData = createCall[0].data;

    expect(createData.salePrice.toString()).toBe('0');
    expect(createData.cost.toString()).toBe('0');
    expect(createData.marginAmount.toString()).toBe('0');
    expect(createData.marginPercent.toString()).toBe('0');
  });

  it('rechaza salePrice = 0 cuando el producto tiene receta', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('1500') },
    ]);

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con receta y precio cero',
        salePrice: '0',
        minMarginPercent: '0',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio de venta debe ser mayor a cero/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('PUT rechaza salePrice = 0 cuando el producto conserva la receta', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txProductIngredientCountMock.mockResolvedValue(1);

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ salePrice: '0' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio de venta debe ser mayor a cero/i);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('PUT rechaza una receta nueva cuando salePrice = 0', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p2',
      name: 'Borrador',
      salePrice: new Prisma.Decimal('0'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('0'),
      marginAmount: new Prisma.Decimal('0'),
      marginPercent: new Prisma.Decimal('0'),
    });
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('12.50') },
    ]);

    const res = await request(buildApp())
      .put('/api/products/p2')
      .send({
        salePrice: '0',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio de venta debe ser mayor a cero/i);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('PUT admite salePrice = 0 en un borrador que sigue sin receta', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p3',
      name: 'Borrador',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('0'),
      marginAmount: new Prisma.Decimal('0'),
      marginPercent: new Prisma.Decimal('0'),
    });
    txProductIngredientCountMock.mockResolvedValue(0);
    txProductUpdateMock.mockResolvedValue({ id: 'p3', salePrice: '0.00', cost: '0.00', marginPercent: '0.00' });

    const res = await request(buildApp()).put('/api/products/p3').send({ salePrice: '0' });

    expect(res.status).toBe(200);
    const data = firstUpdateData();
    expect(data.salePrice.toString()).toBe('0');
    expect(data.cost.toString()).toBe('0');
    expect(data.marginPercent.toString()).toBe('0');
  });

  it('PUT admite salePrice = 0 si en el mismo pedido se vacía la receta', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txProductUpdateMock.mockResolvedValue({ id: 'p1' });

    const res = await request(buildApp()).put('/api/products/p1').send({ salePrice: '0', ingredients: [] });

    expect(res.status).toBe(200);
    expect(txProductIngredientDeleteManyMock).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    expect(txProductIngredientCountMock).not.toHaveBeenCalled();
    expect(firstUpdateData().cost.toString()).toBe('0');
  });

  it('devuelve el mensaje exacto de la issue al rechazar salePrice = 0 con receta', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con receta',
        salePrice: 0,
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'El precio de venta debe ser mayor a cero cuando el producto tiene ingredientes en su receta.'
    );
    expect(txIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('rechaza quantity que no entra en la columna Decimal(10,3)', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con cantidad enorme',
        salePrice: '100',
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '10000000' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "quantity" excede la capacidad máxima permitida.');
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('acepta quantity en el máximo de la columna (9999999.999)', async () => {
    txIngredientFindManyMock.mockResolvedValue([{ id: 'ing-1', currentCost: new Prisma.Decimal('0.01') }]);
    txProductCreateMock.mockResolvedValue({ id: 'p-max' });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto cantidad máxima',
        salePrice: '100000.00',
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '9999999.999' }],
      });

    expect(res.status).toBe(201);
  });

  it('indica el formato admitido al rechazar un salePrice con 3 decimales (1500.555)', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'Producto precio 3 decimales', salePrice: '1500.555', minMarginPercent: '10', ingredients: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "salePrice" debe ser un valor decimal válido con hasta 2 decimales (ej: "1500.50").');
  });

  it('devuelve 409 si el índice único case-insensitive rechaza un alta concurrente', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);
    txProductFindFirstMock.mockResolvedValue(null);
    txProductCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'Product_accountId_lower_name_key' },
      })
    );

    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'Pan de Campo', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un producto con ese nombre.');
  });

  it('rechaza un insumo repetido en la receta en POST', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con insumo duplicado',
        salePrice: '150',
        minMarginPercent: '20',
        ingredients: [
          { ingredientId: 'ing-1', quantity: '1' },
          { ingredientId: 'ing-1', quantity: '2' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No se puede repetir el mismo insumo/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('rechaza un insumo repetido en la receta en PUT', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('0'),
      marginAmount: new Prisma.Decimal('0'),
      marginPercent: new Prisma.Decimal('0'),
    });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({
        ingredients: [
          { ingredientId: 'ing-1', quantity: '1' },
          { ingredientId: 'ing-1', quantity: '2' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No se puede repetir el mismo insumo/i);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('rechaza salePrice con escala decimal inválida en POST', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con precio inválido',
        salePrice: '123.456',
        minMarginPercent: '10',
        ingredients: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valor decimal válido/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('rechaza quantity con escala decimal inválida en POST', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con cantidad inválida',
        salePrice: '100',
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1.2345' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valor decimal válido/i);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('acepta quantity con 3 decimales válidos y crea el producto', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('10.00') },
    ]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-quantity-3',
      name: 'Producto con cantidad válida',
      cost: '12.34',
      marginAmount: '87.66',
      marginPercent: '87.66',
    });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto con cantidad válida',
        salePrice: '100',
        minMarginPercent: '10',
        ingredients: [{ ingredientId: 'ing-1', quantity: '1.234' }],
      });

    expect(res.status).toBe(201);
    expect(txProductCreateMock).toHaveBeenCalled();

    const call = txProductCreateMock.mock.calls[0];
    expect(call).toBeDefined();

    const createData = (call as [{ data: { ingredients: { create: Array<{ quantity: Prisma.Decimal }> } } }])[0].data;
    expect(createData.ingredients.create).toHaveLength(1);

    const quantity = createData.ingredients.create[0]?.quantity;
    expect(quantity).toBeDefined();
    expect(quantity!.toString()).toBe('1.234');
  });

  it('sigue rechazando salePrice negativo con 400', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto inválido',
        salePrice: '-10',
        minMarginPercent: '0',
        ingredients: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor o igual a cero/);
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('rechaza salePrice mayor al límite de PostgreSQL con 400', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto fuera de rango',
        salePrice: '100000000',
        minMarginPercent: '30',
        ingredients: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "salePrice" no puede superar $99.999.999,99.');
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('acepta el límite superior exacto de salePrice', async () => {
    txIngredientFindManyMock.mockResolvedValue([]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-limit',
      name: 'Producto límite',
      cost: '0.00',
      marginAmount: '0.00',
      marginPercent: '0.00',
    });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto límite',
        salePrice: '99999999.99',
        minMarginPercent: '30',
        ingredients: [],
      });

    expect(res.status).toBe(201);
    const createData = txProductCreateMock.mock.calls[0]?.[0]?.data as { salePrice: Prisma.Decimal } | undefined;
    expect(createData).toBeDefined();
    expect(createData!.salePrice.toString()).toBe('99999999.99');
  });

  it('clampa el costo derivado de la receta si excede el máximo permitido por la base', async () => {
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('30000000') },
      { id: 'ing-2', currentCost: new Prisma.Decimal('30000000') },
    ]);
    txProductCreateMock.mockResolvedValue({
      id: 'p-clamp',
      name: 'Producto clamped',
      cost: '99999999.99',
      marginAmount: '0.00',
      marginPercent: '0.00',
    });

    const res = await request(buildApp())
      .post('/api/products')
      .send({
        name: 'Producto clamped',
        salePrice: '99999999.99',
        minMarginPercent: '30',
        ingredients: [
          { ingredientId: 'ing-1', quantity: '2' },
          { ingredientId: 'ing-2', quantity: '2' },
        ],
      });

    expect(res.status).toBe(201);
    const createData = txProductCreateMock.mock.calls[0]?.[0]?.data as {
      cost: Prisma.Decimal;
      marginAmount: Prisma.Decimal;
      marginPercent: Prisma.Decimal;
    };
    expect(createData.cost.toString()).toBe('99999999.99');
    expect(createData.marginAmount.toString()).toBe('0');
    expect(createData.marginPercent.toString()).toBe('0');
  });
});

describe('GET /api/products/:id', () => {
  it('devuelve 200 con el producto si pertenece a la cuenta', async () => {
    const product = { id: 'p1', accountId: 'account-1', name: 'Prod' };
    productFindFirstMock.mockResolvedValue(product);

    const res = await request(buildApp()).get('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body.product).toEqual(product);
    expect(productFindFirstMock).toHaveBeenCalledWith({
      where: { id: 'p1', accountId: 'account-1' },
      omit: { searchName: true },
      include: { ingredients: { include: { ingredient: true } } },
    });
  });

  it('oculta quantity cost y margin para COLLABORATOR en la respuesta real del endpoint', async () => {
    setAuthRole('COLLABORATOR');
    const product = {
      id: 'p1',
      accountId: 'account-1',
      name: 'Prod',
      cost: '120.00',
      marginAmount: '30.00',
      marginPercent: '25.00',
      ingredients: [
        {
          ingredientId: 'ing-1',
          quantity: '2.5',
          ingredient: {
            id: 'ing-1',
            name: 'Harina',
            currentCost: '10.00',
          },
        },
      ],
    };
    productFindFirstMock.mockResolvedValue(product);

    const res = await request(buildApp()).get('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body.product).not.toHaveProperty('cost');
    expect(res.body.product).not.toHaveProperty('marginAmount');
    expect(res.body.product).not.toHaveProperty('marginPercent');
    expect(res.body.product.ingredients[0]).not.toHaveProperty('quantity');
  });

  it('mantiene quantity cost y margin visibles para ADMIN en la respuesta real del endpoint', async () => {
    setAuthRole('ADMIN');
    const product = {
      id: 'p1',
      accountId: 'account-1',
      name: 'Prod',
      cost: '120.00',
      marginAmount: '30.00',
      marginPercent: '25.00',
      ingredients: [
        {
          ingredientId: 'ing-1',
          quantity: '2.5',
          ingredient: {
            id: 'ing-1',
            name: 'Harina',
            currentCost: '10.00',
          },
        },
      ],
    };
    productFindFirstMock.mockResolvedValue(product);

    const res = await request(buildApp()).get('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body.product.cost).toBe('120.00');
    expect(res.body.product.marginAmount).toBe('30.00');
    expect(res.body.product.marginPercent).toBe('25.00');
    expect(res.body.product.ingredients[0].quantity).toBe('2.5');
  });
});

describe('PUT /api/products/:id', () => {
  it('recalcula marginAmount/marginPercent cuando solo cambia salePrice y el producto YA tenía receta (fix del bug reportado por QA)', async () => {
    // Producto existente: cost=100, salePrice viejo=150 (margen viejo: 50 / 33.33%)
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('150.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('100.00'),
      marginAmount: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    // El producto ya tiene receta cargada (no se envía "ingredients" en este PUT)
    txProductIngredientCountMock.mockResolvedValue(2);
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '100.00', marginAmount: '100.00', marginPercent: '50.00' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ salePrice: '200.00' });

    expect(res.status).toBe(200);
    // No debe correr la rama de "ingredientsProvided" (no se toca la receta)
    expect(txProductIngredientDeleteManyMock).not.toHaveBeenCalled();
    expect(txIngredientFindManyMock).not.toHaveBeenCalled();
    // El margen debe recalcularse contra el cost existente y el salePrice NUEVO
    expect(txProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          salePrice: expect.objectContaining({ d: expect.anything() }), // Decimal('200.00')
          cost: expect.objectContaining({ d: expect.anything() }), // Decimal('100.00'), sin cambios
          marginAmount: expect.objectContaining({ d: expect.anything() }),
          marginPercent: expect.objectContaining({ d: expect.anything() }),
        }),
      })
    );

    const data = firstUpdateData();
    expect(data.marginAmount.toString()).toBe('100');
    expect(data.marginPercent.toString()).toBe('50');
  });

  it('mantiene el margen en 0 si solo cambia salePrice en un producto SIN receta (no genera margen ficticio)', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p2',
      name: 'Medialunas',
      salePrice: new Prisma.Decimal('800.00'),
      minMarginPercent: new Prisma.Decimal('0'),
      cost: new Prisma.Decimal('0.00'),
      marginAmount: new Prisma.Decimal('0.00'),
      marginPercent: new Prisma.Decimal('0.00'),
    });
    // Sin receta cargada
    txProductIngredientCountMock.mockResolvedValue(0);
    txProductUpdateMock.mockResolvedValue({ id: 'p2', name: 'Medialunas', cost: '0.00', marginAmount: '0.00', marginPercent: '0.00' });

    const res = await request(buildApp())
      .put('/api/products/p2')
      .send({ salePrice: '900.00' });

    expect(res.status).toBe(200);
    const data = firstUpdateData();
    expect(data.marginAmount.toString()).toBe('0');
    expect(data.marginPercent.toString()).toBe('0');
  });

  it('recalcula costo y margen cuando se envía una receta nueva', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txIngredientFindManyMock.mockResolvedValue([
      { id: 'ing-1', currentCost: new Prisma.Decimal('5') },
    ]);
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '15.00', marginAmount: '15.00', marginPercent: '50.00' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ ingredients: [{ ingredientId: 'ing-1', quantity: '3' }] });

    expect(res.status).toBe(200);
    expect(txProductIngredientDeleteManyMock).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    const data = firstUpdateData();
    expect(data.cost.toString()).toBe('15');
    expect(data.marginAmount.toString()).toBe('15');
    expect(data.marginPercent.toString()).toBe('50');
  });

  it('pasa a borrador (cost/margin en 0) cuando ingredients llega vacío', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Prod', cost: '0.00', marginAmount: '0.00', marginPercent: '0.00' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ ingredients: [] });

    expect(res.status).toBe(200);
    expect(txProductIngredientDeleteManyMock).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    // No debe consultar insumos porque no hay ninguno que validar
    expect(txIngredientFindManyMock).not.toHaveBeenCalled();
    const data = firstUpdateData();
    expect(data.marginAmount.toString()).toBe('0');
    expect(data.marginPercent.toString()).toBe('0');
  });

  it('devuelve 404 si el producto no existe o pertenece a otra cuenta', async () => {
    txProductFindFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .put('/api/products/p-inexistente')
      .send({ salePrice: '100.00' });

    expect(res.status).toBe(404);
  });

  it('devuelve 400 si la receta enviada contiene un insumo inexistente y no persiste cambios', async () => {
    txProductFindFirstMock.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      salePrice: new Prisma.Decimal('30.00'),
      minMarginPercent: new Prisma.Decimal('10'),
      cost: new Prisma.Decimal('20.00'),
      marginAmount: new Prisma.Decimal('10.00'),
      marginPercent: new Prisma.Decimal('33.33'),
    });
    // Se pidió 1 insumo pero la búsqueda no devuelve ninguno -> mismatch de longitud
    txIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ ingredients: [{ ingredientId: 'ing-inexistente', quantity: '1' }] });

    expect(res.status).toBe(400);
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/products/:id', () => {
  it('elimina el producto si pertenece a la cuenta', async () => {
    productDeleteManyMock.mockResolvedValue({ count: 1 });

    const res = await request(buildApp()).delete('/api/products/p1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(productDeleteManyMock).toHaveBeenCalledWith({ where: { id: 'p1', accountId: 'account-1' } });
  });
});

/* Nombres de producto: se guardan tal como los escribe el usuario (#236) y la
 * unicidad por cuenta es case-insensitive. Desde que se quitó el toLowerCase()
 * al guardar, la restricción @@unique([accountId, name]) de Postgres distingue
 * mayúsculas, así que la única barrera contra "Pan de Campo" / "PAN DE CAMPO"
 * es la validación con mode: 'insensitive' de la ruta. */
describe('Nombres de producto: formato original y unicidad case-insensitive', () => {
  const existingProduct = {
    id: 'p1',
    name: 'Pan de Campo',
    salePrice: new Prisma.Decimal('30.00'),
    minMarginPercent: new Prisma.Decimal('10'),
    cost: new Prisma.Decimal('0'),
    marginAmount: new Prisma.Decimal('0'),
    marginPercent: new Prisma.Decimal('0'),
  };

  beforeEach(() => {
    // Prisma siempre devuelve un array; los POST de este bloque van sin receta.
    txIngredientFindManyMock.mockResolvedValue([]);
  });

  it('POST guarda el nombre con las mayúsculas y minúsculas que escribió el usuario', async () => {
    txProductFindFirstMock.mockResolvedValue(null);
    txProductCreateMock.mockResolvedValue({ id: 'p1', name: 'Pan de Campo' });

    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'Pan de Campo', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(res.status).toBe(201);
    expect(txProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Pan de Campo' }) })
    );
  });

  it('POST busca duplicados sin distinguir mayúsculas y dentro de la misma cuenta', async () => {
    txProductFindFirstMock.mockResolvedValue(null);
    txProductCreateMock.mockResolvedValue({ id: 'p2', name: 'PAN DE CAMPO' });

    await request(buildApp())
      .post('/api/products')
      .send({ name: 'PAN DE CAMPO', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(txProductFindFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'PAN DE CAMPO', mode: 'insensitive' } },
    });
  });

  it('POST rechaza con 409 un nombre que solo difiere en mayúsculas de uno existente', async () => {
    txProductFindFirstMock.mockResolvedValue(existingProduct);

    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'PAN DE CAMPO', salePrice: '30.00', minMarginPercent: '10', ingredients: [] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un producto con ese nombre.');
    expect(txProductCreateMock).not.toHaveBeenCalled();
  });

  it('PUT rechaza con 409 renombrar a un nombre de otro producto con distinto casing', async () => {
    txProductFindFirstMock
      .mockResolvedValueOnce({ ...existingProduct, id: 'p2', name: 'Medialuna' })
      .mockResolvedValueOnce(existingProduct);
    txProductIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp())
      .put('/api/products/p2')
      .send({ name: 'pan de campo' });

    expect(res.status).toBe(409);
    expect(txProductFindFirstMock).toHaveBeenLastCalledWith({
      where: { accountId: 'account-1', name: { equals: 'pan de campo', mode: 'insensitive' } },
    });
    expect(txProductUpdateMock).not.toHaveBeenCalled();
  });

  it('PUT permite corregir solo el casing del propio nombre y lo guarda tal cual', async () => {
    txProductFindFirstMock.mockResolvedValueOnce({ ...existingProduct, name: 'pan de campo' });
    txProductIngredientCountMock.mockResolvedValue(0);
    txProductUpdateMock.mockResolvedValue({ id: 'p1', name: 'Pan de Campo' });

    const res = await request(buildApp())
      .put('/api/products/p1')
      .send({ name: 'Pan de Campo' });

    expect(res.status).toBe(200);
    // Solo la búsqueda del producto existente: no hay chequeo de duplicado contra sí mismo
    expect(txProductFindFirstMock).toHaveBeenCalledTimes(1);
    expect(firstUpdateData().name).toBe('Pan de Campo');
  });
});

/* ------------------------------------------------------------------ */
/* #428: el colaborador no ve borradores ni productos a $0            */
/* ------------------------------------------------------------------ */
describe('Productos a la venta para el COLLABORATOR (#428)', () => {
  const A_LA_VENTA = { ingredients: { some: {} }, salePrice: { gt: 0 } };

  it('Escenario "Colaborador sin borradores": la lista y el total solo cuentan productos con receta y precio', async () => {
    setAuthRole('COLLABORATOR');
    // Panadería: 3 con receta y precio (lo que devuelve la base con el filtro) de 5 en total.
    productFindManyMock.mockResolvedValue([
      { id: 'p1', name: 'Pan de campo 1 kg', salePrice: '4500.00', ingredients: [{ ingredientId: 'i1', quantity: '0.700' }] },
      { id: 'p2', name: 'Medialunas de manteca x12', salePrice: '6000.00', ingredients: [{ ingredientId: 'i2', quantity: '0.300' }] },
      { id: 'p3', name: 'Budín de limón', salePrice: '5200.00', ingredients: [{ ingredientId: 'i3', quantity: '0.250' }] },
    ]);
    productCountMock.mockResolvedValue(3);

    const res = await request(buildApp()).get('/api/products?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    // El filtro va en la consulta: la lista y el conteo usan el mismo where, así la paginación cuenta bien.
    const where = { accountId: 'account-1', ...A_LA_VENTA };
    expect(productFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(productCountMock).toHaveBeenCalledWith({ where });
  });

  it('el filtro se suma a la búsqueda por nombre, sin reemplazarla', async () => {
    setAuthRole('COLLABORATOR');
    productFindManyMock.mockResolvedValue([]);
    productCountMock.mockResolvedValue(0);

    await request(buildApp()).get('/api/products?search=pan');

    const { where } = productFindManyMock.mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(where).toMatchObject({ accountId: 'account-1', ...A_LA_VENTA });
    expect(where.OR).toBeDefined();
  });

  it('Escenario "ADMIN sin cambios": el ADMIN sigue recibiendo los borradores', async () => {
    productFindManyMock.mockResolvedValue([]);
    productCountMock.mockResolvedValue(5);

    const res = await request(buildApp()).get('/api/products');

    expect(res.body.meta.total).toBe(5);
    expect(productCountMock).toHaveBeenCalledWith({ where: { accountId: 'account-1' } });
  });

  it('Escenario "Borrador por id": el COLLABORATOR recibe 404, igual que con un producto de otra cuenta', async () => {
    setAuthRole('COLLABORATOR');
    // Con el filtro en la consulta, la base no devuelve el borrador.
    productFindFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/products/p-borrador');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Producto no encontrado.');
    expect(productFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p-borrador', accountId: 'account-1', ...A_LA_VENTA } })
    );
  });

  it('el ADMIN abre un borrador por id como siempre', async () => {
    productFindFirstMock.mockResolvedValue({ id: 'p-borrador', accountId: 'account-1', name: 'Torta de ricota', salePrice: '0.00' });

    const res = await request(buildApp()).get('/api/products/p-borrador');

    expect(res.status).toBe(200);
    expect(productFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p-borrador', accountId: 'account-1' } })
    );
  });
});
</file>

<file path="backend/src/routes/products.ts">
import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { blockCollaboratorMutations, requireRole, sanitizeFinancialData } from '../middlewares/rbac';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT, normalizeSearchText } from '../utils/pagination';
import { calculateRecipeTotal, calculateMarginAmount, calculateMarginPercent } from '../services/marginCalculator';

const router = Router();
router.use(authMiddleware);
router.use(blockCollaboratorMutations);
router.use(sanitizeFinancialData);

const SORTABLE_FIELDS = ['name', 'salePrice', 'cost', 'marginPercent', 'updatedAt'] as const;
const SAFE_SORTABLE_FIELDS = ['name', 'salePrice', 'updatedAt'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

interface ProductPaginationParams {
  page: number;
  limit: number;
  sortBy: SortableField;
  order: 'asc' | 'desc';
  search: string;
}

function parseProductPaginationParams(
  query: Record<string, unknown>,
  userRole?: 'ADMIN' | 'COLLABORATOR'
): ProductPaginationParams {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawLimit = Number(query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const allowedSortFields = userRole === 'COLLABORATOR' ? SAFE_SORTABLE_FIELDS : SORTABLE_FIELDS;
  const rawSortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
  const sortBy = (allowedSortFields as readonly string[]).includes(rawSortBy)
    ? (rawSortBy as SortableField)
    : 'name';

  const rawOrder = typeof query.order === 'string' ? query.order.toLowerCase() : '';
  const order = rawOrder === 'desc' ? 'desc' : 'asc';

  const rawSearch = typeof query.search === 'string' ? query.search.trim() : '';
  const search = rawSearch.slice(0, 100);

  return { page, limit, sortBy, order, search };
}

interface ProductBody {
  name?: unknown;
  salePrice?: unknown;
  minMarginPercent?: unknown;
  ingredients?: unknown;
}

interface ProductIngredientBody {
  ingredientId?: unknown;
  quantity?: unknown;
}

const MAX_MONEY_VALUE = new Prisma.Decimal('99999999.99');
const MAX_PERCENT_VALUE = new Prisma.Decimal('999.99');
const MAX_QUANTITY_VALUE = new Prisma.Decimal('9999999.999');
const DECIMAL_REGEX = { 2: /^-?\d+(\.\d{1,2})?$/, 3: /^-?\d+(\.\d{1,3})?$/ } as const;
const SALE_PRICE_WITH_RECIPE_ERROR =
  'El precio de venta debe ser mayor a cero cuando el producto tiene ingredientes en su receta.';

function decimal(value: unknown, field: string, allowZero = false, precision: 2 | 3 = 2): Prisma.Decimal {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new AppError(`El campo "${field}" debe ser numérico.`, 400);
  }

  const text = String(value).trim();
  if (!DECIMAL_REGEX[precision].test(text)) {
    throw new AppError(
      `El campo "${field}" debe ser un valor decimal válido con hasta ${precision} decimales (ej: "${precision === 3 ? '0.250' : '1500.50'}").`,
      400
    );
  }

  const result = new Prisma.Decimal(text);
  if (allowZero ? result.lessThan(0) : result.lessThanOrEqualTo(0)) {
    throw new AppError(`El campo "${field}" debe ser ${allowZero ? 'mayor o igual a' : 'mayor a'} cero.`, 400);
  }

  if (field === 'salePrice' && result.abs().greaterThan(MAX_MONEY_VALUE)) {
    throw new AppError('El campo "salePrice" no puede superar $99.999.999,99.', 400);
  }

  if (field === 'minMarginPercent' && result.abs().greaterThan(MAX_PERCENT_VALUE)) {
    throw new AppError('El campo "minMarginPercent" no puede superar el 999.99%.', 400);
  }

  if (field === 'quantity' && result.abs().greaterThan(MAX_QUANTITY_VALUE)) {
    throw new AppError('El campo "quantity" excede la capacidad máxima permitida.', 400);
  }

  return result;
}

function parseRecipe(rawIngredients: unknown): { ingredientId: string; quantity: Prisma.Decimal }[] {
  if (!Array.isArray(rawIngredients)) throw new AppError('El campo "ingredients" debe ser un array.', 400);

  const seenIngredientIds = new Set<string>();
  return rawIngredients.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) throw new AppError('Cada ingrediente debe ser un objeto.', 400);
    const item = entry as ProductIngredientBody;
    if (typeof item.ingredientId !== 'string' || !item.ingredientId) throw new AppError('Cada ingrediente requiere ingredientId.', 400);
    if (seenIngredientIds.has(item.ingredientId)) {
      throw new AppError('No se puede repetir el mismo insumo en la receta.', 400);
    }
    seenIngredientIds.add(item.ingredientId);
    return { ingredientId: item.ingredientId, quantity: decimal(item.quantity, 'quantity', false, 3) };
  });
}

function parseBody(body: ProductBody) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new AppError('El campo "name" es obligatorio.', 400);
  const salePrice = decimal(body.salePrice, 'salePrice', true);
  const minMarginPercent = decimal(body.minMarginPercent, 'minMarginPercent', true);
  const ingredients = parseRecipe(body.ingredients);

  if (ingredients.length > 0 && salePrice.lessThanOrEqualTo(0)) {
    throw new AppError(SALE_PRICE_WITH_RECIPE_ERROR, 400);
  }

  return { name, salePrice, minMarginPercent, ingredients };
}

/**
 * El COLLABORATOR solo ve lo que se vende: productos con receta y precio mayor que 0 (#428).
 * Un borrador (sin receta) puede tener precio $0, y el empleado podría leérselo a un cliente.
 * El filtro va en la consulta, así `meta.total` y la paginación cuentan solo lo que se ve.
 */
function forSaleFilter(role: string | undefined): Prisma.ProductWhereInput {
  return role === 'COLLABORATOR' ? { ingredients: { some: {} }, salePrice: { gt: 0 } } : {};
}

/* ------------------------------------------------------------------ */
/* GET /api/products                                                  */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { page, limit, sortBy, order, search } = parseProductPaginationParams(
    req.query as Record<string, unknown>,
    req.user!.role
  );

  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    accountId,
    ...forSaleFilter(req.user!.role),
    ...(search
      ? {
          OR: [
            { searchName: { contains: normalizeSearchText(search), mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      omit: { searchName: true },
      include: { ingredients: { select: { ingredientId: true, quantity: true } } },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return res.status(200).json({
    data,
    products: data,
    meta: { total, page, limit, totalPages },
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/products                                                 */
/* ------------------------------------------------------------------ */
router.post('/', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const payload = req.body && typeof req.body === 'object' && 'product' in req.body
    ? (req.body as { product?: unknown }).product
    : req.body;
  const input = parseBody(payload as ProductBody);
  const accountId = req.user!.accountId;

  const product = await prisma.$transaction(async (tx) => {
    const ingredientIds = input.ingredients.map((item) => item.ingredientId);
    const ingredientRows = await tx.ingredient.findMany({
      where: { accountId, id: { in: ingredientIds } },
      select: { id: true, currentCost: true },
    });
    if (ingredientRows.length !== ingredientIds.length) throw new AppError('Una receta contiene un insumo inexistente.', 400);

    const cost = calculateRecipeTotal(
      input.ingredients.map((item) => ({
        quantity: item.quantity,
        unitCost: ingredientRows.find((row) => row.id === item.ingredientId)?.currentCost ?? new Prisma.Decimal(0),
      }))
    );
    const marginAmount = calculateMarginAmount(input.salePrice, cost);
    const marginPercent = calculateMarginPercent(input.salePrice, cost);

    const existingByName = await tx.product.findFirst({
      where: { accountId, name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existingByName) throw new AppError('Ya existe un producto con ese nombre.', 409);

    return tx.product.create({
      omit: { searchName: true },
      data: {
        accountId,
        name: input.name,
        searchName: normalizeSearchText(input.name),
        salePrice: input.salePrice,
        minMarginPercent: input.minMarginPercent,
        cost,
        marginAmount,
        marginPercent,
        ingredients: { create: input.ingredients },
      },
      include: { ingredients: { select: { ingredientId: true, quantity: true } } },
    });
  });

  return res.status(201).json({ product });
});

function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] ?? '';
  return rawId ?? '';
}

/* ------------------------------------------------------------------ */
/* GET /api/products/:id                                              */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id as unknown as string | string[] | undefined);
  if (!id) throw new AppError('ID de producto inválido.', 400);

  const product = await prisma.product.findFirst({
    // Para el COLLABORATOR, un borrador responde 404 como un producto de otra cuenta (#428).
    where: { id, accountId, ...forSaleFilter(req.user!.role) },
    omit: { searchName: true },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!product) throw new AppError('Producto no encontrado.', 404);

  return res.status(200).json({ product });
});

/* ------------------------------------------------------------------ */
/* PUT /api/products/:id                                              */
/* ------------------------------------------------------------------ */
router.put('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) throw new AppError('Se requiere Content-Type: application/json', 415);

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id as unknown as string | string[] | undefined);
  if (!id) throw new AppError('ID de producto inválido.', 400);

  const payload = req.body && typeof req.body === 'object' && 'product' in req.body
    ? (req.body as { product?: unknown }).product
    : req.body;
  const body = payload as Partial<ProductBody>;
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const salePrice = body.salePrice !== undefined ? decimal(body.salePrice, 'salePrice', true) : undefined;
  const minMarginPercent = body.minMarginPercent !== undefined ? decimal(body.minMarginPercent, 'minMarginPercent', true) : undefined;
  const ingredients = body.ingredients !== undefined ? parseRecipe(body.ingredients) : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({ where: { id, accountId } });
    if (!existing) throw new AppError('Producto no encontrado.', 404);

    const finalSalePrice = salePrice ?? existing.salePrice;
    const finalMinMargin = minMarginPercent ?? existing.minMarginPercent;
    const hasRecipe = ingredients
      ? ingredients.length > 0
      : (await tx.productIngredient.count({ where: { productId: id } })) > 0;

    if (hasRecipe && finalSalePrice.lessThanOrEqualTo(0)) {
      throw new AppError(SALE_PRICE_WITH_RECIPE_ERROR, 400);
    }

    let finalCost = existing.cost;

    if (ingredients) {
      if (ingredients.length > 0) {
        const ingredientIds = ingredients.map((i) => i.ingredientId);
        const ingredientRows = await tx.ingredient.findMany({
          where: { accountId, id: { in: ingredientIds } },
          select: { id: true, currentCost: true },
        });
        if (ingredientRows.length !== ingredientIds.length) {
          throw new AppError('Una receta contiene un insumo inexistente.', 400);
        }
        finalCost = calculateRecipeTotal(
          ingredients.map((item) => ({
            quantity: item.quantity,
            unitCost: ingredientRows.find((row) => row.id === item.ingredientId)?.currentCost ?? new Prisma.Decimal(0),
          }))
        );
      } else {
        finalCost = new Prisma.Decimal(0);
      }
    }

    const finalMarginAmount = calculateMarginAmount(finalSalePrice, finalCost);
    const finalMarginPercent = calculateMarginPercent(finalSalePrice, finalCost);

    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const found = await tx.product.findFirst({ where: { accountId, name: { equals: name, mode: 'insensitive' } } });
      if (found) throw new AppError('Ya existe un producto con ese nombre.', 409);
    }

    if (ingredients) {
      await tx.productIngredient.deleteMany({ where: { productId: id } });
    }

    return tx.product.update({
      where: { id },
      omit: { searchName: true },
      data: {
        name: name ?? existing.name,
        searchName: name ? normalizeSearchText(name) : undefined,
        salePrice: finalSalePrice,
        minMarginPercent: finalMinMargin,
        cost: finalCost,
        marginAmount: finalMarginAmount,
        marginPercent: finalMarginPercent,
        ingredients: ingredients && ingredients.length > 0 ? { create: ingredients } : undefined,
      },
      include: { ingredients: { select: { ingredientId: true, quantity: true } } },
    });
  });

  return res.status(200).json({ product: updated });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/products/:id                                           */
/* ------------------------------------------------------------------ */
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id as unknown as string | string[] | undefined);
  if (!id) throw new AppError('ID de producto inválido.', 400);

  const result = await prisma.product.deleteMany({ where: { id, accountId } });
  if (result.count === 0) throw new AppError('Producto no encontrado.', 404);

  return res.status(200).json({ success: true });
});

export default router;
</file>

<file path="backend/src/routes/salesModule.ts">
import { Router, type NextFunction, type Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireFeature } from '../lib/features';
import { requireRole } from '../middlewares/rbac';
import { prisma } from '../lib/prisma';
import {
  closeShift,
  findShift,
  getCurrentShift,
  listShifts,
  openShift,
  parseCloseInput,
  parseOpeningAmount,
  parseShiftListQuery,
} from '../services/cashShiftService';
import { getSalesSummary, parseSummaryPeriod } from '../services/salesSummaryService';
import {
  createSale,
  findSale,
  listSales,
  parseSaleInput,
  parseSaleListQuery,
  parseVoidReason,
  serializeSale,
  voidSale,
  type SaleActor,
} from '../services/salesService';

/*
  Módulo de ventas (ADR-010): puntos de montaje de /api/sales y /api/cash-shifts.
  Toda ruta exige sesión y el módulo prendido para la cuenta: si está apagado,
  responde 404 como si no existiera.

  Venta y ticket: ADMIN y COLLABORATOR venden. Al colaborador nunca le llegan costos
  ni márgenes: la respuesta se arma por rol en `serializeSale` (no se usa
  `sanitizeFinancialData` porque quitaría la cantidad de cada renglón del ticket).

  Turnos y cierre de caja: ADMIN y COLLABORATOR abren y cierran. El arqueo no tiene
  costos ni márgenes; el colaborador ve en el historial el turno abierto y los que abrió
  o cerró.
*/
export const salesRouter = Router();
salesRouter.use(authMiddleware, requireFeature('sales'));

export const cashShiftsRouter = Router();
cashShiftsRouter.use(authMiddleware, requireFeature('sales'));

function actorOf(req: AuthenticatedRequest): SaleActor {
  if (!req.user) throw new AppError('No autorizado', 401);
  return { id: req.user.id, accountId: req.user.accountId, role: req.user.role };
}

/** Las respuestas con ventas no se guardan en cachés compartidas. */
function noStore(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
}
salesRouter.use(noStore);
cashShiftsRouter.use(noStore);

salesRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const input = parseSaleInput(req.body);
  const sale = await createSale(actor, input);
  const account = await prisma.account.findUnique({
    where: { id: actor.accountId },
    select: { businessName: true },
  });
  return res.status(201).json(serializeSale(sale, actor.role, account?.businessName ?? ''));
});

salesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const query = parseSaleListQuery(req.query as Record<string, unknown>);
  return res.status(200).json(await listSales(actor, query));
});

/**
 * Ganancia real (solo ADMIN): ventas, costo congelado, ganancia y margen ponderado del
 * período, con la comparación y los rankings. Va antes de `/:id` para que "summary" no
 * se tome como el id de una venta.
 */
salesRouter.get('/summary', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const period = parseSummaryPeriod(req.query as Record<string, unknown>);
  return res.status(200).json(await getSalesSummary(actor.accountId, period));
});

salesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const sale = await findSale(actor, String(req.params.id));
  if (!sale) {
    throw new AppError('La venta no existe.', 404);
  }
  return res.status(200).json(serializeSale(sale, actor.role, sale.account.businessName));
});

salesRouter.post('/:id/void', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const reason = parseVoidReason(req.body);
  const sale = await voidSale(actor, String(req.params.id), reason);
  return res.status(200).json(serializeSale(sale, actor.role, sale.account.businessName));
});

cashShiftsRouter.post('/open', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const openingAmount = parseOpeningAmount(req.body);
  return res.status(201).json(await openShift(actor, openingAmount));
});

/** Sin turno abierto responde 200 con `shift: null`: el 404 queda para el módulo apagado. */
cashShiftsRouter.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  return res.status(200).json({ shift: await getCurrentShift(actor) });
});

cashShiftsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const query = parseShiftListQuery(req.query as Record<string, unknown>);
  return res.status(200).json(await listShifts(actor, query));
});

cashShiftsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const shift = await findShift(actor, String(req.params.id));
  if (!shift) {
    throw new AppError('El turno no existe.', 404);
  }
  // El resumen imprimible del cierre lleva el nombre del comercio, como el ticket.
  const account = await prisma.account.findUnique({
    where: { id: actor.accountId },
    select: { businessName: true },
  });
  return res.status(200).json({ ...shift, businessName: account?.businessName ?? '' });
});

cashShiftsRouter.post('/:id/close', async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req);
  const counted = parseCloseInput(req.body);
  return res.status(200).json(await closeShift(actor, String(req.params.id), counted));
});
</file>

<file path="backend/package.json">
{
  "name": "backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:seed:prod": "NODE_ENV=production ALLOW_PRODUCTION_SEED=true tsx prisma/seed.ts",
    "seed:demo": "tsx prisma/seed-demo.ts",
    "seed:volumen": "tsx prisma/seed-volumen.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@clerk/backend": "^3.16.13",
    "@prisma/client": "^6.19.3",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "helmet": "^8.3.0",
    "prisma": "^6.19.3",
    "swagger-ui-express": "^5.0.1",
    "yaml": "^2.9.1",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@apidevtools/swagger-parser": "^13.1.0",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^26.5.1",
    "@types/supertest": "^7.2.1",
    "@types/swagger-ui-express": "^4.1.8",
    "@vitest/coverage-v8": "^5.1.0",
    "supertest": "^7.0.0",
    "tsx": "^4.23.12",
    "typescript": "^7.0.2",
    "vitest": "^5.1.0"
  },
  "overrides": {
    "effect": "3.22.5"
  }
}
</file>

<file path="backend/src/routes/ingredients.ts">
import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { blockCollaboratorMutations, requireRole, sanitizeFinancialData } from '../middlewares/rbac';
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePaginationParams,
  normalizeSearchText,
} from '../utils/pagination';
import { parseArgentineDecimal } from '../utils/argentineNumber';
import {
  applyIngredientCostChange,
  calculateUnitCost,
  classifyProductHealthBucket,
} from '../services/marginCalculator';
import { dispatchMarginAlertEvent } from '../services/marginAlertDispatcher';

const router = Router();

router.use(authMiddleware);
router.use(blockCollaboratorMutations);
router.use(sanitizeFinancialData);

function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? '';
  }
  return rawId ?? '';
}

const PRODUCT_USAGE_SORTABLE_FIELDS = ['name', 'quantity', 'salePrice', 'cost', 'marginPercent'] as const;
type ProductUsageSortField = (typeof PRODUCT_USAGE_SORTABLE_FIELDS)[number];

interface IngredientProductsPaginationParams {
  page: number;
  limit: number;
  sortBy: ProductUsageSortField;
  order: 'asc' | 'desc';
  search: string;
}

function parseIngredientProductsPaginationParams(
  query: Record<string, unknown>
): IngredientProductsPaginationParams {
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawLimit = Number(query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const rawSortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
  const sortBy = (PRODUCT_USAGE_SORTABLE_FIELDS as readonly string[]).includes(rawSortBy)
    ? (rawSortBy as ProductUsageSortField)
    : 'name';

  const rawOrder = typeof query.order === 'string' ? query.order.toLowerCase() : '';
  const order = rawOrder === 'desc' ? 'desc' : 'asc';

  const rawSearch = typeof query.search === 'string' ? query.search.trim() : '';
  const search = rawSearch.slice(0, 100);

  return { page, limit, sortBy, order, search };
}

function buildIngredientProductsOrderBy(
  sortBy: ProductUsageSortField,
  order: 'asc' | 'desc'
): Prisma.ProductIngredientOrderByWithRelationInput {
  switch (sortBy) {
    case 'quantity':
      return { quantity: order };
    case 'salePrice':
      return { product: { salePrice: order } };
    case 'cost':
      return { product: { cost: order } };
    case 'marginPercent':
      return { product: { marginPercent: order } };
    case 'name':
    default:
      return { product: { name: order } };
  }
}

const VALID_UNITS = ['kg', 'l', 'u'] as const;
type Unit = (typeof VALID_UNITS)[number];
const MAX_MONEY_VALUE = new Prisma.Decimal('99999999.99');
const BULK_MAX_ROWS = 500;

interface IngredientInputDTO {
  name?: unknown;
  unit?: unknown;
  currentCost?: unknown;
}

interface ValidatedIngredientInput {
  name: string;
  unit: Unit;
  currentCost: Prisma.Decimal;
}

function validateIngredientInput(
  body: IngredientInputDTO
): { data: ValidatedIngredientInput } | { errors: string[] } {
  const errors: string[] = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.push('El campo "name" es obligatorio y debe ser un texto no vacío.');
  }

  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  if (!VALID_UNITS.includes(unit as Unit)) {
    errors.push(`El campo "unit" debe ser uno de: ${VALID_UNITS.join(', ')}.`);
  }

  let currentCost: Prisma.Decimal | null = null;
  const rawCost = body.currentCost;

  if (
    rawCost === undefined ||
    rawCost === null ||
    (typeof rawCost === 'string' && rawCost.trim() === '')
  ) {
    errors.push('El campo "currentCost" es obligatorio.');
  } else {
    try {
      const decimalValue = parseArgentineDecimal(rawCost, 'currentCost');
      if (decimalValue.lessThanOrEqualTo(0)) {
        errors.push('El campo "currentCost" debe ser mayor a cero.');
      } else if (decimalValue.decimalPlaces() > 2) {
        errors.push('El campo "currentCost" debe ser un valor decimal válido (ej: "742.98").');
      } else if (decimalValue.abs().greaterThan(MAX_MONEY_VALUE)) {
        errors.push('El insumo no puede superar $99.999.999,99.');
      } else {
        currentCost = decimalValue;
      }
    } catch (error) {
      errors.push((error as Error).message || 'El campo "currentCost" debe ser un valor decimal válido.');
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      name,
      unit: unit as Unit,
      currentCost: currentCost as Prisma.Decimal,
    },
  };
}

function parseIngredientInput(body: IngredientInputDTO): ValidatedIngredientInput {
  const validation = validateIngredientInput(body);
  if ('errors' in validation) {
    throw new AppError(validation.errors.join(' '), 400);
  }
  return validation.data;
}

/* ------------------------------------------------------------------ */
/* GET /api/ingredients                                                */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const query = { ...(req.query as Record<string, unknown>) };

  if (req.user!.role === 'COLLABORATOR') {
    const rawSortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
    if (!['name', 'updatedAt'].includes(rawSortBy)) {
      query.sortBy = 'name';
    }
  }

  const { page, limit, sortBy, order, search } = parsePaginationParams(query);
  const skip = (page - 1) * limit;

  const where: Prisma.IngredientWhereInput = { accountId };
  if (search) {
    const normalized = normalizeSearchText(search);
    where.OR = [
      { searchName: { contains: normalized, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      omit: { searchName: true },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.ingredient.count({ where }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return res.status(200).json({
    data,
    meta: { total, page, limit, totalPages },
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/ingredients/:id                                            */
/* Incluye presentaciones de proveedores asociadas para rol ADMIN.     */
/* (RBAC sanitizeFinancialData limpia 'suppliers' para COLLABORATOR)   */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, accountId },
    omit: { searchName: true },
    include: {
      suppliers: {
        include: {
          supplier: true,
        },
      },
    },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  return res.status(200).json({ ingredient });
});

/* ------------------------------------------------------------------ */
/* GET /api/ingredients/:id/history                                    */
/* ------------------------------------------------------------------ */
router.get('/:id/history', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const history = await prisma.priceHistory.findMany({
    where: { ingredientId: id },
    orderBy: { changedAt: 'asc' },
  });

  return res.status(200).json({ history });
});

/* ------------------------------------------------------------------ */
/* GET /api/ingredients/:id/products                                   */
/* Lista paginada de productos cuya receta utiliza el insumo.          */
/* Solo ADMIN; acotado estrictamente por accountId.                    */
/* ------------------------------------------------------------------ */
router.get('/:id/products', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const { page, limit, sortBy, order, search } = parseIngredientProductsPaginationParams(
    req.query as Record<string, unknown>
  );
  const skip = (page - 1) * limit;

  const where: Prisma.ProductIngredientWhereInput = {
    ingredientId: id,
    product: {
      accountId,
      ...(search
        ? {
            OR: [
              { searchName: { contains: normalizeSearchText(search), mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
  };

  const [rows, total] = await Promise.all([
    prisma.productIngredient.findMany({
      where,
      select: {
        quantity: true,
        product: {
          select: {
            id: true,
            name: true,
            salePrice: true,
            cost: true,
            marginAmount: true,
            marginPercent: true,
            minMarginPercent: true,
            updatedAt: true,
          },
        },
      },
      orderBy: buildIngredientProductsOrderBy(sortBy, order),
      skip,
      take: limit,
    }),
    prisma.productIngredient.count({ where }),
  ]);

  const data = rows.map((row) => {
    const marginStatus = classifyProductHealthBucket(
      new Prisma.Decimal(row.product.marginPercent ?? 0),
      new Prisma.Decimal(row.product.minMarginPercent ?? 0),
      1
    );

    return {
      id: row.product.id,
      name: row.product.name,
      quantity: row.quantity,
      salePrice: row.product.salePrice,
      cost: row.product.cost,
      marginAmount: row.product.marginAmount,
      marginPercent: row.product.marginPercent,
      minMarginPercent: row.product.minMarginPercent,
      marginStatus,
      updatedAt: row.product.updatedAt,
    };
  });

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return res.status(200).json({
    data,
    meta: { total, page, limit, totalPages },
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/ingredients                                               */
/* ------------------------------------------------------------------ */
router.post('/', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);

  const existing = await prisma.ingredient.findFirst({
    where: { accountId, name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) {
    throw new AppError('Ya existe un insumo con ese nombre.', 409);
  }

  const ingredient = await prisma.ingredient.create({
    omit: { searchName: true },
    data: {
      name,
      searchName: normalizeSearchText(name),
      unit,
      currentCost,
      accountId,
    },
  });

  return res.status(201).json({ ingredient });
});

/**
 * Carga masiva de insumos por planilla.
 */
router.post('/bulk', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const rawPayload = req.body as unknown;
  const rows: unknown[] = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray((rawPayload as { rows?: unknown[] } | null)?.rows)
      ? (rawPayload as { rows: unknown[] }).rows
      : [];

  if (!Array.isArray(rawPayload) && !Array.isArray((rawPayload as { rows?: unknown[] } | null)?.rows)) {
    throw new AppError('La carga masiva debe enviarse como un array de filas.', 400);
  }

  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(
      `La lista supera el tope de ${BULK_MAX_ROWS} filas por lote. Dividila en varios lotes más pequeños.`,
      413
    );
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const validRows: Array<{ name: string; searchName: string; unit: Unit; cost: Prisma.Decimal }> = [];
  const existingNames = new Set(
    (await prisma.ingredient.findMany({
      where: { accountId },
      select: { name: true },
    })).map((row) => row.name.trim().toLowerCase())
  );
  const seenInBatch = new Set<string>();
  let skipped = 0;

  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object') {
      errors.push({ row: index + 1, reason: 'La fila debe contener un objeto con nombre, unidad y costo.' });
      continue;
    }

    const candidate = row as Record<string, unknown>;
    const name = String(candidate.name ?? candidate.nombre ?? '').trim();
    const unit = String(candidate.unit ?? candidate.unidad ?? '').trim().toLowerCase();
    const rawCost = candidate.cost ?? candidate.costo ?? candidate.currentCost;
    const normalizedName = name.toLowerCase();

    const validationErrors: string[] = [];

    if (!name) {
      validationErrors.push('El campo "name" es obligatorio y debe ser un texto no vacío.');
    }

    if (!VALID_UNITS.includes(unit as Unit)) {
      validationErrors.push(`El campo "unit" debe ser uno de: ${VALID_UNITS.join(', ')}.`);
    }

    let parsedCost: Prisma.Decimal | null = null;
    if (rawCost === undefined || rawCost === null || (typeof rawCost === 'string' && rawCost.trim() === '')) {
      validationErrors.push('El campo "cost" es obligatorio.');
    } else {
      try {
        const decimalValue = parseArgentineDecimal(rawCost, 'cost');
        if (decimalValue.lessThanOrEqualTo(0)) {
          validationErrors.push('El campo "cost" debe ser mayor a cero.');
        } else if (decimalValue.decimalPlaces() > 2) {
          validationErrors.push('El campo "cost" debe ser un valor decimal válido (ej: "742.98").');
        } else if (decimalValue.abs().greaterThan(MAX_MONEY_VALUE)) {
          validationErrors.push('El insumo no puede superar $99.999.999,99.');
        } else {
          parsedCost = decimalValue;
        }
      } catch (error) {
        validationErrors.push((error as Error).message || 'El campo "cost" debe ser un valor decimal válido.');
      }
    }

    if (validationErrors.length > 0) {
      errors.push({ row: index + 1, reason: validationErrors.join(' ') });
      continue;
    }

    if (existingNames.has(normalizedName) || seenInBatch.has(normalizedName)) {
      skipped += 1;
      continue;
    }

    validRows.push({ name, searchName: normalizeSearchText(name), unit: unit as Unit, cost: parsedCost! });
    seenInBatch.add(normalizedName);
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    for (const item of validRows) {
      await tx.ingredient.create({
        data: {
          name: item.name,
          searchName: item.searchName,
          unit: item.unit,
          currentCost: item.cost,
          accountId,
        },
      });
    }

    return validRows.length;
  });

  return res.status(200).json({
    created: transactionResult,
    skipped,
    errors,
  });
});

/* ------------------------------------------------------------------ */
/* PUT /api/ingredients/:id                                            */
/* ------------------------------------------------------------------ */
/**
 * Qué hacer con la presentación predeterminada cuando el ADMIN cambia a mano el costo del insumo (#427, ADR-011):
 * - `update-presentation`: el precio del bulto pasa a costo × tamaño del bulto, para que siga dando el costo nuevo.
 * - `clear-default`: la presentación deja de ser la predeterminada y el insumo queda con el costo manual.
 */
const DEFAULT_PRESENTATION_ACTIONS = ['update-presentation', 'clear-default'] as const;
type DefaultPresentationAction = (typeof DEFAULT_PRESENTATION_ACTIONS)[number];

function parseDefaultPresentationAction(body: unknown): DefaultPresentationAction | null {
  const raw = (body as { defaultPresentationAction?: unknown } | null)?.defaultPresentationAction;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || !(DEFAULT_PRESENTATION_ACTIONS as readonly string[]).includes(raw)) {
    throw new AppError('El campo "defaultPresentationAction" tiene que ser "update-presentation" o "clear-default".', 400);
  }
  return raw as DefaultPresentationAction;
}

function safeUnitCost(packagePrice: Prisma.Decimal, packageSize: Prisma.Decimal): Prisma.Decimal | null {
  try {
    return calculateUnitCost(packagePrice, packageSize);
  } catch {
    return null;
  }
}

router.put('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    throw new AppError('El header Content-Type debe ser application/json.', 400);
  }

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const existing = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: {
      id: true,
      name: true,
      unit: true,
      currentCost: true,
      _count: {
        select: {
          products: true,
          suppliers: true,
        },
      },
      // La presentación predeterminada, para avisar si el costo manual la contradice (#427).
      suppliers: {
        where: { isDefault: true },
        take: 1,
        select: {
          id: true,
          packageSize: true,
          packageUnit: true,
          packagePrice: true,
          supplier: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!existing) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const { _count, suppliers: defaultPresentations, ...existingIngredient } = existing;
  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);
  const defaultPresentationAction = parseDefaultPresentationAction(req.body);

  if (unit !== existing.unit) {
    const recipesCount = _count?.products ?? 0;
    const presentationsCount = _count?.suppliers ?? 0;
    if (recipesCount > 0 || presentationsCount > 0) {
      throw new AppError(
        `No se puede cambiar la unidad: el insumo está en ${recipesCount} receta(s) y ${presentationsCount} presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad.`,
        409
      );
    }
  }

  const nextCost = new Prisma.Decimal(currentCost.toString());
  const previousCostForComparison = existing.currentCost ?? new Prisma.Decimal(0);
  const hasNoActualChange =
    previousCostForComparison.equals(nextCost) && existing.name === name && existing.unit === unit;

  // Costo manual que no coincide con la presentación predeterminada: sin acción elegida, 409 y no se guarda nada
  // (#427, ADR-011). Con el mismo costo, o si coincide con el de la presentación, se guarda como siempre.
  const defaultPresentation = defaultPresentations?.[0];
  const defaultUnitCost = defaultPresentation
    ? safeUnitCost(defaultPresentation.packagePrice, defaultPresentation.packageSize)
    : null;
  const costChanges = !previousCostForComparison.equals(nextCost);
  const contradictsDefault = Boolean(defaultPresentation && defaultUnitCost && costChanges && !defaultUnitCost.equals(nextCost));
  if (contradictsDefault && defaultPresentation && defaultUnitCost && !defaultPresentationAction) {
    return res.status(409).json({
      error:
        'El insumo tiene una presentación predeterminada con otro costo. Elegí si actualizás el precio de esa presentación o si dejás de usarla como predeterminada.',
      code: 'DEFAULT_PRESENTATION_MISMATCH',
      defaultPresentation: {
        id: defaultPresentation.id,
        supplierId: defaultPresentation.supplier.id,
        supplierName: defaultPresentation.supplier.name,
        packageSize: defaultPresentation.packageSize.toString(),
        packageUnit: defaultPresentation.packageUnit,
        packagePrice: defaultPresentation.packagePrice.toFixed(2),
        unitCost: defaultUnitCost.toFixed(2),
      },
    });
  }

  // update-presentation: el bulto pasa a costo × tamaño, redondeado al centavo, y el insumo guarda el costo que da ese
  // bulto. Con un tamaño con decimales (0,5 kg) puede diferir en centavos del tipeado, pero así el insumo y su
  // presentación predeterminada coinciden siempre (ADR-005, ADR-011). Un bulto fuera de rango no se guarda.
  let presentationUpdate: { packagePrice: Prisma.Decimal; unitCost: Prisma.Decimal } | null = null;
  if (contradictsDefault && defaultPresentation && defaultPresentationAction === 'update-presentation') {
    const packagePrice = nextCost.mul(defaultPresentation.packageSize).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (packagePrice.greaterThan(MAX_MONEY_VALUE)) {
      throw new AppError(
        'El precio del bulto no puede superar $99.999.999,99. Revisá el costo o dejá de usar esta presentación como predeterminada.',
        422
      );
    }
    const unitCost = safeUnitCost(packagePrice, defaultPresentation.packageSize);
    if (!unitCost) {
      throw new AppError(
        'Con ese costo, el precio del bulto no es válido para esta presentación. Revisá el costo o dejá de usar esta presentación como predeterminada.',
        422
      );
    }
    presentationUpdate = { packagePrice, unitCost };
  }
  const costToSave = presentationUpdate?.unitCost ?? nextCost;

  if (name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.ingredient.findFirst({
      where: { accountId, name: { equals: name, mode: 'insensitive' } },
    });
    if (duplicate) {
      throw new AppError('Ya existe un insumo con ese nombre.', 409);
    }
  }

  if (hasNoActualChange) {
    return res.status(200).json({
      ingredient: existingIngredient,
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    });
  }

  const previousCost = existing.currentCost ?? null;

  const result = await prisma.$transaction(async (tx) => {
    // La decisión sobre la presentación predeterminada va en la misma transacción que el costo (#427).
    if (presentationUpdate && defaultPresentation) {
      await tx.supplierIngredient.update({
        where: { id: defaultPresentation.id },
        data: { packagePrice: presentationUpdate.packagePrice },
      });
    } else if (contradictsDefault && defaultPresentation && defaultPresentationAction === 'clear-default') {
      await tx.supplierIngredient.update({ where: { id: defaultPresentation.id }, data: { isDefault: false } });
    }

    const ingredient = await tx.ingredient.update({
      where: { id },
      omit: { searchName: true },
      data: { name, searchName: normalizeSearchText(name), unit, currentCost: costToSave },
    });

    const { affectedProductsCount, affectedProducts, criticalProducts } = await applyIngredientCostChange(tx, id, previousCost, costToSave);

    return { ingredient, affectedProductsCount, affectedProducts, criticalProducts };
  });

  if (result.criticalProducts.length > 0) {
    void dispatchMarginAlertEvent({
      accountId,
      ingredientId: id,
      ingredientName: name,
      affectedProductsCount: result.affectedProductsCount,
      criticalProducts: result.criticalProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        previousCost: product.previousCost.toFixed(2),
        newCost: product.newCost.toFixed(2),
        currentMarginPercent: product.currentMarginPercent.toFixed(2),
        minMarginPercent: product.minMarginPercent.toFixed(2),
      })),
    });
  }

  return res.status(200).json({
    ingredient: result.ingredient,
    affectedProductsCount: result.affectedProductsCount,
    affectedProducts: result.affectedProducts.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      previousCost: product.previousCost.toFixed(2),
      newCost: product.newCost.toFixed(2),
      currentMarginPercent: product.currentMarginPercent.toFixed(2),
      minMarginPercent: product.minMarginPercent.toFixed(2),
    })),
    criticalProducts: result.criticalProducts.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      previousCost: product.previousCost.toFixed(2),
      newCost: product.newCost.toFixed(2),
      currentMarginPercent: product.currentMarginPercent.toFixed(2),
      minMarginPercent: product.minMarginPercent.toFixed(2),
    })),
  });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/ingredients/:id                                         */
/* ------------------------------------------------------------------ */
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const existing = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const usages = await prisma.productIngredient.findMany({
    where: { ingredientId: id },
    select: {
      product: {
        select: { id: true, name: true },
      },
    },
  });

  if (usages.length > 0) {
    return res.status(409).json({
      error: 'No se puede eliminar el insumo porque forma parte de una o más recetas activas.',
      productsAffected: usages.map((u) => u.product),
    });
  }

  await prisma.ingredient.delete({ where: { id } });

  return res.status(200).json({ message: 'Insumo eliminado correctamente.' });
});

export default router;
</file>

<file path="README.md">
# 📊 MargenX — Control de Márgenes en Tiempo Real / Real-Time Profit Margin SaaS

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/dgimenezdeveloper/margenx/ci.yml?branch=develop&label=CI%20Pipeline&logo=githubactions&logoColor=white)](#)
[![Deployment](https://img.shields.io/badge/CD%20Deploy-VPS%20Linux%20%7C%20Docker%20Hub-2496ED?logo=docker&logoColor=white)](#)
[![Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Express%205%20%7C%20Prisma%206%20%7C%20PostgreSQL%2016-blue)](#)
[![Automation](https://img.shields.io/badge/Automation-n8n%20Webhooks%20%7C%20IMAP-FF6D5A?logo=n8n&logoColor=white)](#)
[![Testing](https://img.shields.io/badge/Testing-Playwright%20E2E%20%7C%20Vitest%20%7C%20Postman-darkgreen?logo=playwright&logoColor=white)](#)
[![Figma](https://img.shields.io/badge/UI%2FUX-Figma%20Interactive%20Prototype-F24E1E?logo=figma&logoColor=white)](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)

> Aplicación web multiempresa para comercios gastronómicos, manufactura artesanal y química. Calcula el margen de ganancia real por producto ante la variación de costos de materias primas, con recálculo en cascada, alertas automáticas vía n8n y aislamiento estricto multi-tenant.
>
> 🌐 **Navegación rápida / Quick Navigation:** [English Documentation](#-english-documentation) | [Documentación en Español](#-documentación-en-español)

---

## 🌐 English Documentation

### 1. Executive Summary & Business Problem
In high-inflation economies, small and medium manufacturing enterprises (bakeries, food trucks, craft manufacturers, cleaning product packagers) calculate product costs once on static spreadsheets and rarely update them. 

When a raw material increases in price (e.g., flour, beef, chemicals, containers), selling prices remain outdated. Consequently, profit margins shrink silently, leading businesses to operate at a loss without realizing it.

**MargenX** solves this problem through:
- **Cascading Recalculation:** Updating an ingredient's cost triggers an automated database transaction that recalculates the total cost and gross profit margin of every finished good using that ingredient across the entire catalog.
- **Visual & Automated Alerts:** Immediate traffic-light badges on the dashboard and asynchronous alerts via **n8n** (Email / Telegram) when a product falls below the target margin threshold.
- **Zero-Click Supplier Ingestion:** Business owners forward supplier price lists (Excel/CSV) to a virtual inbox (`precios-<slug>@margenx.tech`). The system updates mapped items and discards unmapped rows (anti-pollution catalog protection).

---

### 2. UI/UX Design & Figma Prototype
To ensure an intuitive user experience and validate recipe creation flows prior to code implementation, the interface was designed from the ground up under a **Mobile-First (360px)** strategy.

🔗 **[View Interactive Figma Prototype](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)**

The application is structured into five core operational modules:
1. **Authentication & Onboarding (`/login`):** Streamlined sign-in with delegated identity management and multi-tenant domain isolation.
2. **Main Dashboard (`/dashboard`):** Real-time financial summary displaying monitored catalog items, average profitability, and risk alerts with WCAG AA compliant contrast badges (Green $\ge 30\%$, Red $< 30\%$).
3. **Pantry & Supply Management (`/insumos`):** Responsive inventory catalog with live unit cost tracking, search filtering, and inline modal creation.
4. **Products & Recipes (`/productos`, `/productos/nuevo`):** Bill of Materials (BOM) constructor with dynamic supply row additions, yield factor conversions, and interactive pricing simulator (+5%, +10%, target 30%).
5. **Supplier Price Quarantine (`/proveedores/cuarentena`):** Review tray for supplier price updates that triggered the anti-pollution anomaly guard (>50% variation or a near-zero computed unit cost) — an ADMIN releases the update to apply it or rejects it to keep the current price.
6. **Interactive OpenAPI / Swagger Documentation (`/api/docs`):** Live API explorer powered by OpenAPI 3.1, enabling authenticated JWT execution (`Try it out`) and raw contract retrieval (`/api/docs/openapi.json`).

---

### 3. Agile Leadership, Product Management & DevOps Case Study

> **Author's Role:** Darío Giménez — **Scrum Master, Product Manager, DevOps & Automation Architect**  
> **Team:** 4 Software Engineers (UNaB - PPS Supervised Professional Practice Program).  
> **Pilot Clients:** Real-world validation with *Panadería Central* (Gastronomy) and *Química GyJ* (Chemical packager).

#### Agile Project Management & Team Leadership
- **Scrum Framework:** Facilitated 7 two-week sprints (Sprint 0 to Sprint 6), leading daily standups (Discord, 10:00 hs), backlog grooming, and sprint retrospectives (`docs/retrospectivas/`).
- **Automated Kanban Board:** Authored `.github/workflows/auto-move-issues.yml`, connecting GitHub Actions to GitHub Projects v2 via GraphQL. Issues move automatically across stages: `BACKLOG → TO DO → IN PROGRESS → IN REVIEW → QA APPROVED → DONE`.
- **Definition of Done (DoD):** Enforced mandatory peer reviews, zero linter warnings, strict TypeScript typing, Gherkin acceptance criteria verification, and mobile-first 360px validation.
- **Progressive Complexity Strategy:** Decoupled ingredients from mandatory suppliers on Day 1, allowing draft "Uncosted" products (`cost = 0, margin = 0`) to prevent blocking commercial onboarding.

#### DevOps, Cloud Infrastructure & Automation
- **Standardized DevContainers:** Configured Dockerized VS Code environments (Node.js 22 LTS, TypeScript, PostgreSQL 16) ensuring zero configuration drift between Windows, macOS, and Linux.
- **Production VPS Deployment:** Configured a dedicated Ubuntu VPS hosting persistent PostgreSQL 16 (port 5435), n8n orchestrator (port 5678), Docker Compose, and Nginx reverse proxy with SSL certificates.
- **CI/CD Pipelines:**
  - `ci.yml`: Automated GitHub Actions pipeline on Node.js 22 LTS: backend build, migrations on an ephemeral PostgreSQL 16 and Vitest with a 90% coverage gate (including the PostgreSQL integration test), frontend ESLint, Vite build and Vitest with a 90% coverage gate, n8n node tests, production `npm audit`, and the Playwright E2E suite, with Discord failure alerts. Dependabot opens weekly grouped minor/patch update PRs; npm major versions are planned as issues.
  - `deploy.yml`: Automated continuous deployment building Docker Hub images, executing SSH deployment to VPS, running `prisma migrate deploy`, and notifying success/failure to team channels.
- **Satellite Automation with n8n:** Offloaded heavy reporting and email delivery to a self-hosted n8n instance via HTTP webhooks, ensuring n8n never directly writes to production PostgreSQL.

---

### 4. Technical Architecture & Core Data Model

#### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Zustand, React Hook Form, Zod, Base UI, Lucide Icons.
- **Backend:** Node.js 22 LTS, Express 5, TypeScript, Prisma ORM 6.
- **Database:** PostgreSQL 16 (strict multi-tenant partitioning by `accountId`).
- **Identity & RBAC:** Clerk (asymmetric JWT verification; `ADMIN` with full financial visibility vs. `COLLABORATOR` with sanitized operational access).
- **Automation & Alerts:** n8n (self-hosted), Cloudflare Email Routing Catch-All, Discord Webhooks.
- **Quality Assurance:** Playwright (E2E), Vitest (Unit testing), Postman / Newman (API integration).

#### Relational Schema Overview
- `Account`: Multi-tenant business account with unique routing slug and subscription status.
- `User`: Team operators linked to Clerk `authProviderId` with assigned role (`ADMIN` or `COLLABORATOR`).
- `Ingredient`: Raw materials with internal unit of measure (`kg`, `l`, `u`) and current cost — derived from its default supplier presentation when one exists (see `Supplier`/`SupplierIngredient` below).
- `Supplier`: Wholesale vendor for an account's ingredients.
- `SupplierIngredient`: A supplier's specific presentation of an ingredient (package size/unit/price, and whether it is the default source for that ingredient). A price update that moves the computed unit cost by more than 50% or drops it near zero is held in **price quarantine** (`isQuarantined`) instead of applying automatically, pending an ADMIN's manual release or rejection.
- `Product`: Finished goods with sale price, minimum margin threshold, and calculated financial metrics.
- `ProductIngredient`: Relational recipe matrix joining products and ingredients with specific yield quantities.

**Role-based visibility:** `/insumos` and `/proveedores/cuarentena` redirect `COLLABORATOR` sessions to `/productos` outright. On the screens a `COLLABORATOR` *can* reach (`/productos`, `/dashboard`, `/perfil`), every financial field is stripped from both the API response and the UI — cost, margin amount/percent, and recipe quantities are invisible, not merely hidden with CSS.

---

### 5. Local Setup & Quick Start

#### Option A: Automated DevContainers (Recommended)
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL2 enabled on Windows) and [VS Code](https://code.visualstudio.com/).
2. Install the **Dev Containers** extension in VS Code.
3. Clone the repository and open it:
   ```bash
   git clone https://github.com/dgimenezdeveloper/margenx.git
   cd margenx
   code .
   ```
4. Press `F1` and select **"Dev Containers: Reopen in Container"**. All services, Node dependencies, and database containers will initialize automatically.
5. Copy `backend/.env.example` to `backend/.env` (and `frontend/.env.example` to `frontend/.env`) with your keys. From then on the environment keeps itself in sync: every time VS Code or Cursor attaches to the container, and on every branch switch or `git pull`, `.devcontainer/scripts/sync-dev-env.sh` aligns Node with `.nvmrc`, runs `npm ci` only when a lockfile changed, regenerates the Prisma client and applies pending migrations to the **local** database (never the seed). Details in "Entorno sincronizado" below.

#### Option B: Manual Local Setup
```bash
# 1. Start PostgreSQL 16 in Docker
docker run --name margenx_postgres_dev -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=<tu_password_local> -e POSTGRES_DB=margenx_dev -p 5432:5432 -d postgres:16-alpine

# 2. Setup & Run Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
export SEED_CONFIRM_TARGET="localhost:5432/margenx_dev"
npx prisma db seed
npm run dev

# 3. Setup & Run Frontend (in another terminal)
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

Seeding staging or production on the VPS (pilot accounts and the Demo account): see `docs/runbook-operacion.md`.

---

### 6. Project Team & Academic Context
Developed as part of the **Supervised Professional Practice (PPS)** — *University Degree in Software Development* (Universidad Nacional Guillermo Brown - UNaB):

- **Darío Giménez** — *Scrum Master, Product Manager, DevOps & Automation Architect*  
  [GitHub](https://github.com/dgimenezdeveloper) • [LinkedIn](https://www.linkedin.com/in/daseg/)
- **Mauricio Barreras** — *Lead Backend & Data Architect*  
  [GitHub](https://github.com/Mau-bar-iva) • [LinkedIn](https://www.linkedin.com/in/mauricio-barreras-235b8128a/)
- **Federico Paál** — *Lead Frontend & Mobile-First UX/UI*  
  [GitHub](https://github.com/FedericoPaal) • [LinkedIn](https://www.linkedin.com/in/federico-paal/)
- **Leandro Herrera** — *QA Engineer & Client Liaison*  
  [GitHub](https://github.com/LeanHerrera97)

---

## 🇪🇸 Documentación en Español

### 1. Resumen Ejecutivo y Problema del Negocio
En economías con alta inflación, las PyMEs y microemprendimientos de elaboración (panaderías, fábricas de pastas, productos químicos de limpieza, talleres artesanales) calculan sus costos una sola vez en planillas estáticas y rara vez los actualizan.

Cuando sube el costo de una materia prima (harina, carne, cloro, envases), los precios de venta permanecen desactualizados. En consecuencia, el margen de ganancia se reduce progresivamente, llevando a vender a pérdida o a operar a margen ciego sin que el dueño lo note.

**MargenX** resuelve este problema mediante:
- **Recálculo en Cascada:** La modificación del costo de un insumo actualiza de forma transaccional el costo total de receta y el margen porcentual de todos los productos vinculados en el catálogo.
- **Alertas Visuales y Automatizadas:** Semáforo de rentabilidad en el panel principal y notificaciones inmediatas por email o Telegram vía **n8n** ante quiebres del umbral mínimo de rentabilidad.
- **Ingesta Desatendida "Zero-Click":** El dueño reenvía listas mayoristas en Excel/CSV a una casilla virtual (`precios-<slug>@margenx.tech`). El sistema actualiza los códigos equivalentes y descarta automáticamente los miles de artículos que el negocio no consume (filtro anti-polución).

---

### 2. Diseño UI/UX y Prototipo en Figma
Para garantizar una experiencia visual clara y validar los flujos de carga antes del desarrollo, la interfaz fue diseñada bajo un enfoque **Mobile-First (360px)**.

🔗 **[Ver Prototipo Interactivo en Figma](https://www.figma.com/proto/VP7NOtPGVwSCPZex5wYpmZ/Margen-X?node-id=0-1&t=AkoTRJ9OMR8ePuRU-1)**

Módulos principales del sistema:
1. **Login y Acceso (`/login`):** Inicio de sesión con autenticación delegada y aislamiento multiempresa.
2. **Dashboard Principal (`/dashboard`):** Resumen de rentabilidad en tiempo real con semáforo de alerta visual accesible bajo estándar WCAG AA (Verde $\ge 30\%$, Rojo $< 30\%$).
3. **Insumos (`/insumos`):** Gestión de materias primas con buscador, unidades de medida (`kg`, `l`, `u`) y formulario modal de alta y edición rápida.
4. **Productos y Recetas (`/productos`, `/productos/nuevo`):** Ficha técnica con selector dinámico de ingredientes por receta, conversión de unidades y simulador interactivo de precios de venta (+5%, +10%, margen 30%).
5. **Cuarentena de Precios de Proveedores (`/proveedores/cuarentena`):** Bandeja de revisión para los cambios de precio de proveedor que disparan el filtro anti-polución (variación mayor al 50% o costo unitario calculado casi nulo) — un ADMIN libera el cambio para aplicarlo o lo rechaza para mantener el precio vigente.
6. **Documentación Interactiva Swagger / OpenAPI (`/api/docs`):** Explorador navegable de la API REST bajo especificación OpenAPI 3.1, con soporte de autorización Bearer JWT, contratos de esquemas completos y descarga en formato JSON (`/api/docs/openapi.json`).

---

### 3. Caso de Estudio: Liderazgo Ágil, Gestión de Producto y DevOps

> **Rol:** Darío Giménez — **Scrum Master, Product Manager, Ingeniero DevOps y Automatización**  
> **Equipo:** 4 Desarrolladores (UNaB - PPS Prácticas Profesionales Supervisadas).  
> **Comercios Piloto:** Validación con *Panadería Central* (Gastronomía) y *Química GyJ* (Manufactura química).

#### Gestión Ágil y Liderazgo de Equipo
- **Marco Scrum:** Planificación y facilitación de 8 sprints (Sprint 0 al 7), de 2 semanas salvo el Sprint 3, que duró una, standups diarias a las 10:00 hs por Discord y actas de retrospectiva (`docs/retrospectivas/`).
- **Tablero Kanban Automatizado con GraphQL:** Implementación del workflow `.github/workflows/auto-move-issues.yml` que sincroniza GitHub Projects v2 según los eventos de Git: `BACKLOG → TO DO → IN PROGRESS → IN REVIEW → QA APPROVED → DONE`.
- **Definition of Done (DoD):** Criterios rigurosos de cierre que exigen aprobación por pares (Peer Review), tipado TypeScript estricto sin `any`, verificación Gherkin, compatibilidad mobile en 360px y aprobación de QA.
- **Estrategia de Complejidad Progresiva:** Desacoplamiento de insumos y proveedores para permitir productos en borrador "Sin Costear" (`cost = 0, margin = 0`), evitando trabas en el onboarding inicial.

#### DevOps, Infraestructura y Automatización
- **DevContainers Estandarizados:** Configuración de contenedores en VS Code (Node 22 LTS, TypeScript, PostgreSQL 16 local) para que cualquier integrante levante el stack en menos de 10 minutos sin discrepancias de entorno.
- **Infraestructura en VPS Linux:** Despliegue en servidor propio Ubuntu con PostgreSQL 16 persistente (puerto 5435), n8n (puerto 5678), red aislada en Docker Compose y Nginx con certificados SSL.
- **Pipelines de CI/CD:**
  - `ci.yml`: Integración continua sobre Node.js 22 LTS: build del backend, migraciones sobre un PostgreSQL 16 efímero y Vitest con umbral de cobertura del 90 % (incluida la prueba de integración contra PostgreSQL), ESLint, build y Vitest del frontend (con umbral de cobertura del 90 %), prueba de los nodos de n8n, `npm audit` de producción y suite E2E de Playwright, con alertas en Discord. Los checks obligatorios para mergear están en `docs/politica-proteccion-main.md`. Dependabot abre cada semana PRs agrupados de versiones menores y parches hacia `develop`; las versiones mayores de npm se planifican como issue propia y sus PRs no pasan por el tablero.
  - `deploy.yml`: Despliegue continuo hacia Staging (`dev.margenx.tech`) y Producción (`margenx.tech`) mediante Docker Hub, conexión SSH a VPS y ejecución de migraciones automáticas (`prisma migrate deploy`).
- **Automatización Satélite con n8n:** Desacoplamiento de reportes PDF y correos transaccionales en n8n mediante webhooks HTTP, preservando la regla: *n8n nunca escribe directamente en la base de datos de producción.*

---

### 4. Arquitectura Técnica y Modelo de Datos

#### Stack Tecnológico
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Zustand, React Hook Form, Zod, Base UI, Lucide Icons.
- **Backend:** Node.js 22 LTS, Express 5, TypeScript, Prisma ORM 6.
- **Base de Datos:** PostgreSQL 16 (particionamiento multiempresa por `accountId`).
- **Autenticación:** Clerk (JWT asimétrico con roles `ADMIN` y `COLLABORATOR`).
- **Automatización:** n8n, Cloudflare Email Routing Catch-All, Webhooks Discord.
- **Testing:** Playwright (E2E), Vitest, Postman / Newman.

#### Entidades Principales de Persistencia
- `Account`: Comercio registrado con slug único para la recepción de listas por correo.
- `User`: Usuarios vinculados al proveedor Clerk con rol asignado.
- `Ingredient`: Insumo con unidad de costeo y costo vigente — tomado de la presentación de su proveedor predeterminado cuando existe uno (ver `Supplier`/`SupplierIngredient` abajo).
- `Supplier`: Proveedor mayorista de los insumos de una cuenta.
- `SupplierIngredient`: Presentación concreta de un insumo en un proveedor (tamaño de paquete, precio, y si es la fuente predeterminada de ese insumo). Un cambio de precio que mueve el costo unitario calculado más de un 50% o lo deja casi en cero queda retenido en **cuarentena de precios** (`isQuarantined`) en vez de aplicarse solo: un ADMIN tiene que liberarlo o rechazarlo a mano.
- `Product`: Producto final con precio de venta, costo calculado y margen resultante.
- `ProductIngredient`: Receta compuesta que vincula producto con insumos y sus cantidades.

**Visibilidad según el rol:** `/insumos` y `/proveedores/cuarentena` redirigen directamente a `/productos` a las sesiones `COLLABORATOR`. En las pantallas a las que sí llegan (`/productos`, `/dashboard`, `/perfil`), todo campo financiero queda afuera — ni en la respuesta de la API ni en la UI: costo, margen (monto y porcentaje) y cantidades de receta quedan invisibles, no solo ocultos con CSS.

---

### 5. Guía de Inicio Rápido Local

#### Opción A: DevContainers de VS Code (Recomendada)
1. Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con WSL2 en Windows) y [VS Code](https://code.visualstudio.com/).
2. Instalar la extensión **Dev Containers** en VS Code.
3. Clonar y abrir el proyecto:
   ```bash
   git clone https://github.com/dgimenezdeveloper/margenx.git
   cd margenx
   code .
   ```
4. Presionar `F1` y seleccionar **"Dev Containers: Reopen in Container"**. El entorno configura Node.js 22 LTS y PostgreSQL 16.
5. Copiar `backend/.env.example` a `backend/.env` (y `frontend/.env.example` a `frontend/.env`) con tus claves.

##### Entorno sincronizado

El script `.devcontainer/scripts/sync-dev-env.sh` deja el contenedor alineado con la rama en la que estás. Corre solo:

- al crear el contenedor y **cada vez que VS Code o Cursor se conectan** (`postCreateCommand` y `postAttachCommand` de `.devcontainer/devcontainer.json`);
- **al cambiar de rama** (`git switch`, `git checkout <rama>`) y **después de `git pull` o `git merge`**, por los hooks versionados de `.githooks/` (el script activa `core.hooksPath` la primera vez).

En cada corrida:

1. **Node:** si la versión del contenedor no coincide con `.nvmrc` (por ejemplo, un contenedor creado antes del paso a Node 22), instala la de `.nvmrc` con nvm y la deja por defecto, sin reconstruir el contenedor. Las terminales que ya estaban abiertas la toman con `hash -r` o abriendo una nueva.
2. **Dependencias:** `npm ci` en `backend/` y `frontend/` solo si cambió su `package-lock.json` o la versión mayor de Node.
3. **Prisma:** `prisma generate` si cambió `backend/prisma/schema.prisma`.
4. **Migraciones:** `prisma migrate deploy` solo si `DATABASE_URL` de `backend/.env` apunta a la base del DevContainer (`localhost:5432/margenx_dev`). Nunca corre el seed ni toca otra base, y no imprime la cadena de conexión. Prisma corre sin la `DATABASE_URL` que haya exportada en la terminal (por ejemplo, la de una VPS), así que siempre migra la base local de `backend/.env`. La prueba es `bash .devcontainer/scripts/sync-dev-env.test.sh` (job `n8n Nodes Tests` del CI).

Si reinstaló dependencias mientras tenías `npm run dev` corriendo, avisa que lo reinicies: el servidor anterior queda apuntando a archivos borrados (en el frontend, la app deja de cargar). Si no hay nada que hacer, termina en un par de segundos. Desde un hook nunca corta la operación de git: si algo falla, avisa y se puede repetir a mano con `bash .devcontainer/scripts/sync-dev-env.sh`. Para saltearlo una vez: `MARGENX_SKIP_SYNC=1 git switch <rama>`. Fuera del contenedor (por ejemplo, un `git switch` desde el host) no hace nada.

**Contenedor creado antes de este cambio:** VS Code o Cursor avisan que cambió la configuración; elegí **Rebuild Container**. Si preferís no reconstruir, ejecutá una vez `bash .devcontainer/scripts/sync-dev-env.sh` desde la terminal del contenedor y los hooks quedan activos.

#### Opción B: Ejecución Manual
Requiere Node.js 22 LTS. La versión está fijada en `.nvmrc` (con nvm: `nvm use`); es la misma que usan el CI y las imágenes Docker.

```bash
# 1. Iniciar PostgreSQL 16
docker run --name margenx_postgres_dev -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=<tu_password_local> -e POSTGRES_DB=margenx_dev -p 5432:5432 -d postgres:16-alpine

# 2. Configurar y levantar Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
export SEED_CONFIRM_TARGET="localhost:5432/margenx_dev"
npx prisma db seed
npm run dev

# 3. Configurar y levantar Frontend (en otra consola)
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

Para sembrar staging o producción en la VPS (cuentas piloto y Demo): ver `docs/runbook-operacion.md`.

---

### 6. Equipo de Desarrollo y Contexto Académico
Proyecto desarrollado en el marco de las **Prácticas Profesionales Supervisadas (PPS)** — *Tecnicatura Universitaria en Programación / Desarrollo de Software* (Universidad Nacional Guillermo Brown - UNaB):

- **Darío Giménez** — *Scrum Master, Product Manager, DevOps & Automation Architect*  
  [GitHub](https://github.com/dgimenezdeveloper) • [LinkedIn](https://www.linkedin.com/in/daseg/)
- **Mauricio Barreras** — *Lead Backend & Data Architect*  
  [GitHub](https://github.com/Mau-bar-iva) • [LinkedIn](https://www.linkedin.com/in/mauricio-barreras-235b8128a/)
- **Federico Paál** — *Lead Frontend & Mobile-First UX/UI*  
  [GitHub](https://github.com/FedericoPaal) • [LinkedIn](https://www.linkedin.com/in/federico-paal/)
- **Leandro Herrera** — *QA Engineer & Client Liaison*  
  [GitHub](https://github.com/LeanHerrera97)

---

## 📄 Licencia
Este proyecto se encuentra bajo la licencia **ISC**. Consultar el archivo `package.json` para más detalles.
</file>

<file path="backend/src/routes/suppliers.ts">
import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import {
  applyIngredientCostChange,
  calculateUnitCost,
  type CriticalMarginProduct,
} from '../services/marginCalculator';
import { requireRole } from '../middlewares/rbac';
import { dispatchMarginAlertEvent } from '../services/marginAlertDispatcher';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT, normalizeSearchText } from '../utils/pagination';

const router = Router();
router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? '';
  }
  return rawId ?? '';
}

interface SupplierInputDTO {
  name?: unknown;
  contactPhone?: unknown;
  email?: unknown;
  address?: unknown;
  isActive?: unknown;
}

function normalizeOptionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || null;
  }

  throw new AppError(`El campo "${field}" debe ser un texto.`, 400);
}

function parseSupplierInput(body: SupplierInputDTO) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new AppError('El campo "name" es obligatorio.', 400);
  }

  const contactPhone = normalizeOptionalText(body.contactPhone, 'contactPhone');

  const email = normalizeOptionalText(body.email, 'email');
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('El campo "email" debe tener un formato válido.', 400);
  }

  const address = normalizeOptionalText(body.address, 'address');

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    throw new AppError('El campo "isActive" debe ser booleano.', 400);
  }

  const isActive = body.isActive === undefined ? true : body.isActive;

  return {
    name,
    contactPhone,
    email,
    address,
    isActive,
  };
}

// Escala y tope de cada columna de SupplierIngredient (schema.prisma).
const SUPPLIER_INGREDIENT_DECIMAL_SPECS = {
  // packageSize es Decimal(10,3): 7 enteros y 3 decimales.
  packageSize: { decimals: 3, regex: /^-?\d+(\.\d{1,3})?$/, max: new Prisma.Decimal('9999999.999'), maxLabel: '9.999.999,999', example: '25.500' },
  // packagePrice es Decimal(10,2): 8 enteros y 2 decimales.
  packagePrice: { decimals: 2, regex: /^-?\d+(\.\d{1,2})?$/, max: new Prisma.Decimal('99999999.99'), maxLabel: '$99.999.999,99', example: '35000.50' },
} as const;

function parseSupplierIngredientDecimal(
  value: unknown,
  field: keyof typeof SUPPLIER_INGREDIENT_DECIMAL_SPECS
): Prisma.Decimal {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new AppError(`El campo "${field}" es obligatorio.`, 400);
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError(`El campo "${field}" debe ser un número o un string numérico.`, 400);
  }

  const asText = String(value).trim();
  const spec = SUPPLIER_INGREDIENT_DECIMAL_SPECS[field];
  if (!spec.regex.test(asText)) {
    throw new AppError(
      `El campo "${field}" debe ser un valor decimal válido con hasta ${spec.decimals} decimales (ej: "${spec.example}").`,
      400
    );
  }

  const decimalValue = new Prisma.Decimal(asText);
  if (decimalValue.abs().greaterThan(spec.max)) {
    throw new AppError(`El campo "${field}" no puede superar ${spec.maxLabel}.`, 400);
  }

  return decimalValue;
}

const supplierMetadataSchema = z.object({
  supplierCode: z.preprocess((value) => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return undefined;
    }

    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value).trim();
    return value;
  }, z.string().max(64, 'El campo "supplierCode" no puede superar 64 caracteres.').optional()),
  rawDescription: z.preprocess((value) => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return undefined;
    }

    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value).trim();
    return value;
  }, z.string().max(500, 'El campo "rawDescription" no puede superar 500 caracteres.').optional()),
});

/* ------------------------------------------------------------------ */
/* GET /api/suppliers                                                   */
/* Lista los proveedores de la cuenta autenticada, con la cantidad de  */
/* presentaciones (ingredientCount) y las retenidas (quarantineCount). */
/* 200 OK | 401 No autenticado | 500                                     */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const suppliers = await prisma.supplier.findMany({
    where: { accountId },
    include: {
      ingredients: {
        select: {
          isQuarantined: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const suppliersWithCount = suppliers.map((supplier) => {
    const quarantineCount = supplier.ingredients.filter((item) => item.isQuarantined).length;
    const { ingredients: _, ...rest } = supplier;
    return {
      ...rest,
      ingredientCount: supplier.ingredients.length,
      quarantineCount,
    };
  });

  return res.status(200).json({ suppliers: suppliersWithCount });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers                                                  */
/* Crea un proveedor asignando accountId automáticamente.             */
/* 201 Created | 400 Validación fallida | 401 No autenticado | 409 Duplicado | 500 */
/* ------------------------------------------------------------------ */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const payload = req.body && typeof req.body === 'object' ? (req.body as SupplierInputDTO) : {};
  const data = parseSupplierInput(payload);

  const existing = await prisma.supplier.findFirst({
    where: { accountId, name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new AppError('Ya existe un proveedor con ese nombre.', 409);
  }

  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      accountId,
    },
  });

  return res.status(201).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* GET /api/suppliers/quarantine                                       */
/* Lista los precios de proveedores en cuarentena para la cuenta del   */
/* administrador autenticado.                                          */
/* 200 OK | 401 No autenticado | 500                                     */
/* ------------------------------------------------------------------ */
router.get('/quarantine', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const quarantined = await prisma.supplierIngredient.findMany({
    where: {
      ingredient: { accountId },
      isQuarantined: true,
    },
    include: {
      ingredient: { select: { id: true, name: true, currentCost: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });

  const normalized = quarantined.map((row) => {
    const currentPrice = new Prisma.Decimal(String(row.packagePrice ?? 0));
    const proposedPrice = new Prisma.Decimal(String(row.pendingPackagePrice ?? row.packagePrice ?? 0));
    const variationPercent = currentPrice.gt(0)
      ? proposedPrice.sub(currentPrice).div(currentPrice).mul(100).abs().toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal('0.00');

    return {
      ...row,
      currentPrice: currentPrice.toString(),
      proposedPrice: proposedPrice.toString(),
      variationPercent: variationPercent.toString(),
      quarantineReason: row.quarantineReason ?? 'SIN_MOTIVO',
    };
  });

  return res.status(200).json({ quarantined: normalized });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers/quarantine/:id/release                          */
/* Libera un precio anómalo de cuarentena y, si corresponde, aplica    */
/* el costo unitario del proveedor como nuevo costo activo del insumo.   */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.post('/quarantine/:id/release', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);

  if (!id) {
    throw new AppError('Precio en cuarentena no encontrado.', 404);
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const quarantined = await tx.supplierIngredient.findFirst({
      where: { id, ingredient: { accountId }, isQuarantined: true },
      include: { ingredient: { select: { id: true, name: true, currentCost: true } } },
    });

    if (!quarantined) {
      throw new AppError('Precio en cuarentena no encontrado.', 404);
    }

    const proposedPrice = quarantined.pendingPackagePrice ?? quarantined.packagePrice;

    if (!proposedPrice) {
      throw new AppError('No hay un precio pendiente para liberar.', 409);
    }

    let unitCost: Prisma.Decimal;
    try {
      unitCost = calculateUnitCost(proposedPrice, quarantined.packageSize);
    } catch (_error) {
      throw new AppError('El costo unitario calculado es inválido para este precio.', 422);
    }

    const updatedSupplierIngredient = await tx.supplierIngredient.update({
      where: { id },
      data: {
        packagePrice: proposedPrice,
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      },
    });

    let affectedProductsCount = 0;
    let affectedProducts: unknown[] = [];
    let criticalProducts: CriticalMarginProduct[] = [];

    if (quarantined.isDefault) {
      const finder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
      const ingredientOnTx = await finder.call(tx.ingredient, {
        where: { id: quarantined.ingredientId },
        select: { id: true, name: true, currentCost: true },
      });

      if (!ingredientOnTx) {
        throw new AppError('Insumo no encontrado.', 404);
      }

      const previousCost = ingredientOnTx.currentCost;
      await tx.ingredient.update({
        where: { id: quarantined.ingredientId },
        data: { currentCost: unitCost },
      });
      const currentResult = await applyIngredientCostChange(tx, quarantined.ingredientId, previousCost, unitCost);
      affectedProductsCount = currentResult.affectedProductsCount;
      affectedProducts = currentResult.affectedProducts;
      criticalProducts = currentResult.criticalProducts;
    }

    return {
      ingredientId: quarantined.ingredientId,
      ingredientName: quarantined.ingredient.name,
      supplierIngredient: updatedSupplierIngredient,
      unitCost,
      affectedProductsCount,
      affectedProducts,
      criticalProducts,
    };
  });

  if (result.criticalProducts.length > 0) {
    void dispatchMarginAlertEvent({
      accountId,
      ingredientId: result.ingredientId,
      ingredientName: result.ingredientName,
      affectedProductsCount: result.affectedProductsCount,
      criticalProducts: result.criticalProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        previousCost: product.previousCost.toFixed(2),
        newCost: product.newCost.toFixed(2),
        currentMarginPercent: product.currentMarginPercent.toFixed(2),
        minMarginPercent: product.minMarginPercent.toFixed(2),
      })),
    });
  }

  return res.status(200).json({
    supplierIngredient: result.supplierIngredient,
    unitCost: result.unitCost,
    affectedProductsCount: result.affectedProductsCount,
    affectedProducts: result.affectedProducts,
    criticalProducts: result.criticalProducts,
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers/quarantine/:id/reject                           */
/* Rechaza un precio anómalo y lo remueve de cuarentena sin tocar el    */
/* costo activo del insumo.                                             */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.post('/quarantine/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);

  if (!id) {
    throw new AppError('Precio en cuarentena no encontrado.', 404);
  }

  const quarantined = await prisma.supplierIngredient.findFirst({
    where: { id, ingredient: { accountId }, isQuarantined: true },
  });

  if (!quarantined) {
    throw new AppError('Precio en cuarentena no encontrado.', 404);
  }

  const supplierIngredient = await prisma.supplierIngredient.update({
    where: { id },
    data: {
      pendingPackagePrice: null,
      isQuarantined: false,
      quarantinedAt: null,
      quarantineReason: null,
    },
  });

  return res.status(200).json({
    supplierIngredient,
    message: 'Precio anómalo rechazado y mantenido en el costo anterior.',
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/suppliers/:id                                               */
/* Detalle del proveedor con sus presentaciones (soporta paginación).   */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const query = req.query as Record<string, unknown>;
  const hasPagination = query.page !== undefined || query.limit !== undefined || query.search !== undefined;

  // Compatibilidad retroactiva: si no se solicitan parámetros de paginación o búsqueda,
  // se devuelve la estructura completa original con el include de ingredientes.
  if (!hasPagination) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, accountId },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentCost: true,
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      throw new AppError('Proveedor no encontrado.', 404);
    }

    return res.status(200).json({ supplier });
  }

  // Flujo con paginación explícita (Issue SPRINT6-BE-02)
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawLimit = Number(query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const rawSearch = typeof query.search === 'string' ? query.search.trim() : '';
  const search = rawSearch.slice(0, 100);
  const normalizedSearch = normalizeSearchText(search);

  const supplier = await prisma.supplier.findFirst({
    where: { id, accountId },
  });

  if (!supplier) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const presentationWhere: Prisma.SupplierIngredientWhereInput = {
    supplierId: id,
    ...(search
      ? {
          OR: [
            { rawDescription: { contains: search, mode: 'insensitive' } },
            { supplierCode: { contains: search, mode: 'insensitive' } },
            { ingredient: { name: { contains: search, mode: 'insensitive' } } },
            { ingredient: { searchName: { contains: normalizedSearch, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [presentations, totalPresentations] = await Promise.all([
    prisma.supplierIngredient.findMany({
      where: presentationWhere,
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentCost: true,
          },
        },
      },
      orderBy: { ingredient: { name: 'asc' } },
      skip,
      take: limit,
    }),
    prisma.supplierIngredient.count({ where: presentationWhere }),
  ]);

  const totalPages = totalPresentations === 0 ? 0 : Math.ceil(totalPresentations / limit);

  return res.status(200).json({
    supplier: {
      ...supplier,
      ingredients: presentations,
    },
    meta: {
      total: totalPresentations,
      page,
      limit,
      totalPages,
    },
  });
});

/* ------------------------------------------------------------------ */
/* PUT /api/suppliers/:id                                              */
/* Actualiza un proveedor, filtrado por cuenta y mergeando campos.      */
/* 200 OK | 400 Validación fallida | 401 No autenticado | 404 No encontrado/ajeno | 500 */
/* ------------------------------------------------------------------ */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    throw new AppError('El header Content-Type debe ser application/json.', 400);
  }

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, accountId },
  });

  if (!existing) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as SupplierInputDTO) : {};
  const merged = {
    name: existing.name,
    contactPhone: existing.contactPhone,
    email: existing.email,
    address: existing.address,
    isActive: existing.isActive,
    ...payload,
  };
  const data = parseSupplierInput(merged);

  if (data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.supplier.findFirst({
      where: { accountId, name: { equals: data.name, mode: 'insensitive' } },
    });

    if (duplicate) {
      throw new AppError('Ya existe un proveedor con ese nombre.', 409);
    }
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data,
  });

  return res.status(200).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers/:id/ingredients                                  */
/* Asocia o actualiza un insumo con presentación mayorista (Upsert).    */
/* 200 OK (actualizado) | 201 Created (nuevo) | 400 | 401 | 404 | 500  */
/* ------------------------------------------------------------------ */
router.post('/:id/ingredients', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const supplierId = getIdParam(req.params.id);
  if (!supplierId) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, accountId },
    select: { id: true },
  });

  if (!supplier) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const metadataParse = supplierMetadataSchema.safeParse(payload);
  if (!metadataParse.success) {
    const issue = metadataParse.error.issues[0];
    throw new AppError(issue?.message ?? 'Payload inválido.', 400);
  }

  const { supplierCode, rawDescription } = metadataParse.data;
  const normalizedSupplierCode = supplierCode && supplierCode.trim() !== '' ? supplierCode.trim() : undefined;
  const normalizedRawDescription = rawDescription && rawDescription.trim() !== '' ? rawDescription.trim() : undefined;

  const { ingredientId: rawIngredientId, packageSize, packageUnit, packagePrice, isDefault, accountId: _ignored } = payload;

  if (typeof rawIngredientId !== 'string' || rawIngredientId.trim() === '') {
    throw new AppError('El campo "ingredientId" es obligatorio.', 400);
  }

  const ingredientId = rawIngredientId.trim();
  const parsedPackageSize = parseSupplierIngredientDecimal(packageSize, 'packageSize');
  if (parsedPackageSize.lte(0)) {
    throw new AppError('El campo "packageSize" debe ser mayor a cero.', 400);
  }

  const parsedPackagePrice = parseSupplierIngredientDecimal(packagePrice, 'packagePrice');
  if (parsedPackagePrice.lte(0)) {
    throw new AppError('El campo "packagePrice" debe ser mayor a cero.', 400);
  }

  if (typeof packageUnit !== 'string' || packageUnit.trim() === '') {
    throw new AppError('El campo "packageUnit" es obligatorio.', 400);
  }

  const normalizedPackageUnit = packageUnit.trim();
  const validUnits = ['kg', 'l', 'u'] as const;
  if (!validUnits.includes(normalizedPackageUnit as (typeof validUnits)[number])) {
    throw new AppError('El campo "packageUnit" debe ser uno de: kg, l, u.', 400);
  }

  if (typeof isDefault !== 'undefined' && typeof isDefault !== 'boolean') {
    throw new AppError('El campo "isDefault" debe ser booleano.', 400);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, accountId },
    select: { id: true, unit: true, currentCost: true },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  if (ingredient.unit !== normalizedPackageUnit) {
    throw new AppError(`El campo "packageUnit" debe coincidir con la unidad del insumo (${ingredient.unit}).`, 400);
  }

  // Comportamiento de Upsert: verificamos si ya existía la presentación
  const existingAssociation = await prisma.supplierIngredient.findFirst({
    where: { supplierId, ingredientId },
    select: { id: true, isDefault: true },
  });

  if (normalizedSupplierCode) {
    const duplicate = await prisma.supplierIngredient.findFirst({
      where: {
        supplierId,
        supplierCode: { equals: normalizedSupplierCode, mode: 'insensitive' },
        ingredientId: { not: ingredientId },
      },
      include: {
        ingredient: { select: { id: true, name: true } },
      },
    });

    if (duplicate?.ingredient?.name) {
      throw new AppError(
        `El código de proveedor "${normalizedSupplierCode}" ya lo usa el insumo "${duplicate.ingredient.name}".`,
        409
      );
    }
  }

  const isUpdate = Boolean(existingAssociation);
  const statusCode = isUpdate ? 200 : 201;

  let unitCost: Prisma.Decimal;
  try {
    unitCost = calculateUnitCost(parsedPackagePrice, parsedPackageSize);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'No se pudo calcular el costo unitario.',
      400
    );
  }

  const associationData = {
    supplierCode: normalizedSupplierCode ?? null,
    rawDescription: normalizedRawDescription ?? null,
    packageSize: parsedPackageSize,
    packageUnit: normalizedPackageUnit,
    packagePrice: parsedPackagePrice,
    isDefault: Boolean(isDefault),
  };

  if (!isDefault) {
    if (existingAssociation && existingAssociation.isDefault) {
      throw new AppError('No podés quitar la presentación predeterminada sin elegir otra. Marcá otra como predeterminada para reemplazarla.', 422);
    }
    const supplierIngredient = existingAssociation
      ? await prisma.supplierIngredient.update({
        where: { id: existingAssociation.id },
        data: associationData,
      })
      : await prisma.supplierIngredient.create({
        data: {
          supplierId,
          ingredientId,
          ...associationData,
        },
      });

    const responseBody = {
      supplierIngredient,
      unitCost,
      ingredient,
      ingestEnabled: Boolean(normalizedSupplierCode),
    };
    if (!normalizedSupplierCode) {
      return res.status(statusCode).json({
        ...responseBody,
        message: 'La asociación se guardó, pero este insumo no recibirá precios por ingesta porque no tiene código de proveedor.',
      });
    }

    return res.status(statusCode).json(responseBody);
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const supplierIngredient = existingAssociation
      ? await tx.supplierIngredient.update({
        where: { id: existingAssociation.id },
        data: associationData,
      })
      : await tx.supplierIngredient.create({
        data: {
          supplierId,
          ingredientId,
          ...associationData,
        },
      });

    if (typeof tx.supplierIngredient.updateMany === 'function') {
      await tx.supplierIngredient.updateMany({
        where: { ingredientId, id: { not: supplierIngredient.id } },
        data: { isDefault: false },
      });
    }

    const finder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
    const ingredientOnTx = await finder.call(tx.ingredient, {
      where: { id: ingredientId },
      select: { id: true, name: true, currentCost: true },
    });

    if (!ingredientOnTx) {
      throw new AppError('Insumo no encontrado.', 404);
    }

    const previousCost = ingredientOnTx.currentCost;
    const updatedIngredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentCost: unitCost },
    });

    const { affectedProductsCount, criticalProducts } = await applyIngredientCostChange(
      tx,
      ingredientId,
      previousCost,
      unitCost
    );

    return {
      supplierIngredient,
      ingredient: updatedIngredient,
      unitCost,
      affectedProductsCount,
      criticalProducts,
    };
  });

  if (result.criticalProducts.length > 0) {
    void dispatchMarginAlertEvent({
      accountId,
      ingredientId,
      ingredientName: result.ingredient.name ?? 'Insumo',
      affectedProductsCount: result.affectedProductsCount,
      criticalProducts: result.criticalProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        previousCost: product.previousCost.toFixed(2),
        newCost: product.newCost.toFixed(2),
        currentMarginPercent: product.currentMarginPercent.toFixed(2),
        minMarginPercent: product.minMarginPercent.toFixed(2),
      })),
    });
  }

  const responseBody = {
    supplierIngredient: result.supplierIngredient,
    unitCost: result.unitCost,
    ingredient: result.ingredient,
    ingestEnabled: Boolean(normalizedSupplierCode),
  };

  if (!normalizedSupplierCode) {
    return res.status(statusCode).json({
      ...responseBody,
      message: 'La asociación se guardó, pero este insumo no recibirá precios por ingesta porque no tiene código de proveedor.',
    });
  }

  return res.status(statusCode).json(responseBody);
});

/* ------------------------------------------------------------------ */
/* DELETE /api/suppliers/:id                                            */
/* Elimina un proveedor. SupplierIngredient se elimina en cascada pero los insumos NO. */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  await prisma.supplier.delete({ where: { id } });

  return res.status(200).json({ message: 'Proveedor eliminado correctamente.' });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/suppliers/:id/ingredients/:ingredientId                  */
/* Quita una presentación evaluando la regla de la predeterminada.    */
/* ------------------------------------------------------------------ */
router.delete('/:id/ingredients/:ingredientId', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const supplierId = getIdParam(req.params.id);
  const ingredientId = getIdParam(req.params.ingredientId);

  if (!supplierId || !ingredientId) {
    throw new AppError('Presentación no encontrada.', 404);
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, accountId },
    select: { id: true },
  });

  if (!supplier) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const association = await prisma.supplierIngredient.findFirst({
    where: { supplierId, ingredientId },
    select: { id: true, isDefault: true },
  });

  if (!association) {
    throw new AppError('Presentación no encontrada.', 404);
  }

  if (association.isDefault) {
    const otherCount = await prisma.supplierIngredient.count({
      where: {
        ingredientId,
        supplier: { accountId },
        id: { not: association.id },
      },
    });

    if (otherCount > 0) {
      throw new AppError(
        'No podés eliminar la presentación predeterminada mientras haya otras. Elegí otra como predeterminada primero.',
        409
      );
    }
  }

  await prisma.supplierIngredient.delete({
    where: { id: association.id },
  });

  return res.status(200).json({ message: 'Presentación eliminada correctamente.' });
});

export default router;
</file>

<file path="backend/src/routes/ingredients.test.ts">
// src/routes/ingredients.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Prisma } from '@prisma/client';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import * as marginCalculator from '../services/marginCalculator';

const authMiddlewareMock = vi.fn((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const role = (req.headers['x-role'] as string | undefined) === 'COLLABORATOR' ? 'COLLABORATOR' : 'ADMIN';
  req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role };
  next();
});

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (...args: Parameters<typeof authMiddlewareMock>) => authMiddlewareMock(...args),
}));

const findManyMock = vi.fn();
const countMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const productIngredientFindManyMock = vi.fn();
const productIngredientCountMock = vi.fn();
const productFindUniqueMock = vi.fn();
const productUpdateMock = vi.fn();
const priceHistoryFindManyMock = vi.hoisted(() => vi.fn());

const productFindManyMock = vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
  const found = await Promise.all(where.id.in.map((id) => productFindUniqueMock({ where: { id } })));
  return found.filter(Boolean);
});
const priceHistoryCreateMock = vi.fn();
const supplierIngredientUpdateMock = vi.fn();
const accountFindUniqueMock = vi.fn();

const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => {
  return callback({
    ingredient: { findMany: findManyMock, create: createMock, update: updateMock },
    productIngredient: { findMany: productIngredientFindManyMock },
    product: { findUnique: productFindUniqueMock, findMany: productFindManyMock, update: productUpdateMock },
    priceHistory: { create: priceHistoryCreateMock },
    supplierIngredient: { update: supplierIngredientUpdateMock },
  });
});

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) => transactionMock(callback),
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
    },
    ingredient: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
    productIngredient: {
      findMany: (...args: unknown[]) => productIngredientFindManyMock(...args),
      count: (...args: unknown[]) => productIngredientCountMock(...args),
    },
    product: {
      findUnique: (...args: unknown[]) => productFindUniqueMock(...args),
      update: (...args: unknown[]) => productUpdateMock(...args),
    },
    priceHistory: {
      findMany: priceHistoryFindManyMock,
      create: (...args: unknown[]) => priceHistoryCreateMock(...args),
    },
  },
}));

import ingredientsRouter from './ingredients';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ingredients', ingredientsRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  findManyMock.mockReset();
  countMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  productIngredientFindManyMock.mockReset();
  productIngredientCountMock.mockReset();
  productFindUniqueMock.mockReset();
  productUpdateMock.mockReset();
  priceHistoryFindManyMock.mockReset();
  priceHistoryCreateMock.mockReset();
  supplierIngredientUpdateMock.mockReset();
  accountFindUniqueMock.mockReset();
  transactionMock.mockClear();
  authMiddlewareMock.mockClear();

  accountFindUniqueMock.mockResolvedValue({
    id: 'account-1',
    businessName: 'Panadería Central',
    slug: 'panaderia-central',
    users: [{ email: 'admin.panaderia@seed.example.test' }],
  });
});

afterEach(() => {
  delete process.env.N8N_MARGIN_ALERT_WEBHOOK_URL;
  delete process.env.INTERNAL_WEBHOOK_SECRET;
  vi.unstubAllGlobals();
});

describe('GET /api/ingredients - paginación', () => {
  it('devuelve data y meta correctos con page/limit/sortBy/order válidos', async () => {
    findManyMock.mockResolvedValue(new Array(10).fill({ id: '1', name: 'Harina' }));
    countMock.mockResolvedValue(25);

    const res = await request(buildApp()).get(
      '/api/ingredients?page=1&limit=10&sortBy=currentCost&order=desc'
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.meta).toEqual({ total: 25, page: 1, limit: 10, totalPages: 3 });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        orderBy: { currentCost: 'desc' },
        skip: 0,
        take: 10,
      })
    );
  });

  it('page inexistente (999) devuelve array vacío sin error 500', async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(25);

    const res = await request(buildApp()).get('/api/ingredients?page=999&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ total: 25, page: 999, limit: 10, totalPages: 3 });
  });

  it('usa los defaults cuando no se envían query params', async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/ingredients');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });
});

describe('GET /api/ingredients - Búsqueda por nombre (search)', () => {
  it('aplica filtro de búsqueda por searchName y name insensitive, y count recibe el mismo where', async () => {
    findManyMock.mockResolvedValue([
      { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', searchName: 'semillas de sesamo la molinera', unit: 'kg', currentCost: '1500.00' },
    ]);
    countMock.mockResolvedValue(1);

    const res = await request(buildApp()).get('/api/ingredients?search=sesamo');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Semillas de sésamo La Molinera');
    expect(res.body.meta.total).toBe(1);

    const expectedWhere = {
      accountId: 'account-1',
      OR: [
        { searchName: { contains: 'sesamo', mode: 'insensitive' } },
        { name: { contains: 'sesamo', mode: 'insensitive' } },
      ],
    };

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 0,
        take: 20,
      })
    );
    expect(countMock).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('encuentra nombres reales con múltiples tildes o con eñe ("azucar comun", "almidon de maiz", "jabon liquido", "canoncitos")', async () => {
    const testCases = [
      { search: 'azucar comun', expectedName: 'Azúcar común tipo A', normalized: 'azucar comun' },
      { search: 'almidon de maiz', expectedName: 'Almidón de maíz', normalized: 'almidon de maiz' },
      { search: 'jabon liquido', expectedName: 'Jabón líquido', normalized: 'jabon liquido' },
      { search: 'canoncitos', expectedName: 'Cañoncitos', normalized: 'canoncitos' },
    ];

    for (const tc of testCases) {
      findManyMock.mockResolvedValueOnce([
        { id: 'ing-x', name: tc.expectedName, searchName: tc.normalized, unit: 'kg', currentCost: '100' },
      ]);
      countMock.mockResolvedValueOnce(1);

      const res = await request(buildApp()).get(`/api/ingredients?search=${encodeURIComponent(tc.search)}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe(tc.expectedName);
      expect(findManyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { searchName: { contains: tc.normalized, mode: 'insensitive' } },
              { name: { contains: tc.search, mode: 'insensitive' } },
            ],
          }),
        })
      );
    }
  });

  it('devuelve array vacío y meta.total: 0 cuando no hay coincidencias', async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/ingredients?search=inexistente');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });
});

describe('GET /api/ingredients/:id', () => {
  it('devuelve 200 con el insumo incluyendo proveedores asociados si pertenece a la cuenta', async () => {
    const ingredient = {
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina',
      suppliers: [
        {
          id: 'si-1',
          packageSize: '50.000',
          packagePrice: '35000.00',
          isDefault: true,
          supplier: { id: 's-1', name: 'Molino Cañuelas' },
        },
      ],
    };
    findFirstMock.mockResolvedValue(ingredient);

    const res = await request(buildApp()).get('/api/ingredients/ing-1');

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual(ingredient);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 'ing-1', accountId: 'account-1' },
      omit: { searchName: true },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
  });

  it('devuelve 404 si el insumo no existe o es de otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/ingredients/ing-ajeno');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Insumo no encontrado.' });
  });
});

describe('GET /api/ingredients/:id/history', () => {
  it('devuelve 200 con el historial ordenado por changedAt asc', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    const changedAt = new Date();
    const history = [
      { id: 'h-1', ingredientId: 'ing-1', oldCost: '100', newCost: '120', changedAt },
    ];
    priceHistoryCreateMock.mockReset();
    vi.mocked(prisma.priceHistory.findMany).mockResolvedValueOnce(history as any);

    const res = await request(buildApp()).get('/api/ingredients/ing-1/history');

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0]).toMatchObject({
      id: 'h-1',
      ingredientId: 'ing-1',
      oldCost: '100',
      newCost: '120',
      changedAt: changedAt.toISOString(),
    });
  });

  it('devuelve 404 si el insumo no existe para el historial', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/ingredients/ing-inexistente/history');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Insumo no encontrado.');
  });
});

describe('GET /api/ingredients/:id/products', () => {
  const buildUsageRow = (index: number, overrides?: {
    quantity?: string;
    marginPercent?: string;
    minMarginPercent?: string;
    name?: string;
  }) => ({
    quantity: new Prisma.Decimal(overrides?.quantity ?? '0.500'),
    product: {
      id: `prod-${index}`,
      name: overrides?.name ?? `Producto ${index}`,
      salePrice: new Prisma.Decimal('4000.00'),
      cost: new Prisma.Decimal('1500.00'),
      marginAmount: new Prisma.Decimal('2500.00'),
      marginPercent: new Prisma.Decimal(overrides?.marginPercent ?? '62.50'),
      minMarginPercent: new Prisma.Decimal(overrides?.minMarginPercent ?? '30.00'),
      updatedAt: new Date('2026-11-12T10:00:00.000Z'),
    },
  });

  it('Gherkin "Dónde se usa": devuelve los 27 productos con nombre, cantidad y estado de margen al pedir limit=50', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    const rows = Array.from({ length: 27 }, (_, i) =>
      buildUsageRow(i + 1, {
        quantity: i === 0 ? '0.250' : '1.000',
        marginPercent: i === 0 ? '-10.00' : i === 1 ? '20.00' : i === 2 ? '45.00' : '70.00',
        minMarginPercent: '30.00',
      })
    );
    productIngredientFindManyMock.mockResolvedValue(rows);
    productIngredientCountMock.mockResolvedValue(27);

    const res = await request(buildApp()).get('/api/ingredients/ing-1/products?limit=50');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(27);
    expect(res.body.meta).toEqual({ total: 27, page: 1, limit: 50, totalPages: 1 });
    expect(res.body.data[0]).toMatchObject({
      id: 'prod-1',
      name: 'Producto 1',
      quantity: '0.25',
      marginStatus: 'loss',
    });
    expect(res.body.data[1].marginStatus).toBe('risk');
    expect(res.body.data[2].marginStatus).toBe('target');
    expect(res.body.data[3].marginStatus).toBe('surplus');
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 'ing-1', accountId: 'account-1' },
      select: { id: true },
    });
    expect(productIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ingredientId: 'ing-1',
          product: { accountId: 'account-1' },
        },
        orderBy: { product: { name: 'asc' } },
        skip: 0,
        take: 50,
      })
    );
  });

  it('pagina de a 20 por defecto cuando hay 27 productos (page 1 -> 20, page 2 -> 7)', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue(Array.from({ length: 7 }, (_, i) => buildUsageRow(21 + i)));
    productIngredientCountMock.mockResolvedValue(27);

    const res = await request(buildApp()).get('/api/ingredients/ing-1/products?page=2');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.meta).toEqual({ total: 27, page: 2, limit: 20, totalPages: 2 });
    expect(productIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      })
    );
  });

  it('devuelve array vacío y totalPages 0 cuando el insumo no se usa en ningún producto', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-sin-uso' });
    productIngredientFindManyMock.mockResolvedValue([]);
    productIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/ingredients/ing-sin-uso/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  it('Gherkin "Otra cuenta": devuelve 404 si el insumo no existe o pertenece a otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/ingredients/ing-ajeno/products');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Insumo no encontrado.' });
    expect(productIngredientFindManyMock).not.toHaveBeenCalled();
    expect(productIngredientCountMock).not.toHaveBeenCalled();
  });

  it('bloquea a COLLABORATOR con 403 Forbidden sin consultar la base de datos', async () => {
    const res = await request(buildApp())
      .get('/api/ingredients/ing-1/products')
      .set('x-role', 'COLLABORATOR');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(productIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('filtra por search normalizado (sin tildes) y soporta sortBy/order válidos', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue([
      buildUsageRow(1, { name: 'Cañoncitos con dulce de leche' }),
    ]);
    productIngredientCountMock.mockResolvedValue(1);

    const sortCases = [
      { sortBy: 'quantity', order: 'desc', expected: { quantity: 'desc' } },
      { sortBy: 'salePrice', order: 'asc', expected: { product: { salePrice: 'asc' } } },
      { sortBy: 'cost', order: 'desc', expected: { product: { cost: 'desc' } } },
      { sortBy: 'marginPercent', order: 'asc', expected: { product: { marginPercent: 'asc' } } },
    ] as const;

    for (const tc of sortCases) {
      const res = await request(buildApp()).get(
        `/api/ingredients/ing-1/products?search=cañoncito&sortBy=${tc.sortBy}&order=${tc.order}`
      );

      expect(res.status).toBe(200);
      expect(productIngredientFindManyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            ingredientId: 'ing-1',
            product: {
              accountId: 'account-1',
              OR: [
                { searchName: { contains: 'canoncito', mode: 'insensitive' } },
                { name: { contains: 'cañoncito', mode: 'insensitive' } },
              ],
            },
          },
          orderBy: tc.expected,
        })
      );
    }
  });

  it('aplica valores por defecto y límite máximo ante parámetros de paginación inválidos', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue([]);
    productIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get(
      '/api/ingredients/ing-1/products?page=abc&limit=999&sortBy=campo_raro&order=invalido'
    );

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 0, page: 1, limit: 100, totalPages: 0 });
    expect(productIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { product: { name: 'asc' } },
        skip: 0,
        take: 100,
      })
    );
  });
});

describe('POST /api/ingredients', () => {
  it('crea el insumo con datos válidos, asignando accountId y searchName', async () => {
    const created = {
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: '100.00',
    };
    createMock.mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '100.00' });

    expect(res.status).toBe(201);
    expect(res.body.ingredient).toEqual(created);
    expect(createMock).toHaveBeenCalledWith({
      omit: { searchName: true },
      data: expect.objectContaining({
        name: 'Harina 000',
        searchName: 'harina 000',
        unit: 'kg',
        accountId: 'account-1',
      }),
    });
  });

  it('devuelve 400 si falta el name', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ unit: 'kg', currentCost: '10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si unit no es uno de los valores permitidos', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'toneladas', currentCost: '10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unit/);
  });

  it('devuelve 400 si currentCost es menor o igual a cero', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '0' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor a cero/);
  });

  it('devuelve 400 si currentCost es negativo, aunque el formato sea decimal', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '-10.5' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor a cero/);
  });

  it('devuelve 400 si currentCost usa notación científica o escala inválida', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '1e-3' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/decimal válido/);

    const res2 = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '742,985' });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/decimal válido/);
  });

  it('devuelve 409 si el nombre del insumo ya existe con distinto casing en la misma cuenta', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina 000', accountId: 'account-1' });

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'harina 000', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un insumo con ese nombre.');
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'harina 000', mode: 'insensitive' } },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('crea con 201 un insumo cuyo nombre solo existe en otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 'ing-b', name: 'Harina 000', unit: 'kg', currentCost: '10.00', accountId: 'account-1' });

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(201);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'Harina 000', mode: 'insensitive' } },
    });
    expect(createMock).toHaveBeenCalledWith({
      omit: { searchName: true },
      data: expect.objectContaining({ accountId: 'account-1', name: 'Harina 000' }),
    });
  });

  it('devuelve 409 si el índice único case-insensitive rechaza un alta concurrente', async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'Ingredient_accountId_lower_name_key' },
      })
    );

    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un insumo con ese nombre.');
  });

  it('devuelve 400 si currentCost excede el máximo permitido por la base', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: 999999999999999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no puede superar \$99\.999\.999,99/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si currentCost no tiene formato decimal válido', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: 'no-es-un-numero' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/decimal válido/);
  });

  it('ignora cualquier accountId enviado en el body y usa el del token', async () => {
    createMock.mockResolvedValue({ id: 'ing-1' });

    await request(buildApp())
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10', accountId: 'account-ajena' });

    expect(createMock).toHaveBeenCalledWith({
      omit: { searchName: true },
      data: expect.objectContaining({ accountId: 'account-1' }),
    });
  });

  it('acepta correctamente importes válidos en formato argentino de miles en POST verificando el valor procesado', async () => {
    const expectedValues: Record<string, string> = {
      '15.000': '15000',
      '100.000': '100000',
      '1.500': '1500',
      '50.500': '50500',
    };

    for (const [costVal, expectedStr] of Object.entries(expectedValues)) {
      findFirstMock.mockResolvedValueOnce(null);
      createMock.mockResolvedValueOnce({
        id: 'ing-miles',
        accountId: 'account-1',
        name: `Insumo ${costVal}`,
        unit: 'kg',
        currentCost: new Prisma.Decimal(expectedStr),
      });

      const res = await request(buildApp())
        .post('/api/ingredients')
        .send({ name: `Insumo ${costVal}`, unit: 'kg', currentCost: costVal });

      expect(res.status).toBe(201);
      expect(res.body.ingredient).toBeDefined();

      const lastCall = createMock.mock.calls[createMock.mock.calls.length - 1];
      const dataArg = lastCall?.[0]?.data as { currentCost: Prisma.Decimal };
      expect(dataArg.currentCost.toString()).toBe(expectedStr);
    }
  });
});

describe('POST /api/ingredients/bulk', () => {
  it('crea una lista válida y devuelve created/skipped/errors correctos', async () => {
    findManyMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 'ing-1' });

    const rows = [
      { name: 'Harina 000', unit: 'kg', cost: '1.234,56' },
      ...Array.from({ length: 19 }, (_, index) => ({
        name: `Insumo ${index + 2}`,
        unit: 'kg',
        cost: (index + 1) * 10,
      })),
    ];

    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .send(rows);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ created: 20, skipped: 0, errors: [] });
    expect(createMock).toHaveBeenCalledTimes(20);
  });

  it('devuelve errores por fila y crea las válidas aunque haya filas inválidas', async () => {
    findManyMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 'ing-1' });

    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .send([
        { name: 'Harina 000', unit: 'kg', cost: '123,50' },
        { name: '', unit: 'kg', cost: '100' },
        { name: 'Azúcar', unit: 'kg', cost: 'abc' },
        { name: 'Sal', unit: 'kg', cost: '25.50' },
      ]);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toBe(0);
    expect(res.body.errors).toHaveLength(2);
    expect(res.body.errors[0]).toMatchObject({ row: 2, reason: expect.stringMatching(/obligatorio|vacío/i) });
    expect(res.body.errors[1]).toMatchObject({ row: 3, reason: expect.stringMatching(/cost|decimal|numérico|valor/i) });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('omite insumos repetidos sin cambiar el costo existente', async () => {
    findManyMock.mockResolvedValue([{ id: 'ing-1', name: 'Harina 000', accountId: 'account-1' }]);

    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .send([
        { name: 'harina 000', unit: 'kg', cost: '250,75' },
        { name: 'Levadura', unit: 'kg', cost: '50' },
      ]);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ created: 1, skipped: 1, errors: [] });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('responde 403 para colaborador y no crea nada', async () => {
    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .set('x-role', 'COLLABORATOR')
      .send([{ name: 'Harina', unit: 'kg', cost: '100' }]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rechaza más de 500 filas con 413 y mensaje claro', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      name: `Insumo ${index + 1}`,
      unit: 'kg',
      cost: '10',
    }));

    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .send(rows);

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      error: expect.stringMatching(/500|demasiadas|lote/i),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('reporta error y no cuenta como skipped si una fila duplicada contiene campos inválidos', async () => {
    findManyMock.mockResolvedValue([{ id: 'ing-1', name: 'Harina 000', accountId: 'account-1' }]);

    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .send([
        { name: 'harina 000', unit: 'unidad-invalida', cost: '100' },
      ]);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(0);
    expect(res.body.skipped).toBe(0);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0]).toMatchObject({
      row: 1,
      reason: expect.stringMatching(/unit/i),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('falla con 500 y no confirma inserciones si ocurre un error inesperado durante la transacción', async () => {
    findManyMock.mockResolvedValue([]);
    createMock
      .mockResolvedValueOnce({ id: 'ing-1' })
      .mockRejectedValueOnce(new Error('Fallo simulado de conexión en base de datos'));

    const res = await request(buildApp())
      .post('/api/ingredients/bulk')
      .send([
        { name: 'Insumo 1', unit: 'kg', cost: '100' },
        { name: 'Insumo 2', unit: 'kg', cost: '200' },
      ]);

    expect(res.status).toBe(500);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/ingredients/:id', () => {
  it('devuelve 400 si el Content-Type no es application/json', async () => {
    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .set('Content-Type', 'text/plain')
      .send('esto no es json');

    expect(res.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el insumo no pertenece a la cuenta (antes de validar el payload)', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-ajeno')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10' });

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el payload es inválido, sin llegar a actualizar', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: '', unit: 'kg', currentCost: '10' });

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('actualiza el insumo cuando pertenece a la cuenta y el payload es válido (sin productos afectados)', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: new Prisma.Decimal('100.00') });
    const updated = { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: '120.00' };
    updateMock.mockResolvedValue(updated);
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual(updated);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
      omit: { searchName: true },
      data: expect.objectContaining({ name: 'Harina 000', searchName: 'harina 000' }),
    });
    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 si se intenta renombrar un insumo a uno ya existente con distinto casing', async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: 'ing-1', name: 'Levadura', unit: 'kg', currentCost: new Prisma.Decimal('10.00') })
      .mockResolvedValueOnce({ id: 'ing-2', name: 'Harina', unit: 'kg', currentCost: new Prisma.Decimal('12.00') });
    updateMock.mockResolvedValue({ id: 'ing-1', name: 'HARINA', unit: 'kg', currentCost: '10.00' });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'HARINA', unit: 'kg', currentCost: '10.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un insumo con ese nombre.');
  });

  it('registra un PriceHistory cuando el costo cambia', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Manteca', unit: 'kg', currentCost: new Prisma.Decimal('8000.00') });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Manteca',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([]);
    priceHistoryCreateMock.mockResolvedValue({ id: 'ph-1' });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Manteca', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(priceHistoryCreateMock).toHaveBeenCalledTimes(1);
    expect(priceHistoryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ingredientId: 'ing-1',
        oldCost: new Prisma.Decimal('8000.00'),
        newCost: new Prisma.Decimal('9500.00'),
      }),
    });
  });

  it('permite actualizar el costo de un insumo con unidad "u" recalculando recetas (Escenario Gherkin Huevos demo)', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-huevos-demo',
      name: 'Huevos (demo)',
      unit: 'u',
      currentCost: new Prisma.Decimal('250.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-huevos-demo',
      name: 'Huevos (demo)',
      unit: 'u',
      currentCost: new Prisma.Decimal('280.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-torta-demo' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-torta-demo',
      name: 'Torta de chocolate — 1 unidad',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('9800.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('5000.00'),
      marginPercent: new Prisma.Decimal('48.98'),
      ingredients: [
        {
          quantity: new Prisma.Decimal('5'),
          ingredient: { currentCost: new Prisma.Decimal('280.00') },
        },
      ],
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-huevos-demo')
      .send({ name: 'Huevos (demo)', unit: 'u', currentCost: '280.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient.unit).toBe('u');
    expect(res.body.affectedProductsCount).toBe(1);
    expect(productUpdateMock).toHaveBeenCalled();
  });

  it('acepta correctamente importes válidos en formato argentino de miles en PUT verificando el valor procesado', async () => {
    const expectedValues: Record<string, string> = {
      '15.000': '15000',
      '100.000': '100000',
      '1.500': '1500',
      '50.500': '50500',
    };

    for (const [costVal, expectedStr] of Object.entries(expectedValues)) {
      findFirstMock.mockResolvedValueOnce({
        id: 'ing-miles',
        name: 'Insumo Miles',
        unit: 'kg',
        currentCost: new Prisma.Decimal('100.00'),
      });
      updateMock.mockResolvedValueOnce({
        id: 'ing-miles',
        name: 'Insumo Miles',
        unit: 'kg',
        currentCost: new Prisma.Decimal(expectedStr),
      });
      productIngredientFindManyMock.mockResolvedValueOnce([]);

      const res = await request(buildApp())
        .put('/api/ingredients/ing-miles')
        .send({ name: 'Insumo Miles', unit: 'kg', currentCost: costVal });

      expect(res.status).toBe(200);
      expect(res.body.ingredient).toBeDefined();

      const lastCall = updateMock.mock.calls[updateMock.mock.calls.length - 1];
      const dataArg = lastCall?.[0]?.data as { currentCost: Prisma.Decimal };
      expect(dataArg.currentCost.toString()).toBe(expectedStr);
    }
  });

  it('no abre transacción ni crea PriceHistory cuando no hubo cambio real en costo, nombre ni unidad', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('120.00'),
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient).toEqual({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: '120',
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(priceHistoryCreateMock).not.toHaveBeenCalled();
    expect(productIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('solo dispara el evento cuando el producto cruza el umbral mínimo desde un margen aceptable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('20.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dispara el evento margin.alert.triggered cuando un producto cruza el margen mínimo en la actualización', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('50.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    accountFindUniqueMock.mockResolvedValue({
      id: 'account-1',
      businessName: 'Panadería Central',
      slug: 'panaderia-central',
      users: [{ email: 'admin.panaderia@seed.example.test' }],
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://n8n.example.test/webhook/margins',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
          'x-margenx-webhook-secret': 'test-secret',
        }),
      })
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(requestInit?.body).toBeDefined();
    const body = JSON.parse(requestInit!.body!);
    expect(body).toMatchObject({
      accountId: 'account-1',
      accountSlug: 'panaderia-central',
      tradeName: 'Panadería Central',
      ownerEmail: 'admin.panaderia@seed.example.test',
      ingredient: {
        id: 'ing-1',
        name: 'Harina 000',
      },
      affectedProductsCount: 1,
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
          previousCost: '50.00',
          newCost: '9500.00',
          currentMarginPercent: expect.any(String),
          minMarginPercent: '30.00',
        }),
      ],
    });
  });

  it('devuelve affectedProductsCount total y solo los productos críticos en la respuesta', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock
      .mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Pan flauta',
        accountId: 'account-1',
        salePrice: new Prisma.Decimal('100.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('50.00'),
        marginPercent: new Prisma.Decimal('50.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
      })
      .mockResolvedValueOnce({
        id: 'prod-2',
        name: 'Facturas',
        accountId: 'account-1',
        salePrice: new Prisma.Decimal('25000.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('50.00'),
        marginPercent: new Prisma.Decimal('35.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('5000.00') } }],
      });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      affectedProductsCount: 2,
      affectedProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
        expect.objectContaining({
          productId: 'prod-2',
          productName: 'Facturas',
        }),
      ],
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
      ],
    });
    expect(res.body.affectedProducts).toHaveLength(2);
    expect(res.body.criticalProducts).toHaveLength(1);
  });

  it('devuelve affectedProductsCount coherente con los productos realmente procesados aunque uno haya sido borrado', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock
      .mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Pan flauta',
        accountId: 'account-1',
        salePrice: new Prisma.Decimal('100.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('50.00'),
        marginPercent: new Prisma.Decimal('50.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
      })
      .mockResolvedValueOnce(null);
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      affectedProductsCount: 1,
      affectedProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
      ],
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan flauta',
        }),
      ],
    });
    expect(res.body.affectedProducts).toHaveLength(1);
    expect(res.body.criticalProducts).toHaveLength(1);
  });

  it('devuelve 403 si el usuario es COLLABORATOR al intentar actualizar un insumo', async () => {
    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .set('x-role', 'COLLABORATOR')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve affectedProductsCount: 0 y criticalProducts: [] cuando no hubo cambio real', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('120.00'),
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '120.00' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ingredient: {
        id: 'ing-1',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: '120',
      },
      affectedProductsCount: 0,
      criticalProducts: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no despacha la alerta si falta configurar INTERNAL_WEBHOOK_SECRET (Fail-Closed)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    delete process.env.INTERNAL_WEBHOOK_SECRET;

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('50.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('INTERNAL_WEBHOOK_SECRET'));
    consoleErrorSpy.mockRestore();
  });

  it('registra un error en consola si el webhook de n8n responde 401 Unauthorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });
    vi.stubGlobal('fetch', fetchMock);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('8000.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('9500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Pan flauta',
      accountId: 'account-1',
      salePrice: new Prisma.Decimal('100.00'),
      minMarginPercent: new Prisma.Decimal('30.00'),
      cost: new Prisma.Decimal('50.00'),
      marginPercent: new Prisma.Decimal('50.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('9500.00') } }],
    });
    productUpdateMock.mockResolvedValue({});

    accountFindUniqueMock.mockResolvedValue({
      id: 'account-1',
      businessName: 'Panadería Central',
      slug: 'panaderia-central',
      users: [{ email: 'admin.panaderia@seed.example.test' }],
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '9500.00' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 401 (Unauthorized)'));
    consoleErrorSpy.mockRestore();
  });

  it('propaga el error y no responde 200 si falla la actualización del segundo producto afectado', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('120.00'),
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('150.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      name: 'Producto',
      salePrice: new Prisma.Decimal('200.00'),
      minMarginPercent: new Prisma.Decimal('20.00'),
      marginPercent: new Prisma.Decimal('40.00'),
      cost: new Prisma.Decimal('120.00'),
      ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('150.00') } }],
    });
    productUpdateMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Fallo simulado al actualizar el segundo producto'));

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'kg', currentCost: '150.00' });

    expect(res.status).toBe(500);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it('recalcula cost/marginAmount/marginPercent de cada producto afectado por el nuevo costo del insumo', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg' });
    updateMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg', currentCost: '150.00' });

    productIngredientFindManyMock.mockResolvedValue([
      { productId: 'prod-1' },
      { productId: 'prod-2' },
    ]);

    productFindUniqueMock.mockImplementation(({ where }: { where: { id: string } }) => {
      const base = {
        salePrice: new Prisma.Decimal('200.00'),
        ingredients: [
          { quantity: new Prisma.Decimal('2'), ingredient: { currentCost: new Prisma.Decimal('150.00') } },
        ],
      };
      return Promise.resolve(where.id === 'prod-1' ? { id: 'prod-1', ...base } : { id: 'prod-2', ...base });
    });
    productUpdateMock.mockResolvedValue({});

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina', unit: 'kg', currentCost: '150.00' });

    expect(res.status).toBe(200);
    expect(productUpdateMock).toHaveBeenCalledTimes(2);
    expect(productUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: {
        cost: expect.objectContaining({ d: expect.anything() }),
        marginAmount: expect.anything(),
        marginPercent: expect.anything(),
      },
    });

    const firstCall = productUpdateMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const firstCallArgs = firstCall![0] as {
      data: { cost: Prisma.Decimal; marginAmount: Prisma.Decimal; marginPercent: Prisma.Decimal };
    };
    expect(firstCallArgs.data.cost.toString()).toBe('300');
    expect(firstCallArgs.data.marginAmount.toString()).toBe('-100');
    expect(firstCallArgs.data.marginPercent.toString()).toBe('-50');
  });

  it('no duplica el recálculo si un producto tiene el insumo repetido en la lista de afectados', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1', name: 'Harina', unit: 'kg' });
    updateMock.mockResolvedValue({ id: 'ing-1' });

    productIngredientFindManyMock.mockResolvedValue([
      { productId: 'prod-1' },
      { productId: 'prod-1' },
    ]);

    productFindUniqueMock.mockResolvedValue({
      id: 'prod-1',
      salePrice: new Prisma.Decimal('100.00'),
      ingredients: [],
    });
    productUpdateMock.mockResolvedValue({});

    await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10' });

    expect(productUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('responde 409 si cambia unit de "kg" a "l" y el insumo tiene recetas, sin modificar ni recalcular', async () => {
    const applySpy = vi.spyOn(marginCalculator, 'applyIngredientCostChange');
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('736.25'),
      _count: { products: 2, suppliers: 0 },
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'l', currentCost: '736.25' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'No se puede cambiar la unidad: el insumo está en 2 receta(s) y 0 presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad.'
    );
    expect(transactionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(priceHistoryCreateMock).not.toHaveBeenCalled();
    expect(applySpy).not.toHaveBeenCalled();
    applySpy.mockRestore();
  });

  it('responde 409 si cambia unit de "kg" a "l" y el insumo tiene presentaciones de proveedor', async () => {
    const applySpy = vi.spyOn(marginCalculator, 'applyIngredientCostChange');
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('736.25'),
      _count: { products: 0, suppliers: 1 },
    });

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000', unit: 'l', currentCost: '900.00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'No se puede cambiar la unidad: el insumo está en 0 receta(s) y 1 presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad.'
    );
    expect(transactionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(applySpy).not.toHaveBeenCalled();
    applySpy.mockRestore();
  });

  it('permite cambiar unit de "kg" a "l" (200) cuando el insumo no tiene recetas ni presentaciones', async () => {
    findFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Insumo sin uso',
      unit: 'kg',
      currentCost: new Prisma.Decimal('500.00'),
      _count: { products: 0, suppliers: 0 },
    });
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Insumo sin uso',
      unit: 'l',
      currentCost: new Prisma.Decimal('500.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Insumo sin uso', unit: 'l', currentCost: '500.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient.unit).toBe('l');
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
      omit: { searchName: true },
      data: expect.objectContaining({ unit: 'l' }),
    });
  });

  it('permite editar nombre y costo (200) sobre un insumo con recetas y presentaciones si la unidad no cambia', async () => {
    findFirstMock
      .mockResolvedValueOnce({
        id: 'ing-1',
        name: 'Harina 000',
        unit: 'kg',
        currentCost: new Prisma.Decimal('736.25'),
        _count: { products: 3, suppliers: 2 },
      })
      .mockResolvedValueOnce(null);
    updateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000 Olavarriense',
      unit: 'kg',
      currentCost: new Prisma.Decimal('800.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .put('/api/ingredients/ing-1')
      .send({ name: 'Harina 000 Olavarriense', unit: 'kg', currentCost: '800.00' });

    expect(res.status).toBe(200);
    expect(res.body.ingredient.name).toBe('Harina 000 Olavarriense');
    expect(res.body.ingredient.unit).toBe('kg');
    expect(updateMock).toHaveBeenCalled();
  });
});

describe('DELETE /api/ingredients/:id', () => {
  it('devuelve 404 si el insumo no pertenece a la cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/ingredients/ing-ajeno');

    expect(res.status).toBe(404);
    expect(productIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 con los productos afectados si el insumo está en uso', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue([
      { product: { id: 'p1', name: 'Pan' } },
      { product: { id: 'p2', name: 'Facturas' } },
    ]);

    const res = await request(buildApp()).delete('/api/ingredients/ing-1');

    expect(res.status).toBe(409);
    expect(res.body.productsAffected).toEqual([
      { id: 'p1', name: 'Pan' },
      { id: 'p2', name: 'Facturas' },
    ]);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('elimina el insumo si no está en uso en ninguna receta', async () => {
    findFirstMock.mockResolvedValue({ id: 'ing-1' });
    productIngredientFindManyMock.mockResolvedValue([]);
    deleteMock.mockResolvedValue({ id: 'ing-1' });

    const res = await request(buildApp()).delete('/api/ingredients/ing-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Insumo eliminado correctamente.' });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'ing-1' } });
  });
});

/* ------------------------------------------------------------------ */
/* #427: costo manual con presentación predeterminada                 */
/* ------------------------------------------------------------------ */
describe('PUT /api/ingredients/:id - costo manual con presentación predeterminada (#427)', () => {
  // Harina 000 a $900/kg por la bolsa de 25 kg de Molinera a $22.500 (predeterminada).
  const presentacionMolinera = {
    id: 'si-molinera',
    packageSize: new Prisma.Decimal('25.000'),
    packageUnit: 'kg',
    packagePrice: new Prisma.Decimal('22500.00'),
    supplier: { id: 'sup-molinera', name: 'Distribuidora Mayorista Molinera' },
  };
  const harinaConPredeterminada = (overrides: Record<string, unknown> = {}) => ({
    id: 'ing-harina',
    name: 'Harina 000 Olavarriense',
    unit: 'kg',
    currentCost: new Prisma.Decimal('900.00'),
    _count: { products: 3, suppliers: 2 },
    suppliers: [presentacionMolinera],
    ...overrides,
  });

  const guardar = (body: Record<string, unknown>) =>
    request(buildApp()).put('/api/ingredients/ing-harina').send({ name: 'Harina 000 Olavarriense', unit: 'kg', ...body });

  beforeEach(() => {
    updateMock.mockResolvedValue({ id: 'ing-harina', name: 'Harina 000 Olavarriense', unit: 'kg', currentCost: new Prisma.Decimal('950.00') });
    productIngredientFindManyMock.mockResolvedValue([]);
  });

  it('pide la presentación predeterminada del insumo en la misma consulta', async () => {
    findFirstMock.mockResolvedValue(harinaConPredeterminada());
    await guardar({ currentCost: '950' });

    const select = (findFirstMock.mock.calls[0]![0] as { select: { suppliers?: { where: unknown } } }).select;
    expect(select.suppliers?.where).toEqual({ isDefault: true });
  });

  it('Escenario "Aviso al cambiar el costo a mano": 409 DEFAULT_PRESENTATION_MISMATCH con los datos de la presentación y sin guardar nada', async () => {
    const applySpy = vi.spyOn(marginCalculator, 'applyIngredientCostChange');
    findFirstMock.mockResolvedValue(harinaConPredeterminada());

    const res = await guardar({ currentCost: '950' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DEFAULT_PRESENTATION_MISMATCH');
    expect(res.body.error).toMatch(/presentación predeterminada/);
    expect(res.body.defaultPresentation).toEqual({
      id: 'si-molinera',
      supplierId: 'sup-molinera',
      supplierName: 'Distribuidora Mayorista Molinera',
      packageSize: '25',
      packageUnit: 'kg',
      packagePrice: '22500.00',
      unitCost: '900.00',
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
    expect(applySpy).not.toHaveBeenCalled();
    applySpy.mockRestore();
  });

  it('Escenario "Actualizar la presentación": el bulto pasa a costo × tamaño y el insumo se recalcula con su historial', async () => {
    const applySpy = vi.spyOn(marginCalculator, 'applyIngredientCostChange');
    findFirstMock.mockResolvedValue(harinaConPredeterminada());

    const res = await guardar({ currentCost: '950', defaultPresentationAction: 'update-presentation' });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledTimes(1);
    const arg = supplierIngredientUpdateMock.mock.calls[0]![0] as { where: { id: string }; data: { packagePrice: Prisma.Decimal } };
    expect(arg.where).toEqual({ id: 'si-molinera' });
    expect(arg.data.packagePrice.toFixed(2)).toBe('23750.00');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ currentCost: new Prisma.Decimal('950') }) }));
    // applyIngredientCostChange registra el PriceHistory del insumo (900 → 950) dentro de la misma transacción.
    expect(applySpy).toHaveBeenCalledWith(expect.anything(), 'ing-harina', new Prisma.Decimal('900.00'), new Prisma.Decimal('950'));
    applySpy.mockRestore();
  });

  it('actualizar la presentación redondea el precio del bulto con ROUND_HALF_UP a 2 decimales', async () => {
    // Bolsa de 3,333 kg: 950,15 × 3,333 = 3166,84995 → 3166,85.
    findFirstMock.mockResolvedValue(
      harinaConPredeterminada({
        suppliers: [{ ...presentacionMolinera, packageSize: new Prisma.Decimal('3.333'), packagePrice: new Prisma.Decimal('2999.70') }],
      })
    );

    await guardar({ currentCost: '950.15', defaultPresentationAction: 'update-presentation' });

    const arg = supplierIngredientUpdateMock.mock.calls[0]![0] as { data: { packagePrice: Prisma.Decimal } };
    expect(arg.data.packagePrice.toFixed(2)).toBe('3166.85');
  });

  it('Escenario "Quitar el predeterminado": el insumo queda a $950 y la presentación deja de ser predeterminada', async () => {
    findFirstMock.mockResolvedValue(harinaConPredeterminada());

    const res = await guardar({ currentCost: '950', defaultPresentationAction: 'clear-default' });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({ where: { id: 'si-molinera' }, data: { isDefault: false } });
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ currentCost: new Prisma.Decimal('950') }) }));
  });

  it('sin presentación predeterminada, el costo manual se guarda como hoy', async () => {
    findFirstMock.mockResolvedValue(harinaConPredeterminada({ suppliers: [] }));

    const res = await guardar({ currentCost: '950' });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('con el mismo costo (solo cambia el nombre), no pide elegir', async () => {
    // La segunda consulta es la del nombre duplicado: no hay otro insumo con ese nombre.
    findFirstMock
      .mockResolvedValueOnce(harinaConPredeterminada({ currentCost: new Prisma.Decimal('950.00') }))
      .mockResolvedValueOnce(null);

    const res = await guardar({ name: 'Harina 000 Olavarriense x 25', currentCost: '950' });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('si el costo nuevo coincide con el de la presentación predeterminada, guarda sin pedir elegir', async () => {
    findFirstMock.mockResolvedValue(harinaConPredeterminada({ currentCost: new Prisma.Decimal('880.00') }));

    const res = await guardar({ currentCost: '900' });

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('rechaza una acción desconocida con 400', async () => {
    findFirstMock.mockResolvedValue(harinaConPredeterminada());

    const res = await guardar({ currentCost: '950', defaultPresentationAction: 'borrar-todo' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/defaultPresentationAction/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('con un bulto de 0,5 kg, actualizar la presentación redondea el medio centavo hacia arriba y guarda el costo que da el bulto', async () => {
    // Pan de manteca de 0,5 kg a $6.045 ($12.090/kg). 12.090,25 × 0,5 = 6.045,125 → 6.045,13 (ROUND_HALF_UP; con
    // redondeo bancario daría 6.045,12). Ese bulto da 6.045,13 / 0,5 = 12.090,26 por kg: es el costo que se guarda,
    // así el insumo y su presentación predeterminada coinciden (ADR-005, ADR-011).
    const applySpy = vi.spyOn(marginCalculator, 'applyIngredientCostChange');
    findFirstMock.mockResolvedValue(
      harinaConPredeterminada({
        name: 'Manteca en bloque mayorista',
        currentCost: new Prisma.Decimal('12090.00'),
        suppliers: [{ ...presentacionMolinera, packageSize: new Prisma.Decimal('0.500'), packagePrice: new Prisma.Decimal('6045.00') }],
      })
    );

    const res = await guardar({ name: 'Manteca en bloque mayorista', currentCost: '12090.25', defaultPresentationAction: 'update-presentation' });

    expect(res.status).toBe(200);
    const arg = supplierIngredientUpdateMock.mock.calls[0]![0] as { data: { packagePrice: Prisma.Decimal } };
    expect(arg.data.packagePrice.toFixed(2)).toBe('6045.13');
    const data = (updateMock.mock.calls[0]![0] as { data: { currentCost: Prisma.Decimal } }).data;
    expect(data.currentCost.toFixed(2)).toBe('12090.26');
    expect((applySpy.mock.calls[0]![3] as Prisma.Decimal).toFixed(2)).toBe('12090.26');
    applySpy.mockRestore();
  });

  it('si el precio del bulto superaría $99.999.999,99, responde 422 sin guardar nada', async () => {
    // Bolsa de 25 kg: 4.000.000 × 25 = 100.000.000, que no entra en el precio del bulto (Decimal(10, 2)).
    findFirstMock.mockResolvedValue(harinaConPredeterminada());

    const res = await guardar({ currentCost: '4000000', defaultPresentationAction: 'update-presentation' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/precio del bulto no puede superar/);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('si el precio del bulto daría $0,00, responde 422 sin guardar nada', async () => {
    // Bulto de 0,1 kg: 0,01 × 0,1 = 0,001 → 0,00.
    findFirstMock.mockResolvedValue(
      harinaConPredeterminada({
        suppliers: [{ ...presentacionMolinera, packageSize: new Prisma.Decimal('0.100'), packagePrice: new Prisma.Decimal('90.00') }],
      })
    );

    const res = await guardar({ currentCost: '0.01', defaultPresentationAction: 'update-presentation' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/precio del bulto/);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it.each(['update-presentation', 'clear-default'])(
    'con un costo igual al de la presentación, la acción "%s" no toca la presentación',
    async (accion) => {
      findFirstMock.mockResolvedValue(harinaConPredeterminada({ currentCost: new Prisma.Decimal('880.00') }));

      const res = await guardar({ currentCost: '900', defaultPresentationAction: accion });

      expect(res.status).toBe(200);
      expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
    }
  );

  it.each(['update-presentation', 'clear-default'])(
    'con el mismo costo (solo cambia el nombre), la acción "%s" no toca la presentación',
    async (accion) => {
      findFirstMock
        .mockResolvedValueOnce(harinaConPredeterminada({ currentCost: new Prisma.Decimal('950.00') }))
        .mockResolvedValueOnce(null);

      const res = await guardar({ name: 'Harina 000 Olavarriense x 25', currentCost: '950', defaultPresentationAction: accion });

      expect(res.status).toBe(200);
      expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
    }
  );
});
</file>

<file path="backend/src/routes/suppliers.test.ts">
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import express from 'express';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

const authState = vi.hoisted(() => ({ role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR' }));

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role: authState.role };
    next();
  },
}));

const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const supplierIngredientFindManyMock = vi.fn();
const supplierIngredientCreateMock = vi.fn();
const supplierIngredientUpdateMock = vi.fn();
const supplierIngredientUpdateManyMock = vi.fn();
const supplierIngredientFindFirstMock = vi.fn();
const supplierIngredientDeleteMock = vi.fn();
const supplierIngredientCountMock = vi.fn();
const ingredientFindFirstMock = vi.fn();
const ingredientUpdateMock = vi.fn();
const priceHistoryCreateMock = vi.fn();
const productIngredientFindManyMock = vi.fn();
const productFindUniqueMock = vi.fn();
const productUpdateMock = vi.fn();

const productFindManyMock = vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
  const found = await Promise.all(where.id.in.map((id) => productFindUniqueMock({ where: { id } })));
  return found.filter(Boolean);
});
const accountFindUniqueMock = vi.fn();
const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => {
  return callback({
    supplierIngredient: {
      create: supplierIngredientCreateMock,
      findFirst: supplierIngredientFindFirstMock,
      update: supplierIngredientUpdateMock,
      updateMany: supplierIngredientUpdateManyMock,
      delete: supplierIngredientDeleteMock,
      count: supplierIngredientCountMock,
    },
    ingredient: { findFirst: ingredientFindFirstMock, update: ingredientUpdateMock },
    productIngredient: { findMany: productIngredientFindManyMock },
    product: { findUnique: productFindUniqueMock, findMany: productFindManyMock, update: productUpdateMock },
    priceHistory: { create: priceHistoryCreateMock },
  });
});

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) => transactionMock(callback),
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
    },
    supplier: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
    supplierIngredient: {
      findMany: (...args: unknown[]) => supplierIngredientFindManyMock(...args),
      create: (...args: unknown[]) => supplierIngredientCreateMock(...args),
      update: (...args: unknown[]) => supplierIngredientUpdateMock(...args),
      updateMany: (...args: unknown[]) => supplierIngredientUpdateManyMock(...args),
      findFirst: (...args: unknown[]) => supplierIngredientFindFirstMock(...args),
      delete: (...args: unknown[]) => supplierIngredientDeleteMock(...args),
      count: (...args: unknown[]) => supplierIngredientCountMock(...args),
    },
    ingredient: {
      findFirst: (...args: unknown[]) => ingredientFindFirstMock(...args),
      update: (...args: unknown[]) => ingredientUpdateMock(...args),
    },
    productIngredient: {
      findMany: (...args: unknown[]) => productIngredientFindManyMock(...args),
    },
    product: {
      findUnique: (...args: unknown[]) => productFindUniqueMock(...args),
      update: (...args: unknown[]) => productUpdateMock(...args),
    },
    priceHistory: {
      create: (...args: unknown[]) => priceHistoryCreateMock(...args),
    },
  },
}));

import suppliersRouter from './suppliers';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/suppliers', suppliersRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  authState.role = 'ADMIN';
  findManyMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  supplierIngredientFindManyMock.mockReset();
  supplierIngredientCreateMock.mockReset();
  supplierIngredientUpdateMock.mockReset();
  supplierIngredientUpdateManyMock.mockReset();
  supplierIngredientFindFirstMock.mockReset();
  supplierIngredientDeleteMock.mockReset();
  supplierIngredientCountMock.mockReset();
  ingredientFindFirstMock.mockReset();
  ingredientUpdateMock.mockReset();
  priceHistoryCreateMock.mockReset();
  productIngredientFindManyMock.mockReset();
  productFindUniqueMock.mockReset();
  productUpdateMock.mockReset();
  accountFindUniqueMock.mockReset();
  transactionMock.mockClear();
  accountFindUniqueMock.mockResolvedValue({
    id: 'account-1',
    businessName: 'Panadería Central',
    slug: 'panaderia-central',
    users: [{ email: 'admin.panaderia@seed.example.test' }],
  });
});

describe('GET /api/suppliers', () => {
  it('lista solo los proveedores de la cuenta ordenados por name asc', async () => {
    const suppliers = [
      { id: 's-1', accountId: 'account-1', name: 'Acuario', ingredients: [] },
      { id: 's-2', accountId: 'account-1', name: 'Bodega', ingredients: [] },
    ];
    findManyMock.mockResolvedValue(suppliers);

    const res = await request(buildApp()).get('/api/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.suppliers).toEqual([
      { id: 's-1', accountId: 'account-1', name: 'Acuario', ingredientCount: 0, quarantineCount: 0 },
      { id: 's-2', accountId: 'account-1', name: 'Bodega', ingredientCount: 0, quarantineCount: 0 },
    ]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1' },
      include: {
        ingredients: {
          select: {
            isQuarantined: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  });

  it('suma ingredientCount (todas las presentaciones) y quarantineCount (solo las retenidas) por proveedor', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 's-1',
        accountId: 'account-1',
        name: 'Molino Olavarriense',
        ingredients: [{ isQuarantined: true }, { isQuarantined: false }, { isQuarantined: false }],
      },
      { id: 's-2', accountId: 'account-1', name: 'Distribuidora Química del Sur', ingredients: [{ isQuarantined: false }] },
    ]);

    const res = await request(buildApp()).get('/api/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.suppliers).toEqual([
      { id: 's-1', accountId: 'account-1', name: 'Molino Olavarriense', ingredientCount: 3, quarantineCount: 1 },
      { id: 's-2', accountId: 'account-1', name: 'Distribuidora Química del Sur', ingredientCount: 1, quarantineCount: 0 },
    ]);
  });

  it('lista los precios en cuarentena filtrados por la cuenta del administrador', async () => {
    const quarantined = [
      {
        id: 'sq-1',
        ingredientId: 'ing-1',
        supplierId: 's-1',
        packagePrice: '50000',
        packageSize: '50',
        isDefault: true,
        isQuarantined: true,
        ingredient: { id: 'ing-1', name: 'Manteca', currentCost: '12090' },
        supplier: { id: 's-1', name: 'Distribuidora X' },
      },
    ];
    supplierIngredientFindManyMock.mockResolvedValue(quarantined);

    const res = await request(buildApp()).get('/api/suppliers/quarantine');

    expect(res.status).toBe(200);
    expect(res.body.quarantined).toEqual([
      expect.objectContaining({
        id: 'sq-1',
        currentPrice: '50000',
        proposedPrice: '50000',
        variationPercent: '0',
        quarantineReason: 'SIN_MOTIVO',
        ingredient: { id: 'ing-1', name: 'Manteca', currentCost: '12090' },
        supplier: { id: 's-1', name: 'Distribuidora X' },
      }),
    ]);
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith({
      where: { ingredient: { accountId: 'account-1' }, isQuarantined: true },
      include: {
        ingredient: { select: { id: true, name: true, currentCost: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
  });

  it('libera un precio en cuarentena aplicando el pendiente y limpia los metadatos de rechazo', async () => {
    const quarantined = {
      id: 'sq-1',
      ingredientId: 'ing-1',
      supplierId: 's-1',
      packagePrice: new Prisma.Decimal('1000'),
      pendingPackagePrice: new Prisma.Decimal('5000'),
      packageSize: new Prisma.Decimal('50'),
      isDefault: true,
      isQuarantined: true,
      quarantinedAt: new Date('2026-10-20T12:00:00.000Z'),
      quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
      ingredient: { id: 'ing-1', name: 'Manteca', currentCost: new Prisma.Decimal('12090') },
    };

    supplierIngredientFindFirstMock.mockResolvedValue(quarantined);
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Manteca',
      currentCost: new Prisma.Decimal('12090'),
    });
    supplierIngredientUpdateMock.mockResolvedValue({
      id: 'sq-1',
      packagePrice: new Prisma.Decimal('5000'),
      pendingPackagePrice: null,
      isQuarantined: false,
      quarantinedAt: null,
      quarantineReason: null,
    });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      currentCost: new Prisma.Decimal('20000'),
    });

    const applyIngredientCostChangeMock = vi.spyOn(
      await import('../services/marginCalculator'),
      'applyIngredientCostChange'
    ).mockResolvedValue({
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    });

    const res = await request(buildApp()).post('/api/suppliers/quarantine/sq-1/release');

    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(supplierIngredientFindFirstMock).toHaveBeenCalledWith({
      where: { id: 'sq-1', ingredient: { accountId: 'account-1' }, isQuarantined: true },
      include: { ingredient: { select: { id: true, name: true, currentCost: true } } },
    });
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'sq-1' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('5000'),
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      })
    });

    applyIngredientCostChangeMock.mockRestore();
  });

  it('libera una fila legacy en cuarentena aunque no tenga pendingPackagePrice', async () => {
    const quarantined = {
      id: 'sq-legacy',
      ingredientId: 'ing-1',
      supplierId: 's-1',
      packagePrice: new Prisma.Decimal('1000'),
      pendingPackagePrice: null,
      packageSize: new Prisma.Decimal('50'),
      isDefault: false,
      isQuarantined: true,
      quarantinedAt: new Date('2026-10-20T12:00:00.000Z'),
      quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
      ingredient: { id: 'ing-1', name: 'Manteca', currentCost: new Prisma.Decimal('12090') },
    };

    supplierIngredientFindFirstMock.mockResolvedValue(quarantined);
    supplierIngredientUpdateMock.mockResolvedValue({
      id: 'sq-legacy',
      packagePrice: new Prisma.Decimal('1000'),
      pendingPackagePrice: null,
      isQuarantined: false,
      quarantinedAt: null,
      quarantineReason: null,
    });

    const res = await request(buildApp()).post('/api/suppliers/quarantine/sq-legacy/release');

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'sq-legacy' },
      data: expect.objectContaining({
        packagePrice: new Prisma.Decimal('1000'),
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      }),
    });
  });

  it('dispara la alerta de margen cuando un precio liberado cruza el mínimo', async () => {
    const quarantined = {
      id: 'sq-1',
      ingredientId: 'ing-1',
      supplierId: 's-1',
      packagePrice: new Prisma.Decimal('1000'),
      pendingPackagePrice: new Prisma.Decimal('5000'),
      packageSize: new Prisma.Decimal('50'),
      isDefault: true,
      isQuarantined: true,
      ingredient: { id: 'ing-1', name: 'Manteca', currentCost: new Prisma.Decimal('12090') },
    };

    supplierIngredientFindFirstMock.mockResolvedValue(quarantined);
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Manteca',
      currentCost: new Prisma.Decimal('12090'),
    });
    supplierIngredientUpdateMock.mockResolvedValue({
      id: 'sq-1',
      packagePrice: new Prisma.Decimal('5000'),
      pendingPackagePrice: null,
      isQuarantined: false,
      quarantinedAt: null,
      quarantineReason: null,
    });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      currentCost: new Prisma.Decimal('20000'),
    });

    const applyIngredientCostChangeMock = vi.spyOn(
      await import('../services/marginCalculator'),
      'applyIngredientCostChange'
    ).mockResolvedValue({
      affectedProductsCount: 1,
      affectedProducts: [],
      criticalProducts: [{
        productId: 'prod-1',
        productName: 'Pan Integral',
        previousCost: new Prisma.Decimal('1000'),
        newCost: new Prisma.Decimal('1200'),
        currentMarginPercent: new Prisma.Decimal('18.75'),
        minMarginPercent: new Prisma.Decimal('20'),
      }],
    });
    const dispatchSpy = vi.spyOn(await import('../services/marginAlertDispatcher'), 'dispatchMarginAlertEvent').mockResolvedValue();

    const res = await request(buildApp()).post('/api/suppliers/quarantine/sq-1/release');

    expect(res.status).toBe(200);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'account-1',
      ingredientId: 'ing-1',
      ingredientName: 'Manteca',
      affectedProductsCount: 1,
      criticalProducts: [
        expect.objectContaining({
          productId: 'prod-1',
          productName: 'Pan Integral',
          previousCost: '1000.00',
          newCost: '1200.00',
          currentMarginPercent: '18.75',
          minMarginPercent: '20.00',
        }),
      ],
    }));

    dispatchSpy.mockRestore();
    applyIngredientCostChangeMock.mockRestore();
  });

  it('devuelve array vacío si no hay proveedores', async () => {
    findManyMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.suppliers).toEqual([]);
  });
});

describe('POST /api/suppliers', () => {
  it('crea asignando accountId del token, con trim del name y opcionales en null', async () => {
    const created = {
      id: 's-1',
      accountId: 'account-1',
      name: 'Madero',
      contactPhone: null,
      email: null,
      address: null,
      isActive: true,
    };
    createMock.mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({
        name: '  Madero  ',
        contactPhone: null,
        email: null,
        address: null,
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.supplier).toEqual(created);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Madero',
        accountId: 'account-1',
        contactPhone: null,
        email: null,
        address: null,
        isActive: true,
      }),
    });
  });

  it('ignora el accountId enviado en el body', async () => {
    createMock.mockResolvedValue({ id: 's-1' });

    await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', accountId: 'account-ajena' });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: 'account-1' }),
    });
  });

  it('convierte un contactPhone numérico a string', async () => {
    createMock.mockResolvedValue({ id: 's-1' });

    await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', contactPhone: 1234567 });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ contactPhone: '1234567' }),
    });
  });

  it('devuelve 400 si falta name', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ contactPhone: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si name es solo espacios', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si name no es string', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 (no 500) si no se envía body', async () => {
    const res = await request(buildApp()).post('/api/suppliers');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si isActive no es boolean', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', isActive: 'false' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "isActive" debe ser booleano.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si email no tiene formato válido', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', email: 'correo-invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "email" debe tener un formato válido.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si contactPhone es un objeto', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', contactPhone: { value: 123 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "contactPhone" debe ser un texto.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 con "Ya existe un proveedor con ese nombre." si el nombre existe', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Proveedor' });

    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un proveedor con ese nombre.');
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'Proveedor', mode: 'insensitive' } },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('no guarda el nombre en minúsculas', async () => {
    createMock.mockResolvedValue({ id: 's-1' });

    await request(buildApp())
      .post('/api/suppliers')
      .send({ name: '  PANADERIA  ' });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'PANADERIA' }),
    });
  });
});

describe('GET /api/suppliers/:id - Paginación de presentaciones', () => {
  it('responde 404 en la rama paginada si el proveedor pertenece a otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/suppliers/sup-ajeno?page=1&limit=20');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Proveedor no encontrado.');
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 'sup-ajeno', accountId: 'account-1' },
    });
    expect(supplierIngredientFindManyMock).not.toHaveBeenCalled();
  });

  it('ordena las presentaciones paginadas alfabéticamente por nombre del insumo', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-marjuanc',
      accountId: 'account-1',
      name: 'Distribuidora MarJuanC',
    });

    supplierIngredientFindManyMock.mockResolvedValue([]);
    supplierIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/suppliers/s-marjuanc?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { ingredient: { name: 'asc' } },
      })
    );
  });

  it('permite buscar por coincidencia en searchName normalizado del insumo ("sesamo" -> "sésamo")', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-marjuanc',
      accountId: 'account-1',
      name: 'Distribuidora MarJuanC',
    });

    supplierIngredientFindManyMock.mockResolvedValue([]);
    supplierIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/suppliers/s-marjuanc?search=sesamo');

    expect(res.status).toBe(200);
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { ingredient: { searchName: { contains: 'sesamo', mode: 'insensitive' } } },
            { ingredient: { name: { contains: 'sesamo', mode: 'insensitive' } } },
          ]),
        }),
      })
    );
  });

  it('pagina las presentaciones del proveedor respetando limit, page y devolviendo meta', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-marjuanc',
      accountId: 'account-1',
      name: 'Distribuidora MarJuanC',
    });

    const mockPresentations = Array.from({ length: 20 }, (_, i) => ({
      id: `si-${i + 1}`,
      supplierId: 's-marjuanc',
      ingredientId: `ing-${i + 1}`,
      packageSize: new Prisma.Decimal('25'),
      packagePrice: new Prisma.Decimal('10000'),
      ingredient: { id: `ing-${i + 1}`, name: `Insumo ${i + 1}`, unit: 'kg', currentCost: new Prisma.Decimal('400') },
    }));

    supplierIngredientFindManyMock.mockResolvedValue(mockPresentations);
    supplierIngredientCountMock.mockResolvedValue(67);

    const res = await request(buildApp()).get('/api/suppliers/s-marjuanc?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.supplier.ingredients).toHaveLength(20);
    expect(res.body.meta).toEqual({
      total: 67,
      page: 1,
      limit: 20,
      totalPages: 4,
    });
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ supplierId: 's-marjuanc' }),
        skip: 0,
        take: 20,
      })
    );
  });
  it('aplica DEFAULT_LIMIT = 20 cuando se solicita paginación sin especificar limit', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-marjuanc',
      accountId: 'account-1',
      name: 'Distribuidora MarJuanC',
    });

    supplierIngredientFindManyMock.mockResolvedValue([]);
    supplierIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/suppliers/s-marjuanc?page=1');

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(20);
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 0,
      })
    );
  });

  it('Escenario Gherkin: un proveedor con 67 presentaciones y limit=20 devuelve 20 y totalPages=4', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-marjuanc',
      accountId: 'account-1',
      name: 'Distribuidora MarJuanC',
    });

    const mock20Items = Array.from({ length: 20 }, (_, i) => ({
      id: `si-${i + 1}`,
      supplierId: 's-marjuanc',
      ingredientId: `ing-${i + 1}`,
      packageSize: new Prisma.Decimal('25'),
      packagePrice: new Prisma.Decimal('10000'),
      ingredient: { id: `ing-${i + 1}`, name: `Insumo ${i + 1}`, unit: 'kg', currentCost: new Prisma.Decimal('400') },
    }));

    supplierIngredientFindManyMock.mockResolvedValue(mock20Items);
    supplierIngredientCountMock.mockResolvedValue(67);

    const res = await request(buildApp()).get('/api/suppliers/s-marjuanc?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.supplier.ingredients).toHaveLength(20);
    expect(res.body.meta).toEqual({
      total: 67,
      page: 1,
      limit: 20,
      totalPages: 4,
    });
  });

  it('permite filtrar presentaciones por search (código o descripción)', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-marjuanc',
      accountId: 'account-1',
      name: 'Distribuidora MarJuanC',
    });

    supplierIngredientFindManyMock.mockResolvedValue([]);
    supplierIngredientCountMock.mockResolvedValue(0);

    const res = await request(buildApp()).get('/api/suppliers/s-marjuanc?search=HAR188');

    expect(res.status).toBe(200);
    expect(supplierIngredientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          supplierId: 's-marjuanc',
          OR: expect.arrayContaining([
            { supplierCode: { contains: 'HAR188', mode: 'insensitive' } },
            { rawDescription: { contains: 'HAR188', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  it('conserva compatibilidad retroactiva: sin query params devuelve todas las presentaciones sin meta', async () => {
    findFirstMock.mockResolvedValue({
      id: 's-1',
      accountId: 'account-1',
      name: 'Molino Sur',
      ingredients: [{ id: 'si-1' }],
    });

    const res = await request(buildApp()).get('/api/suppliers/s-1');

    expect(res.status).toBe(200);
    expect(res.body.supplier).toHaveProperty('ingredients');
    expect(res.body).not.toHaveProperty('meta');
  });
});

describe('GET /api/suppliers/:id', () => {
  it('devuelve 200 con el proveedor y sus presentaciones e insumos asociados', async () => {
    const supplier = {
      id: 's-1',
      accountId: 'account-1',
      name: 'Molino Sur',
      ingredients: [
        {
          id: 'si-1',
          supplierCode: 'HAR-000',
          packagePrice: new Prisma.Decimal('35000'),
          packageSize: new Prisma.Decimal('50'),
          ingredient: { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: new Prisma.Decimal('700') },
        },
      ],
    };
    findFirstMock.mockResolvedValue(supplier);

    const res = await request(buildApp()).get('/api/suppliers/s-1');

    expect(res.status).toBe(200);
    expect(res.body.supplier).toEqual({
      id: 's-1',
      accountId: 'account-1',
      name: 'Molino Sur',
      ingredients: [
        {
          id: 'si-1',
          supplierCode: 'HAR-000',
          packagePrice: '35000',
          packageSize: '50',
          ingredient: { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: '700' },
        },
      ],
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 's-1', accountId: 'account-1' },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentCost: true,
              },
            },
          },
        },
      },
    });
  });

  it('devuelve 404 si no existe o es de otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/suppliers/s-ajeno');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Proveedor no encontrado.' });
  });
});

describe('PUT /api/suppliers/:id', () => {
  it('devuelve 400 si el Content-Type no es application/json', async () => {
    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .set('Content-Type', 'text/plain')
      .send('esto no es json');

    expect(res.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 si no existe o es de otra cuenta, sin llamar a update', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .put('/api/suppliers/s-ajeno')
      .send({ name: 'Proveedor' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Proveedor no encontrado.' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('un update parcial conserva los campos no enviados', async () => {
    const existing = {
      id: 's-1',
      accountId: 'account-1',
      name: 'Original',
      contactPhone: '123456',
      email: 'viejo@correo.com',
      address: 'Calle Falsa 123',
      isActive: true,
    };
    findFirstMock
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);
    updateMock.mockResolvedValue({ ...existing, name: 'Nuevo' });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ name: 'Nuevo' });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: {
        name: 'Nuevo',
        contactPhone: '123456',
        email: 'viejo@correo.com',
        address: 'Calle Falsa 123',
        isActive: true,
      },
    });
  });

  it('contactPhone: "" limpia el campo (queda null)', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: '111', email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, contactPhone: null });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ contactPhone: '' });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ contactPhone: null }),
    });
  });

  it('contactPhone: null limpia el campo (queda null)', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: '111', email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, contactPhone: null });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ contactPhone: null });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ contactPhone: null }),
    });
  });

  it('isActive: false se respeta', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, isActive: false });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ isActive: false }),
    });
  });

  it('isActive: "false" devuelve 400', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ isActive: 'false' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "isActive" debe ser booleano.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 si el nuevo nombre ya existe en la cuenta', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ id: 's-2', accountId: 'account-1', name: 'Nuevo' });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ name: 'Nuevo' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un proveedor con ese nombre.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('no chequea duplicado si el nombre no cambia aunque cambien mayúsculas', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, name: 'original' });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ name: 'original' });

    expect(res.status).toBe(200);
    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ name: 'original' }),
    });
  });
});

describe('DELETE /api/suppliers/:id', () => {
  it('devuelve 404 si no pertenece a la cuenta, sin llamar a delete', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/suppliers/s-ajeno');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Proveedor no encontrado.' });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('elimina y responde { message: "Proveedor eliminado correctamente." }', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    deleteMock.mockResolvedValue({ id: 's-1' });

    const res = await request(buildApp()).delete('/api/suppliers/s-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Proveedor eliminado correctamente.' });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 's-1' } });
  });
});


describe('POST /api/suppliers/:id/ingredients (Upsert)', () => {
  it('crea la asociación y actualiza el insumo con status 201 Created cuando es predeterminado', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Sur' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina',
      unit: 'kg',
      currentCost: new Prisma.Decimal('1000.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue(null);
    supplierIngredientCreateMock.mockResolvedValue({
      id: 'si-1',
      supplierId: 's-1',
      ingredientId: 'ing-1',
      packageSize: new Prisma.Decimal('50'),
      packageUnit: 'kg',
      packagePrice: new Prisma.Decimal('35000'),
      isDefault: true,
    });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina',
      unit: 'kg',
      currentCost: new Prisma.Decimal('700.00'),
    });
    priceHistoryCreateMock.mockResolvedValue({ id: 'ph-1' });
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000', isDefault: true });

    expect(res.status).toBe(201);
    expect(res.body.unitCost.toString()).toBe('700');
    expect(res.body.supplierIngredient).toEqual(expect.objectContaining({ isDefault: true }));
    expect(supplierIngredientCreateMock).toHaveBeenCalled();
    expect(ingredientUpdateMock).toHaveBeenCalled();
    expect(priceHistoryCreateMock).toHaveBeenCalled();
  });

  it('actualiza una asociación existente respondiendo 200 OK (sin 409 Conflict) y registra PriceHistory', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Cañuelas' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('700.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue({
      id: 'si-existente',
      isDefault: true,
    });
    supplierIngredientUpdateMock.mockResolvedValue({
      id: 'si-existente',
      supplierId: 's-1',
      ingredientId: 'ing-1',
      packageSize: new Prisma.Decimal('50'),
      packageUnit: 'kg',
      packagePrice: new Prisma.Decimal('40000'),
      isDefault: true,
    });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('800.00'),
    });
    priceHistoryCreateMock.mockResolvedValue({ id: 'ph-nuevo' });
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '40000', isDefault: true });

    expect(res.status).toBe(200);
    expect(res.body.unitCost.toString()).toBe('800');
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'si-existente' },
      })
    );
    expect(priceHistoryCreateMock).toHaveBeenCalled();
  });

  it('no crea PriceHistory en actualización si el costo unitario no varió', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Cañuelas' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('700.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue({
      id: 'si-existente',
      isDefault: true,
    });
    supplierIngredientUpdateMock.mockResolvedValue({
      id: 'si-existente',
      isDefault: true,
    });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      currentCost: new Prisma.Decimal('700.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000', isDefault: true });

    expect(res.status).toBe(200);
    expect(priceHistoryCreateMock).not.toHaveBeenCalled();
  });

  it('devuelve 422 si se intenta quitar el predeterminado sin reemplazo', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Cañuelas' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('700.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue({
      id: 'si-existente',
      isDefault: true,
    });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '40000', isDefault: false });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/No podés quitar la presentación predeterminada sin elegir otra/);
    expect(supplierIngredientUpdateMock).not.toHaveBeenCalled();
  });

  it('si isDefault es false en nueva asociación no actualiza ingredient ni crea historial', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Sur' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina',
      unit: 'kg',
      currentCost: new Prisma.Decimal('1000.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue(null);
    supplierIngredientCreateMock.mockResolvedValue({ id: 'si-1' });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000', isDefault: false });

    expect(res.status).toBe(201);
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(priceHistoryCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it('si isDefault es false en asociación existente responde 200 y no toca ingredient', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      unit: 'kg',
    });
    supplierIngredientFindFirstMock.mockResolvedValue({ id: 'si-1', isDefault: false });
    supplierIngredientUpdateMock.mockResolvedValue({ id: 'si-1', isDefault: false });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000', isDefault: false });

    expect(res.status).toBe(200);
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
    expect(priceHistoryCreateMock).not.toHaveBeenCalled();
  });

  it('usa el total real de productos afectados en el payload de alerta cuando hay críticos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    process.env.N8N_MARGIN_ALERT_WEBHOOK_URL = 'https://n8n.example.test/webhook/margins';
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';

    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Sur' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina',
      unit: 'kg',
      currentCost: new Prisma.Decimal('1000.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue(null);
    supplierIngredientCreateMock.mockResolvedValue({ id: 'si-1', isDefault: true });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina',
      unit: 'kg',
      currentCost: new Prisma.Decimal('700.00'),
    });
    productIngredientFindManyMock.mockResolvedValue([{ productId: 'prod-1' }, { productId: 'prod-2' }]);
    productFindUniqueMock
      .mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Pan',
        salePrice: new Prisma.Decimal('100.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('60.00'),
        marginPercent: new Prisma.Decimal('50.00'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('700.00') } }],
      })
      .mockResolvedValueOnce({
        id: 'prod-2',
        name: 'Torta',
        salePrice: new Prisma.Decimal('5000.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        cost: new Prisma.Decimal('60.00'),
        marginPercent: new Prisma.Decimal('98.80'),
        ingredients: [{ quantity: new Prisma.Decimal('1'), ingredient: { currentCost: new Prisma.Decimal('700.00') } }],
      });
    productUpdateMock.mockResolvedValue({});
    const body = {
      id: 'account-1',
      businessName: 'Panadería Central',
      slug: 'panaderia-central',
      users: [{ email: 'admin.panaderia@seed.example.test' }],
    };
    accountFindUniqueMock.mockResolvedValue(body);

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000', isDefault: true });

    expect(res.status).toBe(201);
    const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(requestInit?.body).toBeDefined();
    const payload = JSON.parse(requestInit!.body!);
    expect(payload.affectedProductsCount).toBe(2);
    expect(payload.criticalProducts).toHaveLength(1);
  });

  it('devuelve 400 si packageUnit no coincide con la unidad del insumo', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({ id: 'ing-1', accountId: 'account-1', unit: 'kg' });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'l', packagePrice: '35000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/packageUnit/i);
  });

  it('devuelve 400 si el costo unitario calculado redondea a 0.00 o supera el máximo', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({ id: 'ing-1', accountId: 'account-1', unit: 'kg' });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '100', packageUnit: 'kg', packagePrice: '0.01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/costo unitario|mayor a cero|superar/i);
  });

  it.each([
    ['packageSize con 4 decimales', { packageSize: '25.1234', packagePrice: '35000' }, 'El campo "packageSize" debe ser un valor decimal válido con hasta 3 decimales (ej: "25.500").'],
    ['packagePrice con 3 decimales', { packageSize: '25', packagePrice: '35000.555' }, 'El campo "packagePrice" debe ser un valor decimal válido con hasta 2 decimales (ej: "35000.50").'],
    ['packageSize fuera de Decimal(10,3)', { packageSize: '10000000', packagePrice: '35000' }, 'El campo "packageSize" no puede superar 9.999.999,999.'],
    ['packagePrice fuera de Decimal(10,2)', { packageSize: '25', packagePrice: '100000000' }, 'El campo "packagePrice" no puede superar $99.999.999,99.'],
  ])('devuelve 400 si %s', async (_caso, values, message) => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({ id: 'ing-1', accountId: 'account-1', unit: 'kg' });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageUnit: 'kg', ...values });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it('acepta packageSize con 3 decimales en el máximo de la columna', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({ id: 'ing-1', accountId: 'account-1', unit: 'kg' });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '9999999.999', packageUnit: 'kg', packagePrice: '99999999.99' });

    // Pasa la validación de escala; si falla, es por otra regla, nunca por el formato.
    expect(res.body.error ?? '').not.toMatch(/decimal válido|no puede superar/);
  });

  it('devuelve 404 si el proveedor es ajeno a la cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/suppliers/s-ajeno/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Proveedor no encontrado.');
  });

  it('guarda supplierCode y rawDescription al crear la asociación', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Molino Sur' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('1000.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue(null);
    supplierIngredientCreateMock.mockResolvedValue({
      id: 'si-1',
      supplierId: 's-1',
      ingredientId: 'ing-1',
      supplierCode: 'HAR-000',
      rawDescription: 'Harina 000 bolsa 50kg',
      packageSize: new Prisma.Decimal('50'),
      packageUnit: 'kg',
      packagePrice: new Prisma.Decimal('35000'),
      isDefault: true,
    });
    ingredientUpdateMock.mockResolvedValue({
      id: 'ing-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('700.00'),
    });
    priceHistoryCreateMock.mockResolvedValue({ id: 'ph-1' });
    productIngredientFindManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({
        ingredientId: 'ing-1',
        packageSize: '50',
        packageUnit: 'kg',
        packagePrice: '35000',
        isDefault: true,
        supplierCode: ' HAR-000 ',
        rawDescription: ' Harina 000 bolsa 50kg ',
      });

    expect(res.status).toBe(201);
    expect(supplierIngredientCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supplierId: 's-1',
        ingredientId: 'ing-1',
        supplierCode: 'HAR-000',
        rawDescription: 'Harina 000 bolsa 50kg',
      }),
    });
  });

  it('devuelve 409 con el insumo que ya tiene ese supplierCode', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('1000.00'),
    });
    supplierIngredientFindFirstMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'si-dup',
        supplierId: 's-1',
        ingredientId: 'ing-2',
        supplierCode: 'har-000',
        ingredient: { id: 'ing-2', name: 'Manteca' },
      });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({
        ingredientId: 'ing-1',
        packageSize: '50',
        packageUnit: 'kg',
        packagePrice: '35000',
        supplierCode: 'har-000',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Manteca|har-000|código/i);
    expect(supplierIngredientCreateMock).not.toHaveBeenCalled();
  });

  it('guarda la asociación sin supplierCode y avisa que no recibirá precios por ingesta', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({
      id: 'ing-1',
      accountId: 'account-1',
      name: 'Harina 000',
      unit: 'kg',
      currentCost: new Prisma.Decimal('1000.00'),
    });
    supplierIngredientFindFirstMock.mockResolvedValue(null);
    supplierIngredientCreateMock.mockResolvedValue({
      id: 'si-1',
      supplierId: 's-1',
      ingredientId: 'ing-1',
      supplierCode: null,
      rawDescription: 'Harina 000 bolsa 50kg',
      packageSize: new Prisma.Decimal('50'),
      packageUnit: 'kg',
      packagePrice: new Prisma.Decimal('35000'),
      isDefault: false,
    });

    const res = await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({
        ingredientId: 'ing-1',
        packageSize: '50',
        packageUnit: 'kg',
        packagePrice: '35000',
        isDefault: false,
        rawDescription: 'Harina 000 bolsa 50kg',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/no recibirá precios por ingesta|código de proveedor/i);
    expect(supplierIngredientCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supplierCode: null,
        rawDescription: 'Harina 000 bolsa 50kg',
      }),
    });
  });

  it('ignora accountId enviado en el body', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    ingredientFindFirstMock.mockResolvedValue({ id: 'ing-1', accountId: 'account-1', unit: 'kg' });
    supplierIngredientFindFirstMock.mockResolvedValue(null);
    supplierIngredientCreateMock.mockResolvedValue({ id: 'si-1' });

    await request(buildApp())
      .post('/api/suppliers/s-1/ingredients')
      .send({ ingredientId: 'ing-1', packageSize: '50', packageUnit: 'kg', packagePrice: '35000', accountId: 'account-2' });

    expect(supplierIngredientCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ supplierId: 's-1', ingredientId: 'ing-1' }),
    });
  });
});

describe('POST /api/suppliers/quarantine/:id/reject', () => {
  it('rechaza un precio en cuarentena conservando el costo vigente y limpiando los metadatos', async () => {
    const quarantined = {
      id: 'sq-1',
      ingredientId: 'ing-1',
      supplierId: 's-1',
      packagePrice: new Prisma.Decimal('1000'),
      pendingPackagePrice: new Prisma.Decimal('5000'),
      isQuarantined: true,
    };

    supplierIngredientFindFirstMock.mockResolvedValue(quarantined);
    supplierIngredientUpdateMock.mockResolvedValue({
      ...quarantined,
      pendingPackagePrice: null,
      isQuarantined: false,
      quarantinedAt: null,
      quarantineReason: null,
    });

    const res = await request(buildApp()).post('/api/suppliers/quarantine/sq-1/reject');

    expect(res.status).toBe(200);
    expect(supplierIngredientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'sq-1' },
      data: expect.objectContaining({
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      }),
    });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/suppliers/:id/ingredients/:ingredientId', () => {
  it('responde 409 si se intenta eliminar la presentación predeterminada existiendo otras alternativas', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    supplierIngredientFindFirstMock.mockResolvedValue({ id: 'si-1', isDefault: true });
    supplierIngredientCountMock.mockResolvedValue(1); // Existen otras presentaciones

    const res = await request(buildApp()).delete('/api/suppliers/s-1/ingredients/ing-1');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/No podés eliminar la presentación predeterminada/i);
    expect(supplierIngredientDeleteMock).not.toHaveBeenCalled();
  });

  it('elimina correctamente la presentación común sin alterar el costo vigente', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    supplierIngredientFindFirstMock.mockResolvedValue({ id: 'si-2', isDefault: false });
    supplierIngredientDeleteMock.mockResolvedValue({ id: 'si-2' });

    const res = await request(buildApp()).delete('/api/suppliers/s-1/ingredients/ing-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada correctamente/i);
    expect(supplierIngredientDeleteMock).toHaveBeenCalledWith({ where: { id: 'si-2' } });
    expect(ingredientUpdateMock).not.toHaveBeenCalled();
  });

  it('devuelve 403 al colaborador y no elimina nada', async () => {
    authState.role = 'COLLABORATOR';

    const res = await request(buildApp()).delete('/api/suppliers/s-1/ingredients/ing-1');

    expect(res.status).toBe(403);
    expect(supplierIngredientDeleteMock).not.toHaveBeenCalled();
  });
});
</file>

<file path="docs/api.md">
# API REST — Contratos, Límites, Seguridad y Códigos HTTP

Esta guía narrativa constituye el contrato histórico de referencia para el Frontend, las automatizaciones de n8n y las suites automatizadas de Postman/Newman (`backend/tests/postman/`). Desde esta entrega, `backend/openapi/openapi.yaml` es la referencia OpenAPI 3.1 para esquemas y operaciones. Explorá la documentación interactiva Swagger UI en [`/api/docs`](https://api-dev.margenx.tech/api/docs) y obtené el contrato JSON en [`/api/docs/openapi.json`](https://api-dev.margenx.tech/api/docs/openapi.json). Las rutas de la aplicación requieren autenticación mediante cabecera `Authorization: Bearer <JWT>` emitido por Clerk; los endpoints satélite usan autenticación por secreto criptográfico.

---

## 1. Límites de Carga y Seguridad HTTP

- **Límite General:** `256 KB` para todas las rutas REST de la plataforma.
- **Webhook de Ingesta:** `5 MB` dedicados para `POST /api/webhooks/supplier-prices`.
- **Exceso de Payload:** Responde `413` con cuerpo estructurado:
  ```json
  {
    "code": "PAYLOAD_TOO_LARGE",
    "error": "La lista es demasiado grande. Dividila en varios lotes más pequeños."
  }
  ```
- **Seguridad Perimetral:** Incorporación de cabeceras HTTP de `helmet`.
- **Aislamiento Multi-Tenant:** Todas las consultas en base de datos se aíslan estrictamente por `accountId`, extraído del usuario autenticado en `req.user`.

---

## 2. Códigos de Estado HTTP Uniformes

- `200 OK`: Operación exitosa (lectura o actualización).
- `201 Created`: Recurso creado exitosamente.
- `400 Bad Request`: Error de validación semántica o sintáctica (cuerpo no numérico, cantidades negativas, JSON malformado).
- `401 Unauthorized`: Token JWT ausente, vencido o secreto de webhook inválido.
- `403 Forbidden`: Privilegios insuficientes (ej. rol `COLLABORATOR` intentando mutar datos o acceder a rutas de administración).
- `404 Not Found`: Recurso inexistente o perteneciente a otra cuenta comercial.
- `409 Conflict`: Violación de unicidad de nombre (case-insensitive) o de protección referencial.
- `413 Payload Too Large`: Cuerpo de solicitud superior a la cuota permitida o más de 500 filas en carga masiva.
- `422 Unprocessable Entity`: Violación de regla de negocio (ej. quitar la presentación predeterminada sin elegir otra).
- `500 Internal Server Error`: Excepción no controlada en servidor.
- `502 Bad Gateway`: Falló un servicio externo del que depende la operación (hoy, la Backend API de Clerk al invitar, revocar o dar de baja). La operación no se aplicó y se puede reintentar.
- `503 Service Unavailable`: Un servicio satélite necesario para completar la solicitud (como el generador de PDF en n8n) no respondió o está deshabilitado.

---

## 3. Módulo Autenticación y Cuenta (`/api/auth`)

### `GET /api/auth/me`
Retorna el perfil del usuario autenticado y su cuenta asociada.
- **Roles:** `ADMIN` o `COLLABORATOR`.
- **Sanitización RBAC:** Si el usuario es `COLLABORATOR`, el objeto `account` omite `slug` y `defaultMinMarginPercent`.
- **Módulos de la cuenta (ADR-010):** `user.features` trae un booleano por módulo (hoy, solo `sales`). Lo reciben los dos roles: el colaborador usa el módulo de ventas aunque no vea costos. Primero manda la excepción de la cuenta (`AccountFeature`) y después el plan; hoy ningún plan trae módulos. Ver §12.
- **Respuesta 200 (ADMIN):**
  ```json
  {
    "user": {
      "id": "uuid",
      "accountId": "uuid",
      "email": "admin@comercio.example",
      "role": "ADMIN",
      "account": {
        "id": "uuid",
        "businessName": "Panadería Central",
        "defaultMinMarginPercent": "30.00",
        "slug": "panaderia-central"
      },
      "features": { "sales": false }
    }
  }
  ```

### `PATCH /api/auth/account/margin`
Actualiza el margen objetivo global por defecto para la cuenta comercial.
- **Roles:** Solo `ADMIN` (responde `403` a colaboradores).
- **Body:** `{ "defaultMinMarginPercent": 35 }` (número entre 0 y 100).
- **Respuesta 200:**
  ```json
  {
    "message": "Margen global actualizado correctamente",
    "account": {
      "id": "uuid",
      "businessName": "Panadería Central",
      "defaultMinMarginPercent": "35.00"
    }
  }
  ```

### Equipo de la cuenta: invitaciones y colaboradores

El ADMIN invita a su personal por mail y lo da de baja (ADR-008). Todas estas rutas son **solo `ADMIN`** (`403` a colaboradores con `"Acceso denegado. Se requiere rol ADMIN."`) y operan siempre sobre la cuenta de `req.user`: el cliente nunca manda la cuenta ni el rol. Si la Backend API de Clerk falla, responden `502` con `"No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos."` y no aplican cambios.

**Primer inicio de sesión del invitado.** Al aceptar la invitación, Clerk copia sus metadatos (`{ accountId, role: "COLLABORATOR" }`) a `publicMetadata` del usuario. Cuando ese usuario llama a la API por primera vez y todavía no tiene fila en `User`, `authMiddleware` lee los metadatos con la clave secreta y crea el `User` con esa cuenta y ese rol. Responde `401` sin crear nada si no hay metadatos, si el rol no es `COLLABORATOR`, si la cuenta no existe o está inactiva, o si el correo ya pertenece a otro usuario.

#### `POST /api/auth/invitations`
Crea una invitación en Clerk **sin el mail de Clerk** (`notify: false`) y despacha el mail de MargenX a n8n (`N8N_INVITATION_WEBHOOK_URL`, workflow `infra/n8n/workflows/invitacion-colaborador.json`): en español, con la marca de MargenX, enviado por Brevo desde `alertas@margenx.tech`. El enlace de aceptación lleva a `<APP_BASE_URL>/login`, que con el ticket muestra el alta; si `APP_BASE_URL` no está definida, Clerk usa su portal. La invitación vence a los 30 días (valor por defecto de Clerk).

Si el mail no sale (n8n no responde 2xx, no hay `N8N_INVITATION_WEBHOOK_URL`, como en local, o falta `INTERNAL_WEBHOOK_SECRET`), la invitación **igual queda creada** y la respuesta trae `emailSent: false`: el ADMIN copia el enlace (`url`) y lo manda por otro medio. `url` es el enlace de aceptación; lo recibe solo el ADMIN de la cuenta y el backend no lo registra en los logs.
- **Body:** `{ "email": "cajera.quimica@seed.example.test" }`. Solo se acepta `email` (se recorta y se pasa a minúsculas, hasta 254 caracteres); cualquier otro campo, como `accountId` o `role`, da `400`.
- **Respuesta 201:**
  ```json
  {
    "invitation": {
      "id": "inv_2abc",
      "email": "cajera.quimica@seed.example.test",
      "createdAt": "2026-11-16T12:00:00.000Z",
      "url": "https://<instancia>.clerk.accounts.dev/v1/tickets/accept?ticket=<ticket>"
    },
    "emailSent": true
  }
  ```
  `url` es `null` si Clerk no devolvió el enlace; en ese caso no se intenta mandar el mail.
- **Errores:** `400` `"Ingresá un correo electrónico válido."` (también si Clerk rechaza el formato del correo) · `409` `"Ese correo ya tiene un usuario en MargenX."` · `409` `"Ya hay una invitación pendiente para ese correo."` · `409` `"Ese correo ya tiene una cuenta o una invitación pendiente."` (lo informa Clerk) · `502`.

#### `GET /api/auth/invitations`
Invitaciones pendientes de la cuenta, de la más nueva a la más vieja.
- **Respuesta 200:** `{ "invitations": [ { "id": "inv_2abc", "email": "cajera.quimica@seed.example.test", "createdAt": "2026-11-16T12:00:00.000Z", "url": "https://<instancia>.clerk.accounts.dev/v1/tickets/accept?ticket=<ticket>" } ] }` (`url` puede ser `null`).
- **Errores:** `502`.

#### `DELETE /api/auth/invitations/:id`
Revoca una invitación pendiente: el enlace del mail deja de funcionar.
- **Respuesta 200:** `{ "message": "Invitación revocada correctamente." }`
- **Errores:** `404` `"La invitación no existe o ya no está pendiente."` (también si es de otra cuenta) · `502`.

#### `GET /api/auth/users`
Usuarios activos de la cuenta, primero los administradores y después por fecha de alta. No expone `authProviderId`.
- **Respuesta 200:**
  ```json
  {
    "users": [
      { "id": "uuid", "email": "admin@comercio.example", "role": "ADMIN", "createdAt": "2026-08-30T10:00:00.000Z" },
      { "id": "uuid", "email": "colab.quimica@seed.example.test", "role": "COLLABORATOR", "createdAt": "2026-10-02T10:00:00.000Z" }
    ]
  }
  ```

#### `DELETE /api/auth/users/:id`
Da de baja a un colaborador: borra su usuario en Clerk (cierra sus sesiones e impide que vuelva a entrar con la invitación) y después su fila en `User`. Si el usuario ya no existía en Clerk, completa la baja en la base.
- **Respuesta 200:** `{ "message": "Colaborador dado de baja correctamente." }`
- **Errores:** `404` `"El usuario no existe."` (también si es de otra cuenta) · `422` `"No podés darte de baja a vos mismo."` · `422` `"Solo se pueden dar de baja colaboradores."` · `502` (no borra la fila: se puede reintentar).

Colección de Postman: `backend/tests/postman/MargenX - Colaboradores API.postman_collection.json` (`README-Colaboradores.md`).

---

## 4. Módulo Insumos (`/api/ingredients`)

### `GET /api/ingredients`
Lista paginada de insumos de la cuenta.
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `sortBy` (`name`, `currentCost`, `updatedAt`), `order` (`asc`, `desc`), `search` (opcional, hasta 100 caracteres; búsqueda parcial insensible a mayúsculas y tildes).
- **Sanitización RBAC:** Para `COLLABORATOR`, se purga `currentCost` y la lista de `suppliers`. `sortBy=currentCost` se fuerza a `name`.
- **Respuesta 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Harina de trigo 000 Olavarriense",
        "unit": "kg",
        "currentCost": "736.25",
        "updatedAt": "2026-10-14T12:00:00.000Z",
        "suppliers": []
      }
    ],
    "meta": { "total": 20, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

### `GET /api/ingredients/:id`
Detalle de insumo con sus presentaciones comerciales asociadas.
- **Respuesta 200 (ADMIN):**
  ```json
  {
    "ingredient": {
      "id": "uuid",
      "accountId": "uuid",
      "name": "Harina de trigo 000 Olavarriense",
      "unit": "kg",
      "currentCost": "736.25",
      "suppliers": [
        {
          "id": "uuid",
          "supplierId": "uuid",
          "packageSize": "25.000",
          "packagePrice": "18406.25",
          "packageUnit": "kg",
          "isDefault": true,
          "supplier": { "id": "uuid", "name": "Distribuidora MarJuanC Alimentos" }
        }
      ]
    }
  }
  ```

### `GET /api/ingredients/:id/history`
Auditoría cronológica inmutable de variaciones de costos.
- **Roles:** Solo `ADMIN` (`403` a colaboradores).
- **Respuesta 200:**
  ```json
  {
    "history": [
      {
        "id": "uuid",
        "ingredientId": "uuid",
        "oldCost": "700.00",
        "newCost": "736.25",
        "changedAt": "2026-10-14T12:00:00.000Z"
      }
    ]
  }
  ```

### `GET /api/ingredients/:id/products`
Lista paginada de productos cuya receta incluye al insumo indicado, con la cantidad utilizada y su estado de margen.
- **Roles:** Solo `ADMIN` (`403 Forbidden` a colaboradores; `404 Not Found` si el insumo no existe o pertenece a otra cuenta).
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `sortBy` (`name`, `quantity`, `salePrice`, `cost`, `marginPercent`; default `name`), `order` (`asc`, `desc`; default `asc`), `search` (opcional, hasta 100 caracteres; búsqueda parcial insensible a mayúsculas y tildes sobre el nombre del producto).
- **Respuesta 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Pan flauta — 1 kg",
        "quantity": "1.000",
        "salePrice": "4332.14",
        "cost": "749.30",
        "marginAmount": "3582.84",
        "marginPercent": "82.70",
        "minMarginPercent": "55.00",
        "marginStatus": "surplus",
        "updatedAt": "2026-10-14T12:00:00.000Z"
      }
    ],
    "meta": { "total": 4, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```
  - `marginStatus` adopta los mismos estados que el tablero (`loss`, `risk`, `target`, `surplus`).

### `POST /api/ingredients`
Alta de nuevo insumo en la despensa.
- **Roles:** Solo `ADMIN`.
- **Body:** `{ "name": "Azúcar común", "unit": "kg", "currentCost": "1140.00" }`
- **Reglas:** `unit` debe ser `kg`, `l` o `u`. `currentCost` > 0 y $\le \$99.999.999,99$. Formato numérico argentino soportado (`1.140,00`).
- **Respuesta 201 Created** | `409 Conflict` si ya existe un insumo con ese nombre en la cuenta (case-insensitive).

### `POST /api/ingredients/bulk`
Carga masiva de insumos por planilla en una única transacción.
- **Roles:** Solo `ADMIN`.
- **Body:** Array de objetos `[{ "name": "Harina 000", "unit": "kg", "cost": "736,25" }]` (máx. 500 filas).
- **Respuesta 200:**
  ```json
  {
    "created": 18,
    "skipped": 1,
    "errors": [
      { "row": 21, "reason": "El costo no es un número válido. Escribilo como 1.234,56." }
    ]
  }
  ```

### `PUT /api/ingredients/:id`
Actualización de costo o datos del insumo con recálculo en cascada y alertas.
- **Roles:** Solo `ADMIN`.
- **Body:** `{ "name": "Harina 000", "unit": "kg", "currentCost": "9500.00" }`. Campo opcional `defaultPresentationAction`: `"update-presentation"` o `"clear-default"` (ver la regla de la presentación predeterminada). Otro valor responde `400`.
- **Guarda Zero-Variation:** Si `currentCost` no varía, retorna inmediatamente con `affectedProductsCount: 0`.
- **Reglas:**
  - **Unidad fija con uso (`409 Conflict`):** Si cambia `unit` y el insumo tiene al menos una receta (`ProductIngredient`) o presentación de proveedor (`SupplierIngredient`), responde `409 Conflict` sin modificar datos ni historial: `"No se puede cambiar la unidad: el insumo está en N receta(s) y M presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad."`. Si no tiene recetas ni presentaciones, permite cambiar la unidad. Nombre y costo siguen siendo editables cuando la unidad no cambia.
  - **Nombre único (`409 Conflict`):** Si el nuevo nombre ya existe en la cuenta (case-insensitive).
  - **Costo manual con presentación predeterminada (ADR-011):** si el costo cambia, el insumo tiene una presentación predeterminada y el costo nuevo no coincide con el costo unitario de esa presentación:
    - **Sin `defaultPresentationAction`:** responde `409` sin modificar nada:
      ```json
      {
        "error": "El insumo tiene una presentación predeterminada con otro costo. Elegí si actualizás el precio de esa presentación o si dejás de usarla como predeterminada.",
        "code": "DEFAULT_PRESENTATION_MISMATCH",
        "defaultPresentation": {
          "id": "uuid", "supplierId": "uuid", "supplierName": "Distribuidora Mayorista Molinera",
          "packageSize": "25", "packageUnit": "kg", "packagePrice": "22500.00", "unitCost": "900.00"
        }
      }
      ```
    - **`"update-presentation"`:** en la misma transacción, el precio del bulto pasa a `currentCost × packageSize` (`ROUND_HALF_UP`, 2 decimales; con $950 y 25 kg, `23750.00`) y la presentación sigue siendo la predeterminada. El insumo guarda el costo que da ese bulto (precio ÷ tamaño, 2 decimales), así los dos coinciden: con un bulto de tamaño con decimales puede diferir en centavos del enviado (con 0,5 kg y `12090.25`, el bulto queda en `6045.13` y el insumo en `12090.26`), y la respuesta trae el costo guardado.
    - **Precio del bulto fuera de rango (`422`):** con `"update-presentation"`, si el precio del bulto superaría $99.999.999,99 o daría $0,00, responde `422` sin modificar nada: `"El precio del bulto no puede superar $99.999.999,99. Revisá el costo o dejá de usar esta presentación como predeterminada."`.
    - **`"clear-default"`:** en la misma transacción, la presentación deja de ser la predeterminada (`isDefault: false`) y el insumo queda con el costo manual.
    - Sin presentación predeterminada, con el mismo costo o con un costo igual al de la presentación, se guarda como siempre y la acción, si viene, no hace nada.
- **Respuesta 200:**
  ```json
  {
    "ingredient": { "id": "uuid", "currentCost": "9500.00" },
    "affectedProductsCount": 2,
    "affectedProducts": [
      { "productId": "uuid", "productName": "Pan flauta — 1 kg", "newCost": "9510.00", "currentMarginPercent": "-119.52" }
    ],
    "criticalProducts": [
      { "productId": "uuid", "productName": "Pan flauta — 1 kg", "currentMarginPercent": "-119.52", "minMarginPercent": "55.00" }
    ]
  }
  ```

### `DELETE /api/ingredients/:id`
Baja de insumo con protección referencial de recetas.
- **Roles:** Solo `ADMIN`.
- **Regla:** Si el insumo forma parte de recetas activas, responde `409 Conflict`:
  ```json
  {
    "error": "No se puede eliminar el insumo porque forma parte de una o más recetas activas.",
    "productsAffected": [{ "id": "uuid", "name": "Medialunas de manteca" }]
  }
  ```
- **Respuesta 200:** `{ "message": "Insumo eliminado correctamente." }`

---

## 5. Módulo Productos y Fichas Técnicas (`/api/products`)

### `GET /api/products`
Catálogo general paginado de productos terminados.
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `sortBy` (`name`, `salePrice`, `cost`, `marginPercent`, `updatedAt`; para `COLLABORATOR` solo `name`, `salePrice` o `updatedAt`), `order` (`asc`, `desc`), `search` (opcional, hasta 100 caracteres; búsqueda parcial insensible a mayúsculas y tildes).
- **Sanitización RBAC:** Si el usuario es `COLLABORATOR`, se purgan recursivamente `cost`, `marginAmount`, `marginPercent`, `minMarginPercent` y `quantity` de la receta. Solo se retorna el nombre y `salePrice`.
- **Solo productos a la venta para `COLLABORATOR`:** el colaborador recibe únicamente productos con receta (al menos un insumo) y `salePrice` mayor que 0. Los borradores, que pueden tener precio $0, no aparecen. El filtro va en la consulta, así que `meta.total` y `totalPages` cuentan solo esos productos. El `ADMIN` recibe todo el catálogo, borradores incluidos.
- **Respuesta 200 (ADMIN):**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Medialunas de manteca — docena",
        "salePrice": "13500.00",
        "cost": "3616.25",
        "marginAmount": "9883.75",
        "marginPercent": "73.21",
        "minMarginPercent": "65.00",
        "ingredients": [{ "ingredientId": "uuid", "quantity": "0.500" }]
      }
    ],
    "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

### `POST /api/products`
Creación de ficha técnica de producto.
- **Roles:** Solo `ADMIN`.
- **Body:**
  ```json
  {
    "name": "Pan de Campo",
    "salePrice": "4500.00",
    "minMarginPercent": "50.00",
    "ingredients": [
      { "ingredientId": "uuid", "quantity": "0.700" }
    ]
  }
  ```
- **Reglas:**
  - `salePrice` = 0 solo se permite si `ingredients: []` (modo borrador). Si tiene receta, `salePrice` debe ser estrictamente > 0 (`400 Bad Request`).
  - `quantity` admite hasta 3 decimales y un máximo de `9999999.999`.
  - No se permiten insumos repetidos en la receta (`400`).
  - Nombre único por cuenta case-insensitive (`409`).
- **Respuesta 201 Created.**

### `GET /api/products/:id`
Detalle completo de la ficha técnica.
- **Sanitización RBAC:** Colaboradores acceden a la vista pero la respuesta no contiene `cost`, `marginAmount`, `marginPercent` ni las cantidades numéricas de los ingredientes.
- **Borradores:** para `COLLABORATOR`, un producto sin receta o con `salePrice` 0 responde `404`, igual que un producto de otra cuenta.
- **Respuesta 200.**

### `PUT /api/products/:id`
Actualización de datos comerciales o líneas de receta.
- **Roles:** Solo `ADMIN`.
- **Respuesta 200.**

### `DELETE /api/products/:id`
Elimina el producto y sus líneas de receta asociadas.
- **Roles:** Solo `ADMIN`.
- **Respuesta 200:** `{ "success": true }`.

---

## 6. Módulo Proveedores y Empaques (`/api/suppliers`)

Todas las rutas de este módulo son exclusivas para `ADMIN` (responden `403` a colaboradores).

### `GET /api/suppliers`
Lista de distribuidores con contadores de presentaciones y precios en cuarentena.
- **Respuesta 200:**
  ```json
  {
    "suppliers": [
      {
        "id": "uuid",
        "name": "Distribuidora MarJuanC Alimentos",
        "contactPhone": "+54 11 3758-0195",
        "email": null,
        "address": "Grito de Asencio 3632",
        "isActive": true,
        "ingredientCount": 7,
        "quarantineCount": 0
      }
    ]
  }
  ```

### `POST /api/suppliers`
Alta de proveedor mayorista.
- **Body:** `{ "name": "Molino Olavarriense", "contactPhone": "+54 2284 415566", "email": "ventas@molino.test", "address": null, "isActive": true }`
- **Respuesta 201 Created** | `409 Conflict` si el nombre ya existe en la cuenta.

### `GET /api/suppliers/:id`
Ficha técnica del proveedor con sus presentaciones e insumos mapeados. Soporta paginación opcional de presentaciones.
- **Query Params (opcionales):** `page` (default 1), `limit` (default 20, max 100), `search` (opcional, filtra presentaciones por coincidencia parcial en nombre de insumo, código SKU o descripción de lista mayorista).
- **Compatibilidad retroactiva:** Si no se envían parámetros de paginación (`page`, `limit`, `search`), devuelve el objeto del proveedor con la totalidad de sus presentaciones sin el bloque `meta`.
- **Respuesta 200 (Con paginación):**
  ```json
  {
    "supplier": {
      "id": "uuid",
      "accountId": "uuid",
      "name": "Distribuidora MarJuanC Alimentos",
      "contactPhone": "+54 11 3758-0195",
      "email": null,
      "address": "Grito de Asencio 3632",
      "isActive": true,
      "ingredients": [
        {
          "id": "uuid",
          "supplierId": "uuid",
          "ingredientId": "uuid",
          "supplierCode": "HAR188",
          "rawDescription": "HARINA SARITA 000 X 25 KG",
          "packageSize": "25.000",
          "packagePrice": "18406.25",
          "packageUnit": "kg",
          "isDefault": true,
          "isQuarantined": false,
          "ingredient": {
            "id": "uuid",
            "name": "Harina de trigo 000 Olavarriense",
            "unit": "kg",
            "currentCost": "736.25"
          }
        }
      ]
    },
    "meta": {
      "total": 67,
      "page": 1,
      "limit": 20,
      "totalPages": 4
    }
  }
  ```

### `PUT /api/suppliers/:id`
Actualización de datos de contacto o estado activo/inactivo.
- **Respuesta 200.**

### `DELETE /api/suppliers/:id`
Baja del proveedor. Sus presentaciones se eliminan en cascada; los insumos conservan su costo actual.
- **Respuesta 200:** `{ "message": "Proveedor eliminado correctamente." }`.

### `POST /api/suppliers/:id/ingredients`
Asocia o actualiza (Upsert) una presentación comercial cerrada para un insumo.
- **Body:**
  ```json
  {
    "ingredientId": "uuid",
    "packageSize": "25.000",
    "packageUnit": "kg",
    "packagePrice": "18406.25",
    "isDefault": true,
    "supplierCode": "HAR188",
    "rawDescription": "HARINA 000 X 25 KG"
  }
  ```
- **Reglas:**
  - `packageUnit` debe coincidir con `Ingredient.unit` (`400`).
  - `supplierCode` único por proveedor (`409 Conflict` si otro insumo del mismo proveedor ya lo tiene).
  - Si `isDefault: true`, recalcula el costo unitario ($18406,25 / 25 = 736,25$), desmarca a los demás proveedores de ese insumo, actualiza `Ingredient.currentCost` y dispara el recálculo en cascada de los productos.
- **Respuesta 200 (actualizado) / 201 (creado):**
  ```json
  {
    "supplierIngredient": { "id": "uuid", "supplierCode": "HAR188", "isDefault": true },
    "unitCost": "736.25",
    "ingredient": { "id": "uuid", "currentCost": "736.25" },
    "ingestEnabled": true
  }
  ```

### `DELETE /api/suppliers/:id/ingredients/:ingredientId`
Elimina la presentación comercial de un insumo.
- **Protección de Referencia (409):** Si es la presentación predeterminada y el insumo cuenta con otras presentaciones alternativas, la API rechaza el borrado:
  ```json
  {
    "error": "No podés eliminar la presentación predeterminada mientras haya otras. Elegí otra como predeterminada primero."
  }
  ```
- **Respuesta 200:** `{ "message": "Presentación eliminada correctamente." }`.

---

## 7. Módulo Bandeja de Cuarentena (`/api/suppliers/quarantine`)

### `GET /api/suppliers/quarantine`
Lista los precios retenidos por el filtro anti-pollution en la cuenta del administrador.
- **Tipos:** los importes (`packageSize`, `packagePrice`, `currentPrice`, `proposedPrice`, `variationPercent` e `ingredient.currentCost`) llegan como texto decimal, porque Prisma serializa así los `Decimal`. `variationPercent` es el valor absoluto de la variación: el sentido (aumento o caída) se obtiene comparando `currentPrice` con `proposedPrice`. El frontend los convierte a número en `supplierService`.
- **Respuesta 200:**
  ```json
  {
    "quarantined": [
      {
        "id": "uuid",
        "packageSize": "25.000",
        "currentPrice": "18406.25",
        "proposedPrice": "50000.00",
        "variationPercent": "171.64",
        "quarantineReason": "VARIACION_MAYOR_50_POR_CIENTO",
        "isDefault": true,
        "ingredient": { "id": "uuid", "name": "Harina 000", "currentCost": "736.25" },
        "supplier": { "id": "uuid", "name": "Distribuidora MarJuanC" }
      }
    ]
  }
  ```

### `POST /api/suppliers/quarantine/:id/release`
Aprueba el precio retenido y consolida el cambio.
- **Efecto:** `packagePrice = pendingPackagePrice`, limpia la cuarentena y, si `isDefault = true`, actualiza `Ingredient.currentCost` y dispara recálculo en cascada y alertas de margen.
- **Respuesta 200:**
  ```json
  {
    "supplierIngredient": { "id": "uuid", "packagePrice": "50000.00", "isQuarantined": false },
    "unitCost": "2000.00",
    "affectedProductsCount": 2,
    "criticalProducts": []
  }
  ```

### `POST /api/suppliers/quarantine/:id/reject`
Descarta el precio propuesto por anomalía.
- **Efecto:** Pone `pendingPackagePrice = null` y limpia la cuarentena. El insumo conserva intacto su costo anterior.
- **Respuesta 200:**
  ```json
  {
    "supplierIngredient": { "id": "uuid", "isQuarantined": false },
    "message": "Precio anómalo rechazado y mantenido en el costo anterior."
  }
  ```

---

## 8. Módulo Métricas del Dashboard (`/api/dashboard`)

### `GET /api/dashboard/metrics`
Métricas consolidadas de rentabilidad, riesgo y distribución completa del catálogo para el panel principal, calculadas sobre toda la base de la cuenta autenticada.
- **Roles:** Solo `ADMIN` (`403 Forbidden` a colaboradores).
- **Reglas:**
  - Los cinco buckets suman el total de productos de la cuenta (`lossCount + riskCount + targetCount + surplusCount + draftCount`):
    - `draftCount`: productos sin receta (`0` ingredientes).
    - `lossCount`: productos con receta y `marginPercent < 0`.
    - `riskCount`: productos con receta y `0 <= marginPercent < minMarginPercent` (evaluado contra el `minMarginPercent` propio de cada producto).
    - `targetCount`: productos con receta y `minMarginPercent <= marginPercent <= 60`.
    - `surplusCount`: productos con receta y `marginPercent >= minMarginPercent` con `marginPercent > 60`.
  - `criticalProductsCount = lossCount + riskCount` y `healthyProductsCount = targetCount + surplusCount`.
  - `averageMarginPercent`: **mediana** de `marginPercent` de los productos con receta (excluye borradores), redondeada a 2 decimales con `ROUND_HALF_UP` (robusta frente a precios extremos mal cargados).
- **Respuesta 200:**
  ```json
  {
    "activeIngredientsCount": 10,
    "criticalProductsCount": 2,
    "healthyProductsCount": 8,
    "averageMarginPercent": 58.25,
    "recentCostVariationsCount": 1,
    "lossCount": 0,
    "riskCount": 2,
    "targetCount": 4,
    "surplusCount": 4,
    "draftCount": 0
  }
  ```

---

## 9. Módulo Ingesta Desatendida Satélite (`/api/webhooks`)

### `POST /api/webhooks/supplier-prices`
Endpoint de recepción en lote para el orquestador satélite n8n.
- **Autenticación:** Requiere cabecera `x-margenx-webhook-secret` evaluada con `crypto.timingSafeEqual` (`401` si falta o no coincide).
- **Parser de Cuerpo:** Límite dedicado de `5 MB`.
- **Body:**
  ```json
  {
    "accountSlug": "panaderia-central",
    "items": [
      { "code": "HAR188", "description": "Harina Sarita", "price": 18406.25 },
      { "code": "SKU-AJENO", "price": 999.00 }
    ]
  }
  ```
- **Lógica de Procesamiento:**
  1. Deduplica ítems por código dentro del lote.
  2. Búsqueda implícita de `supplierCode` en `SupplierIngredient` de la cuenta.
  3. Descarte estricto (Anti-Pollution): Códigos no vinculados se descartan con motivo `NOT_FOUND`; proveedores inactivos con `INACTIVE_SUPPLIER`; códigos duplicados entre múltiples proveedores con `AMBIGUOUS`.
  4. **Redondeo del precio:** `price` se redondea a 2 decimales con `ROUND_HALF_UP`, igual que la columna `packagePrice` (`Decimal(10, 2)`), antes de compararlo y de guardarlo. Un precio igual al vigente con más decimales cuenta como `unchanged` y no recalcula: `18406.387654` contra `18406,39` no es un cambio, y `18406.385` tampoco (redondea a `18406,39`).
  5. Retención en Cuarentena si $|\Delta\%| > 50\%$ o costo unitario $\le \$0.01$.
  6. Actualiza precios válidos y ejecuta recálculo en cascada para presentaciones con `isDefault = true`.
- **Respuesta 200:**
  ```json
  {
    "received": 2,
    "updated": 1,
    "unchanged": 0,
    "quarantined": 0,
    "duplicates": 0,
    "discarded": 1,
    "discardedCodes": [{ "code": "SKU-AJENO", "reason": "NOT_FOUND" }],
    "account": { "tradeName": "Panadería Central", "ownerEmail": "admin@panaderia.example" },
    "criticalProductsAlerts": []
  }
  ```

---

## 10. Módulo Compras Sugeridas — Smart Purchasing (`/api/purchasing`)

Todas las rutas de este módulo son exclusivas para `ADMIN` (responden `403 Forbidden` a colaboradores), están acotadas por `accountId` y son de **solo lectura**: las sugerencias y proyecciones no modifican `Ingredient.currentCost` (ADR-005).

**Regla de alcance (ADR-010):** Compras sugeridas mide el impacto en el margen de cambiar de proveedor. Sin stock no hay cantidades reales, por lo que la reposición con cantidades llega en la Fase 2. En la v1.0.0, `POST /api/purchasing/order-preview` queda **deprecado** (se reutiliza para la reposición con stock o se elimina en la v1.1).

### `GET /api/purchasing/suggestions`
Compara las presentaciones activas y no en cuarentena de cada insumo contra su presentación predeterminada, calculando el ahorro por unidad (`$` y `%`) y por bulto mediante `calculateUnitCost` (`Prisma.Decimal`, `ROUND_HALF_UP`).
- **Exclusiones:** las presentaciones de proveedores inactivos no participan; las presentaciones en cuarentena no compiten como más baratas y se informan aparte en `quarantinedExcluded`.
- **Alcance (ADR-010):** Compras sugeridas mide el impacto en el margen de cambiar de proveedor; al no registrarse stock ni consumo todavía, no se estima ahorro mensual ni cantidades a reponer.
- **Respuesta 200:**
  ```json
  {
    "summary": {
      "withSavingsCount": 1,
      "alreadyBestPriceCount": 2,
      "singleSupplierCount": 7,
      "withoutEligibleSupplierCount": 0,
      "withoutActiveDefaultCount": 0,
      "quarantinedExcludedCount": 0
    },
    "byIngredient": [
      {
        "ingredientId": "uuid",
        "ingredientName": "Harina 000",
        "unit": "kg",
        "currentCost": "900.00",
        "defaultPresentation": {
          "supplierIngredientId": "uuid",
          "supplierId": "uuid",
          "supplierName": "Molino Cañuelas",
          "supplierCode": "MC-990",
          "rawDescription": null,
          "packageSize": "50",
          "packageUnit": "kg",
          "packagePrice": "45000.00",
          "unitCost": "900.00"
        },
        "cheapestPresentation": {
          "supplierIngredientId": "uuid",
          "supplierId": "uuid",
          "supplierName": "Distribuidora del Centro",
          "supplierCode": "5521",
          "rawDescription": null,
          "packageSize": "25",
          "packageUnit": "kg",
          "packagePrice": "22000.00",
          "unitCost": "880.00"
        },
        "savingsPerUnit": "20.00",
        "savingsPercent": "2.22",
        "packageSavings": "500.00"
      }
    ],
    "bySupplier": [
      {
        "supplierId": "uuid",
        "supplierName": "Distribuidora del Centro",
        "contactPhone": null,
        "email": null,
        "address": null,
        "itemsCount": 1,
        "totalPackageSavings": "500.00",
        "items": []
      }
    ],
    "alreadyBestPrice": [],
    "singleSupplier": [],
    "quarantinedExcluded": []
  }
  ```

### `GET /api/purchasing/margin-impact`
Devuelve el impacto proyectado en el margen de los productos con receta (excluye borradores) al cambiar a la presentación alternativa elegible más económica de cada insumo.
- **Base y elegibilidad:** Compara contra `Ingredient.currentCost` (refleja ediciones manuales del costo). Entra un insumo solo si tiene al menos una presentación alternativa activa, no en cuarentena, no predeterminada y con `unitCost < currentCost`. Ante empate de `unitCost`, desempata por menor `packagePrice`, nombre del proveedor y `id`.
- **Impacto aislado (un cambio por vez):** Para cada producto con receta que usa el insumo, proyecta el costo de receta y el margen reemplazando únicamente ese insumo y dejando el resto con su `currentCost`. Usa `Prisma.Decimal` con redondeo `ROUND_HALF_UP` por renglón, idéntico al recálculo real al confirmar el cambio de proveedor predeterminado.
- **Campos de margen:** por cada producto, el margen por unidad vendida hoy y con la alternativa, en `$` (`currentMarginAmount` y `projectedMarginAmount`, es decir `salePrice` menos el costo de receta) y en `%` (`currentMarginPercent` y `projectedMarginPercent`). Los cuatro salen de `marginCalculator.ts`, con el mismo redondeo que el recálculo real.
- **`summary`:** `ingredientsWithAlternative`, `productsAffected` (productos distintos entre todos los insumos) y `productsLeavingRiskOrLoss` (productos distintos que pasan de `risk` o `loss` a `target` o `surplus` con al menos uno de los cambios).
- **Orden:** Insumos ordenados por `productsLeavingRiskOrLossCount` descendente, mayor suba de margen porcentual entre sus productos, mayor `unitCostDifference` y nombre. Dentro de cada insumo, productos ordenados por suba de margen descendente y nombre.
- **Respuesta 200:**
  ```json
  {
    "summary": {
      "ingredientsWithAlternative": 1,
      "productsAffected": 1,
      "productsLeavingRiskOrLoss": 1
    },
    "byIngredient": [
      {
        "ingredientId": "uuid",
        "ingredientName": "Harina 000",
        "unit": "kg",
        "currentCost": "950.00",
        "defaultPresentation": {
          "supplierIngredientId": "uuid",
          "supplierName": "Molino Cañuelas",
          "unitCost": "900.00"
        },
        "alternativePresentation": {
          "supplierIngredientId": "uuid",
          "supplierName": "Distribuidora del Centro",
          "unitCost": "880.00"
        },
        "unitCostDifference": "70.00",
        "productsAffectedCount": 1,
        "productsLeavingRiskOrLossCount": 1,
        "products": [
          {
            "productId": "uuid",
            "productName": "Medialunas x 12",
            "salePrice": "6000.00",
            "minMarginPercent": "35.00",
            "currentRecipeCost": "3950.00",
            "projectedRecipeCost": "3810.00",
            "currentMarginAmount": "2050.00",
            "projectedMarginAmount": "2190.00",
            "currentMarginPercent": "34.17",
            "projectedMarginPercent": "36.50",
            "currentBucket": "risk",
            "projectedBucket": "target"
          }
        ]
      }
    ]
  }
  ```
  - `defaultPresentation` puede ser `null` si el insumo no tiene presentación predeterminada activa o está en cuarentena.

### `GET /api/purchasing/margin-impact/:ingredientId?supplierIngredientId=...`
Evalúa el mismo cálculo de impacto para una presentación alternativa específica del insumo indicado (usado en la confirmación de "Ya le compro a este proveedor"). Usa la misma base `Ingredient.currentCost` (por lo que `unitCostDifference` puede ser `0.00` o negativo si se evalúa una presentación de igual o mayor costo).
- **Query Params:** `supplierIngredientId` (obligatorio).
- **Errores:**
  - `400 Bad Request`: falta `supplierIngredientId` o viene vacío.
  - `404 Not Found`: el insumo o la presentación no existen, no corresponden entre sí o pertenecen a otra cuenta.
  - `422 Unprocessable Entity`: la presentación está en cuarentena, su proveedor está inactivo o ya es la presentación predeterminada del insumo.
- **Respuesta 200:**
  ```json
  {
    "ingredientId": "uuid",
    "ingredientName": "Harina 000",
    "unit": "kg",
    "currentCost": "950.00",
    "defaultPresentation": {
      "supplierIngredientId": "uuid",
      "supplierName": "Molino Cañuelas",
      "unitCost": "900.00"
    },
    "alternativePresentation": {
      "supplierIngredientId": "uuid",
      "supplierName": "Distribuidora del Centro",
      "unitCost": "880.00"
    },
    "unitCostDifference": "70.00",
    "productsAffectedCount": 1,
    "productsLeavingRiskOrLossCount": 1,
    "products": [
      {
        "productId": "uuid",
        "productName": "Medialunas x 12",
        "salePrice": "6000.00",
        "minMarginPercent": "35.00",
        "currentRecipeCost": "3950.00",
        "projectedRecipeCost": "3810.00",
        "currentMarginAmount": "2050.00",
        "projectedMarginAmount": "2190.00",
        "currentMarginPercent": "34.17",
        "projectedMarginPercent": "36.50",
        "currentBucket": "risk",
        "projectedBucket": "target"
      }
    ]
  }
  ```

### `[Deprecado] POST /api/purchasing/order-preview`
> **Estado (ADR-010):** Deprecado en v1.0.0 (`deprecated: true` en OpenAPI). No se elimina todavía: se reutilizará para la reposición con stock en la Fase 2 o se eliminará en la v1.1.

Calcula el pedido agrupado por proveedor con subtotales, total y ahorro respecto a comprar todo a la presentación predeterminada. No persiste nada en base de datos.
- **Body:**
  ```json
  {
    "items": [
      { "supplierIngredientId": "uuid", "packages": 2 }
    ]
  }
  ```
- **Reglas de validación:** `items` entre 1 y 500 elementos, sin repetir `supplierIngredientId` (400 Bad Request). `packages` entero entre `1` y `100.000` (400 Bad Request).
- **Cálculo de ahorro (`savings` / `totalSavings`):** representa el ahorro neto respecto a comprar la misma cantidad total a la presentación predeterminada activa de cada insumo (`baseline - subtotal`). Si se selecciona una presentación más cara que la predeterminada, el valor será negativo (sobrecosto); si el insumo no tiene presentación predeterminada activa, `defaultUnitCost` es `null` y el ahorro de esa línea es `"0.00"`.
- **Errores de dominio:** si alguna presentación no existe o pertenece a otra cuenta → `404 Not Found`; si el proveedor está inactivo o la presentación está en cuarentena → `422 Unprocessable Entity`.
- **Respuesta 200:**
  ```json
  {
    "groups": [
      {
        "supplierId": "uuid",
        "supplierName": "Distribuidora del Centro",
        "contactPhone": null,
        "email": null,
        "address": null,
        "subtotal": "44000.00",
        "savings": "1000.00",
        "items": [
          {
            "supplierIngredientId": "uuid",
            "ingredientId": "uuid",
            "ingredientName": "Harina 000",
            "unit": "kg",
            "supplierCode": "5521",
            "rawDescription": null,
            "packageSize": "25",
            "packageUnit": "kg",
            "packagePrice": "22000.00",
            "unitCost": "880.00",
            "packages": 2,
            "totalQuantity": "50",
            "subtotal": "44000.00",
            "defaultUnitCost": "900.00",
            "savings": "1000.00"
          }
        ]
      }
    ],
    "total": "44000.00",
    "totalSavings": "1000.00",
    "totalPackages": 2,
    "itemsCount": 1
  }
  ```

---

## 11. Módulo Reportes Semanales (`/api/reports` y `/api/internal/reports`)

### Rutas internas para n8n

Estas rutas requieren la cabecera `x-margenx-webhook-secret`, comparada en tiempo constante. Si falta la cabecera o `INTERNAL_WEBHOOK_SECRET` no está configurado, responden `401 Unauthorized`. Nginx bloquea `/api/internal/` desde el exterior con `403`; n8n las consume por la red interna de Docker.

- `GET /api/internal/reports/accounts`: lista las cuentas activas con `id`, `slug`, `businessName` y el correo del ADMIN más antiguo (`ownerEmail`, o `null`).
- `GET /api/internal/reports/weekly/:slug`: devuelve el reporte semanal calculado para una cuenta activa. Acepta `from` y `to` opcionales como fechas ISO; si no se indican, usa los últimos siete días. Un slug inexistente o inactivo responde `404`.

### Rutas de la aplicación

Ambas rutas requieren JWT de Clerk y rol `ADMIN`; `COLLABORATOR` recibe `403 Forbidden`. El reporte se limita a la cuenta del usuario autenticado. `from` y `to` son parámetros opcionales de fecha ISO.

- `GET /api/reports/weekly`: devuelve el reporte como JSON.
- `GET /api/reports/weekly.pdf`: envía el mismo reporte al webhook `N8N_REPORT_PDF_WEBHOOK_URL` con un timeout de 20 segundos y devuelve el PDF con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="margenx-reporte-AAAA-MM-DD.pdf"`. La fecha del nombre corresponde al día en `America/Argentina/Buenos_Aires`. También envía `Cache-Control: private, no-store` y `Access-Control-Expose-Headers: Content-Disposition`: la app y la API se publican en orígenes distintos, y sin esa cabecera el navegador no deja que la app lea el nombre del archivo. Si n8n no está configurado, falla, expira o devuelve un PDF vacío, responde `503` con un mensaje genérico, sin detalles internos.

El reporte incluye la salud completa del catálogo (con los mismos buckets y mediana que `/api/dashboard/metrics`), hasta 20 productos bajo el mínimo, 10 cambios de costo, 5 presentaciones en cuarentena más antiguas, 5 oportunidades de ahorro de compras y hasta 20 costos desactualizados. **Ventas de la semana:** si la cuenta tiene el módulo de ventas (ADR-010), el reporte suma `sales` con la ganancia real del mismo período (`salesCount`, `salesTotal`, `costTotal`, `profit`, `marginPercent` y los rankings `topSold` y `topProfit`, con la forma de `GET /api/sales/summary` de §12). Sin el módulo, el campo no viene y el PDF no tiene la sección. `staleCosts` considera desactualizado un insumo cuyo último `PriceHistory.changedAt` hasta la fecha `to` (o, si nunca cambió de costo, `Ingredient.updatedAt`, lo que refleja también ediciones de nombre o unidad) supera los 30 días al cierre del período.

## 12. Módulo de Ventas y Caja (`/api/sales` y `/api/cash-shifts`)

Módulo opcional por cuenta (ADR-010, `docs/especificacion-funcional.md` §13). Todas las rutas exigen `Authorization: Bearer <JWT de Clerk>` y el módulo prendido para la cuenta del usuario autenticado.

- **Módulo apagado:** cualquier ruta de `/api/sales` o `/api/cash-shifts` responde `404 Not Found` con `{ "error": "Recurso no encontrado." }`, para los dos roles, como si no existiera. La cuenta sale de `req.user`, nunca del cliente.
- **Sin sesión:** `401 Unauthorized`, antes de consultar el módulo.
- **Cómo saber si está prendido:** `GET /api/auth/me` → `user.features.sales` (§3).
- **Turnos y cierre de caja (`/api/cash-shifts`):** más abajo, en esta misma sección. ADMIN y COLLABORATOR abren y cierran el turno.
- **Montos:** todos los importes van como texto con dos decimales (`"3300.00"`), calculados con `Prisma.Decimal` y `ROUND_HALF_UP`. Las fechas, en ISO 8601 (UTC).
- **Colaborador:** vende, ve sus ventas y su ticket, pero **nunca** recibe `unitCost`, `lineCost`, `marginPercent` ni `totalCost`. La respuesta se arma por rol en el servicio de ventas (no con `sanitizeFinancialData`, que también quitaría la `quantity` de cada renglón). Todas las respuestas llevan `Cache-Control: private, no-store`.

### `POST /api/sales` — Registrar una venta (ADMIN y COLLABORATOR)

- **Body:**
  ```json
  {
    "paymentMethod": "CASH",
    "items": [
      { "productId": "<uuid>", "quantity": 2 },
      { "productId": "<uuid>", "quantity": 1 }
    ]
  }
  ```
  - `paymentMethod`: `CASH` (efectivo), `TRANSFER` (transferencia) o `MERCADO_PAGO`. Solo se registra: no hay integración de cobro.
  - `items`: de 1 a 50 productos distintos; `quantity` entera de 1 a 999. Un producto repetido suma sus cantidades. Cualquier otro campo (precio, costo, total, `accountId`) se ignora: el precio y el costo salen de la base.
- **Regla:** en **una transacción**: exige un turno de caja abierto en la cuenta, toma el precio de venta y el costo vigentes de cada producto, calcula el margen de cada renglón (misma fórmula que el producto, ADR-004) y asigna el **número de ticket correlativo por cuenta** (el siguiente al mayor; si dos ventas toman el mismo número a la vez, el índice único rechaza una y se reintenta con el siguiente, hasta 3 veces). Precio, costo y margen quedan **congelados** en cada renglón: si mañana cambia un costo, la venta no cambia (ADR-005, ADR-010).
- **Respuesta 201 Created:**
  ```json
  {
    "id": "<uuid>",
    "ticketNumber": 8,
    "businessName": "Panadería Central",
    "soldAt": "2026-11-24T12:30:00.000Z",
    "paymentMethod": "CASH",
    "total": "3300.00",
    "totalCost": "1015.20",
    "status": "COMPLETED",
    "cashShiftId": "<uuid>",
    "voidedAt": null,
    "voidReason": null,
    "items": [
      { "productId": "<uuid>", "productName": "Medialuna de manteca", "quantity": 2, "unitPrice": "900.00", "lineTotal": "1800.00", "unitCost": "301.35", "lineCost": "602.70", "marginPercent": "66.52" }
    ]
  }
  ```
  Para el colaborador, sin `totalCost` y sin `unitCost`, `lineCost` ni `marginPercent` en los renglones.
- **Errores:** `400` (medio de pago, productos o cantidades inválidos) · `404` `"Uno de los productos de la venta no existe."` (también si es de otra cuenta) · `409` `"No hay un turno de caja abierto. Abrí el turno para empezar a cobrar."` · `422` si un producto está en borrador (sin receta) o no tiene precio de venta.

### `GET /api/sales` — Historial de ventas

- **Query:** `page` (por defecto 1), `limit` (por defecto 20, máximo 100), `date` (`AAAA-MM-DD`, día calendario de Argentina: de 00:00 a 24:00 en UTC−3) y `cashShiftId` (uuid del turno). Orden: la más reciente primero.
- **Alcance:** el ADMIN ve las ventas de toda la cuenta; el colaborador, solo las que registró él.
- **Respuesta 200 OK:** `{ "data": [{ "id", "ticketNumber", "soldAt", "paymentMethod", "total", "status", "cashShiftId", "itemsCount" }], "meta": { "total", "page", "limit", "totalPages" } }`. Sin costos para ningún rol.
- **Errores:** `400` `"La fecha tiene que tener el formato AAAA-MM-DD."` · `400` `"El turno indicado no es válido."`

### `GET /api/sales/summary` — Ganancia real (solo ADMIN)

- **Query:** `period` = `day` (hoy), `week` (hoy y los 6 días anteriores, la misma ventana del reporte semanal) o `month` (hoy y los 29 anteriores). Por defecto, `week`. Días calendario de Argentina (UTC−3).
- **Regla:** ventas menos el **costo congelado** de cada renglón, y el **margen ponderado por lo vendido** (ganancia / ventas × 100, sobre la venta como en ADR-004), con `Prisma.Decimal` y `ROUND_HALF_UP`. **Sin las ventas anuladas.** El período anterior tiene el mismo largo y termina donde empieza el actual.
- **Respuesta 200 OK:**
  ```json
  {
    "period": "week",
    "from": "2026-11-18",
    "to": "2026-11-24",
    "salesCount": 41,
    "salesTotal": "100000.00",
    "costTotal": "62000.00",
    "profit": "38000.00",
    "marginPercent": "38.00",
    "previous": { "from": "2026-11-11", "to": "2026-11-17", "salesCount": 35, "salesTotal": "80000.00", "costTotal": "52000.00", "profit": "28000.00", "marginPercent": "35.00" },
    "change": { "salesTotal": "25.00", "profit": "35.71" },
    "topSold": [{ "productId": "<uuid>", "productName": "Pan flauta — 1 kg", "quantity": 80, "salesTotal": "346571.20", "profit": "145571.20", "marginPercent": "42.00" }],
    "topProfit": [{ "productId": "<uuid>", "productName": "Medialunas de manteca — docena (12 unidades)", "quantity": 30, "salesTotal": "405000.00", "profit": "273000.00", "marginPercent": "67.41" }]
  }
  ```
  - `marginPercent`: `null` si no hubo ventas (nunca divide por cero).
  - `change`: variación porcentual de las ventas y de la ganancia contra el período anterior; `null` si el anterior fue 0.
  - `topSold` (por unidades) y `topProfit` (por ganancia): 5 productos cada uno. Un producto dado de baja aparece con `productId: null` y el nombre guardado en la venta.
- **Errores:** `400` `"El período tiene que ser day, week o month."` · `403` para el colaborador.
- **Pruebas:** colección `MargenX - Ventas API`, `backend/src/routes/salesSummaryRoutes.test.ts` y `backend/src/services/salesSummaryService.test.ts`.

### `GET /api/sales/:id` — Detalle y ticket

- Mismo cuerpo que la respuesta de `POST /api/sales`, con los renglones ordenados por nombre. El colaborador solo puede ver sus ventas.
- **Errores:** `404` `"La venta no existe."` (también si es de otra cuenta, de otro colaborador o el id no es válido).

### `POST /api/sales/:id/void` — Anular una venta

- **Body:** `{ "reason": "Cobré dos veces la misma venta" }` (de 3 a 200 caracteres).
- **Regla:** no se borra nada: la venta pasa a `VOIDED` con la fecha, quién la anuló y el motivo, y sigue en el historial. **Solo mientras el turno de la venta siga abierto**, también para el ADMIN: así el arqueo de un turno cerrado no cambia nunca. El ADMIN anula cualquier venta del turno; el colaborador, solo las suyas. La anulación toma el mismo bloqueo compartido que la venta (ver el cierre).
- **Respuesta 200 OK:** la venta anulada, con el mismo cuerpo que el detalle.
- **Errores:** `400` `"Escribí el motivo de la anulación."` · `403` `"Solo se pueden anular ventas del turno abierto. El turno de esta venta ya se cerró y su arqueo no cambia."` (los dos roles) · `404` `"La venta no existe."` (también la venta de otro colaborador) · `409` `"La venta ya está anulada."`
- **Pruebas:** colección `MargenX - Ventas API` (`backend/tests/postman/README-Ventas.md`) y `backend/src/routes/salesRoutes.test.ts`.

### Turnos de caja (`/api/cash-shifts`)

Un solo turno abierto por cuenta (índice parcial único `CashShift_accountId_open_key`). Para vender hace falta un turno abierto. **ADMIN y COLLABORATOR** abren y cierran. El arqueo no tiene costos ni márgenes, así que la respuesta es la misma para los dos roles.

**Resumen del turno** (respuesta de todas las rutas de turnos):

```json
{
  "id": "<uuid>",
  "status": "CLOSED",
  "openedAt": "2026-11-24T10:00:00.000Z",
  "openedBy": "cajera.panaderia@seed.example.test",
  "closedAt": "2026-11-24T18:00:00.000Z",
  "closedBy": "cajera.panaderia@seed.example.test",
  "openingAmount": "10000.00",
  "salesCount": 11,
  "voidedCount": 1,
  "salesTotal": "33400.00",
  "methods": [
    { "paymentMethod": "CASH", "salesTotal": "25000.00", "expected": "35000.00", "counted": "34500.00", "difference": "-500.00" },
    { "paymentMethod": "TRANSFER", "salesTotal": "8400.00", "expected": "8400.00", "counted": "8400.00", "difference": "0.00" },
    { "paymentMethod": "MERCADO_PAGO", "salesTotal": "0.00", "expected": "0.00", "counted": "0.00", "difference": "0.00" }
  ],
  "expectedTotal": "43400.00",
  "countedTotal": "42900.00",
  "difference": "-500.00"
}
```

- `salesCount` y `salesTotal`: solo las ventas completadas. Las anuladas no suman en lo esperado y se cuentan en `voidedCount`.
- **Esperado:** en efectivo, el monto inicial más las ventas en efectivo; en transferencia y Mercado Pago, solo sus ventas.
- **Diferencia:** contado − esperado, por medio de pago y total. Negativa = falta plata; positiva = sobra.
- **Turno abierto:** lo esperado se calcula con las ventas hasta ahora, y `counted`, `difference`, `countedTotal`, `closedAt` y `closedBy` van en `null`.
- **Turno cerrado:** lo esperado y lo contado son los guardados al cierre.
- `openedBy` y `closedBy`: el email del usuario, o `null` si se dio de baja (ADR-008).
- **Montos de entrada** (`openingAmount` y lo contado): número o texto, de 0 a 99.999.999,99, con hasta 2 decimales. Si no, `400` `"Indicá <qué>: un monto de 0 a $99.999.999,99, con hasta 2 decimales."`

#### `POST /api/cash-shifts/open` — Abrir el turno

- **Body:** `{ "openingAmount": 10000 }`.
- **Respuesta 201 Created:** el resumen del turno abierto.
- **Errores:** `400` (monto inválido) · `409` `"Ya hay un turno de caja abierto. Cerralo antes de abrir otro."` (también si dos personas abren a la vez: el índice único deja pasar una).

#### `GET /api/cash-shifts/current` — Turno abierto

- **Respuesta 200 OK:** `{ "shift": <resumen> }`, o `{ "shift": null }` si no hay turno abierto. No responde 404: el 404 queda para el módulo apagado.

#### `POST /api/cash-shifts/:id/close` — Cerrar el turno con el arqueo

- **Body:** lo contado en los **tres** medios de pago (obligatorios): `{ "countedCash": 34500, "countedTransfer": 8400, "countedMercadoPago": 0 }`.
- **Regla:** en **una transacción**:
  1. pasa el turno a `CLOSED`;
  2. suma las ventas del turno;
  3. guarda lo esperado, lo contado y la diferencia total.

  La venta y la anulación toman un bloqueo compartido (`FOR SHARE`) sobre la fila del turno, así que el paso 1 espera a las que están en curso. Una venta que llega durante el cierre espera y responde 409: ninguna venta queda afuera de un arqueo ya calculado.
- **Respuesta 200 OK:** el resumen del turno cerrado.
- **Errores:** `400` (falta lo contado de algún medio o es inválido) · `404` `"El turno no existe."` (también de otra cuenta o, para el colaborador, un turno cerrado en el que no trabajó) · `409` `"El turno ya está cerrado."` (también si otra persona lo cerró a la vez).

#### `GET /api/cash-shifts` — Historial de turnos

- **Query:** `page` (por defecto 1) y `limit` (por defecto 20, máximo 100). Orden: el más reciente primero.
- **Alcance:** el ADMIN ve todos los turnos de la cuenta; el colaborador, el abierto y los que abrió, cerró o en los que vendió.
- **Respuesta 200 OK:** `{ "data": [<resumen>], "meta": { "total", "page", "limit", "totalPages" } }`.

#### `GET /api/cash-shifts/:id` — Resumen del turno

- **Respuesta 200 OK:** el resumen, más `businessName` (el nombre del comercio, para imprimirlo). Mismo alcance que el historial.
- **Errores:** `404` `"El turno no existe."`
- **Pruebas:** colección `MargenX - Ventas API`, `backend/src/routes/cashShiftRoutes.test.ts` y `backend/src/services/cashShiftService.test.ts`.
</file>

<file path="docs/especificacion-funcional.md">
# Especificación funcional y diseño de dominio — MargenX

**Documento:** catálogo de insumos, recetas, proveedores, ingesta de listas de precios y roles.
**Versión:** 2.3 · **Fecha:** 22/11/2026 · **Responsable:** Darío Giménez (Tech Lead)
**Reemplaza a:** `especificacion-funcional-abastecimiento.md` y `Diseño-Dominio-Arquitectura-Gestion-Insumos-Multi‐Proveedor-Automatización-Operativa.md` (versión 1.0). Este documento los unifica y los corrige contra el código de `develop` al 26/10/2026.

## Cómo leer este documento

- **Qué describe:** el comportamiento del producto y las reglas de dominio. No repite lo que ya tiene una fuente propia:
  - el esquema de base de datos completo está en `backend/prisma/schema.prisma` (§9 solo resume las reglas);
  - la fórmula del margen y su justificación están en `docs/adr/0004-calculo-margen-ventas-vs-markup.md`;
  - la regla de costo vigente, retención en cuarentena y canal de ingesta están formalizadas en `docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`;
  - la regla de n8n y la arquitectura de despliegue están en `docs/adr/0003-automatizacion-satelite-n8n.md` y en `docs/Arquitectura-Software-(SAD).md`;
  - el cronograma vigente está en `CHANGELOG.md` y en las actas de `docs/retrospectivas/`.
- **Jerarquía:** los ADR aceptados y la Definition of Done mandan sobre el SAD, y el SAD manda sobre este documento. Si encontrás una contradicción, gana la fuente de mayor jerarquía y este documento se corrige.
- **Estado de cada funcionalidad:**

| Marca | Significado |
|---|---|
| **Disponible** | Implementado en `develop`. |
| **Planificado** | Comprometido en el backlog del sprint en curso; todavía no existe. |
| **Propuesta** | Idea de diseño sin sprint asignado. No se presenta como funcionalidad del producto. |

---

## 1. Propósito y principio rector

El motivo más común de abandono de los sistemas de costos en PyMEs gastronómicas, de manufactura artesanal y de química de limpieza es la **fricción en la carga de datos**: el dueño no tiene tiempo de cargar listas a mano, los proveedores mandan listas desordenadas (PDF, Excel, WhatsApp) con códigos dispares, y si el sistema exige proveedores, códigos y conversiones desde el primer minuto, el usuario abandona.

MargenX se rige por el principio de **complejidad progresiva**: la aplicación es simple y útil el primer día, sin pedir datos que el usuario no tiene a mano, y permite activar capas de automatización a medida que el comercio las necesita.

```
[ DÍA 1: ARRANQUE ]        Insumos cargados a mano · recetas y margen al instante
          │
          ▼
[ OPERACIÓN ]              Proveedores y presentaciones · proveedor predeterminado
          │
          ▼
[ AUTOMATIZACIÓN ]         Ingesta de listas por correo · cuarentena de precios anómalos
```

---

## 2. Día Cero: carga inicial de insumos

### El dilema

Un producto necesita insumos para calcular su costo. Si para cargar un insumo hiciera falta conocer de antemano el proveedor, el código de artículo y el tamaño del bulto, el comercio se trabaría antes de ver su primer margen.

### La solución: el insumo no depende del proveedor

Un insumo **puede existir sin proveedor**. Solo necesita tres datos: **nombre**, **unidad de costeo** (`kg`, `l` o `u`) y **costo actual por unidad**. Los proveedores, sus presentaciones y la ingesta automática son capas opcionales que se activan después (§4 y §5).

Hay tres caminos de entrada. Los tres terminan en el mismo lugar, insumos en la despensa (`/insumos`) listos para usar en recetas, y ninguno crea proveedores ni códigos de artículo.

| Camino | Para quién | Cómo funciona | Estado |
|---|---|---|---|
| **A. Arranque rápido** (carga manual) | Comercios con pocos insumos | En **Insumos**, "Nuevo insumo": nombre, unidad y costo por unidad (ej. *Harina 000 — kg — $736,25*). | **Disponible** |
| **B. Plantilla oficial** (CSV o Excel) | Comercios con muchos insumos ya en una planilla | Descargar la plantilla (Nombre, Unidad, Costo en formato `1.234,56` o `1234.56`), completarla y subirla desde **Insumos**. Una vista previa muestra filas válidas, filas con error y nombres duplicados; al confirmar se crean los insumos válidos en una sola operación. | **Disponible** |
| **C. Starter pack por rubro** | Comercios que arrancan de cero | Al primer ingreso se elige el rubro (panadería, hamburguesería, química de limpieza), se ve la lista sugerida con su unidad, se desmarca lo que no se usa, se ajusta el costo y se confirma. | **Propuesta** |

Reglas del camino A (vigentes):

- La cantidad de la receta se puede cargar en la unidad que prefiera el usuario dentro de la misma magnitud (g o kg; ml o l). La base sigue guardando la cantidad en la unidad del insumo.
- El costo debe ser mayor a cero y como máximo $99.999.999,99.
- Si después se edita el costo, se registra el cambio en el historial de precios y se recalculan en cascada todos los productos que usan el insumo (§6).
- Un insumo que está en una receta no se puede borrar (§10).

Decisiones de diseño del camino B:

- El archivo se lee **en el navegador** y se envía a un endpoint autenticado de alta masiva, solo para ADMIN, con validación por fila, tope de filas, transacción y respuesta con creados, omitidos y errores.
- La carga masiva procesa cada fila independientemente: una inválida no frena el resto; si hay un nombre repetido en la cuenta, esa fila se omite sin tocar el costo vigente; y si la lista supera 500 filas, la API responde con `413` y un mensaje claro para dividir el lote.
- **No** usa el webhook de ingesta (§5): ese webhook está reservado a n8n, exige un secreto interno que no puede viajar al navegador y solo actualiza precios de artículos ya vinculados; no crea catálogo. La plantilla y la ingesta comparten solo las reglas de lectura (nombres de columna y formato de números), no el contrato.

Decisión de diseño del camino C: los costos "de referencia de mercado" envejecen rápido con la inflación. Si se implementa, los insumos sugeridos se precargan con su fecha de referencia o con el costo marcado "a confirmar", y la carga reutiliza el alta masiva del camino B.

---

## 3. Productos y recetas

### Producto en borrador ("Borrador") · *Disponible*

Un producto puede crearse **sin insumos**, para que el comercio cargue su lista de precios de venta antes de pesar ingredientes (ej. *Hamburguesa Simple — precio de venta $3.800 — margen mínimo 35 %*).

- Mientras no tenga receta, la interfaz lo muestra con el estado unificado **"Borrador"** (sin receta cargada).
- En ese estado se permite `salePrice = 0` como valor de transición, pero solo si el producto todavía no tiene receta.
- Cuando el producto ya tiene insumos, `salePrice` debe ser estrictamente mayor a `0`; de lo contrario la API responde `400 Bad Request`.
- Si no tiene receta, su costo y margen se informan como `0.00` y `0.00 %` para representar "sin costo cargado", no "rentabilidad nula" (ADR-004). No dispara alertas.
- El cálculo se activa en cuanto se asocia el primer insumo.

### Receta (ficha técnica) · *Disponible*

- Cada línea de la receta vincula un insumo con una cantidad. En la interfaz se puede cargar y visualizar en submúltiplos (g, ml), pero en la base de datos se guarda expresada en la unidad base del insumo (hasta 3 decimales). Un insumo aparece una sola vez por receta.
- Costo del producto = suma de `cantidad × costo actual del insumo`. Margen sobre el precio de venta, con `Prisma.Decimal` y redondeo a 2 decimales (ADR-004).
- Cada producto tiene su margen mínimo (`minMarginPercent`); la cuenta tiene un margen mínimo por defecto (`defaultMinMarginPercent`, 30 %).

### Alta de insumo desde la receta ("+ Crear nuevo insumo") · *Disponible*

Mientras se arma una receta en `/productos/nuevo` o `/productos/:id`, la última opción del selector de insumos (`+ Crear nuevo insumo`) abre un modal secundario (nombre, unidad y costo) y deja el insumo elegido sin abandonar la pantalla ni perder los cambios de la receta. Los insumos que ya forman parte de la receta figuran marcados como "Ya en la receta" y no pueden volver a elegirse.

---

## 4. Proveedores y presentaciones

### El problema

1. El comercio llama a la materia prima de una forma interna (*Harina 000*).
2. Cada proveedor la factura con su propio código y descripción (`MC-990 — HARINA TRIGO TIPO 000 50KG`).
3. El proveedor vende por **bulto cerrado** (bolsa de 50 kg), pero la receta costea por **unidad base** (kg).

### La solución: presentaciones de proveedor (`SupplierIngredient`) · *Disponible*

El insumo (`Ingredient`) se desacopla de la compra física mediante una **presentación**: la forma en que un proveedor vende ese insumo.

| Campo | Qué es |
|---|---|
| `packageSize` | Cantidad de unidades base que trae el bulto (ej. `50`). |
| `packageUnit` | Unidad del bulto. **Debe coincidir con la unidad del insumo** (`kg`, `l` o `u`); si no coincide, la API responde 400. |
| `packagePrice` | Precio del bulto cerrado. |
| `isDefault` | Marca la presentación **predeterminada** del insumo. |
| `supplierCode` | Código de artículo del proveedor. Opcional; único por proveedor. |
| `rawDescription` | Descripción del artículo tal como viene en la lista del proveedor. Opcional. |
| `pendingPackagePrice`, `isQuarantined`, `quarantinedAt`, `quarantineReason` | Estado de cuarentena (§5.4). |

Costo unitario de una presentación:

```
costo unitario = packagePrice / packageSize     (2 decimales, redondeo ROUND_HALF_UP)
```

Ejemplo: bolsa de 25 kg a $18.406,25 → $736,25 por kg.

### Reglas vigentes

- **Costo vigente del insumo = costo unitario de la presentación predeterminada.** El administrador elige a mano qué presentación es la predeterminada (la estrella **Usar como predeterminada** en la ficha del insumo o en la del proveedor, o **Ya le compro a este proveedor** en Impacto en el margen, siempre con confirmación). Al cambiarla, el costo del insumo pasa a ser el de la nueva presentación y se recalculan las recetas en cascada (§6). La justificación y el comportamiento ante ediciones manuales están formalizados en **ADR-005** (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`). El sistema **no** toma automáticamente el proveedor más barato: el mínimo entre proveedores es información para decidir (§7), no una regla de costo.
- **Costo manual con presentación predeterminada (ADR-011, reemplaza la regla anterior de ADR-005):** si el administrador cambia a mano el costo de un insumo y no coincide con el costo unitario de su presentación predeterminada, MargenX le pregunta qué hacer antes de guardar: **actualizar el precio de esa presentación** (el bulto pasa a dar el costo nuevo; con un bulto de tamaño con decimales, el costo puede quedar unos centavos distinto, porque el precio del bulto se redondea al centavo) o **dejar de usarla como predeterminada** (el insumo queda con el costo manual y sin presentación predeterminada hasta que elija otra). Si cancela, no se guarda nada.
- **Unidad de medida fija cuando el insumo está en uso:** No se permite modificar la unidad de medida (`kg`, `l`, `u`) de un insumo que forme parte de al menos una receta o tenga al menos una presentación de proveedor asociada (la API responde `409 Conflict` y la UI deshabilita la selección explicando el motivo). El nombre y el costo continúan siendo editables.
- **Una sola presentación por par proveedor-insumo.** El modelo no admite, por ejemplo, un pack de 10 × 1 kg y una bolsa de 50 kg del mismo mayorista para el mismo insumo (restricción `@@unique([supplierId, ingredientId])`).
- Asociar una presentación a un par que ya existe la actualiza (upsert), no la duplica.
- Borrar un proveedor borra sus presentaciones; el costo actual de los insumos no cambia.
- **Quitar una presentación** (`DELETE /api/suppliers/:id/ingredients/:ingredientId`): si es la predeterminada y el insumo tiene otras, la API responde 409 y pide marcar otra como predeterminada primero; si es la única, se borra y el costo actual del insumo no cambia (ADR-005 §1 y §4).
- Todas las operaciones de proveedores son solo para ADMIN.

### Ejemplo: un insumo, cuatro proveedores

| Proveedor | Código | Bulto | Precio del bulto | Costo por kg | Predeterminado |
|---|---|---|---:|---:|:---:|
| Molino Cañuelas | `MC-990` | 50 kg | $45.000 | $900 | ✅ |
| Distribuidora San Cayetano | `ART-012` | 25 kg | $23.000 | $920 | |
| Mayorista Makro | `MK-PACK-10` | 10 kg | $9.500 | $950 | |
| Distribuidora del Centro | `5521` | 50 kg | $44.000 | $880 | |

El costo de la *Harina 000* en las recetas es **$900/kg**, el de la presentación predeterminada, aunque Distribuidora del Centro sea más barata. Si el administrador marca a Distribuidora del Centro como predeterminada, el costo pasa a $880/kg y se recalculan todos los productos que usan harina.

La receta solo conoce el insumo, la cantidad y el costo actual. Quién vendió la harina, en qué bulto y con qué código queda aislado en las presentaciones.

### Código de artículo del proveedor

- La ingesta por correo (§5) identifica cada fila de la lista por su `supplierCode`. Sin código cargado, la presentación no se actualiza sola.
- El alta de presentaciones desde la app acepta `supplierCode` y `rawDescription`; si el código no se completa, la asociación se conserva y el backend avisa explícitamente que ese insumo no recibirá precios por ingesta hasta que se complete el mapping.
- **Bandeja de códigos no mapeados** · *Propuesta*: guardar los códigos recibidos sin vínculo para que el administrador los asocie a un insumo ("aprender una sola vez"). Hoy esos códigos se descartan y solo se informan en el resumen por correo.

---

## 5. Ingesta automática de listas de precios por correo

### 5.1. El problema: la polución del catálogo

Un mayorista manda su catálogo completo (miles de artículos). Si el sistema lo importara a ciegas, la base se llenaría de insumos que el comercio no usa. Por eso rige la **regla de descarte estricto**:

> La lista de un proveedor **nunca** crea insumos. **Solo** actualiza precios de presentaciones cuyo `supplierCode` ya está vinculado en la cuenta.

### 5.2. Canal de entrada · *Disponible*

El canal de ingesta desatendida y su filtro de descarte están formalizados en **ADR-005** §3 (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`).

```
Proveedor ──(email o WhatsApp)──> Dueño del comercio
                                       │ reenvía la lista
                                       ▼
                       precios-<slug>@margenx.tech
                                       │ Cloudflare Email Routing (catch-all)
                                       ▼
                          Casilla central (IMAP)
                                       │
                                       ▼
          n8n: extrae el slug y el adjunto, lee CSV/XLSX/XLS, normaliza columnas
                                       │ POST /api/webhooks/supplier-prices
                                       ▼            (cabecera x-margenx-webhook-secret)
          Backend: valida, filtra, aplica cuarentena y recalcula (§5.3)
                                       │ respuesta con el resultado
                                       ▼
          n8n: correo de resumen al dueño (Brevo)
```

- **Dirección de ingesta:** `precios-<slug>@margenx.tech`, donde `slug` es el identificador único de la cuenta (`Account.slug`). Es el formato oficial. El flujo de n8n también acepta `precios.<slug>@` y `precios+<slug>@`.
- No hay una casilla real por comercio: la regla catch-all de Cloudflare envía todo `*@margenx.tech` a una casilla central, y n8n identifica la cuenta por el slug del destinatario.
- **Se ignora el remitente (`From:`)**: el correo lo reenvía el dueño, no el proveedor. El proveedor se identifica de forma implícita por el `supplierCode` de cada fila.
- **WhatsApp:** el dueño comparte el archivo recibido por WhatsApp por correo a su dirección de ingesta. No se usa la API de WhatsApp de Meta por su costo por conversación.
- Columnas reconocidas, formatos de número, límites (más de 5.000 filas se envían en varios lotes), reintentos y manejo de errores del lado de n8n: ver `infra/n8n/README.md`.
- n8n nunca escribe directamente en la base de datos: todo cambio pasa por la API (ADR-003).

### 5.3. Procesamiento en el backend · *Disponible*

Contrato:

```typescript
POST /api/webhooks/supplier-prices
// Cabecera: x-margenx-webhook-secret (comparación en tiempo constante; si falta o no coincide, 401)
{
  accountSlug: string,                        // mínimo 2 caracteres
  items: Array<{                              // entre 1 y 5.000 por solicitud
    code: string,
    description?: string,
    price: number                             // precio del bulto, mayor a cero
  }>
}
// 200 OK | 400 payload inválido | 401 no autorizado | 404 slug inexistente o cuenta inactiva
// 413 cuerpo mayor a 5 MB (código PAYLOAD_TOO_LARGE): n8n debe dividir la lista en lotes más chicos
```

El límite de 5 MB es propio de esta ruta; el resto de la API acepta hasta 256 KB (`backend/src/index.ts`, detalle en `docs/api.md`).

Reglas, en orden:

1. **Cuenta:** el slug debe corresponder a una cuenta activa; si no, 404.
2. **Duplicados en el lote:** si un código aparece más de una vez, vale la última fila y se cuenta como duplicado.
3. **Búsqueda:** cada código se busca entre las presentaciones de la cuenta.
4. **Descartes** (no modifican nada y se informan con su motivo):
   - `NOT_FOUND`: el código no está vinculado en la cuenta;
   - `INACTIVE_SUPPLIER`: el código solo existe en proveedores inactivos;
   - `AMBIGUOUS`: el mismo código está vinculado en más de un proveedor activo.
5. **Sin cambios:** si el precio es igual al vigente, no se modifica nada (y si la presentación estaba en cuarentena, sale de ella).
6. **Cuarentena:** si corresponde (§5.4), el precio nuevo queda retenido y el vigente no cambia.
7. **Actualización:** se guarda el nuevo precio del bulto. Si la presentación es la **predeterminada**, se actualiza el costo del insumo y se recalculan en cascada sus productos (§6). Si no lo es, solo cambia el precio de esa presentación.

Todo el lote se procesa en una única transacción. La respuesta informa recibidos, actualizados, sin cambios, en cuarentena, duplicados y descartados, hasta 100 códigos descartados con su motivo, el correo del administrador de la cuenta y los productos que cruzaron su margen mínimo. Con esa respuesta n8n arma el resumen al dueño.

### 5.4. Cuarentena de precios anómalos · *Disponible*

Un precio queda **retenido** (no se aplica) bajo las reglas formalizadas en **ADR-005** (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`):

| Motivo (`quarantineReason`) | Condición |
|---|---|
| `VARIACION_MAYOR_50_POR_CIENTO` | El costo unitario nuevo varía más de un 50 %, en más o en menos, respecto del vigente. |
| `COSTO_UNITARIO_INSUFICIENTE` | El costo unitario nuevo es menor o igual a $0,01, o no se puede calcular. |

- El precio retenido se guarda en `pendingPackagePrice`; el vigente sigue en uso.
- El administrador resuelve la cuarentena en **`/proveedores/cuarentena`**:
  - **Liberar** aplica el precio retenido; si la presentación es la predeterminada, actualiza el costo del insumo, recalcula en cascada y, si algún producto cruza su margen mínimo, dispara la alerta (§6).
  - **Rechazar** descarta el precio retenido y conserva el vigente. Hoy no avisa a nadie (ADR-005).
- Si una lista posterior trae otra vez el precio vigente, la presentación sale de la cuarentena.

---

## 6. Recálculo en cascada y alertas de margen

### Recálculo · *Disponible*

Cuando cambia el costo de un insumo (edición manual, cambio de presentación predeterminada, liberación de cuarentena o ingesta), en una sola transacción se:

1. actualiza el costo del insumo;
2. registra el cambio en el historial de precios (`PriceHistory`);
3. recalculan costo y margen de todos los productos que lo usan;
4. detectan los productos que **cruzaron** su margen mínimo.

- **Edición individual:** si el costo no cambió (`previousCost.equals(nextCost)`), no se abre la transacción ni se recalcula nada (guarda Zero-Variation).
- **Ingesta en lote (`applyBatchIngredientCostChanges`):** cuando una lista modifica múltiples materias primas a la vez, se buscan todos los productos afectados en una sola consulta (`findMany`) y cada producto se recalcula **una sola vez**, consolidando los nuevos costos de todos sus insumos antes de persistir. Si un producto comparte dos o más insumos actualizados, su margen se evalúa con el conjunto completo y genera a lo sumo una alerta si cruza el umbral mínimo.

### Alertas

- Un producto genera alerta **solo cuando cruza** el umbral: pasa de un margen mayor o igual al mínimo a uno menor. Un producto que ya estaba por debajo no vuelve a alertar.
- **Correo al dueño** · *Disponible*: ante la edición manual del costo, el alta o cambio de la presentación predeterminada y la liberación de un precio en cuarentena, el backend envía el evento `margin.alert.triggered` a n8n, que manda el correo vía Brevo. En la ingesta por correo, los productos críticos van dentro del resumen.
- **Indicador visual** · *Disponible*: el semáforo de margen en el panel y en los productos.
- **Otros canales** · *Propuesta*: notificación dentro de la app, bot de Telegram y notificaciones push de la PWA. Todos deben ser de costo $0.

### Glosario unificado de estados de rentabilidad · *Disponible*

Todo el sistema (panel principal, histograma, catálogo de productos, ficha técnica, barra móvil, simulador y reportes) comparte una única fuente de verdad (`HEALTH_BUCKET_META` en `frontend/src/lib/healthBucket.ts`) para denominar cada estado de rentabilidad:

| Clave técnica | Nombre oficial | Condición financiera |
|---|---|---|
| `draft` | **Borrador** | Productos sin ingredientes en su receta (`ingredients.length === 0`). |
| `loss` | **Pérdida** | Productos con receta y margen porcentual `< 0 %` (venta a pérdida). |
| `risk` | **En riesgo** | Productos con receta, margen `>= 0 %` y menor al `minMarginPercent` **propio** de ese producto. |
| `target` | **En objetivo** | Productos con receta, margen `>= minMarginPercent` propio y `<= 60 %`. |
| `surplus` | **Superávit** | Productos con receta, margen `>= minMarginPercent` propio y `> 60 %`. |

### Métricas del panel y margen promedio (`/api/dashboard/metrics`) · *Disponible*

El panel principal calcula la salud de **todo el catálogo** de la cuenta en el servidor (sin depender de la paginación de `/api/products`), siempre acotado por `accountId` y exclusivo para el rol `ADMIN`:

- **Distribución en cinco buckets:**
  - **Borrador (`draftCount`):** productos sin ingredientes en su receta.
  - **Pérdida (`lossCount`):** con receta y margen `< 0 %`.
  - **En riesgo (`riskCount`):** con receta, margen `>= 0 %` y menor al `minMarginPercent` **propio** de ese producto.
  - **En objetivo (`targetCount`):** con receta, margen `>= minMarginPercent` propio y `<= 60 %`.
  - **Superávit (`surplusCount`):** con receta, margen `>= minMarginPercent` propio y `> 60 %`.
- **Margen promedio robusto (`averageMarginPercent`):** se adopta la **mediana** del `marginPercent` de los productos activos (excluyendo borradores), calculada con `Prisma.Decimal` (`ROUND_HALF_UP` a 2 decimales).
  - *Por qué mediana y no promedio simple ni margen ponderado:* un precio mal cargado (por ejemplo, `$13` con costo `$3.854`, equivalente a `-29.546 %`) distorsiona un promedio simple; y como MargenX no registra volumen de ventas (ADR-004 / fuera de alcance POS), un margen ponderado por `salePrice` unitario sigue quedando dominado por una pérdida alta en comercios con pocos productos o precios unitarios bajos (como *Química GyJ*). La mediana mantiene un punto de quiebre del 50 % independientemente del tamaño del catálogo.
- **En el panel:** las tarjetas y el histograma muestran estos valores sin recalcularlos en el navegador, así que las columnas más los borradores suman el total del catálogo, el mismo que indica "Ver catálogo completo". Los rótulos del histograma aclaran que cada producto se compara con su propio mínimo. La tarjeta del margen se titula **Margen mediano** (el campo de la API sigue siendo `averageMarginPercent`), se pinta según su signo (rojo si es negativo, verde si es positivo) y explica la mediana: "La mitad de tus productos gana más que esto y la mitad menos". El reporte semanal usa el mismo rótulo. Al tocar una columna, la grilla muestra esos productos de todo el catálogo con la misma regla y con la misma denominación de estado del glosario unificado, de a 20 con el paginador. Detalle para el usuario: `docs/manual-usuario/06-panel.md`.

### Reporte semanal de márgenes · *Disponible*

El backend entrega los datos del reporte semanal mediante `/api/internal/reports` (para n8n) y `/api/reports` (para ADMIN desde la app). Incluye los indicadores del catálogo con los mismos buckets y mediana del panel, productos debajo del mínimo con precio sugerido, cambios de costo, cuarentena, oportunidades de ahorro y costos desactualizados. La descarga `GET /api/reports/weekly.pdf` delega la generación del PDF al webhook satélite de n8n. El envío por correo · *Disponible*: los lunes a las 08:00 (hora de Argentina), n8n manda al Administrador de cada cuenta activa el reporte en PDF, en este orden: "Para revisar" (productos debajo de su margen mínimo con el precio sugerido, precios en cuarentena y costos sin actualizar), salud del catálogo con los nombres de estado de esta sección, cambios de costo de la semana y oportunidades de ahorro. Los montos van en formato es-AR. Una cuenta sin correo de Administrador no recibe nada (ADR-009, `infra/n8n/README.md`). La descarga desde la app · *Disponible*: solo el ADMIN ve **Descargar reporte (PDF)** en el panel y **Descargar el último reporte** en Perfil, donde el reporte figura como "Activo · lunes 08:00". El archivo se llama `margenx-reporte-AAAA-MM-DD.pdf` y no se guarda en el service worker; si el generador no responde (503), la app avisa y el botón queda disponible para reintentar. Detalle para el usuario: `docs/manual-usuario/08-reporte-semanal.md`.

---

## 7. Compras inteligentes (Smart Purchasing, RF-15) · *Disponible*

Compras sugeridas mide el **impacto en el margen** de cambiar el proveedor de un insumo (ADR-010). Sin stock no hay cantidades reales de consumo, por lo que la reposición con cantidades queda para la Fase 2 y `POST /api/purchasing/order-preview` pasa a estado **deprecado** (se conserva en la v1.0.0 hasta que se reutilice con stock o se retire en la v1.1).

- **Impacto en el margen por insumo (`GET /api/purchasing/margin-impact` · *Disponible*, solo `ADMIN`):**
  - **Alternativa evaluada:** para cada insumo, toma la presentación elegible más barata (proveedor activo, no en cuarentena y no predeterminada), usando los mismos desempates que `/api/purchasing/suggestions`.
  - **Base de comparación:** compara contra el **costo vigente del insumo (`Ingredient.currentCost`)**, no contra el costo de la presentación predeterminada (si el costo se editó a mano, la diferencia parte de ese valor manual). Solo entra un insumo si el costo unitario de su alternativa es menor a su `currentCost`.
  - **Un cambio por vez:** proyecta cada producto con receta (excluye borradores) cambiando solo ese insumo y manteniendo los demás con su costo vigente. Informa el costo de receta actual y proyectado, el margen porcentual antes y después, y la transición de estado de salud (`classifyProductHealthBucket`).
  - **Priorización y resumen:** ordena primero los insumos que sacan más productos de **Pérdida** o **En riesgo** (`loss`/`risk` → `target`/`surplus`), luego por mayor suba de margen porcentual. El resumen general cuenta productos **distintos** afectados y rescatados de riesgo/pérdida (un producto compartido por dos insumos cuenta una sola vez).
  - **Paridad exacta:** calcula con `Prisma.Decimal` y redondeo `ROUND_HALF_UP` por renglón, igual que el recálculo en cascada real al confirmar el cambio de proveedor.
- **Proyección puntual (`GET /api/purchasing/margin-impact/:ingredientId?supplierIngredientId=...` · *Disponible*, solo `ADMIN`):** calcula el mismo impacto sobre una presentación específica para mostrarlo antes de confirmar *"Ya le compro a este proveedor"*. Responde `404` si el insumo o la presentación no son de la cuenta o no se corresponden, y `422` si está en cuarentena, su proveedor está inactivo o ya es la predeterminada.
- **Comparativa de ahorro (`GET /api/purchasing/suggestions` · *Disponible*):** compara las presentaciones elegibles contra la predeterminada activa e informa aparte las excluidas por cuarentena.
- **Pantalla "Impacto en el margen" (`/compras` · *Disponible*, solo `ADMIN`):** se llama así en el título; en los menús el texto visible es **Impacto** y el nombre completo queda para el lector de pantalla y como texto de ayuda. En la barra superior, entre 768 y 1023 px, los enlaces muestran solo el ícono. La ruta no cambia. Arriba, el resumen: insumos con alternativa, productos que mejoran y cuántos salen de **En riesgo** o **Pérdida**. Debajo, una tarjeta por insumo en el orden que devuelve la API, con el proveedor actual contra la alternativa, la diferencia por unidad y cada producto que lo usa con el margen antes y después y su estado (los nombres de estado de §6). El botón **Ya le compro a este proveedor** de cada tarjeta nombra el insumo y el proveedor para el lector de pantalla y abre una confirmación con la proyección puntual (productos y margen nuevo). Al confirmar, la presentación pasa a ser la predeterminada con el mismo alta que usan Proveedores e Insumos (`POST /api/suppliers/:id/ingredients` con `isDefault: true`, §4) y la app avisa *"Listo: {n} productos recalculados"*. Como `margin-impact` identifica la presentación solo por su id, la app toma el proveedor y los datos del bulto de `GET /api/ingredients/:id` antes del alta. La pantalla no tiene calculadora de bultos, pedido semanal ni ahorro por bulto, y no llama a `order-preview`. Si hay precios en cuarentena, un aviso enlaza a **Proveedores › Cuarentena**. Detalle para el usuario: `docs/manual-usuario/07-compras-sugeridas.md`.

La consulta **no cambia** el costo vigente: el administrador decide si confirma el cambio de proveedor predeterminado (§4). Así el costo de las recetas solo cambia por una decisión explícita y queda registrado en el historial (ADR-005).

---

## 8. Roles y visibilidad

MargenX tiene dos roles por cuenta, gestionados con Clerk (ADR-001). El control se aplica en el backend y se repite en la interfaz como segunda capa.

| | ADMIN (dueño) | COLLABORATOR (salón o mostrador) |
|---|---|---|
| Productos: nombre y precio de venta | Ve y edita | **Ve** |
| Costos de insumos y recetas, márgenes, umbrales | Ve y edita | **No ve**: la API los quita de las respuestas |
| Insumos (`/insumos`), proveedores y cuarentena | Accede | **No accede** (la ruta lo redirige; la API de proveedores responde 403) |
| Métricas del panel | Ve | **No ve** |
| Altas, ediciones y bajas | Puede | **No puede**: la API rechaza toda mutación |
| Equipo: invitar colaboradores y darlos de baja (Perfil) | Puede | **No accede** (la sección no se muestra; la API responde 403) |

- Implementación: `backend/src/middlewares/rbac.ts` (`requireRole`, `blockCollaboratorMutations`, `sanitizeFinancialData`) y, en la interfaz, `AdminOnlyRoute` y `useUserRole`.
- El colaborador **no edita costos**. Este documento reemplaza en ese punto al RF-12 y al RNF-09 de `docs/propuesta-proyecto.md`, que decían que el colaborador podía editar costos y que no veía el precio de venta.
- **Receta para el colaborador** · *Disponible*: ve qué insumos lleva cada producto, pero no las cantidades, los costos ni los subtotales, y no tiene acciones de edición. La API quita `quantity` de las respuestas para este rol (`FINANCIAL_FIELDS` en `rbac.ts`). En el perfil no ve el margen objetivo global ni la configuración de alertas. Detalle para el usuario: `docs/manual-usuario/03-colaborador.md`.
- **Solo productos a la venta para el colaborador** · *Disponible*: el colaborador ve en el panel y en Productos únicamente los productos con receta y precio de venta mayor que 0. Los borradores, que pueden tener precio $0, no le aparecen y su ficha responde 404. El ADMIN los sigue viendo.
- **Vista de precios vigentes para el colaborador** · *Propuesta*: una vista simple con los precios de venta y un indicador de "modificados recientemente", para actualizar la pizarra o la caja.
- **Invitar y dar de baja colaboradores** · *Disponible*: el ADMIN invita por mail desde Perfil (el mail lo manda MargenX, en español y con su marca), ve las invitaciones pendientes y los colaboradores activos, puede copiar el enlace de una invitación para mandarlo por otro medio, y puede revocar o dar de baja con confirmación. El invitado entra siempre como `COLLABORATOR` de la cuenta que lo invitó: la cuenta y el rol los fija el backend, nunca el cliente. Invitar a otro ADMIN y cambiar roles siguen en la Fase 2 (ADR-007). Decisión técnica: ADR-008. Detalle para el usuario: `docs/manual-usuario/05-colaboradores.md`.

---

## 9. Modelo de datos (resumen)

La fuente de verdad es `backend/prisma/schema.prisma`. Esta sección resume solo las reglas de dominio.

| Entidad | Rol | Reglas clave |
|---|---|---|
| `Account` | Comercio (tenant) | `slug` único (dirección de ingesta); `defaultMinMarginPercent` (30 % por defecto); `isActive`. |
| `User` | Persona de la cuenta | `role` `ADMIN` o `COLLABORATOR`; `authProviderId` vincula con Clerk. |
| `Ingredient` | Insumo del catálogo interno | Nombre único por cuenta con índice funcional case-insensitive (`lower(name)`) en la base; `unit` `kg`, `l` o `u`; `currentCost` = costo vigente. |
| `Supplier` | Proveedor de la cuenta | Nombre único por cuenta con índice funcional case-insensitive (`lower(name)`) en la base; `isActive`; contacto opcional (`contactPhone`, `email`, `address`). |
| `SupplierIngredient` | Presentación de un proveedor para un insumo | Única por par proveedor-insumo; `supplierCode` opcional y único por proveedor; ver §4. |
| `PriceHistory` | Historial de cambios de costo de un insumo | Costo anterior, costo nuevo y fecha. |
| `Product` | Producto terminado | Nombre único por cuenta con índice funcional case-insensitive (`lower(name)`) en la base; `salePrice`, `minMarginPercent`; `cost`, `marginAmount` y `marginPercent` calculados (`marginPercent` admite valores negativos). La regla de negocio exige `salePrice > 0` cuando el producto tiene receta; un producto sin receta puede quedar en borrador con `salePrice = 0` para cálculo transitorio de margen. |
| `ProductIngredient` | Línea de receta | Única por par producto-insumo; `quantity` en la unidad del insumo. |
| `AccountFeature` | Excepción del control de módulos | Única por par cuenta-módulo; `enabled` manda sobre lo que trae el plan (§13). |
| `CashShift` | Turno de caja | Un solo turno `OPEN` por cuenta; monto inicial y, al cierre, esperado y contado por medio de pago (§13). |
| `Sale` | Venta con ticket no fiscal | `ticketNumber` correlativo y único por cuenta; `COMPLETED` o `VOIDED` (se anula, no se borra) (§13). |
| `SaleItem` | Renglón de la venta | Precio, costo y margen del momento de la venta, y copia del nombre del producto (§13). |

**Aislamiento entre cuentas:** toda consulta se filtra por el `accountId` del usuario autenticado, que sale del JWT de Clerk y nunca del cliente (`docs/definition-of-done.md` §6). Los proveedores y las presentaciones heredan la cuenta de su insumo.

---

## 10. Integridad referencial: cascada en la base y 409 en la API

En la base, la relación receta → insumo (`ProductIngredient → Ingredient`) se declara con **`onDelete: Cascade`**, igual que el resto de las relaciones que cuelgan de la cuenta.

**Por qué no `Restrict`:** al borrar una cuenta, PostgreSQL no garantiza el orden entre ramas hermanas de la cascada. Con `Restrict`, el borrado de `Ingredient` podría ejecutarse antes que el de los `ProductIngredient` y bloquear la eliminación de la cuenta.

```
Account (CASCADE)
  ├── Ingredient (CASCADE)   ← se bloquearía con Restrict hacia ProductIngredient
  └── Product (CASCADE)
       └── ProductIngredient (CASCADE)
```

**Protección en la API:** `DELETE /api/ingredients/:id` revisa antes si el insumo está en alguna receta. Si lo está, responde **409 Conflict** con la lista de productos afectados (`productsAffected`) y no borra nada. Así el usuario no pierde recetas por accidente y la base conserva la capacidad de purgar cuentas completas.

---

## 11. Estado de implementación

La entrega final de la cursada es el **05/12/2026**. Qué entra antes de esa fecha y qué queda para la Fase 2 está en la tabla única de alcance del SAD (`docs/Arquitectura-Software-(SAD).md` §1, "Alcance de la cursada y Fase 2"). Esta tabla dice el estado de cada capacidad en `develop`.

| Capacidad | Estado |
|---|---|
| Carga manual de insumos (camino A) | Disponible |
| Plantilla oficial CSV/Excel (camino B) | Disponible |
| Starter pack por rubro (camino C) | Propuesta |
| Productos en borrador y recetas | Disponible |
| Alta de insumo desde la receta | Disponible |
| Proveedores y presentaciones desde la ficha del insumo, proveedor predeterminado | Disponible |
| Vista de proveedores (`/proveedores`): lista con cantidad de insumos y de precios en cuarentena, alta, edición, desactivación y baja con confirmación | Disponible |
| Detalle de proveedor (`/proveedores/:id`) con sus presentaciones | Disponible |
| Código de artículo cargado desde la app | Disponible |
| Bandeja de códigos no mapeados | Propuesta |
| Ingesta por correo, filtro de descarte y resumen | Disponible |
| Cuarentena de precios y bandeja `/proveedores/cuarentena` | Disponible |
| Recálculo en cascada y alerta por correo al cruzar el margen mínimo | Disponible |
| Métricas del panel: 5 buckets sobre todo el catálogo y margen promedio robusto (mediana) | Disponible |
| Notificación en la app, Telegram y push | Propuesta |
| Compras inteligentes: impacto en el margen por insumo (API: `margin-impact` y detalle; `order-preview` deprecado) | Disponible |
| Compras inteligentes: vista de impacto en el margen en `/compras` | Disponible |
| Reporte semanal de márgenes (API de datos y descarga PDF desde el panel y Perfil) | Disponible |
| Workflow automático semanal de reporte PDF por correo (n8n) | Disponible |
| Receta sin cantidades ni costos para el colaborador | Disponible |
| Vista de precios vigentes para el colaborador | Propuesta |
| Invitar y dar de baja colaboradores desde Perfil | Disponible |
| Control de módulos por plan y por cuenta, y módulos de la cuenta en `GET /api/auth/me` | Disponible |
| Módulo de ventas: modelo de ventas y caja, y ventas de prueba en la cuenta Demo | Disponible (solo la cuenta Demo de staging tiene el módulo) |
| Venta rápida con ticket no fiscal | Planificado |
| Turnos y cierre de caja | Planificado |
| Ganancia real en el panel y en el reporte semanal | Planificado |
| Qué módulos trae cada plan (Basic, Pro y Business) | Propuesta (v1.2) |
| Stock de insumos, compras con pedido y reposición con cantidades | Fase 2 (v1.1) |
| Facturación electrónica de ARCA | Fase 2 (v1.3) |

## 12. Decisiones pendientes

1. ¿Se permiten varias presentaciones del mismo proveedor para un insumo (por ejemplo, pack chico y bolsa)? Hoy el modelo lo impide.
2. ¿Rechazar un precio en cuarentena debe avisar al dueño? Hoy no avisa.
3. ~~¿Qué pasa al quitar la presentación predeterminada de un insumo?~~ **Resuelta** por ADR-005 §1 y §4: con otras presentaciones, la API responde 409 y pide elegir otra predeterminada; si es la única, se borra (§4, "Reglas vigentes", y `docs/api.md` §6).
4. ¿Entra el camino C (starter packs) en el alcance del proyecto?

---

## 13. Ventas, caja y ganancia real (módulo opcional)

**Fuente:** ADR-010. **Estado:** el control de módulos, el modelo de datos, la venta con ticket, la caja por turnos y la ganancia real están *Disponibles*. En la v1.0.0, solo la cuenta Demo tiene el módulo: el 28/11/2026 se decide si se muestra en producción.

### El problema

MargenX calcula el margen **teórico** de cada producto (precio contra costo de la receta), pero no sabe cuánto se vendió ni cuánto se ganó de verdad. Los comercios piloto anotan las ventas a mano.

### Control de módulos por plan y por cuenta · *Disponible*

- Un módulo está prendido para una cuenta si tiene una **excepción** que lo prende (`AccountFeature`), o si no tiene excepción y su **plan** lo trae. La excepción manda en los dos sentidos.
- Hoy ningún plan trae módulos. Qué plan incluye las ventas se decide en la v1.2, con los planes pagos: es una *propuesta* abierta. Mientras tanto, las excepciones se cargan con el seed de la Demo (`docs/runbook-operacion.md`).
- Con el módulo apagado, las rutas `/api/sales` y `/api/cash-shifts` responden **404**, como si no existieran.
- `GET /api/auth/me` informa los módulos en `user.features` (`docs/api.md` §3). El frontend los lee con el hook `useFeatures`: el menú "Ventas" y las pantallas `/ventas` solo existen con el módulo prendido (si no, la página 404).

### Reglas del módulo de ventas

- **Ticket no fiscal:** número correlativo por cuenta y la leyenda **"Comprobante no válido como factura"**. No reemplaza a la factura.
- **Medio de pago:** efectivo, transferencia o Mercado Pago, **solo registrado**. MargenX no cobra ni se conecta con ningún medio de pago.
- **Precio, costo y margen congelados:** cada renglón guarda los valores del momento de la venta. Si mañana sube la harina, la ganancia de las ventas de ayer no cambia. El margen es sobre el precio de venta (ADR-004).
- **Caja por turnos:** un solo turno abierto por cuenta. Para vender hace falta un turno abierto. ADMIN y COLLABORATOR abren y cierran el turno. Al cierre se comparan lo esperado y lo contado por medio de pago.
- **Anulación:** una venta no se borra. Se anula, con su motivo, y queda en el historial. Solo mientras su turno siga abierto: el arqueo de un turno cerrado no cambia nunca.
- **Baja de un colaborador** (ADR-008): sus ventas y turnos quedan, sin usuario.
- **Colaborador:** vende y ve los montos de venta y el arqueo de su turno, pero **nunca costos ni márgenes** (§8).
- **Ganancia real:** ventas menos costo congelado, y el margen ponderado por lo vendido (ganancia / ventas), sin las ventas anuladas.

### Venta rápida y ticket · *Disponible*

- **Quién vende:** ADMIN y COLLABORATOR, desde `/ventas/nueva`: productos con búsqueda, cantidades con + y −, total en es-AR, medio de pago y **Cobrar**. Solo se ofrecen y se aceptan productos con receta y precio mayor a $0 (la API rechaza un borrador o un precio en $0 con 422).
- **Qué guarda:** en una transacción, el número de ticket siguiente de la cuenta y, en cada renglón, el precio y el costo vigentes del producto y su margen (`Prisma.Decimal`, `ROUND_HALF_UP`). El precio y el costo salen siempre de la base, nunca del navegador. Sin turno abierto, responde 409 y la pantalla ofrece abrir el turno.
- **El ticket** (`/ventas/:id/ticket`): comercio, fecha y hora de Argentina, número, ítems, total, medio de pago y la leyenda no fiscal, con el logo de MargenX arriba y la firma "Emitido con MargenX · margenx.tech" al pie (también en el texto de WhatsApp). Se imprime en ticketera de 58 u 80 mm o en A4, se guarda como PDF desde la ventana de impresión del navegador y se comparte por WhatsApp (enlace `wa.me` con el texto del ticket).
- **Historial** (`/ventas`): las ventas del día o todas, paginadas. El ADMIN ve las de la cuenta; el colaborador, solo las suyas, y nunca recibe costos ni márgenes.
- **Anulación:** con motivo, sin borrar, y solo mientras el turno de la venta siga abierto (también para el ADMIN). El ADMIN anula cualquier venta del turno; el colaborador, solo las suyas.
- Contrato: `docs/api.md` §12. Detalle para el usuario: `docs/manual-usuario/09-ventas.md`.

### Caja por turnos · *Disponible*

- **Abrir:** en `/ventas`, con el monto inicial que hay en la caja. ADMIN y COLLABORATOR abren. Un solo turno abierto por cuenta: si ya hay uno, la API responde 409.
- **Turno abierto:** `/ventas` muestra quién lo abrió, desde cuándo, cuántas ventas lleva y cuánto se vendió; `/ventas/nueva`, desde cuándo está abierto. Sin turno, `/ventas/nueva` avisa al entrar y ofrece abrirlo.
- **Cerrar** (`/ventas/turnos/:id/cerrar`): por cada medio de pago se ve lo esperado y se carga lo contado. Lo esperado en efectivo es el monto inicial más las ventas en efectivo; en transferencia y Mercado Pago, solo sus ventas; las anuladas no suman. Transferencia y Mercado Pago vienen precargados con lo esperado y el efectivo se cuenta. La diferencia (contado − esperado) se resalta por medio de pago y en total: **Falta** (negativa), **Sobra** (positiva) o **Justo**, con el rótulo además del color. Cerrar pide confirmación y es definitivo: después no se vende ni se anula en ese turno.
- **Arqueo guardado:** al cierre se guardan lo esperado y lo contado por medio de pago y la diferencia total. Una venta que llega mientras se cierra el turno no queda afuera del arqueo: espera y la API responde que no hay turno abierto.
- **Resumen del cierre** (`/ventas/turnos/:id`): comercio, quién abrió y cerró y cuándo, monto inicial, ventas, anuladas, lo vendido, el arqueo por medio de pago y la diferencia total, con el logo de MargenX. Se imprime en ticketera de 58 u 80 mm o en A4, y enlaza a las ventas del turno (`/ventas?turno=<id>`).
- **Historial de turnos** (`/ventas/turnos`): el más reciente primero, con lo vendido y la diferencia. El ADMIN ve todos; el colaborador, el abierto y los que abrió, cerró o en los que vendió.
- **Historial de ventas:** suma el filtro **Del turno** cuando hay un turno abierto.
- **Colaborador:** ve los montos de venta y el arqueo de su turno; el arqueo no tiene costos ni márgenes.
- **Varios vendedores:** todos los usuarios de la cuenta venden en el único turno abierto, y el arqueo es del turno (la caja), no de cada vendedor. Para un arqueo por persona, cada una abre y cierra su propio turno, uno después del otro.
- **Planificado para la v1.1:** movimientos de caja (gastos y retiros con su motivo, que entran en lo esperado) y el fondo del turno siguiente precargado con lo que quedó. Hasta entonces, un gasto pagado con la caja aparece como faltante en el arqueo.
- **Fase 2:** el mail con el resumen del cierre al dueño (n8n), y el arqueo por cajero o varias cajas abiertas a la vez si los comercios piloto lo piden.

### Ganancia real · *Disponible*

- **Qué es:** lo que se vendió menos lo que costó cada producto el día de la venta (el costo congelado de cada renglón), y el margen ponderado por lo vendido (ganancia / ventas). No reemplaza al margen teórico de cada producto: lo complementa. Sin las ventas anuladas.
- **Solo para el ADMIN** (§8): el colaborador no la ve en el panel ni en la API.
- **Panel:** la tarjeta "Ganancia real" muestra hoy y la semana, con la cantidad de ventas, lo vendido y el margen, y enlaza al detalle. Aparece solo con el módulo de ventas prendido.
- **Detalle** (`/ventas/ganancia`): hoy, la semana (hoy y los 6 días anteriores) o el mes (hoy y los 29 anteriores), en días de Argentina; ventas, costo, ganancia y margen; la comparación de la ganancia con el período anterior; y los 5 productos más vendidos y los 5 que más ganancia dejan.
- **Reporte semanal** (ADR-009): con el módulo prendido, el PDF suma la sección "Ventas de la semana" y el mail, la ganancia real de la semana. Sin el módulo, no aparecen.
- Contrato: `docs/api.md` §11 y §12. Detalle para el usuario: `docs/manual-usuario/09-ventas.md`.

### Fuera del módulo (Fase 2)

Stock de insumos descontado por receta, compras con pedido a proveedores, reposición con cantidades y facturación electrónica de ARCA (ADR-010, SAD §1).
</file>

<file path="CHANGELOG.md">
# Changelog — MargenX

Todos los cambios notables de este proyecto serán documentados en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- **QA / CI:** Pruebas automáticas de accesibilidad con axe (`[RV387-I1]`). `frontend/tests/e2e/accessibility-axe.spec.ts` (`@axe-core/playwright`) corre axe con la sesión de ADMIN sobre la ficha del producto, `/productos/nuevo`, `/insumos`, la carga desde planilla y el panel, en claro y oscuro, a 360 px y en escritorio (20 pruebas). Falla con violaciones `serious` o `critical`; las `moderate` y `minor` se informan en el reporte del job de E2E, y el detalle por pantalla se sube como artefacto `axe-accesibilidad`. Sin exclusiones. Cómo correrlo: `frontend/README.md`; resultado en `docs/qa/reporte-calidad-sprint7.md` §5 (#442).
- **Docs / Scrum:** Hoja de ruta posterior a la cursada en `docs/roadmap.md` (plan del Sprint 7 del 22/11): v1.1 (stock, reposición y permisos granulares), v1.2 (backoffice, planes, período de prueba y borrado de cuenta), lanzamiento en Android como Trusted Web Activity y v1.3 en adelante, con riesgos, dependencias, los requisitos de Play Store verificados en la documentación oficial y el texto de la lámina para la presentación. Milestones v1.2, Lanzamiento Android y v1.3 con sus épicas (#481 a #484). El SAD §1 y la especificación funcional §11 indican la versión de la Fase 2 de cada capacidad (`#451`).
- **Frontend:** `/compras` pasa a ser **Impacto en el margen** (ADR-010): consume `GET /api/purchasing/margin-impact` y muestra el resumen (insumos con alternativa, productos que mejoran y los que salen de En riesgo o Pérdida) y una tarjeta por insumo con el proveedor actual contra la alternativa y el margen antes y después de cada producto. **Ya le compro a este proveedor** nombra insumo y proveedor para el lector de pantalla, abre una confirmación con `GET /api/purchasing/margin-impact/:ingredientId` y avisa cuántos productos se recalcularon. Se quitan la calculadora de bultos, el pedido semanal y el ahorro por bulto (la app deja de llamar a `order-preview`), y el hover de **Ver cuarentena** es legible en modo oscuro (hallazgos RC-16 a RC-19). En la barra superior el enlace muestra **Impacto**, porque a 1280 px el nombre completo se partía en tres líneas; ningún enlace parte su texto, y entre 768 y 1023 px la barra muestra solo íconos para no desbordar. Manual `07-compras-sugeridas.md` reescrito, con capturas a 360 px en claro y oscuro (`docs/manual-usuario/capturas/`), especificación funcional §7 y E2E con datos propios (`#446`).
- **QA:** Medición del tiempo de respuesta con y sin búsqueda en staging (`[RV375-I1]`): con la cuenta Demo (225 insumos y 343 productos), la mediana con búsqueda es de 57,1 ms en `GET /api/ingredients` y de 55,9 ms en `GET /api/products`, unos 3 ms más que sin búsqueda y muy por debajo del umbral de 300 ms, así que no hace falta un índice antes del release. Script `backend/tests/rendimiento/medir-busqueda.js` con su prueba, resultado en `docs/qa/reporte-calidad-sprint7.md` §4 y salida en `docs/qa/evidencias/444/` (#444).
- **Backend:** Endpoints `GET /api/purchasing/margin-impact` y `GET /api/purchasing/margin-impact/:ingredientId` para calcular el impacto proyectado en el margen por insumo al comprar a proveedores alternativos más baratos, con base en `Ingredient.currentCost`, proyección aislada producto por producto, detección de productos que salen de En riesgo o Pérdida y ordenamiento por efectividad (`#445`).

- **CI / Frontend:** Lighthouse CI a 360 px sobre las páginas públicas (`frontend/lighthouserc.json`, job **Lighthouse CI (360 px, no bloquea)**, artefacto `lighthouse-360px`). Las metas de 90 van como advertencia hasta que la medición sea estable. Cómo correrlo: `frontend/README.md` (#398).
- **Backend / Frontend / n8n:** Ganancia real en el módulo de ventas (ADR-010): `GET /api/sales/summary?period=day|week|month`, solo ADMIN, con ventas, costo congelado, ganancia y margen ponderado por lo vendido, sin las anuladas, la comparación con el período anterior y los 5 productos más vendidos y que más ganancia dejan. Tarjeta "Ganancia real" en el panel (hoy y semana) y pantalla `/ventas/ganancia`. El reporte semanal suma la sección "Ventas de la semana" solo si la cuenta tiene el módulo, y el mail, la ganancia real. Colección `MargenX - Ventas API` con el resumen y el 403 del colaborador (`#450`).
- **Backend / Docs:** Documentación interactiva OpenAPI 3.1 en `/api/docs`, JSON de contrato en `/api/docs/openapi.json`, validación con Swagger Parser y consistencia automática entre las rutas de Express y `backend/openapi/openapi.yaml`; CSP separada para Swagger UI sin relajar las demás rutas (`#393`).
- **Backend / Frontend:** Turnos y cierre de caja en el módulo de ventas (ADR-010): `POST /api/cash-shifts/open`, `GET /api/cash-shifts/current`, `POST /api/cash-shifts/:id/close` (arqueo en una transacción: esperado, contado y diferencia por medio de pago, sin las ventas anuladas), `GET /api/cash-shifts` y `GET /api/cash-shifts/:id`. ADMIN y COLLABORATOR abren y cierran; un solo turno abierto por cuenta (409). La venta y la anulación toman un bloqueo compartido sobre el turno, así ninguna venta queda afuera de un arqueo; nadie anula ventas de un turno cerrado (403). Pantallas: apertura e indicador en `/ventas` y `/ventas/nueva`, cierre con la diferencia resaltada, resumen imprimible (58/80 mm y A4), historial de turnos y filtro **Del turno**. E2E de punta a punta (ADMIN y colaborador sin costos), colección `MargenX - Ventas API` con el día de caja completo y manual `09-ventas.md` (`#449`).
- **Backend / Frontend:** Venta rápida con ticket no fiscal en el módulo de ventas (ADR-010): `POST /api/sales` en una transacción con turno abierto (409 si no hay), ticket correlativo por cuenta, y precio, costo y margen congelados en cada renglón; `GET /api/sales` (del día o del turno, paginado), `GET /api/sales/:id` y `POST /api/sales/:id/void` (anulación con motivo, sin borrar); el colaborador nunca recibe costos ni márgenes. Pantallas `/ventas/nueva`, `/ventas/:id/ticket` con el logo de MargenX (imprimir en 58/80 mm o A4, PDF y WhatsApp) y `/ventas`, y menú **Ventas** solo con el módulo prendido. Colección Postman `MargenX - Ventas API` y manual `09-ventas.md` (`#448`).
- **Backend / Frontend:** Base del módulo de ventas con ticket no fiscal, detrás de un control de módulos por plan y por cuenta (ADR-010). El control de módulos (`backend/src/lib/features.ts`) resuelve primero la excepción de la cuenta (tabla `AccountFeature`) y después el plan (`PLAN_FEATURES`); hoy ningún plan trae módulos. Con el módulo apagado, `/api/sales` y `/api/cash-shifts` responden `404`. `GET /api/auth/me` informa los módulos de la cuenta en `user.features`, también al colaborador, y el frontend los lee con el hook `useFeatures`. Modelo de ventas y caja con una migración solo aditiva: `CashShift` (un solo turno abierto por cuenta, con índice parcial único), `Sale` (ticket correlativo por cuenta; se anula y no se borra) y `SaleItem` (precio, costo y margen del momento de la venta). Seed `seed-ventas-demo.ts` con 21 días de ventas y turnos en la cuenta Demo y la excepción `sales` prendida, que se corre con las opciones `ventas` y `ventas-apagar` de `infra/scripts/seed-remoto.sh`. Documentación: ADR-010, SAD 3.2 (fuera de alcance, alcance de la cursada contra la Fase 2 y modelo), especificación funcional 2.3 (§9, §11 y §13 nueva), nota en ADR-004, `docs/api.md` §3 y §12, `docs/runbook-operacion.md` y la colección de Postman de Colaboradores. Pasan a la Fase 2 el stock, las compras con pedido, la facturación de ARCA y el monitor de disponibilidad (`#447`).
- **Docs:** Acta de cierre del Sprint 6 (`docs/retrospectivas/acta-cierre-sprint-6.md`) con el incremento, las métricas del tablero (35 issues, 116 SP), los hitos por rol con su PR y su commit, la Sprint Review del 21/11, el healthcheck de producción y staging, lo que pasa al Sprint 7 y la retrospectiva. Retrospectiva del Sprint 5 en `docs/retrospectivas/acta-cierre-sprint-5.md` §4, con el cumplimiento de los compromisos del Sprint 4. Las dos retrospectivas las validó el equipo el 21/11/2026. En el §5 del acta, la clasificación de los hallazgos I de las revisiones, de H2, de la revisión de usabilidad y del recorrido de cliente, con el mapa de cada ID a su issue del Sprint 7 (`#426` a `#451`), los not planned con su motivo y el cambio de alcance del 22/11 (módulo de ventas detrás de un control de módulos, Compras por impacto en el margen y Fase 2; ADR-010 en `#447`). Reporte de calidad del Sprint 7 (`docs/qa/reporte-calidad-sprint7.md`) con el recorrido de cliente en staging del 21/11 y sus capturas en `docs/qa/evidencias/recorrido-cliente/`. En el SAD §6, el Sprint 6 pasa a completado y lista los retoques visuales, el pie de página, los avisos y la zona segura de iOS, que el tablero tiene en ese sprint (`#396`).
- **Frontend:** Avisos, cambios sin guardar y colaborador redirigido (`#364`). Los avisos flotantes de todas las pantallas usan el hook `useToast` y la constante `TOAST_DURATION_MS`: el error y la advertencia duran 8 s y el éxito y la información 4 s, todos se cierran con la X o deslizándolos, y un aviso nuevo cancela el temporizador del anterior (antes un aviso viejo podía cortar al siguiente, por eso "Error al actualizar" duraba menos). `ToastAlert` anuncia el error y la advertencia con `role="alert"` y el resto con `role="status"`. En Perfil, el error al guardar el margen global ya no se muestra con el aviso verde de éxito. La ficha de insumo en `/insumos` y el diálogo de alta y edición de proveedor piden confirmación al salir de la pantalla o cerrar la pestaña con cambios sin guardar, como ya hacía la ficha de producto (`useUnsavedChangesWarning`, ahora con pruebas propias y dentro de la cobertura). El colaborador que abre una ruta del administrador vuelve a `/productos` con el aviso "Esa pantalla es solo para el administrador", que no se repite al recargar. Pruebas de Vitest, `TC-RBAC-08` en `rbac-security.spec.ts`, `frontend/README.md` y manual en `docs/manual-usuario/02-rutas-y-roles.md` y `03-colaborador.md`, que ahora lista también `/productos/nuevo`, `/proveedores/:id` y `/compras` como bloqueadas.
- **Frontend / Accesibilidad:** Selector único de insumos de receta con navegación por flechas, Escape, roles ARIA, bloqueo de repetidos y alta rápida en alta y edición (`#357`).
- **Frontend:** Descarga a pedido del reporte semanal en PDF, solo para `ADMIN`: botón **Descargar reporte (PDF)** en el panel (visible también en el celular) y enlace **Descargar el último reporte** en Perfil, donde el reporte pasa de "Próximamente" a **Activo · lunes 08:00**. Llama a `GET /api/reports/weekly.pdf` con el token de Clerk, muestra "Generando reporte…" sin permitir un segundo pedido y guarda el archivo con el nombre que manda la API (o `margenx-reporte-AAAA-MM-DD.pdf` con la fecha de Argentina si no llega). Con 503 avisa "No pudimos generar el reporte ahora…" y el botón queda disponible; con 401 o 403 muestra el mensaje de la API. El PDF no se cachea (la API sigue en `NetworkOnly`). Servicio `reportService.ts`, `fetchApiFile` en `api.ts`, hook `useWeeklyReportDownload`, componente `WeeklyReportDownload` y pruebas de Vitest. Manual en `docs/manual-usuario/08-reporte-semanal.md`; especificación funcional §6 y rutas por rol actualizadas (`#392`).
- **Backend:** `GET /api/reports/weekly.pdf` envía `Access-Control-Expose-Headers: Content-Disposition`: la app y la API están en orígenes distintos y, sin esa cabecera, el navegador no deja leer el nombre del archivo. Prueba de la ruta, `docs/api.md` §11 y colección `MargenX - Reportes API` (`#392`).
- **Frontend:** Pantalla de compras sugeridas en `/compras` (solo `ADMIN`: `AdminOnlyRoute`, sin enlace para `COLLABORATOR`). Resumen de insumos con ahorro, al mejor precio, con proveedor único y excluidos por cuarentena (con enlace a la bandeja); lista agrupada por proveedor, en tarjetas en mobile y tabla desde `md`, con costo unitario sugerido contra el actual y ahorro en `$`, `%` y por bulto; **Hacer predeterminada** con confirmación; pedido sugerido con bultos por ítem contra `POST /api/purchasing/order-preview` (subtotal por proveedor, total y ahorro), **Copiar pedido** en texto plano para WhatsApp o mail e **Imprimir** solo la orden. Servicio `purchasingService.ts`, pruebas de Vitest de la pantalla, E2E `purchasing-suggestions.spec.ts` (360 px y escritorio) y `TC-RBAC-07` en `rbac-security.spec.ts`. Manual en `docs/manual-usuario/07-compras-sugeridas.md` y ruta en `docs/manual-usuario/02-rutas-y-roles.md` (`#389`).
- **DevOps / n8n:** Reporte semanal de márgenes en PDF (`infra/n8n/workflows/reporte-semanal.json`). Los lunes a las 08:00 (hora de Argentina) manda a cada cuenta activa de producción el mail "MargenX · Reporte semanal · <comercio>" con el PDF adjunto (`margenx-reporte-AAAA-MM-DD.pdf`), y el webhook `report-pdf` genera el mismo PDF para la descarga desde la app (401 sin secreto). Pide los datos por la red interna a `/api/internal/reports`; una cuenta que falla no frena a las demás y se avisa a Discord sin datos personales. Staging se prueba con un disparador manual, limitado a un slug y a una casilla de prueba. Plantilla compartida con versión A4 (`mxDocumentoA4`), prueba `infra/n8n/tests/reporte-nodos.test.mjs` en CI y ADR-009 (`#391`).
- **DevOps:** Servicio `gotenberg` (HTML a PDF, versión 8.40.0) en `infra/vps/docker-compose.prod.yml`: solo red interna, 512 MB de límite, Chromium que arranca con la primera conversión y se apaga a los 60 s sin uso, sin JavaScript y sin acceso a la red. n8n recibe `GOTENBERG_URL`, `MARGENX_INTERNAL_API_URL` y `MARGENX_INTERNAL_DEV_API_URL` con valores por defecto (`#391`).
- **Frontend:** Edición de nombre y unidad de medida en la ficha del insumo (`/insumos`), con validación reactiva de nombre duplicado (`409 Conflict`) adyacente al campo y diálogo modal de advertencia accesible al cambiar la unidad de un insumo presente en recetas activas (`#354`).
- **Frontend:** Sección "Se usa en" en la ficha del insumo (solo `ADMIN`) con los productos vinculados, cantidades utilizadas y enlaces directos a sus fichas técnicas, consumiendo el endpoint paginado `GET /api/ingredients/:id/products`. El contador muestra el total real y, con más de 100 productos, la lista avisa cuántos se ven. Si la consulta falla, la sección muestra el error con Reintentar en lugar de decir que el insumo no se usa, y cambiar la unidad pide confirmación aunque la lista no haya cargado (`#354`).
- **Frontend:** Ordenamiento del historial de costos con el cambio más reciente primero por defecto y botón interactivo para alternar orden cronológico ascendente y descendente en `PriceHistoryModal` (`#354`).
- **Frontend:** Formateo en estándar argentino (`2.179,13`) para el campo de costo del insumo en la ficha de edición (`#354`).
- **QA:** Pruebas unitarias completas de la sección "Se usa en", edición de nombre/unidad, captura de error 409 y conmutación de orden en el historial de costos (`#354`).
- **Backend:** Servicio `reportService.ts` y endpoints de reporte semanal de márgenes: rutas internas `GET /api/internal/reports/accounts` y `GET /api/internal/reports/weekly/:slug` (protegidas por `x-margenx-webhook-secret` y bloqueadas en Nginx con `location ^~ /api/internal/`) y rutas de la app `GET /api/reports/weekly` y `GET /api/reports/weekly.pdf` (solo `ADMIN`, timeout 20 s hacia `N8N_REPORT_PDF_WEBHOOK_URL` con `503` controlado), reutilizando el cálculo del panel (`calculateCatalogHealthSummary`) y las oportunidades de ahorro de `purchasingService` (`#390`).
- **QA:** Colección Postman `MargenX - Reportes API` y script `run-tests-reportes.sh` (`#390`).
- **Docs:** SAD 3.0, especificación funcional 2.1 y plan de entregas con un solo alcance y un solo calendario: Sprint 6 del 07/11 al 20/11, **Sprint 7 del 21/11 al 04/12** (release `v1.0.0` y defensa), congelamiento de funcionalidades el 28/11 y **entrega final el 05/12/2026** (aviso de la docente del 12/11/2026; fechas del campo Sprint del tablero). Tabla única de alcance de la cursada contra la Fase 2 en el SAD §1, con la fuente de cada fila: Smart Purchasing, el reporte semanal en PDF y la invitación de colaboradores entran en la cursada (confirmado por el equipo el 14/11/2026). En la especificación, el código de artículo y la ingesta en producción pasan a *Disponible*; compras inteligentes queda como API *Disponible* y pantalla *Planificada*; el API del reporte semanal queda *Disponible*, con su workflow automático todavía *Planificado*; la decisión sobre borrar la presentación predeterminada se resuelve con ADR-005 (409). El SAD documenta el destino del reporte semanal, Gotenberg (planificado) en el despliegue y el monitor de disponibilidad (planificado). `README.md` y la vigencia de `docs/definition-of-done.md` cuentan el Sprint 7, sin cambios en los criterios (`#397`).
- **Backend:** Servicio `purchasingService.ts` y endpoints `GET /api/purchasing/suggestions` y `POST /api/purchasing/order-preview` (solo `ADMIN`, acotados por `accountId`, solo lectura con `Prisma.Decimal` y `calculateUnitCost`) excluyendo proveedores inactivos y presentaciones en cuarentena (`#388`).
- **QA:** Colección Postman `MargenX - Compras API` y script `run-tests-compras.sh` (`#388`).
- **DevOps:** El DevContainer se sincroniza solo con la rama: `.devcontainer/scripts/sync-dev-env.sh` corre al crear el contenedor, cada vez que VS Code o Cursor se conectan (`postAttachCommand`) y al cambiar de rama o hacer `git pull` (hooks versionados en `.githooks/`). Alinea Node con `.nvmrc` mediante nvm (corrige los contenedores creados antes del paso a Node 22, que seguían en Node 20), ejecuta `npm ci` solo si cambió un lockfile, regenera el cliente de Prisma y aplica las migraciones pendientes únicamente sobre la base local del DevContainer, sin seed (ignora una `DATABASE_URL` exportada en la terminal; prueba `sync-dev-env.test.sh` en el CI). Reemplaza al `npm install` del `postCreateCommand`. Documentado en `README.md`, "Entorno sincronizado" (`#395`).
- **Backend / Frontend:** El administrador invita colaboradores por mail desde **Perfil → Colaboradores**, ve las invitaciones pendientes y los colaboradores activos, y puede revocar o dar de baja con confirmación. Endpoints solo `ADMIN` y acotados a la cuenta: `POST/GET/DELETE /api/auth/invitations` y `GET/DELETE /api/auth/users`. La invitación de Clerk lleva la cuenta y el rol `COLLABORATOR` en `publicMetadata` (nunca desde el cliente), y en el primer inicio de sesión `authMiddleware` crea el `User`. Con metadatos inválidos, rol `ADMIN` o una cuenta inexistente o inactiva sigue respondiendo 401, y el backend recuerda ese rechazo 5 minutos para no consultar a Clerk en cada pedido. La instancia de Clerk va en modo *Restricted*. La baja borra también el usuario en Clerk. El mail de invitación lo manda MargenX y no Clerk (que en desarrollo lo enviaba desde `accounts.dev`, en inglés, sin marca y llegaba a spam): el backend crea la invitación con `notify: false` y despacha el enlace al webhook `collaborator-invitation` de n8n (`N8N_INVITATION_WEBHOOK_URL`, workflow `infra/n8n/workflows/invitacion-colaborador.json`), que lo envía por Brevo desde `alertas@margenx.tech` con la plantilla de MargenX. Si el mail no sale, la invitación igual queda (`emailSent: false`) y cada invitación pendiente tiene **Copiar enlace** para mandarla por WhatsApp. El enlace del mail abre `/login`, que con el ticket muestra el alta de Clerk. Decisión en ADR-008; contrato en `docs/api.md` §3 (y el 502 en §2); caso de uso CU-06 en el SAD; manual en `docs/manual-usuario/05-colaboradores.md`; colección `MargenX - Colaboradores API` en `backend/tests/postman/` (`#395`).
- **QA:** Pruebas de la bandeja de cuarentena: estado de error con "Reintentar", cierre del aviso con la X y deslizándolo, y conversión de los importes de la API en `supplierService` (`#311`).
- **Backend:** Columna normalizada `searchName` en `Ingredient` y `Product` (migración `20261111180000_add_search_name_to_ingredient_and_product`, backfill de registros existentes e índices por cuenta) y parámetro `search` en `GET /api/ingredients` y `GET /api/products` para búsqueda parcial insensible a mayúsculas y tildes, combinable con `page`, `limit`, `sortBy` y `order` (`#366`).
- **Backend:** Paginación y búsqueda de presentaciones en `GET /api/suppliers/:id` mediante `page`, `limit` y `search` con metadatos `meta` (`total`, `page`, `limit`, `totalPages`), preservando compatibilidad retroactiva completa cuando no se envían parámetros de paginación (`#366`).
- **Backend:** Endpoint paginado `GET /api/ingredients/:id/products` (solo `ADMIN`, acotado por `accountId`) para consultar los productos que utilizan un insumo con nombre, cantidad en receta, valores financieros y `marginStatus`; actualización de `docs/api.md` y colección Postman de Insumos (`#368`).
- **Docs:** Documentación técnica del estándar de foco canónico perimetral y directivas de accesibilidad en formularios en `frontend/README.md` (`#361`).
- **QA:** Enlace "Ajustar" del mail de alerta de margen probado con un mail real en iPhone (Gmail abre Safari): sin sesión pide login y vuelve a la ficha del producto; con sesión abre la ficha directo. Resultado en `docs/qa/reporte-calidad-sprint5.md` §2.5 y capturas en `docs/qa/evidencias/365/` (`#365`).
- **QA:** Pruebas en iPhone y Android de los diálogos y la barra del producto (#355), de Perfil (#356) y de la landing sin pantallazo con datos móviles (#360). Resultado en `docs/qa/reporte-calidad-sprint6.md` §1, con capturas en `docs/qa/evidencias/383/`. Dos hallazgos menores informados al SM: la línea de inicio de iOS sobre la BottomNav en la app instalada (`#406`) y textos del simulador fuera del formato es-AR (`#383`).
- **Docs:** Acta de cierre del Sprint 5 (`docs/retrospectivas/acta-cierre-sprint-5.md`) con el incremento, las métricas, los hitos por rol, lo que pasa al Sprint 6 y el traspaso; la retrospectiva se completa en el primer Planning del Sprint 6, según el recorte previsto (`#273`).
- **Docs:** Reporte de la Entrega 6 (`docs/entregables/entrega-pps-sprint-5.md`) con el template de 7 puntos, documentación técnica y manual breve; hashes verificados contra el rango `v0.5.0...v0.6.0` y horas confirmadas por el equipo (`#273`).
- **Frontend:** Aviso en la receta cuando el costo de una línea supera el precio de venta del producto, en `/productos/:id` y `/productos/nuevo` (`#352`).
- **Frontend:** Paginador accesible con selector de 20, 50 o 100 filas en `/insumos`, `/productos` y las presentaciones de `/proveedores/:id`, con "Cargar más" en mobile; componente `Pagination` y hook `usePaginatedList` documentados en `frontend/README.md` y en `docs/manual-usuario/` (`#350`).
- **QA:** Colección Postman `backend/tests/postman/MargenX - Dashboard API.postman_collection.json` y script `run-tests-dashboard.sh` validando `GET /api/dashboard/metrics` (401 sin token, 403 a `COLLABORATOR`, schema completo y consistencia de buckets para `ADMIN`) (`#367`).
- **Docs / Proceso:** Regla escrita de no incluir co-autoría ni firma de herramientas de IA en commits ni PRs (`CONTRIBUTING.md` §6), con cómo evitarla según la herramienta, incluido el autor de los commits, que el Squash and Merge convierte en `Co-authored-by`. El repositorio trae `.claude/settings.json` con la atribución de Claude Code desactivada, y `/revisar-pr` y `docs/process/revision-de-prs.md` §5 controlan los mensajes, los autores y la descripción del PR (`#314`).

### Changed

- **Backend / Docs:** Deprecación de `POST /api/purchasing/order-preview` en Swagger y en `docs/api.md`, adoptando la regla del ADR-010 de Smart Purchasing enfocado en margen (`#445`).
- **DevOps / QA:** `Backend Build & Tests` levanta un PostgreSQL 16 efímero (la misma imagen que producción), aplica todas las migraciones desde cero con `prisma migrate deploy` y corre `npm run test:coverage` con `TEST_DATABASE_URL`: el job falla si las líneas del backend bajan del 90 % (`vitest.config.mts`) y sube el reporte como artefacto `cobertura-backend`, también cuando el umbral falla. La prueba de integración de `prisma/seed-units.test.ts` ya no se omite en el CI: si falta la variable, falla (`RV371-I2`, `RV374-I1`). Documentado en `backend/README.md` (nuevo), `backend/.env.example`, `README.md` y `docs/process/revision-de-prs.md` (`#438`).
- **Frontend:** Retoques visuales que salieron de las pruebas de usabilidad del 06 al 10/11/2026. **Panel:** "Ver catálogo completo" (y "Restablecer" en el celular) usa el color de enlace también con un filtro activo, en lugar del rojo de alerta, y las tres KPI se ven en el celular en una fila, como las tarjetas de Proveedores ("Debajo de su mínimo", "Insumos activos" y "Margen promedio"; las aclaraciones aparecen desde la tableta y en el celular quedan para el lector de pantalla). **Insumos:** el encabezado queda Buscar · Cuarentena · Cargar desde planilla · Nuevo Insumo, "Cargar desde planilla" responde al pasar el mouse en claro y en oscuro, y se quitan las tarjetas "Recálculo: Activo" y "Afectan a: Catálogo general", que no informaban nada. **Asociar otro empaque:** el alta rápida pasa a ser el botón **Nuevo proveedor**, con borde y fondo, y el proveedor se elige en un desplegable de Base UI con los colores y el modo oscuro de la app (flechas, Enter y Escape), en lugar del `<select>` nativo. **Detalle de proveedor:** teléfono, correo y dirección quedan en una lista rotulada debajo del nombre, "Hacer predeterminada" responde al pasar el mouse y los nombres de insumo ya no se cortan ("Cacao…"): bajan de renglón y tienen tooltip. Pruebas de Vitest de cada punto; manual del panel actualizado (`docs/manual-usuario/06-panel.md`) (`#362`).
- **Frontend:** En la pantalla de Perfil (`/perfil`), se eliminaron los interruptores sin persistencia ("Alerta de Margen Crítico" y "Reporte Semanal en PDF"). La alerta de margen crítico se muestra con badge informativo "Activa" y el reporte semanal con indicador "Próximamente", reflejando el estado real del sistema (`#356`).
- **Frontend:** La guía `/instalar` muestra capturas reales en las tres secciones. Se sumaron Android (Chrome) y Escritorio (Edge), y se quitó el recuadro "Captura pendiente". En Android, si Chrome muestra el aviso "Instalar MargenX" al abrir la página, alcanza con tocar "Instalar". Si no aparece o se cerró, los pasos siguen el menú actual de Chrome: "Instalar y crear acceso directo" y después "Instalar". Una prueba exige una captura con texto alternativo en cada paso, y `docs/manual-usuario/instalacion.md` muestra las mismas imágenes (`#365`).
- **DevOps / n8n:** Rediseño del mail de resumen de ingesta. Empieza por "Para revisar", con enlaces directos al entorno de la lista (`margenx.tech` o `dev.margenx.tech`): precios en cuarentena (a la bandeja), códigos sin mapear (a Proveedores; los `NOT_FOUND` ya no se informan como descartes) y productos debajo de su margen mínimo (botón "Ajustar"). Después, el resumen en números, con singular y plural correctos ("1 fila", "1 precio quedó en cuarentena"). El resumen y la alerta de margen comparten la plantilla `infra/n8n/plantillas/mail-margenx.js`, con estilos de MargenX y tabla de productos legible a 360 px; `sincronizar.mjs` la copia a los workflows y las pruebas fallan si se desincroniza. Documentado en `infra/n8n/README.md` (`#254`).
- **Frontend:** Formato es-AR consistente en toda la app con el helper `frontend/src/lib/format.ts`: porcentajes con coma y espacio (`36,9 %`), cantidades de receta con coma (`0,7 kg`), unidades legibles (`u`/`unit` → `unidad`), importes con centavos (`$7.000,51`) en Insumos, en las pantallas de producto (lista, ficha, receta, alta y modal de ingrediente), en el panel, en proveedores y en cuarentena, todos con `formatMoney` en lugar de funciones propias que redondeaban a pesos enteros y el campo de costo que acepta el número como se escribe, con punto de miles y coma decimal (`1.234,56`; `1.250` es mil doscientos cincuenta) (`#359`).
- **Frontend:** La plantilla de "Cargar desde planilla" se genera con ExcelJS: encabezado con el color de MargenX y fila fija, lista desplegable de unidades, costo con formato de pesos y validación en las 500 filas, ejemplos en gris y una hoja de instrucciones con marca, tabla de unidades y qué pasa al subirla. Se completa y se vuelve a subir sin tocar el formato. ExcelJS se descarga solo al pedir la plantilla: no entra en el precache del service worker (`#359`).
- **Frontend:** La cantidad de una línea de receta se carga en la unidad que prefiera el usuario dentro de la misma magnitud (g o kg; ml o l) y se edita directamente en la lista. La base sigue guardando la cantidad en la unidad del insumo, y las líneas guardadas con menos de 1 kg o 1 l se muestran en gr o ml. La conversión vive en `frontend/src/lib/recipeConversion.ts`, compartida por el modal y las dos pantallas de producto (`#352`).
- **Frontend:** Agregar o quitar un insumo de la receta en `/productos/:id` ya no guarda al instante: todo se guarda con "Guardar Cambios", y salir con cambios sin guardar pide confirmación. Si el guardado falla (por ejemplo, con un 400), el borrador se conserva para corregirlo (`#352`).
- **Backend:** `GET /api/dashboard/metrics` ahora calcula los cinco buckets de salud sobre todo el catálogo de la cuenta (`lossCount`, `riskCount`, `targetCount`, `surplusCount`, `draftCount`) evaluando el `minMarginPercent` propio de cada producto, y reemplaza el promedio simple de `marginPercent` por la **mediana** (excluyendo borradores) con `Prisma.Decimal` para resistir precios extremos mal cargados. Documentado en `docs/api.md` y `docs/especificacion-funcional.md` (`#367`).
- **Frontend:** Un solo nombre para cada estado de margen en toda la app: **Borrador**, **Pérdida**, **En riesgo**, **En objetivo** y **Superávit**. Los toman de `frontend/src/lib/healthBucket.ts` el panel, `/productos`, la ficha del producto (banner, simulador y barra móvil) y `/productos/nuevo`, en lugar de "Crítico", "Margen Bajo", "Saludable", "Óptimo" y "Sin Receta", y un margen negativo extremo se lee "Pérdida (-29.546,2 %)". El panel, la lista y la ficha usan una sola regla para el estado, y la tarjeta del panel pasa a "Productos debajo de su mínimo" (Pérdida o En riesgo), para no usar el nombre de un estado con otro número. Glosario en `docs/especificacion-funcional.md` §6 y en `docs/manual-usuario/06-panel.md` (`#358`).
- **QA:** La colección de estrés del webhook de ingesta (`ingesta-estres.json`) verifica el valor que queda y no solo que la fila no se descartó. Con un precio de muchos decimales, Harina 000 queda en $736,26 por kg (redondeado a 2 decimales, no truncado) y el bulto `HAR188`, en $18.406,39. Con el código `"   HAR188   "`, el precio llega a la presentación `HAR188` de Harina 000 ($740,00 por kg). La concurrencia de 15 pedidos tiene un umbral de 7,5 s. `run-tests-ingesta-estres.sh` pide un token de `panaderia-admin` para leer el insumo. Documentado en `backend/tests/postman/README-IngestaEstres.md` (`#313`).

### Removed

- **Frontend:** El diálogo **Soporte y Documentación** ya no muestra la tarjeta de WhatsApp: el número no estaba confirmado como canal oficial y el repositorio es público. El soporte queda por correo (`soporte@margenx.tech`) (`#363`).

### Fixed

- **Frontend / Accesibilidad:** Violaciones graves que encontró axe y que Lighthouse no marcaba (#442). **Contraste AA:** la pestaña activa del menú inferior en el modo oscuro (2,74:1), "Sistemas en línea" del pie de escritorio (4,39:1), el título "Simulador Financiero" y la ganancia sin receta de la ficha del producto (2,6:1), el aviso de borrador de la ficha (4,39:1 en claro y 3,66:1 en oscuro), el número del botón **Cuarentena** de `/insumos` (blanco sobre ámbar, 2,1:1; axe lo deja para revisar a mano) y, en `/productos/nuevo`, "Información comercial", las ayudas de precio y margen y la receta vacía (2,6:1 en claro y 3,66:1 en oscuro). **Nombre que incluye el texto visible (WCAG 2.5.3):** las columnas del histograma del panel y las filas de la tabla de insumos en escritorio ya no usan `aria-label`; el nombre sale del texto que se ve, con lo que antes faltaba (el porcentaje en el panel, la unidad y el costo en insumos), y el lector sigue diciendo primero el estado o "Ver y editar insumo". Lo mismo en las filas de `/productos` en escritorio ("Ver detalle del producto"), y en `/perfil` el aviso de las alertas por mail y el pie pasan a gray-500 en claro y gray-400 en oscuro (`[RV488-I1]`). Sin cambios visuales.
- **Frontend:** En **Insumos**, marcar una presentación como predeterminada ya no borra su código de artículo ni su descripción de lista: el alta reemplaza la presentación entera, así que ahora se reenvían como en la ficha del proveedor. Antes, esa presentación dejaba de recibir precios por la ingesta sin avisar (`#486`).
- **Backend / Frontend:** Costo manual de un insumo con presentación predeterminada (RC-28, ADR-011). Si el costo nuevo no coincide con el de la presentación predeterminada, `PUT /api/ingredients/:id` responde `409` con `code: "DEFAULT_PRESENTATION_MISMATCH"` y no guarda nada, y la ficha pregunta qué hacer: actualizar el precio de esa presentación (`defaultPresentationAction: "update-presentation"`, el bulto pasa a costo × tamaño) o dejar de usarla como predeterminada (`"clear-default"`), en la misma transacción que el costo. Con "actualizar el precio", el insumo guarda el costo que da el bulto redondeado al centavo (con un bulto de tamaño con decimales puede diferir en centavos del cargado), y un precio del bulto fuera de rango responde `422`. Después de guardar, la ficha conserva los proveedores del insumo sin recargar la página. ADR-011 reemplaza en parte a ADR-005 (override temporal del costo manual). `ApiError` del frontend conserva el cuerpo de la respuesta de error (#427).
- **Backend:** El webhook de ingesta de listas (`POST /api/webhooks/supplier-prices`) redondea el precio a 2 decimales con `ROUND_HALF_UP`, igual que la columna `packagePrice`, antes de compararlo y de guardarlo: un precio igual al vigente con más decimales (por ejemplo, `18406.387654` contra `18406,39`) ya no cuenta como actualizado ni recalcula los productos (`RV422-I1`, #439).
- **Backend / Frontend:** El colaborador ya no ve productos en borrador a $0,00 (RC-24, #428). `GET /api/products` le devuelve solo productos con receta y precio mayor que 0, con el filtro en la consulta para que `meta.total` y la paginación cuenten bien, y `GET /api/products/:id` de un borrador le responde 404. El ADMIN sigue viendo los borradores. El panel y el catálogo del colaborador sin productos a la venta dicen "Todavía no hay productos a la venta". Caso nuevo en la colección `MargenX - Colaborador RBAC API`.
- **Frontend / Infra:** Lighthouse a 360 px (RNF-01, RNF-02; #398). Accessibility llega a 100 en las páginas públicas y en las seis con sesión medidas: contraste AA en el menú inferior, la receta, el aviso de borrado del producto, el número "En riesgo" del panel y la landing. `/login` y `/instalar` ya no se corren al cargar (CLS 0): el login reserva el espacio del formulario de Clerk y las capturas de la guía declaran su tamaño. El esqueleto de "Ganancia real" reserva el alto de sus bloques. Cada pantalla con sesión se baja al abrirla (`frontend/src/lib/lazyPage.tsx`): el JavaScript inicial pasa de 346 KB a unos 200 KB con gzip (el bundle principal y el chunk compartido con React), y si una pantalla no baja se ve "No se pudo cargar la pantalla" con Reintentar. La CSP de observación de la VPS (`infra/vps/nginx/margenx.conf`) habilita el dominio, la protección antibots y los workers de Clerk; se aplica a mano en la VPS. Resultados y desvíos: `docs/qa/reporte-calidad-sprint7.md` §3 (#398).
- **Backend / Frontend:** Bloqueo del cambio de unidad de medida de un insumo cuando ya está en recetas o en presentaciones de proveedor (`PUT /api/ingredients/:id` responde `409` indicando cantidad de recetas y presentaciones antes de tocar la base, e `IngredientUpsertSheet` deshabilita los botones de unidad mostrando el motivo y muestra un eventual `409` sin cerrar la ficha). Se quita el diálogo "¿Cambiar unidad de medida?", que avisaba que las cantidades de las recetas no se convertían: con el insumo en uso el cambio ya no se puede hacer, y si no se sabe dónde se usa, el `409` del backend aparece en la ficha (`#426`).
- **Frontend:** Prueba de la búsqueda paginada con respuestas fuera de orden (`RV410-I1`): si la respuesta de "sem" llega después de la de "semillas", la lista se queda con "semillas" y deja de cargar. Sin la guarda `if (!active) return` de `usePaginatedList`, la prueba falla (`#441`).
- **Frontend / Backend:** Proveedores más claro y sin cambios de costo sin querer (RC-14, RC-15 y notas de usabilidad). La ficha del proveedor es una tabla con una columna por dato (insumo, presentación, precio del bulto, costo por unidad, código y Acciones) y la presentación predeterminada se marca con una estrella. Cambiar la presentación predeterminada pide confirmación con el costo nuevo, con el mismo diálogo en la ficha del proveedor, la del insumo y Compras (`frontend/src/components/make-default-dialog.tsx`). La baja del proveedor dice una sola frase sobre los predeterminados, y quitar una presentación ya no repite su precio. Nombres únicos en Proveedores, Insumos, Compras y el mensaje de la API: presentación, precio del bulto y presentación predeterminada (en Compras, el botón pasa a **Usar como predeterminada**, como la estrella de las fichas). El alta de una presentación desde la ficha del insumo suma el código de artículo; al editarla, el código que tenía ya no se borra (`#434`).
- **Frontend:** Insumos claro y sin datos ambiguos (`RV385-I1`, RC-08, RC-09 y notas de usabilidad). "Variaciones recientes" es solo para el ADMIN y, si la consulta de cuarentena falla, dice "No se pudo cargar" con Reintentar en lugar de 0. La ficha se llama "Editar insumo" y guarda con "Guardar cambios"; en "Se usa en", el monto dice "Precio de venta"; el historial de precios muestra la unidad del insumo junto a cada costo. Al terminar la planilla, un aviso dice cuántos insumos se cargaron, cuántos repetidos y cuántos con error. En modo oscuro: hover del botón Cuarentena, campo de nombre al enfocarlo y selector de filas por página (`#433`).
- **Frontend:** Productos sin sorpresas en el teclado ni en el modo oscuro (RC-10, RC-11 y notas de usabilidad). En el selector de la receta, mientras la búsqueda espera o consulta la API, ↓ + Enter ya no abre "Crear nuevo insumo": se ve "Buscando insumos..." y "Crear" aparece recién cuando la búsqueda terminó sin coincidencia exacta (sin tildes ni mayúsculas), con un solo "+". Los avisos de producto creado y eliminado se ven en la lista después de redirigir (`frontend/src/lib/productNotice.ts`). La cruz de la búsqueda tiene cursor de mano, y "Agregar Insumo a la Receta" y los selects de "Unidad" respetan el modo oscuro, también en la lista nativa (`#432`).
- **Frontend:** Simulador de precio en formato es-AR y al centavo con la lista (H2 del reporte del Sprint 6, RC-12 y RC-21). Muestra "Ganancia: $0,00" y los ajustes "+5 %" y "+10 %", en el simulador y en Nuevo producto. El costo de la receta redondea cada renglón a 2 decimales con ROUND_HALF_UP antes de sumar, como el backend (`frontend/src/lib/money.ts`, con enteros exactos): una receta que el simulador mostraba en $2.086,54 ahora da $2.086,55, igual que la lista. Nuevo producto ya no muestra "tu margen global de —" mientras carga el perfil (`#431`).
- **Frontend / Backend:** Textos para el dueño sin jerga y siempre con "vos" (RC-01, RC-02 y RC-04). La portada y la política de privacidad ya no dicen "RBAC", "multi-tenant", "slug", "ADMIN/COLLABORATOR", "Zero-Click", "Anti-Polución" ni "Prisma.Decimal": nombran lo que hace MargenX con palabras del comercio ("Cada empleado ve solo lo que le corresponde"), y la portada muestra la dirección recomendada para las listas de precios, la misma que muestra Proveedores (`precios-panaderia-central@margenx.tech`, ADR-005), en lugar de `precios+…`. Los textos que hablaban de "tú" pasan a "vos" ("Acá tenés", "Hacé clic", "Ingresá", "No podés"), incluidos dos mensajes de `PUT` y `DELETE` de presentaciones de proveedor del backend que la app muestra como aviso. Clerk usa `esUY` (español rioplatense) en lugar de `esES`, con los textos que quedaban en inglés traducidos, incluidos los errores de demasiados intentos (`too_many_requests`, `signup_rate_limit_exceeded` y `verification_code_rate_limit_exceeded`, el que aparece al pedir varios códigos seguidos en la recuperación de la contraseña) (`frontend/src/lib/clerkLocalization.ts`). Una prueba de Vitest barre los textos de `frontend/src` para que no vuelvan "tú" ni "usted". Manual de usuario actualizado (`#436`).
- **QA:** Las colecciones de Postman ya no dejan datos mutados. `MargenX - Productos API` borra los dos productos que crea (el de $0 incluido) con `DELETE /api/products/:id` y controla que ya no existan. `MargenX - Alertas de margen (Insumos)` guarda la Harina como estaba antes de la corrida (nombre, unidad y costo), la deja igual al final y lo controla: antes la volvía siempre al costo del seed. La colección de Colaborador RBAC trae el puerto 3000 por defecto. Las reglas de la evidencia de QA quedan en `docs/qa/evidencias/README.md`: salida real de Newman o Vitest como texto, sin los reportes HTML (traen tokens y secretos) y solo con correos ficticios (`*@seed.example.test` y `demo-*@margenx.tech`). La salida real de las dos colecciones está en `docs/qa/reporte-calidad-sprint7.md` §2 y en `docs/qa/evidencias/312/`. Los siete scripts `run-tests*.sh` que no tenían permiso de ejecución ahora lo tienen (`#312`).
- **Frontend / n8n:** Un solo nombre por estado y por número en la app y en los mails (`RV419-I1`, RC-03, RC-23 y RC-26): las fichas de ejemplo de la portada dicen Superávit, En objetivo y En riesgo en lugar de "Saludable" y "Crítico"; la tarjeta del panel se llama **Margen mediano** y explica que la mitad de los productos gana más y la mitad menos (igual en el PDF y en el mail del reporte semanal); el histograma muestra "En riesgo" y "En objetivo" completos también a 360 px; Perfil dice "Alerta de margen mínimo"; el aviso de liberar una cuarentena dice cuántos productos quedan en riesgo o en pérdida; el mail de alerta tiene el asunto "Productos debajo de su margen mínimo" y el workflow se llama "MargenX - Alertas de Margen Mínimo"; y el resumen de ingesta ya no dice "margen crítico" (`#430`).
- **n8n:** El PDF del reporte semanal ya no corta la columna Estado ("Pérdid/a"): la plantilla A4 suma la clase `mx-nowrap` y las dos tablas con columna Estado la usan. Los mails (resumen de ingesta, alerta de margen, invitación y reporte semanal), en HTML y en texto plano, y el PDF muestran el soporte en `soporte@margenx.tech`, el mismo correo que la app, en lugar de `contacto@margenx.tech`. Las cuatro pruebas de `infra/n8n/tests/` lo verifican (`#435`).
- **Frontend:** Perfil con textos correctos y sin accesos duplicados. La ayuda del margen objetivo global ya no dice que "determinará el umbral de alerta": dice que es la sugerencia al crear un producto y que las alertas usan el mínimo de cada producto (las alertas usan `minMarginPercent` de cada producto). "Alertas automáticas" sin "(n8n)". Los botones Política de privacidad y Guía de instalación salen de Perfil: **Política** e **Instalar** pasan al pie de escritorio (`DesktopFooter`, en todas las pantallas con sesión) y siguen en el pie móvil de Perfil. Cerrar sesión queda en Perfil solo en el celular, porque en la computadora está en "Salir" del navbar. Cada acceso sigue disponible en las dos pantallas. Manual de usuario actualizado (`#429`).
- **Frontend:** **Documentación** del pie (el de escritorio y el móvil de Perfil) ya no abre el mismo diálogo que **Soporte**: lleva al manual de usuario (`docs/manual-usuario/` en la rama `main` de GitHub) en una pestaña nueva, anunciada al lector de pantalla. La tarjeta **Guía de Usuario** del diálogo, que figuraba como "Disponible en versión 1.0", es ahora el mismo enlace. Constante `USER_MANUAL_URL` en `frontend/src/lib/userManual.ts`, foco visible con `CANONICAL_FOCUS_CLASSES` y pruebas de Vitest del pie, del diálogo y de Perfil (`#363`).
- **Frontend:** Corrección de la restricción que impedía editar nombre y unidad en la ficha de insumo (`IngredientUpsertSheet`), permitiendo subsanar errores tipográficos y formatear el costo unitario con separadores de miles es-AR al desenfocar (`#354`).
- **Frontend / PWA:** En la app instalada en iPhone, la línea de inicio de iOS ya no tapa las etiquetas de la `BottomNav`: `index.html` declara `viewport-fit=cover` y `env(safe-area-inset-bottom)` deja de valer 0. Además, la barra de `/productos/nuevo` queda apoyada sobre la `BottomNav` como la de la ficha (antes se superponía 2 px), el final de las dos pantallas deja lugar a la zona segura, los diálogos que salen desde abajo dejan sus botones fuera de ella y, en horizontal, el contenido no queda bajo la muesca (`#406`).
- **Frontend:** Con catálogos de más de 20 filas, `/insumos` y `/productos` mostraban solo la primera página: la tarjeta "Insumos activos" contaba 20, el buscador filtraba solo esos 20 y el selector de la receta ofrecía los primeros 20 insumos. Ahora la búsqueda va a la API (sin tildes ni mayúsculas, 300 ms después de dejar de escribir), los contadores leen `meta.total`, el selector de la receta busca en todo el catálogo y la detección de duplicados de la planilla usa el catálogo completo (`#350`).
- **Frontend:** El aviso de confirmación de `/proveedores/cuarentena` se puede cerrar con la X o deslizándolo: `ToastAlert` recibe `onClose`, que antes faltaba y dejaba deshabilitados el botón y el gesto (`#311`).
- **Frontend:** La tarjeta "Variaciones recientes" de `/insumos` muestra la cantidad real de precios en cuarentena en lugar de un 2 fijo (`#311`).
- **Frontend:** `supplierService` convierte a número los importes que `GET /api/suppliers/quarantine` y `POST /api/suppliers/quarantine/:id/release` envían como texto (`packagePrice`, `packageSize`, `currentPrice`, `proposedPrice`, `variationPercent`, `ingredient.currentCost` y `unitCost`). Los tipos declaraban `number` pero llegaba texto (`#311`).
- **Frontend:** Las pantallas públicas reconocen la sesión iniciada: `/instalar` y `/privacidad` muestran "Ir al panel" (hacia `/dashboard`) en lugar de "Ingresar" o "Volver a la web", y `/` ya no muestra la landing cerca de 1 s antes de redirigir al dashboard (hallazgo de QA del Sprint 5, `docs/qa/reporte-calidad-sprint5.md` §2.6). Mientras Clerk verifica la sesión no se muestra ninguna de las dos versiones; si tarda más de 1,5 s, se muestra la versión sin sesión. La lógica vive en `frontend/src/hooks/usePublicSession.ts` y `frontend/src/components/public-session-link.tsx` (`#360`).
- **Frontend:** Los enlaces "Política de privacidad" y "Guía de instalación" del login pasan al pie, debajo del formulario y más chicos, en vez de quitarse (decisión del Tech Lead sobre la propuesta de las pruebas de usabilidad; `#244` los había agregado a propósito) (`#360`).
- **Frontend:** En la pantalla de Perfil (`/perfil`), se corrigió la duplicación del símbolo porcentual (`% %`) en el campo "Margen Mínimo Sugerido", eliminando el span redundante adyacente a `NumericInput` (`#356`).
- **Frontend / Accesibilidad:** Asociación estricta de elementos `<label htmlFor>` con `id` en los campos de Nombre del Producto, Precio de Venta y Margen Mínimo en la ficha de producto (`/productos/:id` y `/productos/nuevo`), permitiendo a lectores de pantalla anunciar el nombre y propósito de cada campo (`#361`).
- **Frontend / Accesibilidad:** Homogeneización del estilo de foco perimetral canónico (`CANONICAL_FOCUS_CLASSES`, contraste WCAG AA >= 3:1) en pestañas y botones del modal "Cargar desde planilla" (`BulkIngredientsModal`), unificando la experiencia al tabular con el resto de los modales de la aplicación (`#361`).
- **Backend / Seeds:** Unificación de la unidad de medida de `"unit"` a `"u"` en el insumo "Huevos (demo)" y su presentación mayorista en `seed-demo.ts`, corrigiendo el fallo HTTP 400 al actualizar su costo vía API (`#353`).
- **Database:** Migración declarativa `20261111120000_unify_ingredient_unit_u` que actualiza a `'u'` todo registro histórico con unidad `'unit'` en `Ingredient` y `SupplierIngredient` (`#353`).
- **Docs:** Actualización del comentario de modelo en `schema.prisma` (`// kg, l, u`) y del runbook operativo en `docs/runbook-operacion.md` (`#353`).
- **Frontend / UX:** Corrección de desbordamiento en modales y bottom sheets (`DialogSheet`) en resoluciones móviles de 360 px: se fijaron encabezados y acciones con `shrink-0`, se implementó scroll interno con `flex-1 overflow-y-auto` y se acotó la lista de proveedores en insumos a `max-h-60` para evitar bloqueos visuales (`#355`).
- **Frontend / UX:** Reacomodamiento en dos filas de la barra de acciones inferior en la ficha de producto (`ProductMobileFooter`) para evitar superposiciones con la navegación (`BottomNav`) y garantizar la visibilidad completa del badge de rentabilidad (`#355`).
- **DevOps / n8n:** Los mails de resumen, de error de ingesta y de alerta de margen llegan con el remitente "MargenX": `emailSend` 2.1 ignoraba `senderName` y la alerta salía como "alertas". La alerta pasa a enviar HTML y texto plano (`emailFormat: both`), y ninguno lleva el pie de n8n (`appendAttribution: false`). El texto plano de la alerta ya no muestra entidades HTML (`&lt;`) en el nombre del comercio o del insumo, y el destinatario del pie va escapado (`#254`).
- **DevOps / n8n:** El enlace "Ajustar" y el botón principal del mail de alerta de margen apuntan a `<appBase>/productos` cuando la alerta no trae el ID del producto; antes el `href` salía con el texto literal `${appBase}/productos` y no llevaba a ningún lado. Prueba del nodo en `infra/n8n/tests/alertas-nodos.test.mjs`, que ahora corre en CI, y sección de alertas en `infra/n8n/README.md` (`#329`).
- **Docs:** Fecha de la versión `[0.6.0]` en este CHANGELOG: 07/11/2026, el día real del release (`#273`).
- **Frontend / UX:** Corrección de desbordamiento en modales y bottom sheets (`DialogSheet`) en resoluciones móviles de 360 px: se fijaron encabezados y acciones con `shrink-0` y se implementó scroll interno con `flex-1 overflow-y-auto`, acotando la lista de proveedores en insumos a `max-h-60` para evitar bloqueos visuales (`#355`).
- **Frontend / UX:** Reacomodamiento en dos filas de la barra de acciones inferior en la ficha de producto (`ProductMobileFooter`) para evitar superposiciones con la navegación (`BottomNav`) y garantizar la visibilidad completa del badge de rentabilidad (`#355`).
- **Docs:** `docs/process/revision-de-prs.md` §5, punto 6: se quitó un párrafo duplicado y se aclara cómo se mide la cobertura en cada paquete y en el CI (`#307`).
- **Frontend:** `parseNumeroAR` interpretaba `0.250` como 250 (separador de miles); ahora es 0,25 (`#352`).
- **Frontend:** `NumericInput` volvía a leer su propio valor como formato argentino: `1,250` kg pasaba a 1250 kg al entrar y salir otra vez del campo. Además mostraba solo 2 decimales (1,125 kg se veía 1,13); las cantidades de receta muestran 3 (`#352`).
- **Frontend:** Las cantidades de receta se redondean a 3 decimales de la unidad del insumo (límite de la base). El modal y la edición en la lista avisan cuando la cantidad se redondea ("se guarda como 1 gr") o no llega al mínimo (0,001 kg o l), que no se puede agregar; al salir del campo se muestra la cantidad que quedó en la receta (`#352`).
- **Frontend:** El panel mostraba números que no coincidían entre sí con catálogos grandes: las tarjetas contaban toda la base, pero el histograma y "Ver catálogo completo" contaban los productos de la grilla, y el histograma decía "En Objetivo 30 %–60 %" aunque cada producto usa su propio margen mínimo. Ahora el histograma dibuja los cinco buckets de `GET /api/dashboard/metrics` (#367), las columnas más los borradores suman el total del catálogo, los rótulos dicen "Bajo su mínimo" y "Su mínimo a 60 %", y la grilla muestra todo el catálogo de a 20 con el paginador compartido ("Cargar más" en mobile). Al tocar una columna, la grilla filtra todo el catálogo con `classifyHealthBucket` (`src/lib/healthBucket.ts`), la misma regla que el servidor. El margen promedio se pinta según su signo (antes, un valor negativo se veía en verde) y aclara que es la mediana de los productos con receta. El total del catálogo, los porcentajes de las columnas y los rótulos de las tarjetas pasan de gris 400 (2,5:1 sobre blanco) a gris 500 en modo claro para cumplir el contraste WCAG AA. Manual en `docs/manual-usuario/06-panel.md`; excepción a la paginación en la API documentada en `frontend/README.md` (`#351`).

### Security

- **DevOps:** `vitest` y `@vitest/coverage-v8` en 5.1.0 en `backend/` y `frontend/` (antes 2.1 y 4.1). El `npm audit` completo del backend baja de 13 vulnerabilidades (3 críticas, 4 altas, 6 moderadas) a 3 altas, todas de `prisma` → `deepmerge-ts` (en `.github/audit-allowlist.json`); ya no aparecen las de la cadena de Vitest 2 (`vitest`, `vite-node`, `vite`, `esbuild`, `tinypool`, `@vitest/mocker`, `test-exclude`, `glob`, `minimatch`). Adaptaciones: `backend/vitest.config.mts` (antes `.ts`, porque el paquete es CommonJS) vuelve a excluir `dist/`, que el valor por defecto de Vitest 4 en adelante ya no ignora, y `frontend/vitest-env.d.ts` suma los matchers de `@testing-library/jest-dom` a `Matchers<R, T>`, porque Vitest 5 ya no lee `jest.Matchers`. Las suites no cambian (283 pruebas en el backend y 419 en el frontend); la cobertura de líneas del backend pasa de 93,35 % a 91,85 % sin cambios en pruebas ni en código, porque desde Vitest 4 coverage-v8 no cuenta las líneas sin código ejecutable. Vitest 5 requiere Node 22.12 o superior (`.nvmrc`) (`#307`).
- **DevOps / CI:** `effect` se fuerza a la 3.22.5 con `overrides` en `backend/package.json` por GHSA-7589-6fvf-x4pw (ReDoS en `Schema.TemplateLiteral`, alta, afecta a `<=3.22.0`). Llega por `prisma` → `@prisma/config`, que fija la 3.21.0, y hacía fallar el job `Dependency Audit` en todos los PR desde el 20/11. La 3.22.5 es de la misma serie: `prisma validate`, `prisma generate` y `prisma migrate deploy` siguen funcionando. Quitar el override al migrar a Prisma 7 (`#313`).

## [0.6.0] - 2026-11-07 (Sprint 5: Proveedores, PWA instalable y operación en producción)

### Added

- **Docs:** Runbook de release `docs/runbook-release.md`: lista de verificación previa (copia puntual de producción, ensayo de las migraciones sobre una copia con la imagen de `develop` e imagen anterior conservada en la VPS), merge commit hacia `main`, etiqueta anotada y Release, prueba rápida con la cuenta Demo, aviso en Discord y vuelta atrás con tiempo estimado (`#271`).
- **Docs:** Consolidación exhaustiva de contratos de la API REST en `docs/api.md` cubriendo la totalidad de endpoints de Proveedores, Cuarentena, Insumos, Productos, Dashboard, Auth y Webhooks, sincronizados al 100% con las 6 colecciones de Newman.
- **Docs:** Registro de Decisión Arquitectónica `docs/adr/0007-roles-fijos-vs-permisos-granulares.md` formalizando la adopción del modelo RBAC nativo de dos roles fijos (`ADMIN` y `COLLABORATOR`) con sanitización server-side (`sanitizeFinancialData`), difiriendo la matriz de permisos configurables a la Fase 2.
- **Docs:** Guía de contingencia y árbol de decisión paso a paso ante listas de precios no aplicadas en `docs/runbook-ingesta.md`, integrando cuotas de 5 MB, respuesta HTTP 413, filtro anti-pollution y cuarentena preventiva.
- **Docs:** Señalización normalizada de marcadores de capturas de pantalla para resoluciones móviles de 360px (`<!-- [CAPTURA 360PX SUGERIDA: ... ] -->`) en los manuales de usuario `01-primeros-pasos`, `02-proveedores-y-listas`, `03-colaborador` y `02-rutas-y-roles`.
- **DevOps / n8n:** Ingesta de listas por mail separada por entorno: un solo n8n despacha a producción (`MARGENX_API_URL`) o a staging (`MARGENX_DEV_API_URL`, nueva en `infra/vps/.env.example` y en el compose) solo si el destinatario es `precios-dev-<slug>@margenx.tech`; sin la variable de staging, ese correo no se despacha. Ante un `413` el proveedor recibe un correo que le pide dividir la lista. Se corrige la lectura de CSV en UTF-8 (los encabezados con tilde se leían como latin1) y el exporte vuelve a ser portable (inactivo, credenciales de ejemplo, texto plano en los correos). El trigger IMAP fuerza la reconexión cada 5 minutos (antes 60): Gmail cortaba la sesión IDLE en silencio y los correos solo se procesaban con una ejecución manual. Checklist "mandé la lista y no pasó nada" en `docs/runbook-ingesta.md` (`#253`).
- **Frontend:** Pantalla de detalle de proveedor en `/proveedores/:id` (exclusiva para rol `ADMIN`): ficha del mayorista con contacto, contadores y dirección de ingesta; lista responsiva de presentaciones mayoristas (Table-to-Cards) con código SKU, descripción de lista, factor de empaque, precio facturado y costo unitario equivalente; modales accesibles de edición con validación 409 de código duplicado en el campo, conmutación de proveedor predeterminado con recálculo en cascada y baja controlada con captura de la regla 409 de protección referencial (`#250`).
- **Frontend:** Cuarentena integrada en Proveedores: pestañas **Proveedores** y **Cuarentena** (con la cantidad de precios retenidos dicha con texto, no solo con color) en `/proveedores` y `/proveedores/cuarentena`, y el botón Volver de la bandeja lleva a `/proveedores`. La pantalla de Proveedores muestra al administrador la dirección de ingesta `precios-<slug>@margenx.tech` (con el `slug` de `GET /api/auth/me`) con botón **Copiar**, aviso de copiado y aviso para copiarla a mano si el navegador no lo permite. La ficha del insumo avisa cuando tiene un precio retenido, marca la presentación **En cuarentena** y enlaza a la bandeja. Manual en `docs/manual-usuario/02-proveedores-y-listas.md` (`#251`).
- **QA:** Pruebas de Vitest de las pestañas, la bandeja integrada, el botón Copiar (éxito, rechazo del navegador y sin portapapeles), el indicador en la ficha del insumo y el error al liberar y al rechazar; caso E2E `TC-RBAC-06` (el colaborador no accede a la bandeja ni ve la dirección de ingesta) (`#251`).
- **Frontend:** Pantalla `/proveedores`, solo para el administrador (`AdminOnlyRoute` y enlace **Proveedores** en la barra de escritorio y en el menú inferior, visible solo con el rol `ADMIN` confirmado). Lista responsiva (tarjetas en el celular, tabla desde `md`) con nombre, contacto, estado Activo/Inactivo con texto e ícono, cantidad de insumos e indicador de cuarentena con explicación y enlace a la bandeja; resumen de activos, insumos vinculados y precios retenidos; esqueleto de carga, estado vacío con **Cargar mi primer proveedor** y error con **Reintentar**. Alta y edición en un diálogo accesible (foco en Nombre, validación Zod con mensajes en es-AR, nombre repetido `409` en el campo, error de red dentro del diálogo, botón "Guardando...", interruptor Activo/Inactivo y aviso de cambios sin guardar). Baja con confirmación que trae y lista las presentaciones afectadas (insumo, bulto, precio, código, predeterminada y cuarentena) antes de habilitar el botón, explica qué pasa con el costo y las listas de precios, y ofrece **Desactivar en su lugar**. Manual en `docs/manual-usuario/02-proveedores-y-listas.md` y ruta en `02-rutas-y-roles.md` (`#249`).
- **Backend:** `GET /api/suppliers` suma `ingredientCount` (cantidad de presentaciones de cada proveedor) junto a `quarantineCount`, sin consultas extra; contrato en `docs/api.md` y prueba en la colección Postman de Cuarentena (`#249`).
- **QA:** Pruebas de Vitest de la lista, el alta y la edición, la confirmación de baja, la pantalla completa, la navegación por rol y la ruta protegida, y caso E2E `TC-RBAC-05` (el colaborador no accede a `/proveedores` ni ve el enlace) (`#249`).
- **Frontend:** Carga de insumos desde una planilla en `/insumos`, solo para el administrador: plantilla Excel con las columnas Nombre, Unidad y Costo (más una hoja de instrucciones), lectura del .xlsx, .xls o .csv en el navegador con SheetJS (cargado bajo demanda), vista previa en tres pestañas (válidas, repetidas y con error, con el número de fila de la planilla y el motivo), costos en formato es-AR (`1.234,56`) enviados como decimal en texto, y confirmación contra `POST /api/ingredients/bulk` con el resumen de creados y omitidos. El diálogo usa el `Dialog` accesible (foco atrapado, Escape, pestañas con teclado) y funciona como bottom sheet en mobile. Manual de primeros pasos con las tres formas de cargar insumos (`#252`).
- **Frontend:** Service worker con `vite-plugin-pwa` (`frontend/pwa.config.ts`): precache de JS, CSS, íconos y la página `offline.html` ("Sin conexión" con botón Reintentar) para cuando falla una navegación; la API y el HTML de la app en `NetworkOnly`, sin guardar respuestas; la API y las rutas de Clerk (`/login`, `/__clerk`, parámetros `__clerk_*`) excluidas de la página de respaldo; aviso de versión nueva con Actualizar y Más tarde, sin recarga automática; limpieza de las cachés del service worker en todos los cierres de sesión. `nginx.conf` sirve `sw.js` y `offline.html` sin caché inmutable. Estrategia en `docs/Arquitectura-Software-(SAD).md` §4 y verificación en `frontend/README.md` (`#248`).
- **Frontend:** PWA instalable: `manifest.webmanifest` (nombre MargenX, `lang` es-AR, `start_url` `/dashboard?source=pwa`, modo `standalone`, color de marca `#4f46e5`), íconos de 192 y 512 px, 512 px maskable y `apple-touch-icon` de 180 px, `favicon.ico`, `robots.txt` y etiquetas de instalación para Android e iOS en `index.html`. `nginx.conf` sirve el manifest como `application/manifest+json` sin la caché inmutable de los assets con hash. Prueba de Vitest que valida el manifest, el tamaño real de cada ícono y la regla de nginx; guía de verificación en `frontend/README.md` (`#243`).
- **Frontend:** Sesión persistente en la app instalada (PWA en modo standalone, detectada con `display-mode: standalone` y `navigator.standalone`): cerrar la app ya no cierra la sesión y no corre el cierre propio de 30 minutos; manda la duración del Clerk de producción (7 días, tope del plan Hobby). En el navegador común no cambia nada. Al pedir login, el destino viaja en `?redirect_url=` y, tras iniciar sesión (y la verificación de Clerk, si la pide), se vuelve a esa pantalla, por ejemplo el producto del enlace "Ajustar" del mail de alerta. Solo se aceptan rutas internas. Decisión en `docs/adr/0006-sesion-persistente-pwa.md`; nota de duración en `docs/manual-usuario/instalacion.md` (`#241`).
- **DevOps:** Auditoría de solo lectura `backend/prisma/sql/auditar-nombres-duplicados.sql` y paso en `docs/runbook-operacion.md` §8 para detectar nombres duplicados ignorando mayúsculas antes de desplegar la migración de índices únicos (`[RV323-I2]`, `#242`).
- **Backend:** Índices únicos case-insensitive `(accountId, lower(name))` en `Supplier`, `Ingredient` y `Product` (migración `20261030224224_case_insensitive_unique_names`): la base rechaza "Pan" y "pan" en la misma cuenta aunque falle la validación de la API, y `errorHandler` traduce esa violación (`P2002`) a `409` con el mensaje de cada entidad (`#242`).
- **Frontend:** Componente reutilizable `ErrorState` (`src/components/error-state.tsx`) con mensaje, botón Reintentar de 44 px de alto y `role="alert"`; lo usan `/dashboard`, `/insumos` y `/proveedores/cuarentena`, y queda documentado en `frontend/README.md` (`#257`).
- **QA:** Pruebas de Vitest de `ErrorState`, `DashboardPage` y `SuppliesPageContent` (fallo 500, fallo de red, reintento exitoso y estado de carga durante el reintento) y caso E2E en `smoke.spec.ts` que fuerza un 500 en `/api/dashboard/metrics` (`#257`).
- **DevOps:** Script `infra/scripts/seed-remoto.sh` para sembrar o resembrar staging y producción: compila los seeds localmente, compara migraciones, hace `pg_dump` previo y corre el seed en un contenedor temporal con la imagen del backend. En producción exige la rama `main` sin cambios sin commitear. Runbook en `docs/runbook-operacion.md` (`#240`).
- **Backend:** `seed-demo.ts` toma los `user_id` del Clerk de producción de `SEED_DEMO_ADMIN_AUTH_ID` y `SEED_DEMO_COLAB_AUTH_ID` (`#240`).
- **Frontend:** Página 404 dentro del panel (con el menú y un botón al dashboard) para cualquier ruta inexistente, y redirección de `/` al dashboard cuando hay sesión activa. Se eliminó el código muerto `productos/detalle` (`#236`).
- **Docs:** Tabla de rutas y accesos por rol en `docs/manual-usuario/02-rutas-y-roles.md` (`#236`).
- **QA:** `frontend/tests/e2e/quarantine-queue.spec.ts`, primera cobertura E2E de la bandeja de cuarentena (`/proveedores/cuarentena`) — liberar y rechazar un precio anómalo, con captura a 360px. Dispara la cuarentena vía el webhook real de ingesta (no mockeada), por lo que suma `INTERNAL_WEBHOOK_SECRET` a `frontend/.env.test.example` y al job de E2E de `ci.yml`. Verifica el costo vigente tras liberar y rechazar, deja el insumo exactamente como estaba, y el CI publica las capturas como artefacto `evidencia-360px` (`#310`).
- **Frontend:** Páginas públicas `/privacidad` y `/instalar` con contenido de política de datos y guía de instalación para Android, iPhone y escritorio, enlaces visibles desde login y perfil, y navegación sin sesión dentro de la SPA (`#244`).
- **Docs:** ADR-005 formalizando las decisiones de arquitectura sobre costo vigente de materias primas por proveedor predeterminado, umbrales de retención en cuarentena preventiva y canal de ingesta por correo (`precios-<slug>@margenx.tech`) (`#234`).
- **Backend / QA:** Suite integral de pruebas unitarias y de integración para middlewares (`rbac`, `errorHandler`, `auth`), utilitarios (`pagination`), servicios (`marginAlertDispatcher`, `marginCalculator` con resolución de los 8 casos borde de QA) y rutas REST (`ingredients`, `products`, `suppliers`, `webhooks`, `auth`, `dashboard`), elevando la cobertura de líneas de backend por encima del 90 % (`#277`).
- **Backend / Config:** Configuración de `backend/vitest.config.ts` con exclusión de archivos de arranque (`src/index.ts`, `src/lib/prisma.ts`) y umbral de cobertura estricto `thresholds.lines: 90` (`#277`).
- **Frontend / QA:** Configuración de cobertura de código con `@vitest/coverage-v8`, script `test:coverage`, umbral del 90 % en Vitest y suites de pruebas unitarias sobre stores (`useRecipeStore`, `useQuarantineStore`), esquemas Zod (`productSchema`, `ingredientSchema`, `supplierPackagingSchema`), helpers de saneamiento numérico (`numericInput`), hooks de RBAC (`useUserRole`, `useTheme`) y componentes financieros (`MarginBadge`) (`#276`).
- **QA:** Scripts `run-tests-webhooks.sh` y `run-tests-alertas-margen.sh`, para que las 6 colecciones tengan un wrapper uniforme (`#264`).
- **QA:** Cosecha de los comentarios no bloqueantes dejados en las revisiones de los PR #215 a #218: etiqueta `review-followup` y 5 issues nuevas agrupadas por tema (`#310`-`#314`); tabla de trazabilidad completa (28 ítems: resueltos, descartados o agrupados) en `docs/qa/reporte-calidad-sprint5.md` (`#265`).
- **QA:** Regresión liviana de cierre del Sprint 5 con matriz fechada de defectos, lo no cubierto y recomendación de publicación en `docs/qa/reporte-calidad-sprint5.md` §3: 3 de las 6 colecciones Postman de la issue #264 (Webhooks, Colaborador RBAC y Alertas de margen) corrieron en verde, 0 failures, y el E2E de RBAC (`rbac-security.spec.ts`) pasó sus 7 pruebas en el job `E2E Tests Suite (Playwright)` del CI de este mismo PR. Insumos, Productos y Proveedores quedaron no cubiertos por una causa puntual confirmada: la secret key de Clerk disponible pertenece a una instancia distinta a la del frontend, sin los usuarios de Química GyJ. Sin defectos graves abiertos en ningún frente verificado (`#270`).
- **Backend:** Carga masiva de insumos por planilla (`POST /api/ingredients/bulk`) con validación por fila, omisión de duplicados, tope de 500 filas por lote, transacción y respuesta resumida `{ created, skipped, errors }`.
- **Backend:** Parser compartido de números argentinos para costos (`1.234,56` y `1234.56`) aplicado a la carga manual y masiva para evitar inconsistencias entre rutas.
- **Backend:** Límite conservador global de `256 KB` en el parser general de Express y parser específico de `5 MB` para `POST /api/webhooks/supplier-prices`.
- **Backend:** Manejo explícito de `entity.too.large` con respuesta `413`, código estable `PAYLOAD_TOO_LARGE` y mensaje en español orientado a dividir la lista.
- **Backend:** Bloqueo con error 422 al intentar quitar el proveedor predeterminado de un insumo sin asignar otro en su lugar.
- **Frontend:** Exclusión de proveedores ya vinculados en el modal de asociación de empaques y aviso claro al intentar desmarcar el proveedor predeterminado.
- **Security:** Incorporación de `helmet` con cabeceras por defecto para reforzar la capa de seguridad HTTP sin activar CSP aún.
- **Docs:** Formato normalizado de revisión de PR (`docs/process/revision-de-prs.md`), con IDs `[RV<PR>-<S><n>]` que reemplazan al prefijo `NB-n`, y comandos de Claude Code `/revisar-pr` y `/resolver-issue` en `.claude/commands/` (`#274`).
- **Docs:** Especificación funcional unificada (`docs/especificacion-funcional.md`), alineada con el código de `develop` (`#274`).
- **Docs:** ADR-005 sobre costo vigente, cuarentena e ingesta (`docs/adr/0005-costo-vigente-cuarentena-e-ingesta.md`), y actualización del manual de usuario con la regla del proveedor predeterminado.
- **DevOps / CI:** Jobs `Frontend Unit Tests` (Vitest con el umbral de cobertura del 90 %), `n8n Nodes Tests` y `Dependency Audit` (`npm audit --omit=dev` en ambos paquetes, con lista de excepciones en `.github/audit-allowlist.json` y su filtro probado en `.github/scripts/`) (`#260`).
- **DevOps:** `.github/dependabot.yml`: PR semanal agrupado de versiones menores y parches hacia `develop` para npm (backend y frontend), GitHub Actions e imágenes base de Docker (`#260`).
- **DevOps:** `.nvmrc` con Node 22 como versión única para el entorno local, el CI y las imágenes (`#260`).
- **Docs:** `frontend/README.md` propio (antes la plantilla genérica de Vite): cómo correr, variables de entorno, estructura de `src/`, cómo correr las pruebas unitarias y E2E, y una guía de verificación de instalabilidad PWA a completar cuando se mergee S5-FE-05 (`#268`).
- **Docs:** `README.md` principal: `Supplier`/`SupplierIngredient` y la cuarentena de precios en el modelo de datos, el módulo `/proveedores/cuarentena` en la lista de pantallas, y una nota exacta de qué ve y a qué pantallas llega el rol `COLLABORATOR` (`#268`).
- **Docs:** `infra/vps/README.md` §11-12: Cloudflare Email Routing, la casilla IMAP y Brevo (dónde vive cada credencial, no el flujo — eso sigue en `infra/n8n/README.md`), e inventario de titularidad de los servicios (VPS, dominio, Cloudflare, Clerk, Gmail, Brevo, Docker Hub) para preparar el traspaso a una cuenta empresarial en la fase 2; columna de titular actual a completar por Darío (`#268`).
- **Backend / QA:** Benchmark automatizado `scripts/benchmark-batch-recalculation.ts` y pruebas unitarias de recálculo masivo con 300 insumos y 40 productos compartidos (`#259`).
- **Backend:** Endpoints `GET /api/suppliers` (ahora incluye `quarantineCount`), `GET /api/suppliers/:id` (detalle completo de presentaciones) y `DELETE /api/suppliers/:id/ingredients/:ingredientId` (elimina una presentación validando que no quede el insumo sin un predeterminado si hay alternativas) (`#246`).
- **Backend:** `GET /api/auth/me` devuelve el `slug` del comercio exclusivamente para el rol ADMIN, omitiéndolo por seguridad RBAC para los colaboradores (`#246`).
- **DevOps:** Bloque de servidor Nginx y certificado SSL expandido para `www.margenx.tech` con redirección permanente 301 a `margenx.tech` (`#261`).
- **DevOps:** Cabeceras de seguridad perimetral HTTP en Nginx: HSTS de 1 semana (`max-age=604800`), `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `X-Robots-Tag: noindex` en staging y CSP en modo reporte (`Content-Security-Policy-Report-Only`) (`#261`).
- **DevOps:** Límite `client_max_body_size 6m` específico en los bloques de servidor de API (`api` y `api-dev`), descartando cargas superiores a 6 MB con HTTP 413 antes de alcanzar Node.js (`#261`).
- **DevOps:** Configuraciones de Nginx del host versionadas sin secretos en `infra/vps/nginx/` y registro de vencimientos de certificados en `infra/vps/README.md` (`#261`).
- **DevOps:** Automatización de backup diario de base de datos (`margenx_prod`) con compresión nativa `pg_dump -Fc`, rotación (7 diarios y 4 semanales), alerta por fallo a Discord, script de ensayo de restauración (`restore-test.sh`) y runbook operativo (`#239`).

### Changed

- **Docs:** SAD §7.3 y `docs/manual-scrum-master.md` §4 alineados con `docs/politica-proteccion-main.md` §2.4: el release `develop` → `main` se mergea con merge commit (no squash) y usa `Refs #N`; el despliegue a producción lo dispara el merge y la etiqueta anotada se crea después, por CLI (`#271`).
- **DevOps / Security:** SSH de la VPS solo con clave (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`), sin reenvío de agente ni X11, en los puertos 22 y 5371; revisión de dueños de `authorized_keys` (se quitaron una clave sin dueño y la del CI de Allmart); confirmación de que MargenX solo publica en `127.0.0.1`; y hallazgos fuera de alcance (`ufw` inactivo, puertos de otros proyectos en `0.0.0.0`, Postfix en el 25) en `infra/vps/README.md` §9 (`#266`).
- **Docs:** Actualización de `docs/process/revision-de-prs.md` §5 ítem 6 formalizando la medición obligatoria del 90 % de líneas en `frontend/` mediante `npm run test:coverage` y retirando la excepción temporal de cobertura no verificada (`#276`).
- **Docs:** Documentados los límites de ingesta, el contrato de error 413 y el runbook operativo en [docs/api.md](docs/api.md) y [docs/runbook-ingesta.md](docs/runbook-ingesta.md).
- **Docs:** Convención de ramas única `N-slug`, creada desde la issue con *Create a branch*, en la DoD, el manual del Scrum Master y el SAD (`#274`).
- **Docs:** Dirección de ingesta unificada como `precios-<slug>@margenx.tech` en el README (`#274`).
- **DevOps:** `proxy_http_version 1.1` en el ejemplo de Nginx de staging y guía para activar gzip en el Nginx del host, con verificación y reversión, en `infra/vps/README.md` §8 (`#233`).
- **DevOps:** Migración a Node 22 LTS en `backend/Dockerfile`, `frontend/Dockerfile`, el devcontainer y el CI (Node 20 salió de soporte). Quien tenga el devcontainer creado debe reconstruirlo (`#260`).
- **DevOps / CI:** El job `Backend Lint & Typecheck` pasa a llamarse `Backend Build & Tests`, porque no corre linter; el linter real del backend queda para el Sprint 6. Checks requeridos actualizados en `docs/politica-proteccion-main.md` (`#260`).
- **DevOps:** `auto-move-issues.yml` toma el número de issue solo de ramas con formato `N-slug`, para que las ramas de Dependabot no muevan tarjetas ajenas (`#260`).
- **DevOps:** `auto-move-issues.yml` omite los PRs y ramas de Dependabot (no reciben `PROJECT_TOKEN` ni tienen tarjeta), y `dependabot.yml` ignora las versiones mayores de npm, que se planifican como issue propia (`#305`).
- **QA:** `frontend/.env.test.example` y `frontend/tests/e2e/README.md` recomiendan para uso local las credenciales de la cuenta Demo (`backend/prisma/seed-demo.ts`) en vez de las del comercio piloto Panadería Central. **Pendiente, documentado explícitamente:** los 5 specs E2E todavía aseveran contra los datos de Panadería Central — no se reescribieron contra el catálogo de Demo en esta issue porque requiere acceso real a Clerk/CI para verificarlo sin arriesgar el pipeline; el secret de GitHub Actions tampoco se cambia hasta que esa reescritura esté hecha y verificada (`#268`).
- **Docs:** `infra/vps/README.md` §6 aclara que `/opt/margenx-infra` no es un repositorio git a propósito (es solo el destino de despliegue) y que `infra/vps/docker-compose.prod.yml`, ya versionado en este repositorio, es la fuente de verdad real que se copia ahí (`#268`).
- **Frontend:** Diálogos accesibles con teclado y lector de pantalla: todos los modales y bottom sheets (Insumos, Productos, nuevo producto, empaques de proveedor, historial de costos, cuarentena, cerrar sesión, cambios sin guardar y soporte) usan el componente compartido `Dialog` (`frontend/src/components/ui/dialog.tsx`, sobre `@base-ui/react`): el foco queda atrapado dentro del diálogo, Escape lo cierra, el foco vuelve al botón que lo abrió y cada diálogo anuncia su título y su descripción. El bloqueo de scroll del fondo lo hace el propio `Dialog` con `useBodyScrollLock` (se conserva el arreglo de iOS Safari de `#193`), así que las pantallas ya no lo llaman por cada modal; en `/productos/nuevo` queda solo para el desplegable de insumos. Se suma `@testing-library/user-event` (devDependency) para probar la navegación con Tab (`#262`).
- **QA:** Decisión documentada en `frontend/tests/e2e/smoke.spec.ts` de mantener el umbral local de 2000ms (sin subirlo a ciegas): medido en un entorno restringido, la carga fría de una página comparable fue de ~830ms, con margen real por debajo del límite (`#310`).
- **Backend:** Recálculo en cascada optimizado en lote (`applyBatchIngredientCostChanges`): en la ingesta masiva de listas de precios se consultan las recetas afectadas en una única operación `findMany` y cada producto se recalcula una sola vez consolidando todos los insumos modificados, reduciendo las consultas a base de datos y multiplicando la velocidad de procesamiento (`#259`).
- **Docs:** Especificación funcional sincronizada con el código: el canal de ingesta enlaza a ADR-005, el contrato de ingesta suma el 413 de 5 MB y la receta para el colaborador figura como disponible (`#269`).
- **Docs:** Notas de vigencia en ADR-001 y ADR-003 (enmendado por ADR-005) sin reescribir sus decisiones, y fecha definitiva de ADR-002 (`#269`).
- **Docs:** SAD 2.2: la integración con n8n distingue lo implementado de lo planificado y el backlog del Sprint 5 refleja el tablero; Smart Purchasing, el reporte PDF y la meta de Lighthouse pasan al Sprint 6 (`#269`).
- **Docs:** DoD §4: los datos de prueba son realistas de los rubros piloto, en las cuentas del seed o en Demo MargenX, nunca sobre la cuenta real de un comercio (`#269`).
- **Docs:** Documentos históricos marcados con nota al pie y `casos-prueba-sprint1.md` archivado en `docs/historicos/` (`#269`).

### Removed

- **Docs:** Documentación funcional y de dominio consolidada en `docs/especificacion-funcional.md`, tras fusionar los contenidos previos de los archivos dedicados a abastecimiento y diseño operativo en un único documento (`#274`).

### Fixed

- **Docs:** Eliminación de bloque de texto duplicado en la sección de listas de precios y cuarentena de `docs/manual-usuario/02-proveedores-y-listas.md`.
- **Frontend / Accesibilidad:** Navegación accesible por teclado en las tablas desktop de `/insumos` (`SuppliesTableDesktop`) y `/productos` (`ProductsPage`): las filas cuentan con `tabIndex={0}`, `role="button"`, contorno de foco perimetral canónico (`focus-visible:-outline-offset-2`) y activación con teclas `Enter` y `Espacio` (`UX-06`).
- **Frontend / Accesibilidad:** Incorporación de nombres accesibles en los buscadores de catálogo de `/insumos` y `/productos` mediante `aria-label`, y asociación explícita de `htmlFor` con `id="ingredient-current-cost"` en el campo de costo unitario de insumos (`UX-13`).
- **Frontend / UX:** El modal de compras mayoristas (`SupplierPackagingModal`) ahora muestra mensajes de error de validación adyacentes a cada campo con semántica ARIA (`aria-invalid`, `aria-describedby`) y enfoca automáticamente el primer campo con error al fallar el envío (Bug 1 - Entrega 5 / `UX-14`).
- **Backend:** Corregido el parser de números argentinos para costos en `backend/src/utils/argentineNumber.ts`: el punto solo se interpreta como separador de miles cuando cumple el patrón canónico `^-?\d{1,3}(\.\d{3})+$`; así, valores como `1234.567` se mantienen como decimal válido y no se multiplican por 1000. La corrección queda alineada con n8n y el frontend, y cierra la revisión de la issue `#247` / PR `#319` (`RV319-B1`).
- **Backend:** `POST /api/suppliers/:id/ingredients` acepta `supplierCode` y `rawDescription`, normaliza y valida el código (sin espacios externos y máximo 64 caracteres), evita duplicados por proveedor con respuesta `409` e indica el insumo que ya lo usa, y permite guardar la asociación sin código con aviso explícito de que no recibirá precios por ingesta.
- **Backend:** `POST /api/suppliers/:id/ingredients` valida la escala de cada columna: `packageSize` hasta 3 decimales y `9999999.999` (`Decimal(10,3)`; antes un valor mayor desbordaba la base) y `packagePrice` hasta 2 decimales (`[RV323-I1]`, `#242`).
- **QA:** `precision-aritmetica.test.ts` ya no depende del orden de ejecución: la matriz de comparación calcula los cuatro casos por su cuenta y pasa con `--sequence.shuffle` (`[RV323-I3]`).
- **Backend:** `POST`/`PUT /api/products` rechazan con `400` un `salePrice` menor o igual a cero cuando el producto tiene receta ("El precio de venta debe ser mayor a cero cuando el producto tiene ingredientes en su receta."); `salePrice: 0` queda permitido solo en borrador sin receta, lo que cierra la inconsistencia QA4-02. También rechazan con `400` un insumo repetido en la receta, montos con más de 2 decimales y cantidades con más de 3 decimales o fuera de la columna `Decimal(10,3)`. El nombre duplicado de producto pasa de `400` a `409 Conflict`, igual que insumos y proveedores (`#242`).
- **Frontend:** `/dashboard` e `/insumos` ya no muestran "0 productos en riesgo", "0 insumos" ni una lista vacía cuando la API falla (5xx) o no hay red: los indicadores se reemplazan por un estado de error con botón Reintentar, y mientras se reintenta se ve el estado de carga. Ante un fallo de red, estas pantallas y `/proveedores/cuarentena` muestran un texto en español y no el error técnico del navegador ("Failed to fetch") (`#257`).
- **Frontend:** La notificación de error o éxito (toast) ahora se muestra correctamente por encima de los modales abiertos (z-index elevado a 100) (`#322`).
- **Frontend:** El modal de compras mayoristas ahora advierte antes de cerrarse si hay cambios sin guardar, previniendo la pérdida accidental de datos (`#322`).
- **Backend / DevOps:** `seed.ts` ya no aborta en producción cuando los usuarios piloto tienen otro email que el seed: conserva el email y el `authProviderId` existentes. Ambos seeds restauran el nombre de un insumo, proveedor o producto renombrado (mismo ID) en vez de cortar la carga, y buscan nombres repetidos sin distinguir mayúsculas (`#240`).
- **DevOps:** `infra/vps/docker-compose.prod.yml` versiona las claves de Clerk separadas por entorno que ya corrían en la VPS (`CLERK_*_PROD` / `CLERK_*_DEV`) y fija `APP_BASE_URL` por servicio (`https://margenx.tech` en `backend-prod`, `https://dev.margenx.tech` en `backend-dev`); `infra/vps/.env.example` documenta las cuatro variables (`#240`).
- **Frontend / Backend:** El nombre del producto se guarda y se muestra tal como lo escribió el usuario ("Pan de Campo"): se quitó el `toLowerCase()` al guardar en `POST`/`PUT /api/products` y el `toUpperCase()` del listado. La unicidad de nombre por cuenta sigue siendo case-insensitive y queda cubierta por pruebas automatizadas (`#236`).
- **Security:** `/productos/nuevo` protegido con `AdminOnlyRoute`: un `COLLABORATOR` es redirigido a `/productos` (caso `TC-RBAC-04` en el E2E de RBAC) (`#236`).
- **QA:** Las 6 colecciones de Postman actualizadas al contrato vigente de la API — Insumos (paginación de la issue #36), Productos (`salePrice: 0` permitido a propósito y mensaje real de `salePrice` negativo), Webhooks (contrato de respuesta post-cuarentena) y Alertas de margen (orden de ejecución entre sus propios requests, mensaje de RBAC y campo `affectedProducts`), corrigiendo los fallos QA4-01 a QA4-04 de `docs/qa/reporte-calidad-sprint4.md` (`#264`).
- **QA:** `run-tests.sh` (Insumos) usaba un `accountId` que no corresponde a ninguna cuenta del seed; `run-tests-rbac-colaborador.sh` apuntaba al puerto 3021 en vez de 3000 (`#264`).
- **Backend:** Costo declarado de "Harina de trigo 000 Olavarriense" en el seed corregido de `742.98` a `736.25`, igual al costo activo real de su presentación mayorista por defecto (que siempre lo sobrescribía; el valor viejo nunca llegaba a la base y generaba confusión en revisiones). Se alinearon también la colección Postman `Alertas de margen (Insumos)` y `backend/scripts/check-ingredient-cost-change.ts`, que citaban la cifra vieja como si fuera la base real (`#265`).
- **QA:** `coverage/` agregado al `.gitignore` — quedaba sin rastrear después de correr `npm run test:coverage` (`#265`).
- **Security:** Se ocultó la cantidad de receta y los campos financieros para el rol `COLLABORATOR` en la API real y en la UI, y se cubrió con validación de regresión por endpoint y perfil.
- **Security:** Datos sensibles fuera del repositorio: los emails de los comercios piloto en `backend/prisma/seed.ts`, sus tests y la colección Postman de Webhooks pasan al dominio reservado para pruebas `seed.example.test` (RFC 2606); la contraseña del Postgres del devcontainer deja de ser `devpassword123`. Búsqueda confirmada sin coincidencias de emails reales, IP de la VPS ni esa contraseña fuera del historial (`#268`).
- **Docs:** `backend/.env.example` e `infra/vps/.env.example` sin variables muertas que no lee ningún archivo real (`N8N_WEBHOOK_URL`, `POSTGRES_DB`/`POSTGRES_PORT` sueltos, los 4 `*_PORT` de la app — todos los puertos de `docker-compose.prod.yml` están fijos, no son variables); `frontend/.env.example` suma `VITE_INACTIVITY_TIMEOUT_MS` (faltaba) y cambia el ejemplo de producción de una URL de Azure ya inexistente a los dominios reales de la VPS (`#268`).
- **QA:** `frontend/tests/e2e/margin-recalculation.spec.ts` ya no afirma que "el seed no crea recetas" ni que el formulario de costo "no tiene `noValidate`" — ambas cosas dejaron de ser ciertas (el seed sí vincula Harina 000 a la receta de Pan flauta, y `IngredientUpsertSheet.tsx` ya tiene `noValidate` con un input `type="text"`, no `type="number"`); se quitó el workaround que ya no hacía nada y se corrigió `INGREDIENT_BASE_COST` (`742.98` → `736.25`, desactualizada desde la corrección de la `#265`) (`#310`).
- **QA:** `frontend/tests/e2e/cascade-recalculation.spec.ts` dependía del orden del DOM para distinguir el link "Productos" del navbar de escritorio del de la barra inferior (`.last()`); ahora usa un `data-testid` estable agregado a `BottomNav` (`#310`).
- **QA:** `backend/scripts/get-test-token.ts` tenía los `authProviderId` de `panaderia-admin` y `panaderia-colab` desactualizados — la siembra de la cuenta Demo y pilotos en producción (`#240`) los cambió en `backend/prisma/seed.ts` pero no se reflejó en este script, y generar un token para `panaderia-admin` (el target por default) devolvía Bad Request de Clerk. Los de química no se vieron afectados (`#270`).

### Security

- **Backend:** `npm audit fix` sin `--force`: `body-parser` 2.4.0, `proxy-addr` 2.0.8, `qs` 6.16.1 y `source-map-js` 1.2.2. Las vulnerabilidades restantes requieren versiones mayores de `prisma`, `vitest` y `@vitest/coverage-v8` (`#233`).
- **Frontend:** Actualización compatible de dependencias vulnerables: `zod` 4.6.7, `fast-uri` 3.1.9, `undici` 7.30.1, `brace-expansion` 5.0.12 y `source-map-js` 1.2.2; 0 vulnerabilidades en producción. `vite`, `vitest` y `@vitest/mocker` (solo desarrollo) quedan pendientes: `npm audit fix` falla con un error interno del resolvedor de npm (`Cannot read properties of null (reading 'edgesOut')`) al recalcular sus dependencias peer (`#233`).
- **DevOps / CI:** El CI falla ante cualquier vulnerabilidad alta o crítica en dependencias de producción. Única excepción aceptada: `deepmerge-ts` (GHSA-ggr8-5vv4-36mx), que llega por `prisma` y se resuelve con Prisma 7 (`#260`).
- **Frontend:** SheetJS (`xlsx`) se instala en la versión 0.20.3 desde el CDN oficial de SheetJS (`https://cdn.sheetjs.com`), con su hash de integridad en `package-lock.json`. La 0.18.5, la última publicada en el registro de npm, tiene dos vulnerabilidades altas sin parche allí (GHSA-4r6h-8v6p-xvw6, contaminación de prototipo, y GHSA-5pgg-2g8v-p4x9, ReDoS). Además, el archivo se rechaza antes de leerlo si pesa más de 2 MB (`#252`).

## [0.5.0] - 2026-10-24 (Sprint 4: Recálculo en Cascada, Automatización n8n "Zero-Click" y Cuarentena)

### Added

- **Backend:** Recálculo en cascada transaccional masivo de costos y márgenes de recetas (`applyIngredientCostChange`) con guarda Zero-Variation al editar materias primas (`#28`, PR `#182`).
- **Backend:** Endpoint receptor de webhook `POST /api/webhooks/supplier-prices` protegido por cabecera de secreto criptográfico validado en tiempo constante (`#160`, PR `#183`).
- **Backend:** Filtro Anti-Pollution en base de datos para ingesta batch con descarte estricto de artículos no mapeados (`#161`, PR `#194`).
- **Backend:** Endpoints de auditoría, retención y resolución de precios de proveedores en cuarentena (`#162`, PR `#198`).
- **Backend:** Ajuste de contrato en `PUT /api/ingredients/:id` para reportar el total de recetas afectadas y el subconjunto de productos críticos (`#199`, PR `#205`).
- **Backend:** Webhook de ingesta masiva v2 con matching implícito de proveedor por código, descarte de códigos ambiguos o inactivos y retorno del contacto del dueño (`#200`, PR `#208`).
- **Backend:** Cuarentena de precios v2 con campo `pendingPackagePrice`, retención ante variaciones superiores al 50% o costos unitarios insuficientes, y conservación de precio vigente al rechazar (`#202`, PR `#213`).
- **Backend:** Migración relacional de base de datos para backfill de precios pendientes en presentaciones mayoristas legacy en cuarentena (`20261022100000_backfill_legacy_quarantine_pending_prices`).
- **Frontend:** Modularización arquitectónica de la Ficha Técnica de Producto (`/productos/[id]`): separación en `ProductMasterDataForm` y `ProductRecipeBOM` (`#163`, PR `#184`).
- **Frontend:** Modularización de controles analíticos de producto: `ProductSimulatorPanel`, `ProductFinancialCockpit`, `ProductMobileSimulatorSheet`, `ProductDeleteDialog` y `ProductRemoveIngredientDialog` (`#164`, PR `#190`).
- **Frontend:** Modularización de la Despensa de Insumos (`/insumos`): tablas desktop `SuppliesTableDesktop`, tarjetas táctiles `SuppliesCardsMobile`, `IngredientSupplierList` y modal `IngredientUpsertSheet` (`#165`, PR `#185`).
- **Frontend:** Modularización del Dashboard (`/dashboard`): componentes especializados `DashboardKpiCards`, `HealthDistributionHistogram` y `MonitoredCatalogGrid` (`#166`, PR `#192`).
- **Frontend:** Bandeja visual de cuarentena de precios (`/proveedores/cuarentena`) para listar, liberar y rechazar anomalías de proveedores con recálculo automático (`#203`, PR `#217`).
- **Frontend:** Cola secuencial de notificaciones Toast interactivas (`ToastAlert`) con soporte de descarte táctil (_swipe-to-dismiss_) para recálculos en cascada (`#168`, PR `#211`).
- **DevOps:** Infraestructura de correo perimetral con Cloudflare Email Routing Catch-All (`*@margenx.tech`) para habilitar alias virtuales comerciales por comercio (`precios+<slug>@margenx.tech`) (`#169`, PR `#186`).
- **DevOps:** Workflow n8n de ingesta: trigger IMAP vía IDLE sobre Gmail, extracción de slug comercial, parseo de planillas XLSX/XLS/CSV y normalización de columnas (`#170`, PR `#206`).
- **DevOps:** Workflow n8n de despacho HTTP con política de reintentos exponenciales ante fallos de red y armado de correo con resumen de importación al dueño (`#171`, PR `#207`).
- **DevOps:** Workflow n8n de alertas críticas de margen: despacho asíncrono SMTP vía Brevo Relay con plantilla HTML responsive accesible sin dependencias externas (`#172`, PR `#187`).
- **DevOps:** Script centinela `monitor-memory.sh` en el host VPS con inspección periódica de consumo de memoria RAM, top de contenedores Docker y alertas enriquecidas a Discord (`#173`, PR `#188`).
- **Datos:** Cuenta de demostración _Demo MargenX_ (usuarios ADMIN y COLLABORATOR, 2 proveedores, 8 insumos, 3 productos y un caso de cuarentena) mediante el script independiente `prisma/seed-demo.ts` y el comando `npm run seed:demo`, con confirmación explícita del destino vía `SEED_DEMO_CONFIRM` (`#220`, PR `#221`).
- **QA:** Protocolo, ejecución presencial y bitácora firmada de pruebas de ergonomía y usabilidad in-situ en 360px en _Química GyJ_ (`#174`, PR `#191`).
- **QA:** Suite de pruebas automatizadas E2E en Playwright para el recálculo en cascada (`cascade-recalculation.spec.ts`) (`#175`, PR `#216`).
- **QA:** Colección automatizada de pruebas de estrés y resiliencia en Postman/Newman para el webhook de ingesta con lotes de 3.000 filas y 95% de polución (`#176`, PR `#215`).
- **QA:** Suite de regresión general integral y matriz de clasificación de defectos de release (`#177`, PR `#218`).
- **Docs:** Actualización y sincronización del Documento de Arquitectura de Software (SAD v2.0) con topología de red VPS, C4 y diagramas UML (`#179`, PR `#189`).
- **Docs:** Registro de Decisión Arquitectónica ADR-004 formalizando la adopción del Margen Comercial sobre Ventas frente al Markup (`#180`, commit `e4af603`).
- **Docs:** Regularización del CHANGELOG v0.4.0 y rotación de Scrum Master (`#209`, PR `#210`).
- **Docs:** Consolidación de documentación de metodologías ágiles y Reporte de Entrega 5 UNaB (`docs/entregables/entrega-pps-sprint-4.md`) (`#181`).

### Changed

- **Frontend:** Actualización comercial de la Landing Page institucional (`/`) reflejando los casos de uso reales de _Panadería Central_ y _Química GyJ_ e ingesta Zero-Click (`#167`, PR `#197`).
- **Frontend:** Normalización y validación estricta de unidades de medida en formularios reactivos de insumos (`#201`, PR `#204`).
- **Datos:** Actualización del script de seed idempotente (`prisma/seed.ts`) con proveedores mayoristas reales (_Distribuidora MarJuanC_, _Don Roque_ y _Limpikorn_) y homologación de códigos SKU (`#178`, PR `#196`).
- **Testing:** Configuración de ejecución serial (`workers: 1`) en `playwright.config.ts` para evitar colisiones de concurrencia en pruebas E2E que mutan insumos compartidos.

### Fixed

- **Backend:** Los links de las alertas de margen respetan el entorno: el despachador envía `appBaseUrl` (desde `APP_BASE_URL`, opcional) y el workflow n8n lo valida contra una lista cerrada de dominios (`#222`, PR `#223`).
- **Frontend:** Corrección del scroll de fondo en modales sobre iOS Safari mediante bloqueo con `position: fixed` y conteo de referencias en `useBodyScrollLock` (`#193`, PR `#195`).
- **Frontend:** Eliminación del parpadeo visual (_zero-flicker_) y textos transitorios `NaN%` en badges de margen durante la resolución de sesión y rol en el Dashboard.
- **Backend:** Prevención de transacciones innecesarias en base de datos al editar insumos mediante guarda Zero-Variation (`previousCost.equals(nextCost)`) (`#28`, PR `#182`).
- **DevOps:** Confinamiento de memoria a 1024 MB y configuración de `NODE_OPTIONS=--max-old-space-size=768` en el contenedor n8n para prevenir fallos por agotamiento de heap al procesar planillas extensas.

### Security

- **Docs:** Limpieza de datos sensibles en la documentación y los archivos de ejemplo: mails de cuentas piloto, contraseña de ejemplo y datos de conexión del VPS reemplazados por etiquetas y placeholders (`#224`, PR `#225`).
- **Backend:** Autenticación por cabecera de secreto criptográfico (`x-margenx-webhook-secret`) evaluada con `crypto.timingSafeEqual` para mitigar ataques de timing en el webhook de ingesta (`#160`).
- **Backend:** Aislamiento multi-tenant estricto por slug comercial y purga de códigos de artículo ambiguos presentes en múltiples proveedores activos (`#200`).

## [0.4.0] - 2026-10-10 (Sprint 3: Dashboard de Rentabilidad, Roles RBAC y Dominio Multi-Proveedor)

### Added

- **Backend:** Modelos Prisma `Supplier`, `SupplierIngredient` y `PriceHistory` con seed de referencia (`#116`).
- **Backend:** CRUD de proveedores con registro transaccional automático del historial de precios (`#117`).
- **Backend:** Conversión de empaques mayoristas a costo unitario equivalente y proveedor predeterminado (`#118`).
- **Backend:** Middleware RBAC que sanitiza campos de costo, margen y proveedores para el rol `COLLABORATOR` (`#119`).
- **Backend:** Endpoints de métricas consolidadas del Dashboard (`#120`).
- **Backend:** Upsert de precios de presentación de proveedor, en reemplazo del `409 Conflict` al reasociar (`#153`).
- **Frontend:** Dashboard con métricas reales de la API, semáforo de margen e histograma de distribución (`#121`, `#122`).
- **Frontend:** Adaptación de la UI por rol para ocultar datos financieros a colaboradores (`#123`).
- **Frontend:** Gestión de proveedores por insumo con calculadora de empaques en vivo (`#124`).
- **Frontend:** Historial de variaciones de costo por insumo (`#125`) y comparativa de proveedores con acción de predeterminado (`#152`).
- **QA:** Protocolo de pruebas in-situ en 360px (`#126`), suite E2E de seguridad RBAC (`#127`) y colección Postman de precisión de conversión (`#128`).
- **DevOps:** Imágenes Docker multi-stage, límites de memoria por contenedor y rotación de logs en el VPS (`#129`).

### Changed

- **Frontend:** Ficha técnica con inputs estáticos, botonera de margen normalizada y ordenamiento del Dashboard por margen ascendente (`#108`, `#110`, `#111`).
- **Frontend:** Redondeo ascendente del margen sugerido con `Math.ceil` (`#109`).
- **DevOps:** Puerto de Postgres replegado a `127.0.0.1:5435` (`#129`).

### Fixed

- **Frontend:** Blindaje de la UI ante campos ausentes en respuestas sanitizadas para `COLLABORATOR` (`#149`).

### Security

- **Frontend:** Diálogos de confirmación al descartar el modal de insumos, remover insumos de una receta y cerrar sesión (`#112`, `#113`, `#114`).
- **Backend:** Sanitización financiera server-side para el rol `COLLABORATOR` (`#119`).

## [0.3.0] - 2026-10-02 (Sprint 2: MVP Core — Recetas Compuestas, Cálculo en Vivo y Despliegue en Producción)

### Added

- **DevOps:** Puesta a punto y despliegue del entorno oficial de Producción (`https://margenx.tech`) bajo HTTPS con Nginx, Docker Compose y base aislada `margenx_prod` (`#81`).
- **DevOps:** Integración de la suite de pruebas E2E de Playwright en GitHub Actions (`ci.yml`) con bloqueo de PRs defectuosos y reportes HTML como artefactos (`#80`).
- **Backend:** Motor de cálculo financiero con tipos `Prisma.Decimal` para costos unitarios, costo total de receta y porcentaje de margen, respaldado por tests unitarios (`#75`).
- **Frontend:** Editor interactivo de recetas compuestas (BOM) con selector dinámico de insumos y cálculo reactivo en memoria ($<50\text{ ms}$) mediante Zustand (`#76`).
- **Frontend:** Vista dinámica de Detalle, Edición y Eliminación de Producto en `/productos/:id` con soporte de fichas con y sin receta (`#78`).
- **Frontend:** Conexión de API REST para persistencia de productos y recetas con manejo de skeletons y estados de error (`#79`).
- **Frontend:** Persistencia de margen global en perfil de comercio y sistema de jerarquía de margen por producto individual (`#91`).
- **Frontend:** Modal de confirmación de abandono de pantalla ante cambios no guardados para prevenir pérdidas de datos (`#99`).
- **QA:** Dataset oficial de 20 productos con recetas compuestas complejas (BOM) integrado al script de seed idempotente (`#90`).
- **QA:** Suite automatizada de pruebas E2E de recálculo de margen en cascada y aislamiento de datos en Playwright (`#47`).
- **QA:** Batería de validación de precisión aritmética en fórmulas financieras y análisis de casos borde (división por cero y costos nulos) (`#77`).

### Changed

- **Frontend:** Simulador financiero y selector de insumos adaptados para viewports tablet y mobile (`<1024px` con base en `360px`) (`#98`).
- **Frontend:** Hardening de rendimiento, persistencia de estado local y optimización de renderizado en vistas críticas (`#94`).
- **Frontend:** UI Polish general, integración del logotipo vectorizado de MargenX, toasts interactivos y estilización de inputs bajo Dark Mode (`#100`).

### Fixed

- **Backend:** Persistencia transaccional atómica de recetas compuestas con `prisma.$transaction` y mecanismo anti-double submit para evitar duplicaciones (`#92`).

### Security

- **Backend:** Validación de límites numéricos decimales máximos en DTOs con Zod para prevenir desbordes numéricos en PostgreSQL/Prisma ante entradas anómalas (`#102`).

## [0.2.0] - 2026-09-18 (Sprint 1: Insumos, Productos Base y Hardening)

### Added (Terminado y Mergeado)

- **DevOps:** Runner headless de Playwright (Chromium) en GitHub Actions (`ci.yml`) y preconfiguración SSL de producción (Nginx/Certbot) en VPS Donweb (`#68`).
- **QA:** Suite global de autenticación persistente con Clerk y smoke test E2E en Playwright (`#69`).
- **Backend:** Endpoints CRUD de Productos y Recetas con soporte borrador y transacciones ACID (`#65`).
- **QA:** Colección automatizada de pruebas de API en Postman/Newman para el módulo de Productos (`#64`).
- **DevOps:** Notificaciones automáticas de estado de CI/CD en Discord vía Webhooks (`#63`).
- **Docs:** Sincronización de arquitectura VPS consolidada, SAD y plan de entregas (`#62`).
- **Frontend:** Integración con `<ClerkProvider>`, rutas protegidas y consumo autenticado de API (`#60`).
- **DevOps:** Pipeline de Despliegue Continuo (CD) hacia VPS Donweb vía Docker Hub, SSH y Nginx Reverse Proxy (`#40` via PR `#58`).
- **DevOps:** Automatización de migraciones de Prisma en el pipeline de deploy mediante contenedor efímero con mecanismo de fallo seguro (`#41` via PR `#59`).
- **Backend:** Middleware global de captura, formateo y estandarización de errores HTTP (`#35` via PR `#51`).
- **Backend:** Paginación y ordenamiento (Sorting) nativo en base de datos para la API de Insumos (`#36` via PR `#57`).
- **Frontend:** Maquetado responsivo Mobile-First de vistas de Insumos y Productos con tablas, badges y Empty States (`#31` via PR `#53`).
- **Frontend:** Formularios de Insumos y Productos con validación estricta Zod y React Hook Form (`#32` via PR `#55`).
- **QA:** Script ejecutable de Seed idempotente (`prisma/seed.ts`) con dataset verídico de comercios piloto (`#30` via PR `#52`).
- **QA:** Redacción de Casos de Prueba manuales en formato Gherkin para Insumos y Productos (`#39` via PR `#54`).
- **QA:** Colección de pruebas automatizadas de API en Postman/Newman para el módulo de Insumos (`#37` via PR `#56`).

---

## [0.1.0] - 2026-09-04 (Sprint 0: Setup y Fundaciones)

### Added (Agregado)

- **DevOps:** Configuración de entorno aislado con VS Code DevContainers (Node 20, TypeScript, PostgreSQL 16 local).
- **DevOps:** Pipeline de Integración Continua (CI) en GitHub Actions (`ci.yml`) con verificación de lint, typecheck y compilación.
- **DevOps:** Automatización de tablero Kanban mediante GraphQL API (`auto-move-issues.yml`).
- **Infra:** Despliegue en VPS propia de PostgreSQL 16 y orquestador n8n bajo subdominio con certificado SSL.
- **Backend:** Modelo relacional base en Prisma (`Account`, `User`, `Ingredient`, `Product`, `ProductIngredient`).
- **Backend:** Middleware de autenticación delegada (`authMiddleware`) con verificación asimétrica de JWT mediante Clerk.
- **Backend:** Endpoints CRUD para gestión de Insumos (`/api/ingredients`) con aislamiento multi-tenant y tipos `Decimal`.
- **Backend:** Extensión no destructiva del modelo `Account` con campos comerciales (`isActive`, `trialEndsAt`).
- **Frontend:** Inicialización de React 19 con Vite, Tailwind CSS v4 y React Router v7.
- **Frontend:** Maquetado responsivo Mobile-First con Bottom Navigation Bar (360px) y catálogo base.
- **Frontend:** Soporte nativo para Modo Oscuro / Modo Claro y unificación visual bajo la marca MargenX.
- **Frontend:** Prototipado interactivo de constructor de recetas y simulador de ajuste de precios de venta.
- **QA:** Setup inicial de Playwright para pruebas E2E y matriz de pruebas con 10 casos en formato Gherkin.
- **QA:** Dataset verídico de validación (Seed Data) relevado con comercios reales (Panadería Central y Química GyJ).
- **Docs:** Registros de Decisiones de Arquitectura iniciales (ADR-001, ADR-002, ADR-003) y Acta de Cierre de Sprint 0.
</file>

</files>
