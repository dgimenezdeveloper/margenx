import React from 'react';
import { CANONICAL_INPUT_CLASSES } from '../../lib/accessibility';

interface ProductMasterDataFormProps {
  name: string;
  salePrice: number;
  minMarginPercent: number;
  isCollaborator?: boolean;
  disabled?: boolean;
  onChangeName: (value: string) => void;
  onChangeSalePrice: (value: number) => void;
  onChangeMinMarginPercent: (value: number) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const ProductMasterDataForm: React.FC<ProductMasterDataFormProps> = ({
  name,
  salePrice,
  minMarginPercent,
  isCollaborator = false,
  disabled = false,
  onChangeName,
  onChangeSalePrice,
  onChangeMinMarginPercent,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950 sm:p-6"
      noValidate
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
        Datos Principales del Producto
      </h2>

      {/* Campo 1: Nombre del Producto */}
      <div>
        <label
          htmlFor="product-name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Nombre del producto
        </label>
        <input
          id="product-name"
          name="name"
          type="text"
          required
          disabled={disabled || isCollaborator}
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Ej: Pan de campo — 1 kg"
          className={CANONICAL_INPUT_CLASSES}
          aria-describedby="product-name-hint"
        />
        <p id="product-name-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Denominación comercial visible en catálogo y comandas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Campo 2: Precio de Venta al Público (Input nativo sin dependencias faltantes) */}
        <div>
          <label
            htmlFor="product-sale-price"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Precio de venta ($)
          </label>
          <input
            id="product-sale-price"
            name="salePrice"
            type="number"
            step="0.01"
            min="0"
            disabled={disabled || isCollaborator}
            value={salePrice === 0 ? '' : salePrice}
            onChange={(e) => onChangeSalePrice(parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className={CANONICAL_INPUT_CLASSES}
            aria-describedby="product-sale-price-hint"
          />
          <p id="product-sale-price-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Importe final cobrado en mostrador o salón.
          </p>
        </div>

        {/* Campo 3: Margen Mínimo Esperado */}
        {!isCollaborator && (
          <div>
            <label
              htmlFor="product-min-margin"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Margen mínimo esperado (%)
            </label>
            <input
              id="product-min-margin"
              name="minMarginPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              disabled={disabled}
              value={minMarginPercent === 0 ? '' : minMarginPercent}
              onChange={(e) => onChangeMinMarginPercent(parseFloat(e.target.value) || 0)}
              placeholder="30"
              className={CANONICAL_INPUT_CLASSES}
              aria-describedby="product-min-margin-hint"
            />
            <p id="product-min-margin-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Umbral que enciende el semáforo rojo ante aumentos.
            </p>
          </div>
        )}
      </div>
    </form>
  );
};