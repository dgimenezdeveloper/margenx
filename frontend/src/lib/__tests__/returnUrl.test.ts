import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_RETURN_URL,
  RETURN_URL_PARAM,
  buildLoginUrl,
  clearStoredReturnUrl,
  resolveReturnUrl,
  sanitizeReturnUrl,
} from '../returnUrl'

const ORIGIN = 'https://margenx.tech'

describe('sanitizeReturnUrl', () => {
  it('acepta rutas internas con query y hash', () => {
    expect(sanitizeReturnUrl('/productos/medialunas-de-manteca', ORIGIN)).toBe('/productos/medialunas-de-manteca')
    expect(sanitizeReturnUrl('/productos?search=lavandina#lista', ORIGIN)).toBe('/productos?search=lavandina#lista')
  })

  it('rechaza destinos de otro dominio (redirección abierta)', () => {
    expect(sanitizeReturnUrl('https://sitio-malicioso.com/productos', ORIGIN)).toBeNull()
    expect(sanitizeReturnUrl('//sitio-malicioso.com/productos', ORIGIN)).toBeNull()
    expect(sanitizeReturnUrl('/\\sitio-malicioso.com', ORIGIN)).toBeNull()
    expect(sanitizeReturnUrl('javascript:alert(1)', ORIGIN)).toBeNull()
  })

  it('rechaza volver al login y valores vacíos', () => {
    expect(sanitizeReturnUrl('/login', ORIGIN)).toBeNull()
    expect(sanitizeReturnUrl('/login/factor-one', ORIGIN)).toBeNull()
    expect(sanitizeReturnUrl('', ORIGIN)).toBeNull()
    expect(sanitizeReturnUrl(null, ORIGIN)).toBeNull()
  })
})

describe('buildLoginUrl', () => {
  it('codifica el destino en el parámetro de retorno', () => {
    expect(buildLoginUrl({ pathname: '/productos/pan-de-campo', search: '?tab=receta', hash: '' })).toBe(
      `/login?${RETURN_URL_PARAM}=%2Fproductos%2Fpan-de-campo%3Ftab%3Dreceta`,
    )
  })

  it('agrega el motivo de cierre cuando se indica', () => {
    expect(buildLoginUrl({ pathname: '/insumos', search: '', hash: '' }, 'inactivity')).toBe(
      `/login?${RETURN_URL_PARAM}=%2Finsumos&reason=inactivity`,
    )
  })

  it('no agrega retorno si el destino es el dashboard o el login', () => {
    expect(buildLoginUrl({ pathname: '/dashboard', search: '', hash: '' })).toBe('/login')
    expect(buildLoginUrl({ pathname: '/login', search: '', hash: '' }, 'inactivity')).toBe('/login?reason=inactivity')
  })
})

describe('resolveReturnUrl', () => {
  afterEach(() => clearStoredReturnUrl())

  it('toma el destino de la query y lo recuerda para los pasos de Clerk (2FA)', () => {
    expect(resolveReturnUrl(`?${RETURN_URL_PARAM}=%2Fproductos%2Fpan-de-campo`, ORIGIN)).toBe('/productos/pan-de-campo')
    // En /login/factor-one la query ya no está: se usa lo recordado.
    expect(resolveReturnUrl('', ORIGIN)).toBe('/productos/pan-de-campo')
  })

  it('vuelve al dashboard si no hay destino o si el destino es inválido', () => {
    expect(resolveReturnUrl('', ORIGIN)).toBe(DEFAULT_RETURN_URL)
    expect(resolveReturnUrl(`?${RETURN_URL_PARAM}=https%3A%2F%2Fsitio-malicioso.com`, ORIGIN)).toBe(DEFAULT_RETURN_URL)
  })

  it('olvida el destino después de usarlo', () => {
    resolveReturnUrl(`?${RETURN_URL_PARAM}=%2Fperfil`, ORIGIN)
    clearStoredReturnUrl()
    expect(resolveReturnUrl('', ORIGIN)).toBe(DEFAULT_RETURN_URL)
  })
})
