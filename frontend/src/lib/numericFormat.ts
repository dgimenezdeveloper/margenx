export function parseNumeroAR(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value).trim();
  if (!str) return '';

  // 1. Si hay coma decimal:
  // En Argentina la coma es el separador decimal y los puntos son separadores de miles.
  if (str.includes(',')) {
    // Más de una coma es sintaxis inválida (ej: "12,34,56")
    if ((str.match(/,/g) || []).length > 1) {
      return '';
    }

    const sinPuntos = str.replace(/\./g, '');
    const normalizado = sinPuntos.replace(',', '.');

    // Validamos que sea un número sintácticamente correcto
    if (!/^-?\d+(\.\d+)?$/.test(normalizado)) {
      return '';
    }
    return normalizado;
  }

  // 2. Si no hay coma:
  // Caso A: Grupos estándar de miles con puntos (ej: "1.234", "12.345", "1.500.000", "12.345.678")
  // Exige de 1 a 3 dígitos iniciales seguidos de uno o más bloques de exactamente 3 dígitos.
  if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) {
    return str.replace(/\./g, '');
  }

  // Caso B: Múltiples puntos que NO cumplen el formato de miles (ej: "1.2.3" o "12.34.56") -> Inválido
  if ((str.match(/\./g) || []).length > 1) {
    return '';
  }

  // Caso C: Un solo punto decimal (ej: "12.5", "1234.56", "12345.678") o entero sin puntos (ej: "1500")
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    return str;
  }

  // Cualquier otro texto con caracteres no numéricos (ej: "abc", "12a")
  return '';
}

export function formatNumeroAR(value: string | number | undefined | null, maxDecimals = 2): string {
  if (value === undefined || value === null || value === '') return '';

  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else {
    const parsedStr = parseNumeroAR(String(value));
    // Si parseNumeroAR devolvió vacío (por ser texto inválido), retornamos vacío inmediatamente.
    // Esto evita que Number("") evalúe a 0 en JavaScript y formatee "0" por error.
    if (parsedStr === '') return '';
    num = Number(parsedStr);
  }

  if (isNaN(num) || !Number.isFinite(num)) return '';

  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(num);
}