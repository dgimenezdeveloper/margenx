import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, LoaderCircle, Truck, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { Dialog, DialogBackdrop, DialogClose, DialogDescription, DialogPortal, DialogSheet, DialogTitle } from '@/components/ui/dialog'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { supplierSchema, toSupplierPayload, type SupplierFormInput } from '@/schemas/supplierSchema'
import { ApiError } from '@/services/api'
import { supplierService, type Supplier } from '@/services/supplierService'

export type SupplierSaveMode = 'create' | 'update'

interface SupplierFormDialogProps {
  open: boolean
  /** `null` abre el alta; un proveedor abre su edición. */
  supplier: Supplier | null
  onClose: () => void
  onSaved: (supplier: Supplier, mode: SupplierSaveMode) => void
}

const EMPTY_VALUES: SupplierFormInput = { name: '', contactPhone: '', email: '', address: '', isActive: true }

const toFormValues = (supplier: Supplier | null): SupplierFormInput =>
  supplier
    ? {
        name: supplier.name,
        contactPhone: supplier.contactPhone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
        isActive: supplier.isActive,
      }
    : EMPTY_VALUES

const inputClass =
  'mt-1.5 h-12 w-full rounded-2xl border bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800'
const inputState = (hasError: boolean) =>
  hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/70'
    : 'border-gray-200 focus:border-indigo-600 focus:ring-indigo-600/20 dark:border-gray-700 dark:focus:border-indigo-500'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 motion-safe:animate-in motion-safe:fade-in dark:text-rose-400">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

/**
 * Alta y edición de un proveedor en un bottom sheet (ventana centrada desde `md`).
 * Valida con Zod al salir de cada campo y en vivo después; el 409 de nombre repetido
 * se muestra en el campo y cualquier otro error queda dentro del diálogo, nunca tapado.
 */
export function SupplierFormDialog({ open, supplier, onClose, onSaved }: SupplierFormDialogProps) {
  const getToken = useTokenGetter()
  const isEdit = supplier !== null
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDiscard, setShowDiscard] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierSchema),
    mode: 'onTouched',
    defaultValues: toFormValues(supplier),
  })

  const isActive = useWatch({ control, name: 'isActive' })

  useEffect(() => {
    if (open) reset(toFormValues(supplier))
  }, [open, supplier, reset])

  const close = () => {
    setSubmitError(null)
    setShowDiscard(false)
    onClose()
  }

  const requestClose = () => {
    if (isSubmitting) return
    if (isDirty) {
      setShowDiscard(true)
      return
    }
    close()
  }

  const onSubmit = async (values: SupplierFormInput) => {
    setSubmitError(null)
    const payload = toSupplierPayload(values)

    try {
      const saved = isEdit
        ? await supplierService.update(getToken, supplier.id, payload)
        : await supplierService.create(getToken, payload)
      onSaved(saved, isEdit ? 'update' : 'create')
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setError('name', { type: 'server', message: error.message }, { shouldFocus: true })
        return
      }
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'No pudimos guardar el proveedor. Revisá tu conexión y volvé a intentar.'
      )
    }
  }

  const { ref: nameFieldRef, ...nameField } = register('name')

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) requestClose() }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogSheet initialFocus={nameRef}>
            <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" aria-hidden="true" />

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden">
              <div className="flex shrink-0 items-start justify-between gap-3 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <Truck className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      {isEdit
                        ? 'Actualizá cómo contactarlo o si todavía le comprás.'
                        : 'Solo el nombre es obligatorio. El contacto te sirve para pedirle mercadería.'}
                    </DialogDescription>
                  </div>
                </div>
                <DialogClose
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Cerrar"
                >
                  <X className="size-5" aria-hidden="true" />
                </DialogClose>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <div>
                  <label htmlFor="supplier-name" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Nombre
                  </label>
                  <input
                    id="supplier-name"
                    {...nameField}
                    ref={(element) => {
                      nameFieldRef(element)
                      nameRef.current = element
                    }}
                    autoComplete="organization"
                    placeholder="Ej. Molino Olavarriense"
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'supplier-name-error' : undefined}
                    className={`${inputClass} ${inputState(!!errors.name)}`}
                  />
                  <FieldError id="supplier-name-error" message={errors.name?.message} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="supplier-phone" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Teléfono <span className="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id="supplier-phone"
                      {...register('contactPhone')}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ej. +54 9 2284 41-5566"
                      aria-invalid={errors.contactPhone ? 'true' : 'false'}
                      aria-describedby={errors.contactPhone ? 'supplier-phone-error' : undefined}
                      className={`${inputClass} ${inputState(!!errors.contactPhone)}`}
                    />
                    <FieldError id="supplier-phone-error" message={errors.contactPhone?.message} />
                  </div>

                  <div>
                    <label htmlFor="supplier-email" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Email <span className="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id="supplier-email"
                      {...register('email')}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Ej. ventas@proveedor.com.ar"
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={errors.email ? 'supplier-email-error' : undefined}
                      className={`${inputClass} ${inputState(!!errors.email)}`}
                    />
                    <FieldError id="supplier-email-error" message={errors.email?.message} />
                  </div>
                </div>

                <div>
                  <label htmlFor="supplier-address" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Dirección <span className="font-normal text-gray-500 dark:text-gray-400">(opcional)</span>
                  </label>
                  <input
                    id="supplier-address"
                    {...register('address')}
                    autoComplete="street-address"
                    placeholder="Ej. Av. Pringles 1450, Olavarría"
                    aria-invalid={errors.address ? 'true' : 'false'}
                    aria-describedby={errors.address ? 'supplier-address-error' : undefined}
                    className={`${inputClass} ${inputState(!!errors.address)}`}
                  />
                  <FieldError id="supplier-address-error" message={errors.address?.message} />
                </div>

                {isEdit && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
                    <div>
                      <p id="supplier-active-label" className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Proveedor activo
                      </p>
                      <p id="supplier-active-hint" className="text-xs text-gray-600 dark:text-gray-400">
                        {isActive
                          ? 'Sus listas de precios actualizan tus costos.'
                          : 'Queda guardado, pero sus listas de precios no se aplican.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      aria-labelledby="supplier-active-label"
                      aria-describedby="supplier-active-hint"
                      onClick={() => setValue('isActive', !isActive, { shouldDirty: true })}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                        isActive ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>{submitError}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex shrink-0 gap-3 pt-2">
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={isSubmitting}
                  className="min-h-11 flex-1 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                >
                  {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
                </button>
              </div>
            </form>
          </DialogSheet>
        </DialogPortal>
      </Dialog>

      <UnsavedChangesDialog
        open={showDiscard}
        onConfirm={close}
        onCancel={() => setShowDiscard(false)}
      />
    </>
  )
}