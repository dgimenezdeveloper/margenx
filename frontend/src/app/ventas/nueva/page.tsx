'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, LoaderCircle, Minus, Plus, Search, ShoppingBag, Wallet } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToastAlert } from '@/components/ToastAlert'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import { useToast } from '@/hooks/useToast'
import { CANONICAL_FOCUS_CLASSES, CANONICAL_INPUT_CLASSES } from '@/lib/accessibility'
import { formatMoney } from '@/lib/format'
import { ABOVE_BOTTOM_NAV_CLASS } from '@/lib/mobile-layout'
import {
  PAYMENT_METHOD_LABELS,
  addToCart,
  cartItemsForApi,
  cartTotalCents,
  formatSaleDateTime,
  isSellable,
  removeFromCart,
  type Cart,
  type CartProduct,
} from '@/lib/sales'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'
import { productService } from '@/services/productService'
import { saleService, type PaymentMethod } from '@/services/saleService'

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'TRANSFER', 'MERCADO_PAGO']

/** Sin tildes ni mayúsculas: "cafe" encuentra "Café con leche". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Venta rápida (ADR-010): grilla de productos con búsqueda, cantidades con + y −,
 * total en es-AR, medio de pago y Cobrar. El precio y el costo los pone la API.
 */
export default function NewSalePage() {
  const navigate = useNavigate()
  const getToken = useTokenGetter()
  const { toast, notify, dismiss } = useToast()

  const [products, setProducts] = useState<CartProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Cart>({})
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [isCharging, setIsCharging] = useState(false)
  const [noOpenShift, setNoOpenShift] = useState(false)
  const [shift, setShift] = useState<CashShift | null>(null)

  // El turno se consulta al entrar para avisar antes de armar la venta. Si la consulta falla,
  // no se bloquea nada: la API igual responde 409 al cobrar sin turno.
  useEffect(() => {
    let cancelled = false
    cashShiftService
      .current(getToken)
      .then((current) => {
        if (cancelled) return
        setShift(current)
        setNoOpenShift(current === null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [getToken])

  useEffect(() => {
    let cancelled = false
    productService
      .getAll(getToken)
      .then((all) => {
        if (cancelled) return
        setProducts(
          all
            .filter(isSellable)
            .map(({ id, name, salePrice }) => ({ id, name, salePrice }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        )
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, reloadKey])

  const visibleProducts = useMemo(() => {
    const term = normalize(search)
    return term ? products.filter((product) => normalize(product.name).includes(term)) : products
  }, [products, search])

  const totalCents = cartTotalCents(cart, products)
  const unitsInCart = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)

  const handleCharge = async () => {
    if (unitsInCart === 0 || isCharging) return
    setIsCharging(true)
    setNoOpenShift(false)
    try {
      const sale = await saleService.create(getToken, { paymentMethod, items: cartItemsForApi(cart) })
      navigate(`/ventas/${sale.id}/ticket`, { state: { justSold: true } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNoOpenShift(true)
      } else {
        notify(
          error instanceof ApiError ? error.message : 'No se pudo registrar la venta. Revisá tu conexión e intentá de nuevo.',
          'error'
        )
      }
      setIsCharging(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && <ToastAlert key={toast.id} title={toast.title} type={toast.type} onClose={dismiss} />}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        {/* Lugar abajo para el panel de cobro fijo: en el celular va sobre el menú inferior y en escritorio, al pie (#495). */}
        <div className="flex flex-col gap-5 pb-72 md:pb-52">
          <Navbar title="Nueva venta" backHref="/ventas" />

          {shift && !noOpenShift && (
            <p className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <Wallet className="size-3.5" aria-hidden="true" />
              Turno abierto desde {formatSaleDateTime(shift.openedAt)}
            </p>
          )}

          {noOpenShift && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <p className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.
              </p>
              <Link
                to="/ventas"
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 px-4 text-sm font-bold text-white hover:bg-amber-800',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                Abrir el turno
              </Link>
            </div>
          )}

          <label className="relative block">
            <span className="sr-only">Buscar producto</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto"
              // Las clases canónicas van primero: traen px-3, y si fueran después pisarían el pl-9 que deja lugar a la lupa (#495).
              className={cn(
                CANONICAL_INPUT_CLASSES,
                'min-h-11 w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900'
              )}
            />
          </label>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-label="Cargando productos">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState
              title="No pudimos cargar los productos"
              description="Revisá tu conexión e intentá de nuevo."
              onRetry={() => {
                setIsLoading(true)
                setLoadError(false)
                setReloadKey((key) => key + 1)
              }}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="size-6" />}
              title="No hay productos para vender"
              description="Se venden los productos con receta y precio de venta cargado."
            />
          ) : visibleProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Ningún producto coincide con "{search}".</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {visibleProducts.map((product) => {
                const quantity = cart[product.id] ?? 0
                return (
                  <li
                    key={product.id}
                    className={cn(
                      'flex flex-col justify-between gap-3 rounded-2xl border bg-white p-3 shadow-sm dark:bg-gray-900',
                      quantity > 0 ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-100 dark:border-gray-800'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{product.name}</p>
                      <p className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-200">{formatMoney(product.salePrice)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setCart((current) => removeFromCart(current, product.id))}
                        disabled={quantity === 0}
                        aria-label={`Quitar una unidad de ${product.name}`}
                        className={cn(
                          'flex size-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200',
                          CANONICAL_FOCUS_CLASSES
                        )}
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center text-base font-black" aria-label={`Cantidad de ${product.name}`}>
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCart((current) => addToCart(current, product.id))}
                        aria-label={`Agregar una unidad de ${product.name}`}
                        className={cn(
                          'flex size-11 cursor-pointer items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700',
                          CANONICAL_FOCUS_CLASSES
                        )}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Panel de cobro: fijo sobre el menú inferior en el celular, para cobrar con una mano. */}
      <section
        aria-label="Cobro"
        className={cn(
          'fixed inset-x-0 z-10 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95',
          ABOVE_BOTTOM_NAV_CLASS,
          'md:bottom-0'
        )}
      >
        {/* Mismo ancho y relleno que la grilla de productos (#495). */}
        <div className="mx-auto flex max-w-md flex-col gap-3 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Total{unitsInCart > 0 ? ` · ${unitsInCart} ${unitsInCart === 1 ? 'unidad' : 'unidades'}` : ''}
            </span>
            <span data-testid="sale-total" className="text-2xl font-black">
              {formatMoney(totalCents / 100)}
            </span>
          </div>

          <fieldset>
            <legend className="sr-only">Medio de pago</legend>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-1 text-center text-xs font-bold leading-tight has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500',
                    paymentMethod === method
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-100'
                      : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200'
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="sr-only"
                  />
                  {PAYMENT_METHOD_LABELS[method]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={handleCharge}
            disabled={unitsInCart === 0 || isCharging}
            className={cn(
              'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 text-base font-black text-white shadow-md hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50',
              CANONICAL_FOCUS_CLASSES
            )}
          >
            {isCharging ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
            {isCharging ? 'Cobrando…' : `Cobrar ${formatMoney(totalCents / 100)}`}
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
