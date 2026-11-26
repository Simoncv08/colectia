import type { Metadata } from 'next'

// Dirección pública de Colectia: base de las URL canónicas, el sitemap y los datos estructurados.
// Así colectia.vercel.app y colectia.org (sin www) no compiten con www.colectia.org en Google.
export const URL_SITIO = 'https://www.colectia.org'

export const TITULO_SITIO = 'Colectia · Pagos escolares claros para familias y colegios'

export const DESCRIPCION_SITIO =
  'Colectia organiza el recaudo de salidas pedagógicas, eventos y actividades de los colegios en Colombia: el colegio sabe quién ya pagó y cada familia ve lo suyo.'

// Next reemplaza openGraph completo en cada página que lo define, así que estas partes comunes se
// repiten a mano (la imagen la pone src/app/opengraph-image.png).
export const OPEN_GRAPH_BASE = {
  type: 'website',
  siteName: 'Colectia',
  locale: 'es_CO',
} satisfies Metadata['openGraph']

// Páginas detrás del inicio de sesión o de un enlace de correo: no deben salir en buscadores.
export const SIN_INDEXAR = { index: false, follow: false } satisfies Metadata['robots']
