import { esUY } from '@clerk/localizations'

/*
  Textos de Clerk en español rioplatense (#436).

  La base es `esUY` (español de Uruguay), que ya usa voseo: "¿No tenés una cuenta? Registrate".
  `esES` mezclaba "tú" y "usted" ("¿No tienes cuenta? Regístrese"). Encima van los textos que
  `esUY` deja en inglés o con "tú" en el ingreso, el registro por invitación (ADR-008) y la
  recuperación de la contraseña, incluido el error de demasiados intentos.
*/
const DEMASIADOS_INTENTOS = 'Hiciste demasiados intentos. Esperá un momento y probá de nuevo.'

// Códigos de error que Clerk devuelve y que su tipo de traducciones todavía no lista. Clerk busca el
// texto por el código (`unstable__errors.<código>`); si no lo encuentra, muestra el mensaje del
// servidor en inglés. Este salió en el recorrido del 22/11 al pedir varios códigos seguidos en la
// recuperación de la contraseña (429, "Too many verification code requests").
const ERRORES_SIN_TIPO: Record<string, string> = {
  verification_code_rate_limit_exceeded: 'Pediste demasiados códigos. Esperá un momento y probá de nuevo.',
}

export const clerkLocalization = {
  ...esUY,
  formFieldInputPlaceholder__signUpPassword: 'Creá una contraseña',
  formFieldInput__emailAddress_format: 'Formato de ejemplo: nombre@ejemplo.com',
  signIn: {
    ...esUY.signIn,
    accountSwitcher: {
      ...esUY.signIn?.accountSwitcher,
      subtitle: 'Elegí la cuenta con la que querés continuar.',
    },
    emailLink: {
      ...esUY.signIn?.emailLink,
      verifiedTransferable: {
        ...esUY.signIn?.emailLink?.verifiedTransferable,
        title: 'Correo verificado',
        subtitle: 'Volvé a la pestaña original para continuar',
      },
    },
    emailLinkMfa: {
      ...esUY.signIn?.emailLinkMfa,
      title: 'Revisá tu correo electrónico',
    },
    passwordCompromised: {
      ...esUY.signIn?.passwordCompromised,
      title: 'Contraseña comprometida',
    },
    passwordUntrusted: {
      ...esUY.signIn?.passwordUntrusted,
      title: 'Contraseña poco segura',
    },
  },
  unstable__errors: {
    ...esUY.unstable__errors,
    ...ERRORES_SIN_TIPO,
    too_many_requests: DEMASIADOS_INTENTOS,
    signup_rate_limit_exceeded: DEMASIADOS_INTENTOS,
    action_blocked:
      'No pudimos completar la acción. Probá de nuevo más tarde o escribinos a soporte si sigue pasando.',
    external_account_not_found: 'No encontramos la cuenta. Registrate o ingresá con otra cuenta.',
    form_new_password_matches_current: 'La contraseña nueva no puede ser igual a la actual.',
    form_password_matches_identifier:
      'La contraseña no puede ser igual a tu correo, tu teléfono ni tu nombre de usuario. Por seguridad, usá otra.',
    form_password_untrusted__sign_in:
      'Tu contraseña podría estar comprometida. Para proteger tu cuenta, ingresá con otro método y después creá una contraseña nueva.',
    ticket_expired_code: 'Este enlace venció. Empezá de nuevo o pedí un enlace nuevo.',
    ticket_invalid_code: 'Este enlace ya no es válido o ya se usó. Empezá de nuevo o pedí un enlace nuevo.',
    too_many_unverified_identifications:
      'Tu cuenta tiene demasiadas verificaciones pendientes. Quitá un correo que ya no uses y probá de nuevo.',
  },
} satisfies typeof esUY
