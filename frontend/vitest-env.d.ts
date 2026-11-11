/// <reference types="vitest/globals" />
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import type { ExpectStatic } from 'vitest'

// Vitest 5 ya no lee jest.Matchers, que es donde '@testing-library/jest-dom'
// declara sus matchers (toBeInTheDocument, toHaveAttribute, etc.). Se suman a
// Matchers<R, T>, la interfaz que Vitest 5 documenta para extender expect.
// El primer argumento es el matcher asimétrico que aceptan los matchers de
// texto, igual que en la integración de jest-dom con Jest.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars -- fusión de declaraciones: TypeScript exige repetir <R, T> de Vitest y la interfaz solo hereda los matchers.
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<ReturnType<ExpectStatic['stringContaining']>, R> {}
}
