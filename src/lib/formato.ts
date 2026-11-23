import { formatearFecha } from '@/lib/estadoEvento'

// Formatos y comparaciones que usan varias pantallas, en una sola copia.

const FORMATO_PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// "$ 45.000": pesos sin decimales, la única forma de mostrar dinero en la app.
export function pesos(valor: number) {
  return FORMATO_PESOS.format(Math.round(valor))
}

// "22 nov. 2026, 3:45 p. m.", en hora de Colombia, para los registros de pago.
export function formatearFechaHora(iso: string) {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const hora = d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' })
  return `${formatearFecha(fecha)}, ${hora}`
}

// Sin tildes ni mayúsculas: "José" y "jose", o "5 a" y "5A", quedan iguales.
export function normalizar(texto: string) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

type ConNombre = { nombres?: string | null; apellidos?: string | null; correo?: string | null }

export function nombrePersona(p: ConNombre | null | undefined, respaldo = 'Sin nombre') {
  return [p?.nombres, p?.apellidos].filter(Boolean).join(' ').trim() || p?.correo || respaldo
}

// Valor de filtro para "sin curso asignado" (no puede chocar con un curso real).
export const SIN_CURSO = '__sin__'

export function nombreCurso(curso: string | null | undefined) {
  return curso || 'Sin curso asignado'
}

// Orden natural (2A antes que 10A); los que no tienen curso van al final.
export function compararCursos(a: string | null | undefined, b: string | null | undefined) {
  if (!a) return b ? 1 : 0
  if (!b) return -1
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
}

type ConApellidos = { nombres: string; apellidos: string }

export function compararEstudiantes(a: ConApellidos, b: ConApellidos) {
  return (
    a.apellidos.localeCompare(b.apellidos, 'es', { sensitivity: 'base' }) ||
    a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' })
  )
}
