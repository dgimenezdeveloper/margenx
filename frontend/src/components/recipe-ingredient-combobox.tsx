'use client'

import { useAuth } from '@clerk/clerk-react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

import { useIngredientSearch } from '@/hooks/useIngredientSearch'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatMoney, formatUnit } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Ingredient } from '@/services/ingredientService'

export interface RecipeIngredientComboboxProps {
  supplies: Ingredient[]
  selectedSupply: Ingredient | undefined
  existingIngredientIds: readonly string[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (supply: Ingredient) => void
  onOpenQuickCreate: (initialName: string) => void
  label: string
  disabled?: boolean
  placeholderText?: string
  emptyMessage?: string
  labelClassName?: string
  triggerClassName?: string
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function RecipeIngredientCombobox({
  supplies,
  selectedSupply,
  existingIngredientIds,
  isOpen,
  onOpenChange,
  onSelect,
  onOpenQuickCreate,
  label,
  disabled = false,
  placeholderText = 'Buscar insumo...',
  emptyMessage = 'No se encontraron insumos.',
  labelClassName = 'block text-xs font-bold text-gray-600 dark:text-gray-300',
  triggerClassName = 'mt-2 flex min-h-11 h-12 w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 text-left text-sm font-bold text-gray-900 shadow-xs transition hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer',
  triggerRef,
}: RecipeIngredientComboboxProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const triggerId = `${baseId}-trigger`
  const listboxId = `${baseId}-listbox`
  const internalTriggerRef = useRef<HTMLButtonElement | null>(null)
  const resolvedTriggerRef = triggerRef ?? internalTriggerRef
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const { getToken } = useAuth()
  const { results: remoteResults, isSearching } = useIngredientSearch(getToken, searchQuery)
  const existingSet = useMemo(() => new Set(existingIngredientIds), [existingIngredientIds])
  const filteredSupplies = useMemo(
    () => (searchQuery.trim() ? (remoteResults ?? []) : supplies),
    [searchQuery, remoteResults, supplies]
  )
  const createOptionIndex = filteredSupplies.length
  const totalOptions = filteredSupplies.length + 1
  const safeActiveIndex = activeIndex >= 0 && activeIndex < totalOptions ? activeIndex : -1
  const activeOptionId = isOpen && safeActiveIndex >= 0 ? `${baseId}-option-${safeActiveIndex}` : undefined

  const enabledIndices = useMemo(() => {
    const indices: number[] = []
    filteredSupplies.forEach((supply, index) => {
      if (!existingSet.has(supply.id)) indices.push(index)
    })
    indices.push(createOptionIndex)
    return indices
  }, [filteredSupplies, existingSet, createOptionIndex])

  const closeDropdown = useCallback((restoreFocus: boolean) => {
    setSearchQuery('')
    setActiveIndex(-1)
    onOpenChange(false)
    if (restoreFocus) resolvedTriggerRef.current?.focus()
  }, [onOpenChange, resolvedTriggerRef])

  useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (wrapperRef.current && target && !wrapperRef.current.contains(target)) closeDropdown(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, closeDropdown])

  const openDropdown = (initialIndex = -1) => {
    if (disabled) return
    setSearchQuery('')
    setActiveIndex(initialIndex)
    onOpenChange(true)
  }

  const moveActive = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return
    const currentPos = enabledIndices.indexOf(safeActiveIndex)
    const nextPos = currentPos === -1
      ? (direction === 1 ? 0 : enabledIndices.length - 1)
      : (currentPos + direction + enabledIndices.length) % enabledIndices.length
    const nextIndex = enabledIndices[nextPos] ?? -1
    setActiveIndex(nextIndex)
    if (nextIndex >= 0) document.getElementById(`${baseId}-option-${nextIndex}`)?.scrollIntoView?.({ block: 'nearest' })
  }

