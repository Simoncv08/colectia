import { formatearFecha } from '@/lib/estadoEvento'

// Términos y condiciones y política de privacidad (23_documentos_legales.sql).

export type TipoLegal = 'terminos' | 'privacidad'

export const TIPOS_LEGALES: TipoLegal[] = ['terminos', 'privacidad']

export const DOCUMENTOS_LEGALES: Record<TipoLegal, { titulo: string; ruta: string }> = {
  terminos: { titulo: 'Términos y condiciones', ruta: '/terminos' },
  privacidad: { titulo: 'Política de privacidad', ruta: '/privacidad' },
}

export function esTipoLegal(valor: unknown): valor is TipoLegal {
  return valor === 'terminos' || valor === 'privacidad'
}

// "22 nov. 2026", en hora de Colombia (publicado_en viene en UTC).
export function fechaLegal(iso: string) {
  return formatearFecha(new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }))
}
