'use server'

import { createClient } from '@/lib/supabase/server'
import { MENSAJES_REVISION } from '@/lib/registro'

// Antes de crear la cuenta: si el NIT o la dirección no sirven, se avisa sin enviar correos.
export async function revisarRegistro(nit: string, subdominio: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('revisar_registro', { p_nit: nit, p_subdominio: subdominio })
  if (error) return 'No se pudo revisar el registro. Intenta de nuevo en un momento.'
  return data === 'ok' ? null : (MENSAJES_REVISION[data] ?? 'Revisa los datos del colegio.')
}
