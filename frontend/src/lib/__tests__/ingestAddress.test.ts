import { describe, expect, it } from 'vitest'

import { buildIngestAddress } from '../ingestAddress'

describe('buildIngestAddress', () => {
  it('arma la dirección oficial precios-<slug>@margenx.tech (ADR-005 §3)', () => {
    expect(buildIngestAddress('panaderia-central')).toBe('precios-panaderia-central@margenx.tech')
  })

  it('ignora espacios alrededor del slug', () => {
    expect(buildIngestAddress('  limpieza-total  ')).toBe('precios-limpieza-total@margenx.tech')
  })

  it('sin slug no arma ninguna dirección', () => {
    expect(buildIngestAddress(undefined)).toBeNull()
    expect(buildIngestAddress(null)).toBeNull()
    expect(buildIngestAddress('   ')).toBeNull()
  })
})
