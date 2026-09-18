const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export const isClerkConfigured =
  Boolean(publishableKey) &&
  (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')) &&
  publishableKey !== 'pk_test_tu_publishable_key_aqui'

export { publishableKey }