/**
 * Global feature flags. Derived from Vite env at build time.
 */
export const USE_API = (import.meta.env.VITE_USE_API as string | undefined) === 'true';
