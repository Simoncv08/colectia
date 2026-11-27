import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/tipos'
import {
  ENCABEZADO_COLEGIO,
  ENCABEZADO_ZONA,
  decodificarColegio,
  urlDeZona,
  type ColegioDeLaDireccion,
} from '@/lib/zona'

export type ZonaActual = {
  tipo: 'sitio' | 'admin' | 'colegio'
  // Solo en la dirección de un colegio (el proxy ya revisó que existe y está aprobado).
  colegio: ColegioDeLaDireccion | null
  host: string
}

export const zonaActual = cache(async (): Promise<ZonaActual> => {
  const h = await headers()
  const tipo = h.get(ENCABEZADO_ZONA)
  const colegio = tipo === 'colegio' ? decodificarColegio(h.get(ENCABEZADO_COLEGIO)) : null
  return {
    tipo: tipo === 'admin' ? 'admin' : colegio ? 'colegio' : 'sitio',
    colegio,
    host: h.get('host') ?? '',
  }
})

// La dirección del colegio de la cuenta (lcp.colectia.co), o null si no tiene uno aprobado.
async function direccionDeMiColegio(supabase: SupabaseClient<Database>, personaId: string, host: string) {
  const { data } = await supabase
    .from('personas')
    .select('instituciones(subdominio, subdominio_estado)')
    .eq('id', personaId)
    .maybeSingle()
  const inst = data?.instituciones
  return inst?.subdominio && inst.subdominio_estado === 'aprobado' ? urlDeZona(host, inst.subdominio) : null
}

// Para quien ya inició sesión fuera de su colegio: lo lleva a donde le corresponde.
export async function irAMiZona(supabase: SupabaseClient<Database>, personaId: string): Promise<never> {
  const { host } = await zonaActual()
  const { data: superAdmin } = await supabase
    .from('membresias')
    .select('id')
    .eq('persona_id', personaId)
    .eq('rol', 'super_admin')
    .maybeSingle()
  if (superAdmin) redirect(urlDeZona(host, 'admin'))

  const propia = await direccionDeMiColegio(supabase, personaId, host)
  redirect(propia ?? urlDeZona(host, 'www', '/sin-colegio'))
}

// En la dirección de un colegio: la cuenta queda unida a ese colegio la primera vez; si es de
// otro colegio (o es el super administrador), se la lleva a su lugar.
export const asegurarCuentaDelColegio = cache(
  async (supabase: SupabaseClient<Database>, personaId: string, colegio: ColegioDeLaDireccion) => {
    const { data, error } = await supabase.rpc('unirse_a_colegio', { p_institucion_id: colegio.id })
    if (error) throw new Error('No se pudo revisar el colegio de tu cuenta. Recarga la página.')
    if (data !== 'ok') await irAMiZona(supabase, personaId)
  }
)
