# 5. Costo Vigente, Cuarentena e Ingesta

* **Estado:** Aceptado
* **Fecha:** 2026-10-28
* **Decisores:** Darío Giménez (Tech Lead)

## Contexto y Planteamiento del Problema
El sistema permite asociar múltiples presentaciones de proveedores a un mismo insumo. Sin embargo, el costo vigente del insumo (el que se usa para calcular las recetas) debe provenir de una única fuente para evitar ambigüedades. Además, es necesario proteger este costo de errores de carga o variaciones extremas durante la ingesta automática.

## Decisión
1. **Proveedor Predeterminado:** Cada insumo puede tener múltiples presentaciones, pero solo una puede estar marcada como predeterminada (`isDefault: true`). El costo unitario de esta presentación es el que define el costo vigente del insumo.
2. **Protección del Predeterminado:** No se permite desmarcar una presentación predeterminada sin asignar otra en su lugar. Para cambiar el proveedor predeterminado, el usuario debe marcar otra presentación como predeterminada, lo que automáticamente desmarcará la anterior y recalculará el costo vigente.
3. **Cuarentena:** Si la ingesta automática detecta una variación mayor al 50% o un costo unitario insuficiente, el nuevo precio se retiene en cuarentena y el costo vigente no se altera hasta que el administrador lo libere explícitamente.

## Consecuencias
* **Positivas:**
  * Se garantiza que el costo vigente siempre tenga un origen claro y trazable.
  * Se evitan errores humanos al impedir que un insumo quede sin proveedor predeterminado por accidente.
  * Se protege la rentabilidad del negocio ante errores de facturación o listas de precios anómalas.
* **Compromisos (Trade-offs):**
  * Requiere una acción explícita del usuario para cambiar el proveedor predeterminado, en lugar de tomar automáticamente el más barato.