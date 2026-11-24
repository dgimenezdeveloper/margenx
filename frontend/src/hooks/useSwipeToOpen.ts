import { useEffect, useRef } from 'react'

export interface SwipeToOpenHandlers {
  /** Se puede empezar un arrastre ahora (por ejemplo, el panel no está abierto). */
  canStart: () => boolean
  /** El dedo empezó a ir hacia la derecha: hay que mostrar el panel. */
  onStart: () => void
  /** Cuántos píxeles avanzó el dedo hacia la derecha desde donde se apoyó. */
  onMove: (deltaX: number) => void
  /** El dedo se levantó: distancia recorrida y velocidad final en px/ms. */
  onEnd: (result: { deltaX: number; velocityX: number }) => void
}

/** El menú inferior y su panel existen solo debajo de 768 px; desde ahí manda la barra de arriba. */
export const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)'
/** Hasta acá un toque todavía puede ser un tap o un scroll vertical. */
const SLOP_PX = 10
/** El arrastre cuenta como horizontal si avanza más en x que en y, con margen. */
const HORIZONTAL_RATIO = 1.2
/** Ventana para medir la velocidad al soltar. */
const VELOCITY_WINDOW_MS = 100
/** Con menos de un cuadro de pantalla entre muestras, la velocidad no es confiable y no se usa. */
const MIN_VELOCITY_ELAPSED_MS = 16

const IGNORED_TARGETS =
  'input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"], [role="alertdialog"], [data-swipe-ignore]'

/** No se abre el panel si el dedo empieza en un campo, en otro diálogo o en algo que se desplaza en horizontal. */
function startsOnIgnoredElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(IGNORED_TARGETS)) return true
  for (let element: Element | null = target; element && element !== document.body; element = element.parentElement) {
    const { overflowX } = getComputedStyle(element)
    if ((overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth) return true
  }
  return false
}

const isMobileViewport = () => typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
const isAnotherDialogOpen = () => document.querySelector('[role="dialog"], [role="alertdialog"]') !== null

/**
 * Arrastre de izquierda a derecha, desde cualquier punto de la pantalla, para ir abriendo un panel (#437).
 * Empieza en cualquier lugar y no solo en el borde porque, en Android con navegación por gestos y en
 * Safari del iPhone, arrastrar desde el borde izquierdo es "Atrás". Mientras no se decide si el gesto es
 * horizontal, el scroll vertical sigue funcionando; cuando lo es, se frena el scroll de la página.
 */
export function useSwipeToOpen(handlers: SwipeToOpenHandlers): void {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    type Gesture = { startX: number; startY: number; dragging: boolean; samples: { x: number; t: number }[] }
    let gesture: Gesture | null = null
    /** Elemento donde se apoyó el dedo: sigue recibiendo los toques aunque salga del DOM a mitad del gesto. */
    let startTarget: EventTarget | null = null
    /** El mismo evento puede llegar por `window` y por el elemento: se procesa una sola vez. */
    let lastEvent: Event | null = null

    const stopGesture = () => {
      gesture = null
      if (startTarget) {
        startTarget.removeEventListener('touchmove', onTouchMove as EventListener)
        startTarget.removeEventListener('touchend', onTouchEnd as EventListener)
        startTarget.removeEventListener('touchcancel', onTouchEnd as EventListener)
        startTarget = null
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      stopGesture()
      if (event.touches.length !== 1 || !isMobileViewport() || isAnotherDialogOpen()) return
      if (!handlersRef.current.canStart() || startsOnIgnoredElement(event.target)) return
      const touch = event.touches[0]
      gesture = { startX: touch.clientX, startY: touch.clientY, dragging: false, samples: [{ x: touch.clientX, t: performance.now() }] }
      // Si la pantalla cambia mientras el dedo está apoyado (por ejemplo, llegan los datos y la tarjeta se
      // vuelve a dibujar), el navegador sigue mandando los toques al elemento original, ya fuera del DOM:
      // por `window` no llegarían más.
      startTarget = event.target
      startTarget?.addEventListener('touchmove', onTouchMove as EventListener, { passive: false })
      startTarget?.addEventListener('touchend', onTouchEnd as EventListener)
      startTarget?.addEventListener('touchcancel', onTouchEnd as EventListener)
    }

    function onTouchMove(event: TouchEvent) {
      if (event === lastEvent) return
      lastEvent = event
      if (!gesture || event.touches.length !== 1) return
      const touch = event.touches[0]
      const deltaX = touch.clientX - gesture.startX
      const deltaY = touch.clientY - gesture.startY

      if (!gesture.dragging) {
        if (Math.abs(deltaX) < SLOP_PX && Math.abs(deltaY) < SLOP_PX) return
        if (deltaX <= 0 || Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_RATIO) {
          stopGesture() // scroll vertical o arrastre hacia la izquierda: no es para el panel
          return
        }
        gesture.dragging = true
        handlersRef.current.onStart()
      }

      if (event.cancelable) event.preventDefault()
      // El arrastre es del panel: nadie más lo procesa (ver la nota de los listeners, abajo).
      event.stopPropagation()
      const now = performance.now()
      gesture.samples = [...gesture.samples.filter((sample) => now - sample.t <= VELOCITY_WINDOW_MS), { x: touch.clientX, t: now }]
      handlersRef.current.onMove(Math.max(0, deltaX))
    }

    function onTouchEnd(event: TouchEvent) {
      if (event === lastEvent) return
      lastEvent = event
      if (!gesture?.dragging) {
        stopGesture()
        return
      }
      const touch = event.changedTouches[0]
      const endX = touch ? touch.clientX : gesture.samples[gesture.samples.length - 1].x
      const first = gesture.samples[0]
      const elapsed = performance.now() - first.t
      const velocityX = elapsed >= MIN_VELOCITY_ELAPSED_MS ? (endX - first.x) / elapsed : 0
      event.stopPropagation()
      const deltaX = Math.max(0, endX - gesture.startX)
      stopGesture()
      handlersRef.current.onEnd({ deltaX, velocityX })
    }

    // En `window` y en fase de captura: el Drawer de Base UI se monta con el dedo todavía apoyado y escucha
    // `touchmove` en `document`, también en captura, cortando la propagación cuando toma el gesto. Desde
    // `window` el arrastre llega primero y, mientras dura, no le llega al Drawer.
    const capture = { capture: true }
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    // No pasivo: una vez decidido que el arrastre es horizontal, frena el scroll de la página.
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
    window.addEventListener('touchend', onTouchEnd, capture)
    window.addEventListener('touchcancel', onTouchEnd, capture)
    return () => {
      stopGesture()
      window.removeEventListener('touchstart', onTouchStart, capture)
      window.removeEventListener('touchmove', onTouchMove, capture)
      window.removeEventListener('touchend', onTouchEnd, capture)
      window.removeEventListener('touchcancel', onTouchEnd, capture)
    }
  }, [])
}
