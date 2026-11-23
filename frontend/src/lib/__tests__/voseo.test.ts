import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/*
  Barrido de voseo (#436): los textos de la app le hablan al dueño de "vos", nunca de "tú" ni de "usted".
  Revisa solo los textos (cadenas, plantillas y texto JSX) de src/, sin comentarios ni pruebas,
  para que un comentario como "vuelve a pedir la página" no cuente.
*/
// Vitest corre desde frontend/ (npm test y el job "Frontend Unit Tests").
const SRC = resolve(process.cwd(), 'src')

function archivosFuente(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : archivosFuente(ruta)
    return /\.tsx?$/.test(entrada.name) && !/\.(test|spec)\.|\.d\.ts$/.test(entrada.name) ? [ruta] : []
  })
}

function textosDe(ruta: string): Array<{ linea: number; texto: string }> {
  const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true)
  const textos: Array<{ linea: number; texto: string }> = []
  const visitar = (nodo: ts.Node) => {
    let texto: string | null = null
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) texto = nodo.text
    else if (ts.isTemplateExpression(nodo)) texto = [nodo.head.text, ...nodo.templateSpans.map((s) => s.literal.text)].join(' … ')
    else if (nodo.kind === ts.SyntaxKind.JsxText) texto = nodo.getText()
    if (texto && /[a-záéíóúñ]{2,}\s+[a-záéíóúñ]/i.test(texto)) {
      textos.push({ linea: fuente.getLineAndCharacterOfPosition(nodo.getStart()).line + 1, texto: texto.replace(/\s+/g, ' ') })
    }
    ts.forEachChild(nodo, visitar)
  }
  visitar(fuente)
  return textos
}

// Formas de "tú" y de "usted" sin ambigüedad. Los imperativos van al empezar la oración,
// porque en el medio pueden ser tercera persona ("MargenX guarda…").
const TU_O_USTED = [
  /\b(tienes|puedes|quieres|necesitas|deseas|debes|aquí tienes|has (sumado|olvidado|ingresado))\b/i,
  /\b(haz clic|regístrese|ingrese|seleccione|intente|verifique|contacte)\b/i,
  /(^|[.!?¿¡:]\s+)(Ingresa|Selecciona|Agrega|Revisa|Verifica|Abre|Calcula|Marca|Inicia|Configura|Elige|Escribe|Vuelve|Intenta|Toca|Presiona|Busca|Completa|Asegúrate|Recuerda|Registra|Haz)\b/,
  /\b(e intenta|y toca|e ingresa|y selecciona)\b/i,
]

describe('Barrido de voseo en los textos de la app (#436)', () => {
  it('ningún texto le habla al dueño de "tú" ni de "usted"', () => {
    const encontrados = archivosFuente(SRC).flatMap((ruta) =>
      textosDe(ruta)
        .filter(({ texto }) => TU_O_USTED.some((patron) => patron.test(texto)))
        .map(({ linea, texto }) => `${relative(SRC, ruta)}:${linea} → ${texto}`)
    )

    expect(encontrados).toEqual([])
  })
})
