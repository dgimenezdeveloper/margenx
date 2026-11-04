'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  X,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import {
  parseSpreadsheet,
  classifyIngredientRows,
  downloadTemplateFile,
  type ClassifiedIngredientBatch,
} from '@/lib/bulkIngredients'
import { ingredientService, type BulkUploadResponse } from '@/services/ingredientService'
import { ApiError } from '@/services/api'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface BulkIngredientsModalProps {
  isOpen: boolean
  onClose: () => void
  existingSupplies: Array<{ name: string }>
  onSuccess: (result: BulkUploadResponse) => void
}

type TabType = 'valid' | 'errors' | 'duplicates'

export function BulkIngredientsModal({
  isOpen,
  onClose,
  existingSupplies,
  onSuccess,
}: BulkIngredientsModalProps) {
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [batch, setBatch] = useState<ClassifiedIngredientBatch | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('valid')
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null)

  useBodyScrollLock(isOpen)

  const handleReset = () => {
    setFileName(null)
    setBatch(null)
    setActiveTab('valid')
    setIsParsing(false)
    setIsSubmitting(false)
    setErrorBanner(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleModalClose = () => {
    handleReset()
    onClose()
  }

  const handleFileSelected = async (file: File) => {
    setErrorBanner(null)
    setIsParsing(true)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const rawRows = parseSpreadsheet(buffer)

      if (rawRows.length === 0) {
        setErrorBanner('La planilla seleccionada está vacía o no contiene filas con datos.')
        setBatch(null)
        setIsParsing(false)
        return
      }

      if (rawRows.length > 500) {
        setErrorBanner('La lista supera el tope de 500 filas por lote. Por favor dividila en archivos más pequeños.')
        setBatch(null)
        setIsParsing(false)
        return
      }

      const classified = classifyIngredientRows(rawRows, existingSupplies)
      setBatch(classified)

      // Selecciona automáticamente la pestaña con mayor prioridad informativa
      if (classified.valid.length > 0) {
        setActiveTab('valid')
      } else if (classified.errors.length > 0) {
        setActiveTab('errors')
      } else {
        setActiveTab('duplicates')
      }
    } catch {
      setErrorBanner('No se pudo leer el archivo. Asegurate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.')
      setBatch(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleFileSelected(file)
    }
  }

  const handleConfirmImport = async () => {
    if (!batch || batch.valid.length === 0) return

    setIsSubmitting(true)
    setErrorBanner(null)

    try {
      const payload = batch.valid.map((r) => ({
        name: r.name,
        unit: r.unit,
        cost: r.cost,
      }))

      const response = await ingredientService.bulkUpload(getToken, payload)
      setUploadResult(response)
      onSuccess(response)
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof ApiError ? err.message : 'Error inesperado al importar los insumos.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
      <div className="fixed inset-0" onClick={handleModalClose} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-modal-title"
        className="relative z-10 w-full max-w-2xl rounded-t-3xl border border-transparent bg-white p-5 shadow-2xl md:rounded-3xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />

        {/* Cabecera */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="size-4" />
              <span>Importación por Planilla</span>
            </div>
            <h2 id="bulk-modal-title" className="mt-1 text-lg font-bold text-gray-900 dark:text-white md:text-xl">
              Carga Masiva de Insumos
            </h2>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="flex size-9 min-h-11 min-w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Mensaje de error general */}
        {errorBanner && (
          <div className="mt-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {errorBanner}
          </div>
        )}

        {/* Cuerpo dinámico */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {/* Pantalla final de resultado exitoso */}
          {uploadResult ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  ¡Importación finalizada!
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  La base de datos se actualizó correctamente con las filas válidas procesadas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {uploadResult.created}
                  </p>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    Insumos Creados
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                    {uploadResult.skipped}
                  </p>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                    Omitidos (Repetidos)
                  </p>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="w-full text-left rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  <p className="font-bold">Observaciones del servidor ({uploadResult.errors.length}):</p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {uploadResult.errors.map((e, idx) => (
                      <li key={idx}>Fila {e.row}: {e.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : !batch ? (
            /* Pantalla inicial: Descarga de plantilla y subida de archivo */
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                    <Download className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-100">
                      Plantilla oficial de importación
                    </h3>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                      Columnas: <strong>Nombre</strong>, <strong>Unidad</strong> (kg, l, u) y <strong>Costo</strong> (ej. 1.234,56).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplateFile}
                  className="min-h-11 inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100/60 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
                >
                  Descargar Excel
                </button>
              </div>

              {/* Zona de Drop / Selección de Archivo */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-indigo-500"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 mb-3">
                  {isParsing ? (
                    <LoaderCircle className="size-6 animate-spin" />
                  ) : (
                    <UploadCloud className="size-6" />
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {isParsing ? 'Leyendo planilla...' : 'Elegir archivo Excel (.xlsx) o CSV'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                  Arrastrá o seleccioná tu lista. El archivo se analiza de forma privada en tu navegador sin subirse entero a la red.
                </p>
                <button
                  type="button"
                  disabled={isParsing}
                  className="mt-4 min-h-11 inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  Examinar archivos
                </button>
              </div>
            </div>
          ) : (
            /* Pantalla intermedia: Vista previa y resumen categorizado */
            <div className="space-y-4">
              {/* Barra de archivo seleccionado */}
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2 truncate">
                  <FileSpreadsheet className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold truncate text-gray-900 dark:text-white">
                    {fileName}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    ({batch.totalRows} filas leídas)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-11 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="size-3" /> Cambiar
                </button>
              </div>

              {/* Métricas del Lote */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('valid')}
                  className={`min-h-11 rounded-2xl border p-2.5 text-center transition cursor-pointer ${
                    activeTab === 'valid'
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <span className="block text-lg font-black text-emerald-700 dark:text-emerald-400">
                    {batch.valid.length}
                  </span>
                  <span className="block text-[11px] font-bold text-gray-600 dark:text-gray-300">
                    Válidas
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('duplicates')}
                  className={`min-h-11 rounded-2xl border p-2.5 text-center transition cursor-pointer ${
                    activeTab === 'duplicates'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-amber-950/40'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <span className="block text-lg font-black text-amber-600 dark:text-amber-400">
                    {batch.duplicates.length}
                  </span>
                  <span className="block text-[11px] font-bold text-gray-600 dark:text-gray-300">
                    Repetidas
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('errors')}
                  className={`min-h-11 rounded-2xl border p-2.5 text-center transition cursor-pointer ${
                    activeTab === 'errors'
                      ? 'border-rose-600 bg-rose-50 ring-2 ring-rose-500/20 dark:border-rose-500 dark:bg-rose-950/40'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <span className="block text-lg font-black text-rose-600 dark:text-rose-400">
                    {batch.errors.length}
                  </span>
                  <span className="block text-[11px] font-bold text-gray-600 dark:text-gray-300">
                    Con error
                  </span>
                </button>
              </div>

              {/* Contenido de la pestaña activa */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-gray-900">
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {activeTab === 'valid' && (
                    batch.valid.length === 0 ? (
                      <p className="p-6 text-center text-xs text-gray-400">
                        No hay filas válidas listas para importar en este archivo.
                      </p>
                    ) : (
                      batch.valid.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs">
                          <div className="truncate mr-2">
                            <strong className="block font-bold text-gray-900 dark:text-white truncate">
                              {r.name}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              Fila {r.rowNumber} · Unidad: {r.unit}
                            </span>
                          </div>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                            {r.costFormatted} / {r.unit}
                          </span>
                        </div>
                      ))
                    )
                  )}

                  {activeTab === 'duplicates' && (
                    batch.duplicates.length === 0 ? (
                      <p className="p-6 text-center text-xs text-gray-400">
                        No se detectaron nombres repetidos en la planilla.
                      </p>
                    ) : (
                      batch.duplicates.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs bg-amber-50/30 dark:bg-amber-950/20">
                          <div className="truncate mr-2">
                            <strong className="block font-bold text-gray-900 dark:text-white truncate">
                              {r.name}
                            </strong>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400">
                              Fila {r.rowNumber} · {r.reason}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-500 shrink-0">
                            {r.costFormatted} / {r.unit}
                          </span>
                        </div>
                      ))
                    )
                  )}

                  {activeTab === 'errors' && (
                    batch.errors.length === 0 ? (
                      <p className="p-6 text-center text-xs text-gray-400">
                        ¡Excelente! No hay errores de formato en ninguna fila.
                      </p>
                    ) : (
                      batch.errors.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs bg-rose-50/30 dark:bg-rose-950/20">
                          <div className="truncate mr-2">
                            <strong className="block font-bold text-rose-900 dark:text-rose-200 truncate">
                              {r.name}
                            </strong>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400">
                              Fila {r.rowNumber} · Motivo: {r.reason}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 shrink-0">
                            {r.rawCost || 'sin costo'}
                          </span>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="shrink-0 border-t border-gray-100 pt-3 flex gap-3 dark:border-gray-800">
          <button
            type="button"
            onClick={handleModalClose}
            className="flex-1 min-h-11 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
          >
            {uploadResult ? 'Cerrar' : 'Cancelar'}
          </button>

          {!uploadResult && batch && (
            <button
              type="button"
              disabled={isSubmitting || batch.valid.length === 0}
              onClick={handleConfirmImport}
              className="flex-1 min-h-11 cursor-pointer rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <span>Confirmar ({batch.valid.length} válidas)</span>
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}