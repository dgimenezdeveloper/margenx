/**
 * Formatos de impresión del ticket y del resumen del cierre de caja: ticketera de 58 u 80 mm
 * u hoja A4 (también para guardar como PDF). El contenido impreso lleva la clase `mx-ticket`.
 */
export type PrintFormat = '58' | '80' | 'A4'

export const PRINT_FORMATS: Array<{ value: PrintFormat; label: string }> = [
  { value: '58', label: 'Ticketera 58 mm' },
  { value: '80', label: 'Ticketera 80 mm' },
  { value: 'A4', label: 'Hoja A4' },
]

/**
 * Hoja, margen y ancho de lo impreso para cada formato.
 *
 * En la ticketera, el papel es el rollo de la impresora (58 u 80 mm) y lo pone su driver: la
 * regla solo fija el margen y el ancho del ticket. Un `size: 58mm auto` no serviría: no es un
 * valor válido y el navegador lo descarta. En A4 la hoja es fija.
 *
 * En la ticketera el logo sale en negro puro (la impresora térmica no tiene color y el violeta
 * saldría gris) y sin el lema, para ahorrar papel. En A4 y en el PDF, el logo va en color y con
 * el lema. El `!important` gana sobre el logo invertido del modo oscuro.
 */
const THERMAL_BRAND_CSS = '.mx-ticket-logo { filter: grayscale(1) brightness(0) !important; } .mx-ticket-tagline { display: none; }'

export const PRINT_CSS: Record<PrintFormat, string> = {
  '58': `@page { margin: 2mm; } .mx-ticket { width: 54mm; font-size: 11px; } .mx-ticket-logo { width: 34mm; } ${THERMAL_BRAND_CSS}`,
  '80': `@page { margin: 3mm; } .mx-ticket { width: 74mm; font-size: 12px; } .mx-ticket-logo { width: 44mm; } ${THERMAL_BRAND_CSS}`,
  A4: '@page { size: A4; margin: 15mm; } .mx-ticket { width: 100mm; font-size: 13px; } .mx-ticket-logo { width: 56mm; filter: none !important; }',
}
