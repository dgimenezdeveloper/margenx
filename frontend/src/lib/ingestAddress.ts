const INGEST_DOMAIN = 'margenx.tech'

/**
 * Dirección a la que el comercio reenvía las listas de precios de sus proveedores:
 * `precios-<slug>@margenx.tech` (ADR-005 §3, `docs/especificacion-funcional.md` §5).
 * Devuelve `null` si la cuenta no trae slug: `/auth/me` solo se lo envía al administrador.
 */
export function buildIngestAddress(slug: string | null | undefined): string | null {
  const clean = slug?.trim()
  return clean ? `precios-${clean}@${INGEST_DOMAIN}` : null
}
