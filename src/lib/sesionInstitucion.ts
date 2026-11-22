import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SesionInstitucion = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  correo: string
  membresiaId: string
  institucionId: string
  rol: 'admin_institucion' | 'recaudador'
  esAdmin: boolean
  institucion: {
    nombre: string
    estado: string
    paleta: string | null
    fondo: string | null
  }
}

// Sin sesión manda a /login; sin membresía de personal devuelve null. cache() evita repetir la
// consulta en la misma visita. Si la persona es personal de varias instituciones, usa la más antigua.
export const obtenerSesionInstitucion = cache(async (): Promise<SesionInstitucion | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membresias } = await supabase
    .from('membresias')
    .select('id, institucion_id, rol, instituciones(nombre, estado)')
    .eq('persona_id', user.id)
    .in('rol', ['admin_institucion', 'recaudador'])
    .order('created_at', { ascending: true })

  const m = (membresias ?? [])[0] as unknown as
    | {
        id: string
        institucion_id: string
        rol: 'admin_institucion' | 'recaudador'
        instituciones: { nombre: string; estado: string } | null
      }
    | undefined

  if (!m) return null

  // Aparte y sin fallar: sin personalizacion_setup.sql se usan los colores por defecto.
  const { data: apariencia } = await supabase
    .from('instituciones')
    .select('paleta, fondo')
    .eq('id', m.institucion_id)
    .maybeSingle()

  return {
    supabase,
    userId: user.id,
    correo: user.email ?? '',
    membresiaId: m.id,
    institucionId: m.institucion_id,
    rol: m.rol,
    esAdmin: m.rol === 'admin_institucion',
    institucion: {
      nombre: m.instituciones?.nombre ?? 'Tu institución',
      estado: m.instituciones?.estado ?? '',
      paleta: (apariencia as { paleta?: string } | null)?.paleta ?? null,
      fondo: (apariencia as { fondo?: string } | null)?.fondo ?? null,
    },
  }
})
