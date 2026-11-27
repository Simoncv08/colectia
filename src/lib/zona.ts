import { DOMINIO_RAIZ } from '@/lib/sitio'

// Qué parte de Colectia pide cada dirección:
//   www.colectia.co      → sitio (información para colegios)
//   admin.colectia.co    → admin (super administrador)
//   lcp.colectia.co      → colegio "lcp" (personal y familias)
//   colectia.co          → raiz (se redirige a www)
// En desarrollo: localhost:3000, admin.localhost:3000 y lcp.localhost:3000.
// Otras direcciones (colectia.vercel.app, vistas previas) se tratan como el sitio.
export type Zona =
  | { tipo: 'sitio' }
  | { tipo: 'admin' }
  | { tipo: 'colegio'; subdominio: string }
  | { tipo: 'raiz' }

// Lo que el proxy averigua del colegio de la dirección (colegio_publico) y pasa a la app.
export type ColegioDeLaDireccion = {
  id: string
  nombre: string
  subdominio: string
  estado: string
  paleta: string
  fondo: string
}

// El proxy borra estos encabezados si vienen del navegador y los vuelve a escribir.
export const ENCABEZADO_ZONA = 'x-colectia-zona'
export const ENCABEZADO_COLEGIO = 'x-colectia-colegio'

export function leerZona(hostname: string): Zona {
  const host = hostname.toLowerCase()
  for (const raiz of [DOMINIO_RAIZ, 'localhost']) {
    if (host === raiz) return raiz === 'localhost' ? { tipo: 'sitio' } : { tipo: 'raiz' }
    if (host.endsWith(`.${raiz}`)) {
      const etiqueta = host.slice(0, -(raiz.length + 1))
      if (etiqueta === 'www') return { tipo: 'sitio' }
      if (etiqueta === 'admin') return { tipo: 'admin' }
      return { tipo: 'colegio', subdominio: etiqueta }
    }
  }
  return { tipo: 'sitio' }
}

// Rutas que no existen en cada zona: /admin solo en admin.colectia.co, y los paneles del colegio
// solo en la dirección de un colegio.
export function rutaPermitida(zona: Zona, pathname: string) {
  const empieza = (prefijo: string) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)
  const panelesColegio = empieza('/institucion') || empieza('/acudiente')
  switch (zona.tipo) {
    case 'admin':
      return !panelesColegio
    case 'colegio':
      return !empieza('/admin')
    default:
      return !panelesColegio && !empieza('/admin')
  }
}

export function codificarColegio(colegio: ColegioDeLaDireccion) {
  return encodeURIComponent(JSON.stringify(colegio))
}

export function decodificarColegio(valor: string | null): ColegioDeLaDireccion | null {
  if (!valor) return null
  try {
    return JSON.parse(decodeURIComponent(valor)) as ColegioDeLaDireccion
  } catch {
    return null
  }
}

// Dirección completa de otra zona, con el mismo esquema y puerto que la actual (para desarrollo).
export function urlDeZona(hostActual: string, destino: 'www' | 'admin' | string, ruta = '/') {
  const [hostname, puerto] = hostActual.toLowerCase().split(':')
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    const prefijo = destino === 'www' ? '' : `${destino}.`
    return `http://${prefijo}localhost${puerto ? `:${puerto}` : ''}${ruta}`
  }
  return `https://${destino}.${DOMINIO_RAIZ}${ruta}`
}
