// Misma lógica que evento_finalizado y evento_acepta_pagos (supabase/eventos_fechas_setup.sql).

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

// Sin pasar por Date, para que la zona horaria no corra la fecha un día.
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return ''
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export const ESTADOS: Record<EstadoEvento, { etiqueta: string; clase: string }> = {
  abierto: { etiqueta: 'Pago abierto', clase: 'bg-green-100 text-green-800' },
  pago_cerrado: { etiqueta: 'Pago cerrado', clase: 'bg-amber-100 text-amber-800' },
  finalizado: { etiqueta: 'Finalizado', clase: 'bg-gray-200 text-gray-700' },
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
