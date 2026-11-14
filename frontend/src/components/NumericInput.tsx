import React, { useState, useEffect, useRef } from 'react';
import { parseNumeroAR, formatNumeroAR } from '@/lib/numericFormat';
import { cn } from '@/lib/utils';

// Formato canónico: el que emite onChange y el de String(número) (punto decimal, sin miles)
const CANONICAL_REGEX = /^-?\d+(\.\d+)?$/;

/**
 * Normaliza la prop `value` a formato canónico. Las props llegan del estado del formulario,
 * que guarda lo que emitió onChange: "1.250" es 1,25 y no mil doscientos cincuenta.
 */
function toCanonical(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const str = value.trim();
  return CANONICAL_REGEX.test(str) ? str : parseNumeroAR(str);
}

function toDisplay(value: string | number | undefined | null, maxDecimals: number): string {
  const canonical = toCanonical(value);
  return canonical === '' ? '' : formatNumeroAR(Number(canonical), maxDecimals);
}

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string | number;
  onChange?: (val: string) => void;
  error?: string;
  prefixSymbol?: string;
  prefixClassName?: string;
  suffixSymbol?: string;
  suffixClassName?: string;
  containerClassName?: string;
  /** Decimales que se muestran al formatear (por defecto 2). Las cantidades de receta usan 3. */
  maxDecimals?: number;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      onFocus,
      error,
      prefixSymbol,
      prefixClassName,
      suffixSymbol,
      suffixClassName,
      className,
      containerClassName,
      maxDecimals = 2,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState(() => toDisplay(value, maxDecimals));

    const isFocusedRef = useRef(false);
    const lastEmittedValueRef = useRef<string | undefined>(toCanonical(value) || undefined);

    // Sincroniza displayValue únicamente cuando `value` cambia desde el exterior
    useEffect(() => {
      const incoming = toCanonical(value);
      const lastEmitted = lastEmittedValueRef.current ?? '';
      // Mismo número que lo último emitido ("1.250" y "1.25" son iguales): es el eco de onChange
      const isEcho = incoming === lastEmitted || (incoming !== '' && lastEmitted !== '' && Number(incoming) === Number(lastEmitted));

      // Si el valor externo difiere de lo último emitido (ej. reset, sugerencia de margen, etc.)
      if (!isEcho) {
        lastEmittedValueRef.current = incoming;
        if (!isFocusedRef.current) {
          setDisplayValue(toDisplay(incoming, maxDecimals));
        }
      }
    }, [value, maxDecimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      const parsed = parseNumeroAR(raw);
      lastEmittedValueRef.current = parsed;
      if (onChange) {
        onChange(parsed);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      const raw = e.target.value;
      const parsed = parseNumeroAR(raw);

      if (parsed !== '') {
        // `parsed` ya es canónico: se formatea como número para no releer "1.250" como 1250
        setDisplayValue(formatNumeroAR(Number(parsed), maxDecimals));
      } else {
        setDisplayValue('');
      }

      lastEmittedValueRef.current = parsed;
      if (onChange) {
        onChange(parsed);
      }
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      if (onFocus) {
        onFocus(e);
      }
    };

    return (
      <div>
        <div
          className={cn(
            'flex items-center transition',
            error ? 'border-rose-500' : '',
            containerClassName
          )}
        >
          {prefixSymbol && (
            <span className={cn('text-gray-400 mr-2', prefixClassName)}>{prefixSymbol}</span>
          )}
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={cn('w-full bg-transparent outline-none', className)}
            {...props}
          />
          {suffixSymbol && (
            <span className={cn('text-gray-400 ml-1', suffixClassName)}>{suffixSymbol}</span>
          )}
        </div>
        {error && <p className="mt-1 text-xs font-bold text-rose-500">{error}</p>}
      </div>
    );
  }
);

NumericInput.displayName = 'NumericInput';