'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'

const initialSupplies = [
  { name: 'Carne Picada', unit: 'kg', cost: 4200 },
  { name: 'Pan Brioche', unit: 'unidad', cost: 950 },
  { name: 'Queso Cheddar', unit: 'kg', cost: 6800 },
  { name: 'Papas Congeladas', unit: 'kg', cost: 2400 },
]

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState(initialSupplies)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<(typeof initialSupplies)[number] | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [cost, setCost] = useState('')

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(
    () => supplies.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [supplies, query]
  )

  const handleOpenEdit = (supply: (typeof initialSupplies)[number]) => {
    setSelected(supply)
    setName(supply.name)
    setUnit(supply.unit)
    setCost(String(supply.cost))
  }

  const handleOpenNew = () => {
    setSelected(null)
    setName('')
    setUnit('kg')
    setCost('')
    setNewOpen(true)
  }

  const handleCloseSheet = () => {
    setSelected(null)
    setNewOpen(false)
  }

  const handleSave = () => {
    const numCost = Number(cost)
    if (!name.trim() || numCost <= 0) return

    if (selected) {
      setSupplies(supplies.map((s) => (s.name === selected.name ? { ...s, cost: numCost } : s)))
      notify(`Costo de ${selected.name} actualizado a ${money(numCost)}`)
    } else {
      setSupplies([...supplies, { name: name.trim(), unit, cost: numCost }])
      notify(`Insumo "${name.trim()}" creado correctamente`)
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
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={handleOpenNew}
                className="hidden md:inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
              >
                <Plus className="size-4" /> Nuevo Insumo
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

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:overflow-visible md:border-0 md:bg-transparent md:shadow-none dark:border-gray-800 dark:bg-gray-900 md:dark:bg-transparent">
              <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
                {filtered.map((supply) => (
                  <button
                    key={supply.name}
                    type="button"
                    onClick={() => handleOpenEdit(supply)}
                    className="group flex w-full flex-col justify-between border-b border-gray-100 bg-white p-4 text-left transition-all hover:bg-gray-50/80 last:border-0 md:rounded-2xl md:border md:p-5 md:shadow-sm md:hover:border-indigo-200 md:hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/40 md:dark:hover:border-indigo-900"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <strong className="block text-sm font-bold text-gray-900 md:text-base group-hover:text-indigo-600 dark:text-gray-100">{supply.name}</strong>
                      <span className="text-xs text-gray-500 md:rounded-lg md:bg-gray-100 md:px-2 md:py-0.5 md:text-[10px] md:font-bold md:text-gray-600 md:dark:bg-gray-800 md:dark:text-gray-300">
                        <span className="md:hidden">Unidad: </span>{supply.unit}
                      </span>
                    </div>
                    <div className="mt-1 flex w-full items-end justify-between text-xs md:mt-4 md:border-t md:border-gray-50 md:pt-3 md:dark:border-gray-800">
                      <span className="text-[10px] font-bold text-indigo-600 md:text-gray-400 md:font-normal">Tocar para editar</span>
                      <strong className="text-sm font-bold text-gray-900 md:text-lg md:font-black dark:text-white">{money(supply.cost)}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />

      {/* Modal / Bottom Sheet (Sin cambios en clases móviles) */}
      {(selected || newOpen) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
          <div className="fixed inset-0" onClick={handleCloseSheet} />
          <section className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
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
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Harina 0000" className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800" />
              </label>
            )}

            {!selected && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Unidad de medida</label>
                <div className="flex flex-wrap gap-2">
                  {['kg', 'litro', 'unidad', 'gr', 'ml', 'bidón'].map((u) => (
                    <button key={u} type="button" onClick={() => setUnit(u)} className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${unit === u ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="mt-4 block text-xs font-bold text-gray-600 dark:text-gray-300">
              Costo unitario ({selected ? selected.unit : unit})
              <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                <span className="text-lg font-bold text-gray-400">$</span>
                <input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" type="number" placeholder="0.00" className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none" />
              </div>
            </label>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleCloseSheet} className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Cancelar</button>
              <button type="button" onClick={handleSave} className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700">{selected ? 'Guardar Costo' : 'Crear Insumo'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}