'use client'

import { useAuth } from '@clerk/clerk-react'
import {
  AlertTriangle,
  CheckCircle2,
  CopyX,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react'
import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPortal,
  DialogSheet,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BULK_ACCEPTED_EXTENSIONS,
  BULK_MAX_ROWS,
  BULK_UNIT_LABELS,
  analyzeIngredientSheet,
  buildBulkPayload,
  describeBatchProblem,
  downloadTemplateFile,
  mapServerErrorsToSheetRows,
  validateSpreadsheetFile,
  type ClassifiedIngredientBatch,
} from '@/lib/bulkIngredients'
import { readSpreadsheet } from '@/lib/spreadsheet'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { ingredientService, type BulkUploadResponse } from '@/services/ingredientService'

interface BulkIngredientsModalProps {
  isOpen: boolean
  onClose: () => void
  existingSupplies: ReadonlyArray<{ name: string }>
  onSuccess: (result: BulkUploadResponse) => void
}

type Stage =
  | { name: 'pick' }
  | { name: 'reading'; fileName: string }
  | { name: 'review'; fileName: string; batch: ClassifiedIngredientBatch }
  | { name: 'importing'; fileName: string; batch: ClassifiedIngredientBatch }
  | { name: 'done'; fileName: string; batch: ClassifiedIngredientBatch; result: BulkUploadResponse }

type TabId = 'valid' | 'duplicates' | 'errors'

const STEP_LABELS = ['Archivo', 'Revisión', 'Resultado'] as const

