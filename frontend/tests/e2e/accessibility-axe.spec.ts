/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accesibilidad automática con axe (issue #442, `[RV387-I1]`).
 *
 * Corre axe sobre las pantallas con sesión de ADMIN (proyecto `chromium`), en claro y oscuro,
 * a 360 px (DoD §5) y en escritorio. Falla con violaciones `serious` o `critical`; el resto
 * (`moderate` y `minor`) se informa en el reporte: `test-results/axe/`, que el CI sube como
 * artefacto `axe-accesibilidad` y resume en el reporte del job.
 *
 * Límite con #398: Lighthouse mide los puntajes; esta suite revisa en cada PR que no vuelvan
 * a aparecer violaciones graves.
 */

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>
type Violation = AxeResults['violations'][number]
type Theme = 'claro' | 'oscuro'

const BLOCKING_IMPACTS = new Set(['serious', 'critical'])
const REPORT_DIR = 'test-results/axe'

/**
 * Reglas excluidas del corte: id de la regla de axe → motivo.
 * Solo para una violación que no se puede corregir antes de la entrega (28/11). La regla sigue
 * corriendo y figura en el reporte como excluida; cada exclusión se anota también en
 * `docs/qa/reporte-calidad-sprint7.md` §5. Hoy no hay ninguna.
 */
const EXCLUDED_RULES: Readonly<Record<string, string>> = {}

interface Screen {
  /** Orden en el reporte. */
  order: string
  name: string
  slug: string
  open: (page: Page) => Promise<void>
}

const SCREENS: Screen[] = [
  {
    order: '01',
    name: 'Ficha del producto',
    slug: 'producto-ficha',
    open: async (page) => {
      await page.goto('/productos')
      // A 360 px el catálogo son tarjetas con enlace; en escritorio, filas de una tabla.
      const product = page
        .getByRole('link', { name: /Pan flauta — 1 kg/i })
        .or(page.getByRole('button', { name: /Pan flauta — 1 kg/i }))
      await product.click()
      await expect(page).toHaveURL(/\/productos\/(?!nuevo$)[^/]+$/)
      await expect(page.getByRole('heading', { name: 'Composición / receta' })).toBeVisible()
    },
  },
  {
    order: '02',
    name: 'Nuevo producto',
    slug: 'producto-nuevo',
    open: async (page) => {
      await page.goto('/productos/nuevo')
      await expect(page.getByLabel('Nombre del producto')).toBeVisible()
    },
  },
  {
    order: '03',
    name: 'Insumos',
    slug: 'insumos',
    open: async (page) => {
      await page.goto('/insumos')
      await expect(page.getByRole('heading', { name: 'Todos los insumos' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Harina de trigo 000 Olavarriense/i })).toBeVisible()
    },
  },
  {
    order: '04',
    name: 'Carga desde planilla',
    slug: 'planilla',
    open: async (page) => {
      await page.goto('/insumos')
      await expect(page.getByRole('heading', { name: 'Todos los insumos' })).toBeVisible()
      await page.getByRole('button', { name: 'Cargar desde planilla' }).click()
      await expect(page.getByRole('dialog', { name: 'Cargar insumos desde una planilla' })).toBeVisible()
    },
  },
  {
    order: '05',
    name: 'Panel',
    slug: 'dashboard',
    open: async (page) => {
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { name: 'Distribución de salud financiera' })).toBeVisible()
    },
  },
]

const VIEWPORTS = [
  { name: '360px', width: 360, height: 800 },
  { name: 'escritorio', width: 1280, height: 800 },
] as const

const THEMES: Theme[] = ['claro', 'oscuro']

/** Lo que la prueba usa dentro del navegador: `tsconfig.node.json` no trae los tipos del DOM. */
interface BrowserGlobals {
  localStorage: { setItem: (key: string, value: string) => void }
  document: {
    getAnimations: () => { playState: string; effect: { getComputedTiming: () => { iterations?: number } } | null }[]
  }
}

/** Espera a que terminen las transiciones (apertura de diálogos, esqueletos que se van). Las animaciones infinitas no cuentan. */
async function waitForAnimations(page: Page) {
  await page.waitForFunction(() =>
    (globalThis as unknown as BrowserGlobals).document
      .getAnimations()
      .every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity),
  )
}

function describeViolation(violation: Violation): string {
  const targets = violation.nodes.map((node) => node.target.join(' ')).join(' | ')
  return `${violation.impact} · ${violation.id}: ${violation.help} (${violation.nodes.length}) → ${targets}`
}

function markdownReport(title: string, results: AxeResults): string {
  const lines = [`### ${title}`, '']
  if (results.violations.length === 0) {
    lines.push('Sin violaciones.')
  } else {
    lines.push('| Impacto | Regla | Qué pide | Elementos | Corta el CI |', '|---|---|---|---|---|')
    for (const violation of results.violations) {
      const excluded = EXCLUDED_RULES[violation.id]
      const blocks = BLOCKING_IMPACTS.has(violation.impact ?? '')
      const cut = excluded ? `No: excluida (${excluded})` : blocks ? 'Sí' : 'No'
      lines.push(`| ${violation.impact} | \`${violation.id}\` | ${violation.help} | ${violation.nodes.length} | ${cut} |`)
    }
  }
  const review = results.incomplete.map((rule) => `\`${rule.id}\` (${rule.nodes.length})`)
  lines.push('', `Para revisar a mano (axe no pudo decidir): ${review.length > 0 ? review.join(', ') : 'nada'}.`, '')
  return lines.join('\n')
}

for (const viewport of VIEWPORTS) {
  test.describe(`TC-AXE: accesibilidad con axe a ${viewport.name} (issue #442)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const screen of SCREENS) {
      for (const theme of THEMES) {
        test(`${screen.name} en ${theme}: sin violaciones serious ni critical`, async ({ page }, testInfo) => {
          // index.html aplica el tema guardado antes de pintar.
          await page.addInitScript(
            (value) => (globalThis as unknown as BrowserGlobals).localStorage.setItem('theme', value),
            theme === 'oscuro' ? 'dark' : 'light',
          )
          await screen.open(page)
          if (theme === 'oscuro') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
          else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
          await waitForAnimations(page)

          const results = await new AxeBuilder({ page }).analyze()

          const title = `${screen.name} · ${viewport.name} · ${theme}`
          const file = `${REPORT_DIR}/${screen.order}-${screen.slug}-${viewport.name}-${theme}`
          mkdirSync(REPORT_DIR, { recursive: true })
          writeFileSync(`${file}.json`, JSON.stringify({ title, url: new URL(page.url()).pathname, violations: results.violations }, null, 2))
          writeFileSync(`${file}.md`, markdownReport(title, results))
          await testInfo.attach('axe', { path: `${file}.json`, contentType: 'application/json' })

          const blocking = results.violations
            .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? '') && !EXCLUDED_RULES[violation.id])
            .map(describeViolation)
          expect(blocking, `Violaciones serious o critical en ${title}`).toEqual([])
        })
      }
    }
  })
}
