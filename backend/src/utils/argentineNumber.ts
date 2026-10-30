import { Prisma } from '@prisma/client';

const MAX_MONEY_VALUE = new Prisma.Decimal('99999999.99');

/**
 * Normaliza valores numéricos que llegan en formato argentino o decimal estándar.
 *
 * Soporta ejemplos como:
 * - "1.234,56" => 1234.56
 * - "1234,56" => 1234.56
 * - "1234.56" => 1234.56
 * - "1.234.567" => 1234567
 *
 * El objetivo es compartir la misma interpretación entre la carga masiva de
 * insumos y la validación del alta manual, sin depender del webhook de ingesta.
 */
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

  if (text.includes(',') && text.includes('.')) {
    const lastCommaIndex = text.lastIndexOf(',');
    const lastDotIndex = text.lastIndexOf('.');

    if (lastCommaIndex > lastDotIndex) {
      return text.replace(/\./g, '').replace(',', '.');
    }

    return text.replace(/,/g, '');
  }

  if (text.includes(',')) {
    return text.replace('.', '').replace(',', '.');
  }

  if (text.includes('.')) {
    const segments = text.split('.');
    if (segments.length > 2) {
      return segments.join('');
    }

    const integerPart = segments[0];
    const decimalPart = segments[1] ?? '';
    if (decimalPart.length > 0 && decimalPart.length <= 2) {
      return text;
    }

    return text.replace(/\./g, '');
  }

  return text;
}
