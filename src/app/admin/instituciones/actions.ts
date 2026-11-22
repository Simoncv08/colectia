'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Después de bootstrap_super_admin.sql hay que salir y entrar para recibir el token con el rol.
export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Solo super_admin: lo exige la RLS "super_admin crea instituciones", no este código.
export async function crearInstitucion(formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const prefijo_codigo = String(formData.get('prefijo_codigo') ?? '')
    .trim()
    .toUpperCase()
  const planCrudo = String(formData.get('plan') ?? '').trim()
  const plan = planCrudo.length > 0 ? planCrudo : null

  if (!nombre || !prefijo_codigo) {
    throw new Error('El nombre y el prefijo de código son obligatorios.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('instituciones').insert({
    nombre,
    prefijo_codigo,
    plan,
    // El super_admin la pasa a "activa" a mano cuando corresponda.
    estado: 'en_prueba',
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/instituciones')
}

export async function cambiarEstadoInstitucion(
  id: string,
  nuevoEstado: string,
  _formData: FormData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('instituciones')
    .update({ estado: nuevoEstado })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/instituciones')
}

// La persona debe haber entrado una vez a Colectia con su correo confirmado.
export async function asignarAdminInstitucion(
  institucionId: string,
  formData: FormData
) {
  const correo = String(formData.get('correo') ?? '')
    .trim()
    .toLowerCase()

  if (!correo) {
    throw new Error('El correo es obligatorio.')
  }

  const supabase = await createClient()

  const { data: personaId, error: buscarError } = await supabase.rpc(
    'buscar_persona_id_por_correo',
    { p_correo: correo }
  )

  if (buscarError) {
    throw new Error(buscarError.message)
  }

  if (!personaId) {
    throw new Error(
      'Esa persona todavía no tiene cuenta en Colectia. Debe iniciar sesión con Google al menos una vez antes de poder asignarla.'
    )
  }

  const { error } = await supabase.from('membresias').insert({
    persona_id: personaId,
    institucion_id: institucionId,
    rol: 'admin_institucion',
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/instituciones')
}
