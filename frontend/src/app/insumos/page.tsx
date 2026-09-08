'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Boxes, Check, Plus, Search, X } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ingredientSchema, type IngredientFormValues } from '@/schemas/ingredientSchema'

const initialSupplies = [
  { name: 'Carne Picada', unit: 'kg', cost: 4200 },
  { name: 'Pan Brioche', unit: 'unidad', cost: 950 },
  { name: 'Queso Cheddar', unit: 'kg', cost: 6800 },
  { name: 'Papas Congeladas', unit: 'kg', cost: 2400 },
]

const ingredientUnits = ['kg', 'litro', 'unidad', 'gr', 'ml', 'bidón'] as const

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState(initialSupplies)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<(typeof initialSupplies)[number] | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<z.input<typeof ingredientSchema>, undefined, IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    mode: 'onChange',
    defaultValues: { name: '', unit: 'kg', currentCost: '' },
  })

  const selectedUnit = useWatch({ control, name: 'unit' })

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(
    () => supplies.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [supplies, query]
  )

  const isTotalEmpty = supplies.length === 0
  const isSearchEmpty = filtered.length === 0 && !isTotalEmpty

  const handleOpenEdit = (supply: (typeof initialSupplies)[number]) => {
    setSelected(supply)
    reset({ name: supply.name, unit: supply.unit as IngredientFormValues['unit'], currentCost: String(supply.cost) })
  }

  const handleOpenNew = () => {
    setSelected(null)
    reset({ name: '', unit: 'kg', currentCost: '' })
    setNewOpen(true)
  }

  const handleCloseSheet = () => {
    setSelected(null)
    setNewOpen(false)
  }

  const handleSave = (data: IngredientFormValues) => {
    if (selected) {
      setSupplies(supplies.map((s) => (s.name === selected.name ? { ...s, cost: data.currentCost } : s)))
      notify(`Costo de ${selected.name} actualizado a ${money(data.currentCost)}`)
    } else {
      setSupplies([...supplies, { name: data.name, unit: data.unit, cost: data.currentCost }])
      notify(`Insumo "${data.name}" creado correctamente`)
    }
    handleCloseSheet()
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check className="size-5" />
          {toast}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">

        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />

          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Insumos</h1>
              <p className="mt-1 text-sm text-gray-500">Administra los costos de tus materias primas.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 md:w-72 lg:w-80">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar insumos..."
                  disabled={isTotalEmpty}
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-600 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={handleOpenNew}
                className="hidden md:inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
              >
                <Plus className="size-4 " /> Nuevo Insumo
              </button>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/60">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Insumos activos</p>
              <p className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-100">{supplies.length}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/60">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Variaciones recientes</p>
              <p className="mt-1 text-2xl font-black text-rose-950 dark:text-rose-100">2</p>
            </div>
            <div className="hidden rounded-2xl bg-emerald-50 p-4 md:block dark:bg-emerald-950/60">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Recálculo</p>
              <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-emerald-100">Activo</p>
            </div>
            <div className="hidden rounded-2xl bg-slate-100 p-4 md:block dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Afectan a</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">4 Productos</p>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Todos los insumos</h2>
              <button
                type="button"
                onClick={handleOpenNew}
                className="md:hidden rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                + Nuevo Insumo
              </button>
            </div>

            {/* ESTADOS VACÍOS */}
            {isTotalEmpty && (
              <EmptyState
                icon={<Boxes className="size-6" />}
                title="Sin insumos en la despensa"
                description="Agrega tus materias primas para poder armar las recetas y calcular los costos de tus productos."
                actionLabel="Crear nuevo insumo"
                onAction={handleOpenNew}
              />
            )}

            {isSearchEmpty && (
              <EmptyState
                icon={<Search className="size-6" />}
                title="Insumo no encontrado"
                description={`No existe ningún insumo con el nombre "${query}".`}
              />
            )}

            {/* TABLA VS CARDS */}
            {!isTotalEmpty && !isSearchEmpty && (
              <>
                {/* VERSIÓN MOBILE: Tarjetas */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filtered.map((supply) => (
                    <button
                      key={supply.name}
                      type="button"
                      onClick={() => handleOpenEdit(supply)}
                      className="group flex w-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <strong className="block text-sm font-bold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">{supply.name}</strong>
                        <span className="text-xs text-gray-500">
                          Unidad: {supply.unit}
                        </span>
                      </div>
                      <div className="mt-4 flex w-full items-center justify-between border-t border-gray-50 pt-3 text-xs dark:border-gray-800">
                        <span className="text-[10px] font-bold text-indigo-600">Tocar para editar</span>
                        <strong className="text-sm font-black text-gray-900 dark:text-white">{money(supply.cost)}</strong>
                      </div>
                    </button>
                  ))}
                </div>

                {/* VERSIÓN DESKTOP: Tabla genérica con overflow */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                    <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-900 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-100">
                      <tr>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Nombre del Insumo</th>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Unidad de Medida</th>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Costo Actual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filtered.map((supply) => (
                        <tr
                          key={supply.name}
                          onClick={() => handleOpenEdit(supply)}
                          className="group cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                        >
                          <td className="px-5 py-4 font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                            {supply.name}
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {supply.unit}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">{money(supply.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />

      {/* Modal / Bottom Sheet */}
      {(selected || newOpen) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
          <div className="fixed inset-0" onClick={handleCloseSheet} />
          <form onSubmit={handleSubmit(handleSave)} className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-600">
                  {selected ? selected.name : 'Despensa'}
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {selected ? 'Actualizar Costo' : 'Nuevo Insumo'}
                </h2>
              </div>
              <button type="button" onClick={handleCloseSheet} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="size-5" />
              </button>
            </div>

            {!selected && (
              <label className="mt-5 block text-xs font-bold text-gray-600 dark:text-gray-300">
                Nombre del insumo
                <input {...register('name')} placeholder="Ej. Harina 0000" className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800" />
                {errors.name && <p className="mt-1 text-xs font-bold text-rose-500">{errors.name.message}</p>}
              </label>
            )}

            {!selected && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Unidad de medida</label>
                <div className="flex flex-wrap gap-2">
                  {ingredientUnits.map((u) => (
                    <button key={u} type="button" onClick={() => setValue('unit', u, { shouldValidate: true, shouldDirty: true })} className={`rounded-xl cursor-pointer border px-3.5 py-2 text-xs font-bold transition ${selectedUnit === u ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
                      {u}
                    </button>
                  ))}
                </div>
                {errors.unit && <p className="mt-1 text-xs font-bold text-rose-500">{errors.unit.message}</p>}
              </div>
            )}

            <label className="mt-4 block text-xs font-bold text-gray-600 dark:text-gray-300">
              Costo unitario ({selected ? selected.unit : selectedUnit})
              <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                <span className="text-lg font-bold text-gray-400">$</span>
                <input {...register('currentCost')} inputMode="decimal" type="number" placeholder="0.00" className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none" />
              </div>
              {errors.currentCost && <p className="mt-1 text-xs font-bold text-rose-500">{errors.currentCost.message}</p>}
            </label>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleCloseSheet} className="flex-1 cursor-pointer rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Cancelar</button>
              <button type="submit" className="flex-1 cursor-pointer rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700">{selected ? 'Guardar Costo' : 'Crear Insumo'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}