export function parseNumeroAR(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value).trim();

  // Si hay coma, la coma es decimal y los puntos son miles
  if (str.includes(',')) {
    const sinPuntos = str.replace(/\./g, '');
    return sinPuntos.replace(',', '.').replace(/[^0-9.-]/g, '');
  }

  // Si no hay coma, pero hay exactamente un punto seguido de 3 dígitos al final
  // Ej: "1.234" -> 1234
  if (/^-?\d+\.\d{3}$/.test(str)) {
    return str.replace(/\./g, '').replace(/[^0-9.-]/g, '');
  }

  // Cualquier otro caso (ej: "12.5", "1.234.567" que no matchea arriba, etc.)
  // Se asume que el punto es decimal o ya está en formato estándar.
  return str.replace(/[^0-9.-]/g, '');
}

export function formatNumeroAR(value: string | number | undefined | null, maxDecimals = 2): string {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);

  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(num);
}