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

// Ruta pública → carpeta de src/app que la atiende, según la zona; null si ahí no existe (404).
// En un colegio: /inicio y /cuenta son de las familias y /admin/… es el panel del personal
// (carpetas acudiente/ e institucion/). En admin.colectia.co: /inicio, /legal y /cuenta (carpeta
// admin/). Las carpetas no se pueden abrir con su nombre real.
export function rutaInterna(zona: Zona, pathname: string): string | null {
  const bajo = (prefijo: string) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)
  if (bajo('/institucion') || bajo('/acudiente')) return null

  if (zona.tipo === 'colegio') {
    if (bajo('/admin')) return `/institucion${pathname.slice('/admin'.length)}`
    if (pathname === '/inicio') return '/acudiente'
    if (pathname === '/cuenta') return '/acudiente/cuenta'
    return pathname
  }
  if (zona.tipo === 'admin') {
    if (bajo('/admin')) return null
    if (pathname === '/inicio') return '/admin/instituciones'
    if (pathname === '/legal') return '/admin/legal'
    if (pathname === '/tarifas') return '/admin/tarifas'
    if (pathname === '/cuenta') return '/admin/cuenta'
    return pathname
  }
  if (bajo('/inicio') || bajo('/cuenta') || bajo('/admin')) return null
  return pathname
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

// x-forwarded-host lo pone Vercel con el dominio que se visitó; host, en desarrollo.
export function hostDeLaSolicitud(encabezados: Headers) {
  return (encabezados.get('x-forwarded-host') ?? encabezados.get('host'))?.split(',')[0].trim().toLowerCase() || null
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
