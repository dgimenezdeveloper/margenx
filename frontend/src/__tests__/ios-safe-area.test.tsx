import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// process.cwd() apunta a la raíz del paquete frontend durante la ejecución de Vitest
const readFrontendFile = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8')

describe('Zona segura de iOS en la app instalada (#406)', () => {
  it('el viewport declara viewport-fit=cover para que iOS informe env(safe-area-inset-*)', () => {
    const html = readFrontendFile('index.html')
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)

    expect(viewport, 'Falta la etiqueta meta viewport en index.html').not.toBeNull()
    const directives = viewport![1].split(',').map((directive) => directive.trim())

    // Sin viewport-fit=cover, iOS devuelve 0 en env(safe-area-inset-bottom) y la línea de
    // inicio queda sobre las etiquetas de la BottomNav (hallazgo H1 de #383).
    expect(directives).toContain('viewport-fit=cover')
    expect(directives).toContain('width=device-width')
    expect(directives).toContain('initial-scale=1.0')
  })
})
