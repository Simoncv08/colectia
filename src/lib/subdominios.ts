import { DOMINIO_RAIZ } from '@/lib/sitio'

// Las reglas completas (reservados, en uso) las revisa la base de datos (26_subdominios.sql);
// este patrón solo da aviso inmediato en el formulario.
export const PATRON_SUBDOMINIO = '[a-z0-9][a-z0-9\\-]{1,28}[a-z0-9]'

export type EstadoSubdominio = 'propuesto' | 'aprobado' | 'rechazado'

export function direccionColegio(subdominio: string) {
  return `${subdominio}.${DOMINIO_RAIZ}`
}

export function leerSubdominio(formData: FormData) {
  return String(formData.get('subdominio') ?? '').trim().toLowerCase()
}
