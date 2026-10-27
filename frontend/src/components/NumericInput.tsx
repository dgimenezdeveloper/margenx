import React, { useState, useEffect, useRef } from 'react';
import { parseNumeroAR, formatNumeroAR } from '@/lib/numericFormat';
import { cn } from '@/lib/utils';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string | number;
  onChange?: (val: string) => void;
  error?: string;
  prefixSymbol?: string;
  prefixClassName?: string;
  suffixSymbol?: string;
  suffixClassName?: string;
  containerClassName?: string;
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
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState(() => {
      if (value !== undefined && value !== null && value !== '') {
        return formatNumeroAR(value);
      }
      return '';
    });

    const isFocusedRef = useRef(false);
    const lastEmittedValueRef = useRef<string | undefined>(
      value !== undefined && value !== null && value !== '' ? parseNumeroAR(value) : undefined
    );

    // Sincroniza displayValue únicamente cuando `value` cambia desde el exterior
    useEffect(() => {
      const incoming = value !== undefined && value !== null && value !== '' ? String(value) : '';
      const parsedIncoming = parseNumeroAR(incoming);

      // Si el valor externo difiere de lo último emitido (ej. reset, sugerencia de margen, etc.)
      if (parsedIncoming !== lastEmittedValueRef.current) {
        lastEmittedValueRef.current = parsedIncoming;
        if (!isFocusedRef.current) {
          setDisplayValue(incoming !== '' ? formatNumeroAR(incoming) : '');
        }
      }
    }, [value]);

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
        setDisplayValue(formatNumeroAR(parsed));
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
      <div className="w-full">
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