  const activateIndex = (index: number) => {
    if (index < 0 || index >= totalOptions) return
    if (index === createOptionIndex) {
      const initialName = searchQuery.trim()
      closeDropdown(false)
      onOpenQuickCreate(initialName)
      return
    }
    const supply = filteredSupplies[index]
    if (!supply || existingSet.has(supply.id)) return
    onSelect(supply)
    closeDropdown(true)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        const initialIndex = event.key === 'ArrowDown'
          ? (enabledIndices[0] ?? -1)
          : (enabledIndices[enabledIndices.length - 1] ?? -1)
        openDropdown(initialIndex)
      }
    }
  }

  const handleWrapperKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()
      closeDropdown(true)
      return
    }
    if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); return }

    const canJumpHomeEnd = document.activeElement !== searchInputRef.current || searchQuery === ''
    if (event.key === 'Home' && canJumpHomeEnd) {
      event.preventDefault()
      const first = enabledIndices[0] ?? -1
      setActiveIndex(first)
      if (first >= 0) document.getElementById(`${baseId}-option-${first}`)?.scrollIntoView?.({ block: 'nearest' })
      return
    }
    if (event.key === 'End' && canJumpHomeEnd) {
      event.preventDefault()
      const last = enabledIndices[enabledIndices.length - 1] ?? -1
      setActiveIndex(last)
      if (last >= 0) document.getElementById(`${baseId}-option-${last}`)?.scrollIntoView?.({ block: 'nearest' })
      return
    }
    if (event.key === 'Enter' && document.activeElement === searchInputRef.current) {
      event.preventDefault()
      event.stopPropagation()
      if (safeActiveIndex >= 0) activateIndex(safeActiveIndex)
    }
  }

  const displaySupply = selectedSupply && !existingSet.has(selectedSupply.id) ? selectedSupply : undefined

  return (
    <div ref={wrapperRef} onKeyDown={handleWrapperKeyDown} className="relative">
      <span id={labelId} className={labelClassName}>{label}</span>
      <button
        ref={resolvedTriggerRef}
        id={triggerId}
        type="button"
        role={isOpen ? undefined : 'combobox'}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${triggerId}`}
        disabled={disabled}
        onClick={() => isOpen ? closeDropdown(false) : openDropdown(-1)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(triggerClassName, CANONICAL_FOCUS_CLASSES)}
      >
        <span className="truncate">
          {displaySupply
            ? `${displaySupply.name} (${formatMoney(displaySupply.currentCost)}/${formatUnit(displaySupply.unit)})`
            : placeholderText}
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-150 dark:border-gray-700 dark:bg-gray-900">
          <div className="sticky top-0 border-b border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-950">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-gray-400" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeOptionId}
                aria-label="Filtrar insumos por nombre"
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setActiveIndex(-1) }}
                placeholder="Filtrar por nombre..."
                autoFocus
                className={cn('min-h-10 h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white', CANONICAL_FOCUS_CLASSES)}
              />
              {searchQuery && (
                <button type="button" tabIndex={-1} aria-label="Limpiar búsqueda" onClick={() => { setSearchQuery(''); setActiveIndex(-1); searchInputRef.current?.focus() }} className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div id={listboxId} role="listbox" aria-label="Insumos disponibles" className="max-h-48 divide-y divide-gray-100 overflow-y-auto p-1 dark:divide-gray-800">
            {filteredSupplies.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-gray-400" aria-live="polite">
                {isSearching ? 'Buscando insumos...' : emptyMessage}
              </div>
            ) : filteredSupplies.map((supply, index) => {
              const isAlreadyInRecipe = existingSet.has(supply.id)
              const isSelected = !isAlreadyInRecipe && displaySupply?.id === supply.id
              const isActive = safeActiveIndex === index
              return (
                <button
                  key={supply.id}
                  id={`${baseId}-option-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={isSelected}
                  aria-disabled={isAlreadyInRecipe}
                  disabled={isAlreadyInRecipe}
                  onMouseEnter={() => { if (!isAlreadyInRecipe) setActiveIndex(index) }}
                  onClick={() => { if (isAlreadyInRecipe) return; onSelect(supply); closeDropdown(true) }}
                  className={cn(
                    'flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition',
                    isAlreadyInRecipe ? 'cursor-not-allowed text-gray-400 opacity-70 dark:text-gray-500' : 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50',
                    isActive && !isAlreadyInRecipe && 'bg-indigo-100/80 dark:bg-indigo-900/60',
                    isSelected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : !isAlreadyInRecipe && 'text-gray-800 dark:text-gray-200'
                  )}
                >
                  <span className="truncate">{supply.name}</span>
                  {isAlreadyInRecipe ? (
                    <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Ya en la receta</span>
                  ) : <span className="ml-2 shrink-0 text-gray-400">{formatMoney(supply.currentCost)}/{formatUnit(supply.unit)}</span>}
                </button>
              )
            })}

            <button
              id={`${baseId}-option-${createOptionIndex}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={false}
              onMouseEnter={() => setActiveIndex(createOptionIndex)}
              onClick={() => activateIndex(createOptionIndex)}
              className={cn('flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50', safeActiveIndex === createOptionIndex && 'bg-indigo-100/80 dark:bg-indigo-900/60')}
            >
              <Plus className="size-3.5 shrink-0" aria-hidden="true" />
              <span>+ Crear nuevo insumo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
