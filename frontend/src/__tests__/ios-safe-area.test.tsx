import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { Dialog, DialogPortal, DialogSheet, DialogTitle } from '@/components/ui/dialog'

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

  it('los diálogos que salen desde abajo dejan sus botones fuera de la zona segura', () => {
    render(
      <Dialog open>
        <DialogPortal>
          <DialogSheet>
            <DialogTitle>Editar presentación</DialogTitle>
          </DialogSheet>
        </DialogPortal>
      </Dialog>
    )

    // p-6 abajo, o la zona segura si es mayor (la línea de inicio del iPhone)
    expect(screen.getByRole('dialog', { name: 'Editar presentación' })).toHaveClass(
      'pb-[max(1.5rem,env(safe-area-inset-bottom))]'
    )
  })

  it('en horizontal, el contenido no llega hasta la muesca: el body suma la zona segura de los costados', () => {
    const css = readFrontendFile('src/index.css')
    const bodyRules = [...css.matchAll(/(?:^|\n)body\s*\{([^}]*)\}/g)].map((match) => match[1]).join('\n')

    expect(bodyRules).toMatch(/padding-left:\s*env\(safe-area-inset-left\)/)
    expect(bodyRules).toMatch(/padding-right:\s*env\(safe-area-inset-right\)/)
  })
})
