/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** "false" → consume Circle + the NQR backend; anything else → device-local mock. */
  readonly VITE_USE_MOCK?: string
  /** Circle API base URL (system of record for accounts + hierarchy). */
  readonly VITE_CIRCLE_API_BASE?: string
  /** NQR domain backend base URL (concerns, hazards, analytics, sync). */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
