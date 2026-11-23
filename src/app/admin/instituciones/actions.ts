'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { accion, mensajeBD } from '@/lib/resultado'
import { darRolEnInstitucion } from '@/lib/membresias'

const ESTADOS = ['activa', 'en_prueba', 'suspendida', 'cancelada']

// La RLS ya exige super_admin; esto da un mensaje claro y evita llamar a la base de datos en vano.
async function requerirSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('membresias')
    .select('id')
    .eq('persona_id', user.id)
    .eq('rol', 'super_admin')
    .maybeSingle()
  if (!data) throw new Error('Solo el administrador de la plataforma puede hacer esto.')
  return supabase
}

function revalidar() {
  revalidatePath('/admin/instituciones')
}

export async function crearInstitucion(formData: FormData) {
  return accion(async () => {
    const supabase = await requerirSuperAdmin()
    const nombre = String(formData.get('nombre') ?? '').trim()
    const prefijo_codigo = String(formData.get('prefijo_codigo') ?? '').trim().toUpperCase()
    const plan = String(formData.get('plan') ?? '').trim() || null
    if (!nombre || !prefijo_codigo) {
      throw new Error('El nombre y el prefijo de código son obligatorios.')
    }

    // Toda institución empieza en prueba; el super_admin la activa cuando corresponda.
    const { error } = await supabase
      .from('instituciones')
      .insert({ nombre, prefijo_codigo, plan, estado: 'en_prueba' })
    if (error) throw new Error(mensajeBD(error, { duplicado: 'Ya existe una institución con ese prefijo.' }))

    revalidar()
    return `"${nombre}" quedó creada, en prueba.`
  })
}

export async function cambiarEstadoInstitucion(id: string, nuevoEstado: string, _formData: FormData) {
  return accion(async () => {
    const supabase = await requerirSuperAdmin()
    if (!ESTADOS.includes(nuevoEstado)) throw new Error('Ese estado no existe.')
    const { error } = await supabase.from('instituciones').update({ estado: nuevoEstado }).eq('id', id)
    if (error) throw new Error(mensajeBD(error))

    revalidar()
    return `La institución quedó ${nuevoEstado.replace('_', ' ')}.`
  })
}

// El primer administrador de cada institución. Si ya era recaudador ahí, se le cambia el rol.
export async function asignarAdminInstitucion(institucionId: string, formData: FormData) {
  return accion(async () => {
    const supabase = await requerirSuperAdmin()
    const texto = await darRolEnInstitucion(
      supabase,
      institucionId,
      String(formData.get('correo') ?? ''),
      'admin_institucion'
    )
    revalidar()
    return texto
  })
}
