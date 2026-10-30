import { Prisma } from '@prisma/client';

const MAX_MONEY_VALUE = new Prisma.Decimal('99999999.99');

export function parseArgentineDecimal(value: unknown, fieldName = 'valor'): Prisma.Decimal {
  if (value === undefined || value === null) {
    throw new Error(`El campo "${fieldName}" es obligatorio.`);
  }

  const rawText = typeof value === 'string' ? value.trim() : String(value).trim();
  if (rawText === '') {
    throw new Error(`El campo "${fieldName}" es obligatorio.`);
  }

  const normalized = normalizeArgentineDecimal(rawText);
  if (!normalized || !Number.isFinite(Number(normalized))) {
    throw new Error(`El campo "${fieldName}" debe ser un valor decimal válido.`);
  }

  const decimalValue = new Prisma.Decimal(normalized);
  if (decimalValue.abs().greaterThan(MAX_MONEY_VALUE)) {
    throw new Error('El insumo no puede superar $99.999.999,99.');
  }

  return decimalValue;
}

function normalizeArgentineDecimal(rawText: string): string {
  const text = rawText.replace(/\s+/g, '');

  if (!/[\d,\.]/.test(text)) {
    return '';
  }

  // 1. Si contiene coma (separador decimal canónico en Argentina)
  if (text.includes(',')) {
    // Si contiene más de una coma, sintaxis inválida (ej. "12,34,56")
    if ((text.match(/,/g) || []).length > 1) {
      return '';
    }

    const lastCommaIndex = text.lastIndexOf(',');
    const lastDotIndex = text.lastIndexOf('.');

    // Formato con miles y decimal: "1.234,56"
    if (lastDotIndex >= 0 && lastCommaIndex > lastDotIndex) {
      return text.replace(/\./g, '').replace(',', '.');
    }

    // Formato inverso o punto accidental previo: limpia puntos y cambia coma a punto
    return text.replace(/\./g, '').replace(',', '.');
  }

  // 2. Si no contiene coma:
  // Caso A: Separadores de miles estándar con puntos (ej: "1.234", "15.000", "1.500.000")
  // Exige de 1 a 3 dígitos iniciales seguidos de bloques de exactamente 3 dígitos.
  if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    return text.replace(/\./g, '');
  }

  // Caso B: Múltiples puntos que no cumplen formato de miles (ej: "1.2.3" o "12.34.56") -> Inválido
  if ((text.match(/\./g) || []).length > 1) {
    return '';
  }

  // Caso C: Un único punto decimal (ej: "12.5", "1234.56", "1234.567") o entero sin puntos (ej: "1500")
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return text;
  }

  return '';
}