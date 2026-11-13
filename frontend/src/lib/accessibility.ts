/**
 * Utilidades y constantes de accesibilidad (WCAG AA).
 * MargenX - Sprint 6 (#361)
 */

/**
 * Clases canónicas de foco perimetral accesible (WCAG AA - Criterio 2.4.7 y 1.4.11).
 * Garantiza un contorno nítido de 2px con offset de 2px y ratio de contraste >= 3:1
 * tanto en fondos claros como oscuros.
 */
export const CANONICAL_FOCUS_CLASSES =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400 focus-visible:ring-0 focus:outline-none';

/**
 * Clases base canónicas para inputs y controles de texto accesibles.
 */
export const CANONICAL_INPUT_CLASSES =
  `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${CANONICAL_FOCUS_CLASSES}`;

/**
 * Clases base para botones interactivos con foco visible uniforme.
 */
export const CANONICAL_BUTTON_FOCUS_CLASSES = CANONICAL_FOCUS_CLASSES;