const FILE_ACCEPT = [
  ...BULK_ACCEPTED_EXTENSIONS,
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',')

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`

function stepIndex(stage: Stage): number {
  if (stage.name === 'done') return 2
  if (stage.name === 'review' || stage.name === 'importing') return 1
  return 0
}

function firstTabWithRows(batch: ClassifiedIngredientBatch): TabId {
  if (batch.valid.length > 0) return 'valid'
  if (batch.errors.length > 0) return 'errors'
  return 'duplicates'
}

export function BulkIngredientsModal({ isOpen, onClose, existingSupplies, onSuccess }: BulkIngredientsModalProps) {
  const { getToken } = useAuth()
  const [stage, setStage] = useState<Stage>({ name: 'pick' })
  const [activeTab, setActiveTab] = useState<TabId>('valid')
  const [notice, setNotice] = useState<string | null>(null)

  const reset = () => {
    setStage({ name: 'pick' })
    setActiveTab('valid')
    setNotice(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (open || stage.name === 'importing') return
    reset()
    onClose()
  }

  const handleFile = async (file: File) => {
    setNotice(null)
    const fileError = validateSpreadsheetFile(file)
    if (fileError) {
      setNotice(fileError)
      return
    }

    setStage({ name: 'reading', fileName: file.name })
    try {
      const analysis = analyzeIngredientSheet(await readSpreadsheet(await file.arrayBuffer()), existingSupplies)
      if (!analysis.ok) {
        setNotice(describeBatchProblem(analysis.problem))
        setStage({ name: 'pick' })
        return
      }
      setActiveTab(firstTabWithRows(analysis.batch))
      setStage({ name: 'review', fileName: file.name, batch: analysis.batch })
    } catch {
      setNotice('No pudimos leer el archivo. Abrilo en Excel, guardalo como .xlsx o .csv y volvé a subirlo.')
      setStage({ name: 'pick' })
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplateFile()
    } catch {
      setNotice('No se pudo generar la plantilla. Revisá tu conexión y volvé a intentarlo.')
    }
  }

  const handleImport = async () => {
    if (stage.name !== 'review' || stage.batch.valid.length === 0) return
    const { fileName, batch } = stage

    setNotice(null)
    setStage({ name: 'importing', fileName, batch })
    try {
      const result = await ingredientService.bulkUpload(getToken, buildBulkPayload(batch.valid))
      setStage({ name: 'done', fileName, batch, result })
      onSuccess(result)
    } catch (error: unknown) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : 'No pudimos guardar los insumos. Revisá tu conexión y volvé a intentarlo: no se cargó nada.'
      )
      setStage({ name: 'review', fileName, batch })
    }
  }

  const currentStep = stepIndex(stage)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogSheet className="flex max-h-[92dvh] flex-col p-0 md:max-h-[85vh] md:max-w-2xl">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" aria-hidden="true" />

          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-3 md:px-6 md:pt-6 dark:border-gray-800">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="size-4" aria-hidden="true" />
                Carga desde planilla
              </p>
              <DialogTitle className="mt-1 text-xl md:text-2xl">Cargar insumos desde una planilla</DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Revisá cómo queda tu lista antes de guardarla. El archivo se lee en tu dispositivo.
              </DialogDescription>
            </div>
            <DialogClose
              disabled={stage.name === 'importing'}
              aria-label="Cerrar carga desde planilla"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </header>

          <Stepper current={currentStep} />

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 md:px-6">
            {notice && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{notice}</p>
              </div>
            )}

            {(stage.name === 'pick' || stage.name === 'reading') && (
              <FilePickStep
                isReading={stage.name === 'reading'}
                readingFileName={stage.name === 'reading' ? stage.fileName : null}
                onFile={handleFile}
                onDownloadTemplate={handleDownloadTemplate}
              />
            )}

            {(stage.name === 'review' || stage.name === 'importing') && (
              <ReviewStep
                fileName={stage.fileName}
                batch={stage.batch}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onChangeFile={reset}
                disabled={stage.name === 'importing'}
              />
            )}

            {stage.name === 'done' && <ResultStep batch={stage.batch} result={stage.result} />}
          </div>

          <footer className="flex shrink-0 flex-col gap-2 border-t border-gray-100 px-5 py-4 md:flex-row-reverse md:px-6 dark:border-gray-800">
            {(stage.name === 'review' || stage.name === 'importing') && (
              <PrimaryButton onClick={handleImport} disabled={stage.name === 'importing' || stage.batch.valid.length === 0}>
                {stage.name === 'importing' ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Guardando insumos…
                  </>
                ) : stage.batch.valid.length === 0 ? (
                  'No hay insumos para importar'
                ) : (
                  `Importar ${plural(stage.batch.valid.length, 'insumo', 'insumos')}`
                )}
              </PrimaryButton>
            )}
            {stage.name === 'done' ? (
              <>
                <PrimaryButton onClick={() => handleOpenChange(false)}>Listo</PrimaryButton>
                <SecondaryButton onClick={reset}>Cargar otra planilla</SecondaryButton>
              </>
            ) : (
              <SecondaryButton onClick={() => handleOpenChange(false)} disabled={stage.name === 'importing'}>
                Cancelar
              </SecondaryButton>
            )}
          </footer>
        </DialogSheet>
      </DialogPortal>
    </Dialog>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="shrink-0 px-5 pt-4 md:px-6">
      <p className="sr-only">
        Paso {current + 1} de {STEP_LABELS.length}: {STEP_LABELS[current]}
      </p>
      <ol className="grid grid-cols-3 gap-2" aria-hidden="true">
        {STEP_LABELS.map((label, index) => (
          <li key={label} className="flex flex-col gap-1.5">
            <span
              className={cn(
                'h-1.5 rounded-full transition-colors',
                index <= current ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
            <span
              className={cn(
                'text-xs font-semibold',
                index === current ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

interface FilePickStepProps {
  isReading: boolean
  readingFileName: string | null
  onFile: (file: File) => void
  onDownloadTemplate: () => void
}

function FilePickStep({ isReading, readingFileName, onFile, onDownloadTemplate }: FilePickStepProps) {
  const inputId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const takeFile = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = ''
    if (file && !isReading) onFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    takeFile(event.dataTransfer.files[0])
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-900/60 dark:bg-indigo-950/30">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white" aria-hidden="true">
            <Download className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-100">1. Descargá la plantilla</h3>
            <p className="mt-0.5 text-sm text-indigo-900/80 dark:text-indigo-200/80">
              Tres columnas: <strong>Nombre</strong>, <strong>Unidad</strong> (kg, l o u) y <strong>Costo</strong> (ej.
              1.234,56).
            </p>
          </div>
        </div>
        <SecondaryButton onClick={onDownloadTemplate} className="sm:w-auto md:flex-none">
          <Download className="size-4" aria-hidden="true" />
          Descargar plantilla
        </SecondaryButton>
      </section>

      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-busy={isReading}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 py-8 text-center transition',
          'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-indigo-600',
          isDragging
            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-gray-300 bg-gray-50/60 hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-indigo-500',
          isReading && 'pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={FILE_ACCEPT}
          aria-describedby={hintId}
          disabled={isReading}
          onChange={(event) => takeFile(event.target.files?.[0])}
          className="sr-only"
        />
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300" aria-hidden="true">
          {isReading ? <LoaderCircle className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
        </span>
        <span className="text-base font-bold text-gray-900 dark:text-white" aria-live="polite">
          {isReading ? `Leyendo ${readingFileName ?? 'la planilla'}…` : '2. Elegí tu planilla'}
        </span>
        <span id={hintId} className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          <span className="hidden md:inline">Arrastrala acá o hacé clic para buscarla. </span>
          <span className="md:hidden">Tocá para elegirla desde tu teléfono o tu Drive. </span>
          Excel (.xlsx, .xls) o CSV, hasta {BULK_MAX_ROWS} insumos.
        </span>
        <span className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md" aria-hidden="true">
          Buscar archivo
        </span>
      </label>
    </div>
  )
}

interface ReviewStepProps {
  fileName: string
  batch: ClassifiedIngredientBatch
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onChangeFile: () => void
  disabled: boolean
}

function ReviewStep({ fileName, batch, activeTab, onTabChange, onChangeFile, disabled }: ReviewStepProps) {
  const baseId = useId()
  const tabs: Array<{ id: TabId; label: string; count: number; icon: ReactNode; tone: string }> = [
    {
      id: 'valid',
      label: 'Válidas',
      count: batch.valid.length,
      icon: <CheckCircle2 className="size-4" aria-hidden="true" />,
      tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      id: 'duplicates',
      label: 'Repetidas',
      count: batch.duplicates.length,
      icon: <CopyX className="size-4" aria-hidden="true" />,
      tone: 'text-amber-700 dark:text-amber-400',
    },
    {
      id: 'errors',
      label: 'Con error',
      count: batch.errors.length,
      icon: <AlertTriangle className="size-4" aria-hidden="true" />,
      tone: 'text-rose-700 dark:text-rose-400',
    },
  ]

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeTab)
    const nextIndex: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }
    const target = nextIndex[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = tabs[target]
    if (!next) return
    onTabChange(next.id)
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 py-1 pl-4 pr-1 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex min-w-0 items-center gap-2">
          <FileSpreadsheet className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span className="truncate text-sm font-bold text-gray-900 dark:text-white">{fileName}</span>
          <span className="shrink-0 text-xs text-gray-600 dark:text-gray-400">
            {plural(batch.totalRows, 'fila', 'filas')}
          </span>
        </div>
        <button
          type="button"
          onClick={onChangeFile}
          disabled={disabled}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-gray-700"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Cambiar
        </button>
      </div>

      <div role="tablist" aria-label="Resultado de la revisión" className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const selected = tab.id === activeTab
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                'flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-2xl border px-1 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                selected
                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 dark:border-indigo-400 dark:bg-indigo-950/40 dark:ring-indigo-400'
                  : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
              )}
            >
              <span className={cn('flex items-center gap-1 text-xl font-black tabular-nums', tab.tone)}>
                {tab.icon}
                {tab.count}
              </span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab}`}
        tabIndex={0}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white focus-visible:outline-2 focus-visible:outline-indigo-600 dark:border-gray-800 dark:bg-gray-900"
      >
        {activeTab === 'valid' && (
          <RowList empty="Ninguna fila está lista para importar. Revisá las pestañas Repetidas y Con error.">
            {batch.valid.map((row) => (
              <RowItem
                key={row.rowNumber}
                title={row.name}
                meta={`Fila ${row.rowNumber} · ${BULK_UNIT_LABELS[row.unit]}`}
                value={`${row.costFormatted} / ${BULK_UNIT_LABELS[row.unit]}`}
              />
            ))}
          </RowList>
        )}
        {activeTab === 'duplicates' && (
          <RowList empty="No hay nombres repetidos.">
            {batch.duplicates.map((row) => (
              <RowItem
                key={row.rowNumber}
                title={row.name}
                meta={`Fila ${row.rowNumber} · ${BULK_UNIT_LABELS[row.unit]}`}
                detail={row.reason}
                detailTone="text-amber-800 dark:text-amber-300"
                value={`${row.costFormatted} / ${BULK_UNIT_LABELS[row.unit]}`}
              />
            ))}
          </RowList>
        )}
        {activeTab === 'errors' && (
          <RowList empty="Ninguna fila tiene errores.">
            {batch.errors.map((row) => (
              <RowItem
                key={row.rowNumber}
                title={row.name}
                meta={`Fila ${row.rowNumber} · Unidad: ${row.rawUnit || '(vacía)'} · Costo: ${row.rawCost || '(vacío)'}`}
                detail={row.reason}
                detailTone="text-rose-800 dark:text-rose-300"
              />
            ))}
          </RowList>
        )}
      </div>

      {batch.errors.length > 0 && batch.valid.length > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Las filas con error no se cargan. Podés importar las válidas ahora y subir las demás cuando las corrijas.
        </p>
      )}
    </div>
  )
}

