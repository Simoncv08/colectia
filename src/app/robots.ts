import type { MetadataRoute } from 'next'
import { URL_SITIO } from '@/lib/sitio'

// Una sola regla para todos (buscadores y asistentes de IA): las páginas públicas se pueden leer y
// los paneles con sesión no. Esas páginas además llevan noindex (SIN_INDEXAR).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/inicio', '/cuenta', '/auth', '/verificacion', '/restablecer'],
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  }
}
