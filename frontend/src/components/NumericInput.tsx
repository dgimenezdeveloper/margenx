import React, { useState, useEffect } from 'react';
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
  ({ value, onChange, onBlur, onFocus, error, prefixSymbol, prefixClassName, suffixSymbol, suffixClassName, className, containerClassName, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        if (value !== undefined && value !== null && value !== '') {
          setDisplayValue(formatNumeroAR(value));
        } else {
          setDisplayValue('');
        }
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(e.target.value);
      if (onChange) {
        onChange(parseNumeroAR(e.target.value));
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsed = parseNumeroAR(e.target.value);
      if (parsed !== '') {
        setDisplayValue(formatNumeroAR(parsed));
      } else {
        setDisplayValue('');
      }
      if (onChange) {
        onChange(parsed);
      }
      if (onBlur) onBlur(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    return (
      <div className="w-full">
        <div className={cn(
          "flex items-center transition",
          error ? "border-rose-500" : "",
          containerClassName
        )}>
          {prefixSymbol && <span className={cn("text-gray-400 mr-2", prefixClassName)}>{prefixSymbol}</span>}
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={cn("w-full bg-transparent outline-none", className)}
            {...props}
          />
          {suffixSymbol && <span className={cn("text-gray-400 ml-1", suffixClassName)}>{suffixSymbol}</span>}
        </div>
        {error && <p className="mt-1 text-xs font-bold text-rose-500">{error}</p>}
      </div>
    );
  }
);
NumericInput.displayName = 'NumericInput';