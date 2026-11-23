// Misma lógica que evento_finalizado y evento_acepta_pagos (supabase/migraciones/11_eventos_fechas_setup.sql).

export type EstadoEvento = 'abierto' | 'pago_cerrado' | 'finalizado'

export type FechasEvento = {
  fecha_limite_pago: string | null
  fecha_evento: string | null
  finalizado_en: string | null
}

// 'AAAA-MM-DD' en hora de Colombia, comparable como texto con las fechas de la base de datos.
export function hoyColombia(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

export function estadoEvento(ev: FechasEvento, hoy = hoyColombia()): EstadoEvento {
  if (ev.finalizado_en) return 'finalizado'
  if (ev.fecha_evento && hoy > ev.fecha_evento) return 'finalizado'
  if (ev.fecha_limite_pago && hoy > ev.fecha_limite_pago) return 'pago_cerrado'
  return 'abierto'
}

const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']

// "22 nov. 2026". Sin pasar por Date, para que la zona horaria no corra la fecha un día.
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return ''
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`
}

// "22/11/2026", para el Excel.
export function fechaNumerica(fecha: string | null): string {
  if (!fecha) return ''
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

// Solo se reabre lo que se cerró a mano y cuya fecha de realización no ha pasado.
export function puedeReabrir(ev: FechasEvento, hoy = hoyColombia()) {
  return Boolean(ev.finalizado_en) && !(ev.fecha_evento && hoy > ev.fecha_evento)
}

export const ESTADOS: Record<EstadoEvento, { etiqueta: string; clase: string }> = {
  abierto: { etiqueta: 'Pago abierto', clase: 'bg-exito-suave text-exito' },
  pago_cerrado: { etiqueta: 'Pago cerrado', clase: 'bg-alerta-suave text-alerta' },
  finalizado: { etiqueta: 'Finalizado', clase: 'bg-neutro-suave text-neutro' },
}

// Campo vacío = sin fecha.
export function leerFecha(formData: FormData, campo: string): string | null {
  const valor = String(formData.get(campo) ?? '').trim()
  if (!valor) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error('Una de las fechas no es válida.')
  }
  return valor
}

export function validarFechas(fecha_limite_pago: string | null, fecha_evento: string | null) {
  if (fecha_limite_pago && fecha_evento && fecha_limite_pago > fecha_evento) {
    throw new Error('La fecha límite de pago no puede ser después de la fecha del evento.')
  }
}
