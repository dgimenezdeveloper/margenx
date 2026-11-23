import { enUS } from '@clerk/localizations'
import { describe, expect, it } from 'vitest'
import { clerkLocalization } from '../clerkLocalization'

type Arbol = { [clave: string]: unknown }

function aplanar(objeto: unknown, prefijo = '', salida: Record<string, unknown> = {}): Record<string, unknown> {
  for (const [clave, valor] of Object.entries((objeto ?? {}) as Arbol)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave
    if (valor && typeof valor === 'object') aplanar(valor, ruta, salida)
    else salida[ruta] = valor
  }
  return salida
}

const textos = aplanar(clerkLocalization)
const ingles = aplanar(enUS)

// Lo que ve el dueño en /login: ingreso, registro por invitación (ADR-008), recuperación de la
// contraseña y sus errores. Quedan afuera los métodos que MargenX no usa (teléfono, claves de
// acceso, billeteras, SSO, segundo factor) y las pantallas de organizaciones y planes de Clerk.
const DEL_LOGIN =
  /^(signIn\.(start|password|forgotPassword|forgotPasswordAlternativeMethods|resetPassword|emailCode|emailLink|alternativeMethods|accountSwitcher|passwordPwned|passwordCompromised|passwordUntrusted)|signUp\.(start|continue|emailCode|emailLink)|formField|formButtonPrimary$|unstable__errors\.(too_many_requests|signup_rate_limit_exceeded|ticket_|form_password|form_new_password|form_identifier|action_blocked|external_account_not_found|too_many_unverified))/
const AJENO = /phone|Phone|passkey|Passkey|web3|Web3|enterprise|Enterprise|sso|SSO|saml|totp|TOTP|mfa|Mfa|backupCode|username|Username|organization|Organization|apiKey|waitlist|alternativePhoneCode|__use_/

const clavesDelLogin = Object.keys(ingles).filter(
  (clave) => DEL_LOGIN.test(clave) && !AJENO.test(clave) && /[a-z]{3}/i.test(String(ingles[clave] ?? ''))
)

describe('Clerk en español rioplatense (#436)', () => {
  it('usa voseo en el ingreso, el registro y la recuperación de la contraseña', () => {
    expect(textos['signIn.start.actionText']).toBe('¿No tenés una cuenta?')
    expect(textos['signIn.start.actionLink']).toBe('Registrate')
    expect(textos['formFieldAction__forgotPassword']).toBe('¿Olvidaste tu contraseña?')
    expect(textos['signIn.forgotPasswordAlternativeMethods.title']).toBe('¿Olvidaste tu contraseña?')
    expect(textos['signUp.start.actionText']).toBe('¿Ya tenés una cuenta?')
    expect(textos['formFieldInputPlaceholder__emailAddress']).toBe('Ingresá tu dirección de correo electrónico')
  })

  it('Escenario Gherkin "Voseo en Clerk": el error de demasiados intentos está en español', () => {
    for (const clave of ['unstable__errors.too_many_requests', 'unstable__errors.signup_rate_limit_exceeded']) {
      expect(textos[clave], clave).toBe('Hiciste demasiados intentos. Esperá un momento y probá de nuevo.')
    }
    // El que devolvió Clerk en el recorrido del 22/11 al tocar "Reenviar" varias veces en la
    // recuperación de la contraseña: 429 con este código y "Too many verification code requests".
    expect(textos['unstable__errors.verification_code_rate_limit_exceeded']).toBe(
      'Pediste demasiados códigos. Esperá un momento y probá de nuevo.'
    )
  })

  it('ningún texto del login queda en inglés', () => {
    expect(clavesDelLogin.length).toBeGreaterThan(50)
    const enIngles = clavesDelLogin.filter((clave) => textos[clave] === undefined || textos[clave] === ingles[clave])
    expect(enIngles).toEqual([])
  })

  it('ningún texto del login usa "tú" ni "usted"', () => {
    const tuOUsted =
      /\b(tienes|puedes|quieres|deseas|necesitas|debes|has olvidado|regístrese|ingrese|seleccione|intente|verifique|usted)\b|(^|[.!?¿¡]\s*)(Revisa|Selecciona|Ingresa|Intenta|Verifica|Elige|Crea)\b/i
    const conTu = clavesDelLogin.filter((clave) => tuOUsted.test(String(textos[clave] ?? '')))
    expect(conTu.map((clave) => `${clave}: ${textos[clave]}`)).toEqual([])
  })
})