function RowList({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (children.length === 0) {
    return <p className="p-6 text-center text-sm text-gray-600 dark:text-gray-400">{empty}</p>
  }
  return <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">{children}</ul>
}

interface RowItemProps {
  title: string
  meta: string
  value?: string
  detail?: string
  detailTone?: string
}

function RowItem({ title, meta, value, detail, detailTone }: RowItemProps) {
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-0.5 break-words text-xs text-gray-600 dark:text-gray-400">{meta}</p>
        {detail && <p className={cn('mt-1 text-xs font-medium', detailTone)}>{detail}</p>}
      </div>
      {value && (
        <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-white">{value}</span>
      )}
    </li>
  )
}

function ResultStep({ batch, result }: { batch: ClassifiedIngredientBatch; result: BulkUploadResponse }) {
  const serverErrors = mapServerErrorsToSheetRows(result.errors, batch.valid)
  const repeated = batch.duplicates.length + result.skipped
  const withErrors = batch.errors.length + serverErrors.length
  const omitted = repeated + withErrors
  const hasCreated = result.created > 0

  return (
    <div role="status" className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl',
            hasCreated
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
          )}
          aria-hidden="true"
        >
          {hasCreated ? <CheckCircle2 className="size-8" /> : <AlertTriangle className="size-8" />}
        </span>
        <h3 className="text-lg font-black text-gray-900 dark:text-white">
          {hasCreated
            ? `Se ${result.created === 1 ? 'cargó' : 'cargaron'} ${plural(result.created, 'insumo', 'insumos')}`
            : 'No se cargó ningún insumo'}
        </h3>
        <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
          {hasCreated
            ? 'Ya están en tu despensa y podés usarlos en tus recetas.'
            : 'Todas las filas ya existían o tenían errores.'}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <dt className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Creados</dt>
          <dd className="text-2xl font-black tabular-nums text-emerald-800 dark:text-emerald-200">{result.created}</dd>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <dt className="text-xs font-bold text-amber-800 dark:text-amber-300">Omitidos</dt>
          <dd className="text-2xl font-black tabular-nums text-amber-800 dark:text-amber-200">{omitted}</dd>
        </div>
      </dl>

      {omitted > 0 && (
        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {repeated > 0 && <li>· {plural(repeated, 'repetido', 'repetidos')}: ya estaban en tu despensa o en la planilla.</li>}
          {withErrors > 0 && <li>· {withErrors} con error: corregilos y volvé a subirlos.</li>}
        </ul>
      )}

      {serverErrors.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="font-bold">El servidor rechazó estas filas:</p>
          <ul className="mt-1 space-y-1">
            {serverErrors.map((error, index) => (
              <li key={`${error.rowNumber ?? 'x'}-${index}`}>
                {error.rowNumber ? `Fila ${error.rowNumber}` : 'Fila sin identificar'}
                {error.name ? ` (${error.name})` : ''}: {error.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}

function PrimaryButton({ onClick, disabled, className, children }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none md:flex-1 dark:disabled:bg-gray-700 dark:disabled:text-gray-300',
        className
      )}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ onClick, disabled, className, children }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 md:flex-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
        className
      )}
    >
      {children}
    </button>
  )
}
