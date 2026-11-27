import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/tipos'

// Lo que el formulario de registro guarda en la cuenta nueva (user_metadata.registro_colegio)
// para crear el colegio cuando el correo queda confirmado (registrar_colegio).
export type RegistroColegio = {
  nombre: string
  nit: string
  ciudad: string
  tramo: number
  subdominio: string
  cargo: string
  telefono: string
  modulos: string[]
}

// Respuestas de revisar_registro().
export const MENSAJES_REVISION: Record<string, string> = {
  nit_invalido: 'Revisa el NIT: debe tener el número y el dígito de verificación (ej.: 900123456-8).',
  nit_registrado: 'Ese colegio ya está en Colectia; escríbenos si es un error.',
  subdominio_no_disponible:
    'Esa dirección no está disponible o no es válida. Usa de 3 a 30 letras sin tildes, números o guiones.',
}

export function leerRegistro(meta: unknown): RegistroColegio | null {
  const r = (meta as { registro_colegio?: Partial<RegistroColegio> } | null)?.registro_colegio
  if (!r?.nombre || !r.nit || !r.subdominio || !r.tramo) return null
  return {
    nombre: String(r.nombre),
    nit: String(r.nit),
    ciudad: String(r.ciudad ?? ''),
    tramo: Number(r.tramo),
    subdominio: String(r.subdominio),
    cargo: String(r.cargo ?? ''),
    telefono: String(r.telefono ?? ''),
    modulos: Array.isArray(r.modulos) ? r.modulos.map(String) : [],
  }
}

// La base revisa todo otra vez (NIT, dirección, cuenta sin colegio y correo confirmado).
export async function crearColegioRegistrado(
  supabase: SupabaseClient<Database>,
  registro: RegistroColegio,
  persona: { nombres: string; apellidos: string }
) {
  return supabase.rpc('registrar_colegio', {
    p_nombre: registro.nombre,
    p_nit: registro.nit,
    p_ciudad: registro.ciudad,
    p_tramo: registro.tramo,
    p_subdominio: registro.subdominio,
    p_nombres: persona.nombres,
    p_apellidos: persona.apellidos,
    p_cargo: registro.cargo,
    p_telefono: registro.telefono,
    p_modulos: registro.modulos,
  })
}
