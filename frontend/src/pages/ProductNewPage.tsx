import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { CANONICAL_FOCUS_CLASSES, CANONICAL_INPUT_CLASSES } from '../lib/accessibility';

export const ProductNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [minMarginPercent, setMinMarginPercent] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Ingresá el nombre del producto.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      navigate('/productos');
    } catch {
      setErrorMessage('Error al crear el producto. Intentalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/productos')}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${CANONICAL_FOCUS_CLASSES}`}
          aria-label="Volver al catálogo de productos"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          Nuevo Producto
        </h1>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950 sm:p-6 space-y-4">
          <div>
            <label
              htmlFor="new-product-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nombre del producto
            </label>
            <input
              id="new-product-name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Medialunas de manteca — docena"
              className={CANONICAL_INPUT_CLASSES}
              aria-describedby="new-product-name-hint"
            />
            <p id="new-product-name-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nombre con el que se identificará el producto.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-product-sale-price"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Precio de venta ($)
              </label>
              <input
                id="new-product-sale-price"
                name="salePrice"
                type="number"
                step="0.01"
                min="0"
                value={salePrice === 0 ? '' : salePrice}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className={CANONICAL_INPUT_CLASSES}
                aria-describedby="new-product-price-hint"
              />
              <p id="new-product-price-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Puede ser $0 si se guarda inicialmente como borrador sin receta.
              </p>
            </div>

            <div>
              <label
                htmlFor="new-product-min-margin"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Margen mínimo esperado (%)
              </label>
              <input
                id="new-product-min-margin"
                name="minMarginPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={minMarginPercent === 0 ? '' : minMarginPercent}
                onChange={(e) => setMinMarginPercent(parseFloat(e.target.value) || 0)}
                placeholder="30"
                className={CANONICAL_INPUT_CLASSES}
                aria-describedby="new-product-margin-hint"
              />
              <p id="new-product-margin-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Porcentaje objetivo de rentabilidad para alertas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/productos')}
            className={`rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${CANONICAL_FOCUS_CLASSES}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${CANONICAL_FOCUS_CLASSES}`}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Guardando...' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  );
};