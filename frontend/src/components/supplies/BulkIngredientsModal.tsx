import React, { useState } from 'react';
import { X, FileDown, UploadCloud, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { CANONICAL_FOCUS_CLASSES } from '../../lib/accessibility';

interface BulkIngredientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type TabType = 'valid' | 'duplicates' | 'errors';

export const BulkIngredientsModal: React.FC<BulkIngredientsModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('valid');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Tipado explícito como number para evitar el error TS2367 de superposición literal
  const [validCount] = useState<number>(18);
  const [duplicateCount] = useState<number>(2);
  const [errorCount] = useState<number>(1);

  const handleDownloadTemplate = () => {
    // Descarga de planilla de ejemplo
  };

  const handleConfirmUpload = () => {
    setIsProcessing(true);
    try {
      onSuccess();
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Cargar Insumos desde Planilla
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Importá materias primas en lote usando formato Excel (.xlsx) o CSV.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${CANONICAL_FOCUS_CLASSES}`}
            aria-label="Cerrar modal de importación"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <UploadCloud className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Planilla lista para importar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                insumos_noviembre.xlsx (21 filas)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 ${CANONICAL_FOCUS_CLASSES}`}
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Descargar Plantilla
          </button>
        </div>

        {/* Pestañas con foco canónico */}
        <div
          role="tablist"
          aria-label="Clasificación de filas importadas"
          className="flex space-x-2 border-b border-slate-200 dark:border-slate-800"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'valid'}
            aria-controls="panel-valid"
            id="tab-valid"
            tabIndex={activeTab === 'valid' ? 0 : -1}
            onClick={() => setActiveTab('valid')}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'valid'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            } ${CANONICAL_FOCUS_CLASSES}`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Válidas ({validCount})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'duplicates'}
            aria-controls="panel-duplicates"
            id="tab-duplicates"
            tabIndex={activeTab === 'duplicates' ? 0 : -1}
            onClick={() => setActiveTab('duplicates')}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'duplicates'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            } ${CANONICAL_FOCUS_CLASSES}`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Repetidas ({duplicateCount})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'errors'}
            aria-controls="panel-errors"
            id="tab-errors"
            tabIndex={activeTab === 'errors' ? 0 : -1}
            onClick={() => setActiveTab('errors')}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'errors'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            } ${CANONICAL_FOCUS_CLASSES}`}
          >
            <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
            Con error ({errorCount})
          </button>
        </div>

        <div className="py-4">
          {activeTab === 'valid' && (
            <div
              id="panel-valid"
              role="tabpanel"
              aria-labelledby="tab-valid"
              className="max-h-48 overflow-y-auto text-xs text-slate-600 dark:text-slate-300"
            >
              Se crearán {validCount} nuevos insumos en el catálogo.
            </div>
          )}
          {activeTab === 'duplicates' && (
            <div
              id="panel-duplicates"
              role="tabpanel"
              aria-labelledby="tab-duplicates"
              className="max-h-48 overflow-y-auto text-xs text-amber-700 dark:text-amber-400"
            >
              {duplicateCount} insumos ya existen en la cuenta y se omitirán sin modificar su costo vigente.
            </div>
          )}
          {activeTab === 'errors' && (
            <div
              id="panel-errors"
              role="tabpanel"
              aria-labelledby="tab-errors"
              className="max-h-48 overflow-y-auto text-xs text-rose-700 dark:text-rose-400"
            >
              Fila 21: El costo no es un formato numérico válido. Escribilo como 1.234,56.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${CANONICAL_FOCUS_CLASSES}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || validCount === 0}
            onClick={handleConfirmUpload}
            className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${CANONICAL_FOCUS_CLASSES}`}
          >
            {isProcessing ? 'Procesando...' : `Confirmar (${validCount})`}
          </button>
        </div>
      </div>
    </Dialog>
  );
};