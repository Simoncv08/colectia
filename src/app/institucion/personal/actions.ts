'use server'

import { revalidatePath } from 'next/cache'
import { requerirPersonal, type SesionInstitucion } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'
import { darRolEnInstitucion, esRolPersonal, ROLES_INVITACION } from '@/lib/membresias'

export async function invitarMiembro(formData: FormData) {
  return accion(async () => {
    const { supabase, institucionId } = await requerirPersonal({ soloAdmin: true })
    const rol = String(formData.get('rol') ?? '').trim()
    if (!esRolPersonal(rol)) throw new Error('Elige un rol.')

    const texto = await darRolEnInstitucion(supabase, institucionId, String(formData.get('correo') ?? ''), rol)
    revalidatePath('/institucion', 'layout')
    return texto
  })
}

// Quita a alguien del personal sin borrar su fila: queda como "retirado", sin ningún permiso,
// y los eventos y pagos que registró siguen a su nombre. Una invitación pendiente se cancela.
export async function eliminarMiembro(membresiaId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    if (membresiaId === sesion.membresiaId) {
      throw new Error('No puedes quitarte a ti mismo del personal.')
    }
    const { data: miembro } = await sesion.supabase
      .from('membresias')
      .select('id, rol')
      .eq('id', membresiaId)
      .eq('institucion_id', sesion.institucionId)
      .maybeSingle()
    if (!miembro || miembro.rol === 'retirado') throw new Error('Esa persona ya no está en el personal.')

    if (ROLES_INVITACION.includes(miembro.rol)) {
      const { error } = await sesion.supabase.from('membresias').delete().eq('id', miembro.id)
      if (error?.code === '23503') {
        // Ya había estado en el personal: se deja como retirado para conservar sus registros.
        await retirar(sesion.supabase, miembro.id)
      } else if (error) {
        throw new Error(mensajeBD(error))
      }
      revalidatePath('/institucion', 'layout')
      return 'La invitación quedó cancelada.'
    }

    await retirar(sesion.supabase, miembro.id)
    revalidatePath('/institucion', 'layout')
    return 'La persona salió del personal. Sus pagos y eventos registrados se conservan.'
  })
}

async function retirar(supabase: SesionInstitucion['supabase'], id: string) {
  const { data, error } = await supabase.from('membresias').update({ rol: 'retirado' }).eq('id', id).select('id')
  if (error) throw new Error(mensajeBD(error))
  if (!data?.length) throw new Error('No se pudo quitar a esa persona del personal.')
}
