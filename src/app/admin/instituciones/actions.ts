'use server'

import { revalidatePath } from 'next/cache'
import { accion, mensajeBD } from '@/lib/resultado'
import { darRolEnInstitucion } from '@/lib/membresias'
import { requerirSuperAdmin } from '@/lib/sesionSuperAdmin'
import { direccionColegio, leerSubdominio } from '@/lib/subdominios'

const ESTADOS = ['activa', 'en_prueba', 'suspendida', 'cancelada']

function revalidar() {
  revalidatePath('/admin/instituciones')
}

export async function crearInstitucion(formData: FormData) {
  return accion(async () => {
    const { supabase } = await requerirSuperAdmin()
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
    const { supabase } = await requerirSuperAdmin()
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
    const { supabase } = await requerirSuperAdmin()
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

// Aprueba el subdominio propuesto o, si el formulario trae uno, asigna ese (colegios creados
// aquí o un cambio excepcional; el anterior redirige 90 días).
export async function aprobarSubdominio(institucionId: string, formData: FormData) {
  return accion(async () => {
    const { supabase } = await requerirSuperAdmin()
    const elegido = leerSubdominio(formData)
    const { error } = await supabase.rpc('aprobar_subdominio', {
      p_institucion_id: institucionId,
      ...(elegido ? { p_subdominio: elegido } : {}),
    })
    if (error) throw new Error(mensajeBD(error))

    revalidar()
    return elegido ? `${direccionColegio(elegido)} quedó aprobada.` : 'La dirección quedó aprobada.'
  })
}

export async function rechazarSubdominio(institucionId: string, formData: FormData) {
  return accion(async () => {
    const { supabase } = await requerirSuperAdmin()
    const { error } = await supabase.rpc('rechazar_subdominio', {
      p_institucion_id: institucionId,
      p_motivo: String(formData.get('motivo') ?? ''),
    })
    if (error) throw new Error(mensajeBD(error))

    revalidar()
    return 'Rechazada. El colegio verá el motivo y podrá proponer otra.'
  })
}
