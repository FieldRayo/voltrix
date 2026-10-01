import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import netlify from '@astrojs/netlify'

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  // La autenticación es con Bearer token (OAuth 2.0), sin cookies, así que no
  // hay CSRF que frenar; y el token endpoint debe aceptar clientes sin Origin.
  security: { checkOrigin: false },
})
