import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/*
  Barrido de estilo oración (#497, decisión del Tech Lead del 27/11): en títulos, botones y rótulos va
  mayúscula solo en la primera palabra ("Guardar margen", "Cerrar sesión"), como pide la RAE para los
  títulos en español. Revisa los textos de src/ (cadenas y texto JSX), sin comentarios ni pruebas, y
  busca una palabra con mayúscula en el medio que no sea un nombre propio ni el nombre de una pantalla.
*/
// Vitest corre desde frontend/ (npm test y el job "Frontend Unit Tests").
const SRC = resolve(process.cwd(), 'src')

// La portada la reescribe #494: se suma al barrido cuando entre.
const SIN_REVISAR = new Set(['app/page.tsx'])

/**
 * Palabras que van con mayúscula en medio de un texto:
 * - nombres propios (marcas, navegadores, servicios y los ejemplos de los comercios piloto);
 * - el nombre de una pantalla del menú cuando el texto lleva a ella ("Ir a Proveedores", "desde Insumos");
 * - los estados del catálogo ("En riesgo", "Pérdida") y los nombres de botones, pestañas o columnas que el texto cita.
 */
const PERMITIDAS = new Set([
  // Marcas, servicios y sistemas
  'MargenX', 'Mercado', 'Pago', 'WhatsApp', 'Chrome', 'Safari', 'Edge', 'Android', 'iPhone', 'Excel', 'Drive', 'Clerk',
  'Vercel', 'Analytics', 'Google', 'Discord', 'Profesional',
  // Pantallas del menú (navbar.tsx y bottom-nav.tsx)
  'Inicio', 'Insumos', 'Productos', 'Ventas', 'Proveedores', 'Impacto', 'Perfil',
  // Estados del catálogo (lib/healthBucket.ts)
  'En', 'Pérdida', 'Borrador', 'Superávit',
  // Botones, pestañas y columnas que se citan por su nombre
  'Agregar', 'Actualizar', 'Instalar', 'Ahora', 'Crear', 'Repetidas', 'Con', 'Nombre', 'Unidad', 'Costo', 'Activo', 'Activa',
  // Pantalla y botón de Cuarentena, cuando el texto lleva a ella ("Revisar en Cuarentena")
  'Cuarentena',
  // Datos de ejemplo de los comercios piloto (placeholders y plantilla de carga)
  'Medialunas', 'Pan', 'Detergente', 'Molino', 'Olavarriense', 'Av', 'Pringles', 'Olavarría', 'Silvia', 'Leche', 'Harina',
])

function archivosFuente(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : archivosFuente(ruta)
    return /\.tsx?$/.test(entrada.name) && !/\.(test|spec)\.|\.d\.ts$/.test(entrada.name) ? [ruta] : []
  })
}

/** Textos visibles: empiezan con mayúscula y tienen más de una palabra (deja afuera clases, rutas y claves). */
function textosDe(ruta: string): Array<{ linea: number; texto: string }> {
  const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true)
  const textos: Array<{ linea: number; texto: string }> = []
  const visitar = (nodo: ts.Node) => {
    let texto: string | null = null
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) texto = nodo.text
    else if (ts.isTemplateExpression(nodo)) texto = [nodo.head.text, ...nodo.templateSpans.map((s) => s.literal.text)].join(' … ')
    else if (nodo.kind === ts.SyntaxKind.JsxText) texto = nodo.getText()
    if (texto) {
      const limpio = texto.replace(/\s+/g, ' ').trim()
      if (/^[¿¡]?[A-ZÁÉÍÓÚÑ]/.test(limpio) && limpio.includes(' ') && !/[{}=;<>]|https?:|^\//.test(limpio)) {
        textos.push({ linea: fuente.getLineAndCharacterOfPosition(nodo.getStart()).line + 1, texto: limpio })
      }
    }
    ts.forEachChild(nodo, visitar)
  }
  visitar(fuente)
  return textos
}

/**
 * Palabras con mayúscula que no empiezan una oración: después de ". ", ": ", "· " o "→ " sí puede ir,
 * y tampoco cuenta lo que va entre comillas, que cita un texto de otra pantalla o del navegador.
 */
function mayusculasEnElMedio(texto: string): string[] {
  const palabras = texto.split(' ')
  return palabras.filter((palabra, i) => {
    if (i === 0) return false
    const anterior = palabras[i - 1]
    if (/[.!?:·•→]$/.test(anterior) || /^[“"]/.test(palabra)) return false
    const limpia = palabra.replace(/^[(“"'¿¡]+|[)”"',.:;!?]+$/g, '')
    return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(limpia) && !PERMITIDAS.has(limpia)
  })
}

describe('Barrido de estilo oración en títulos y botones (#497)', () => {
  it('ningún texto lleva mayúscula en una palabra del medio, salvo nombres propios y nombres de pantallas', () => {
    const encontrados = archivosFuente(SRC)
      .filter((ruta) => !SIN_REVISAR.has(relative(SRC, ruta)))
      .flatMap((ruta) =>
        textosDe(ruta)
          .filter(({ texto }) => mayusculasEnElMedio(texto).length > 0)
          .map(({ linea, texto }) => `${relative(SRC, ruta)}:${linea} → ${texto}`)
      )

    expect(encontrados).toEqual([])
  })

  it('el barrido detecta las mayúsculas de título y deja pasar nombres propios y pantallas', () => {
    expect(mayusculasEnElMedio('Guardar Margen')).toEqual(['Margen'])
    expect(mayusculasEnElMedio('Perfil y Configuración')).toEqual(['Configuración'])
    expect(mayusculasEnElMedio('Guardar margen')).toEqual([])
    expect(mayusculasEnElMedio('Compartir por WhatsApp')).toEqual([])
    expect(mayusculasEnElMedio('Ir a Proveedores')).toEqual([])
    expect(mayusculasEnElMedio('Turno abierto. Contá la plata')).toEqual([])
    expect(mayusculasEnElMedio('En la ventana de impresión, elegí "Guardar como PDF".')).toEqual([])
  })
})
