'use server'

import { revalidatePath } from 'next/cache'
import { requerirPersonal } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'
import { darRolEnInstitucion, esRolPersonal } from '@/lib/membresias'

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

// Borra la membresía, no la cuenta de Colectia.
export async function eliminarMiembro(membresiaId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    if (membresiaId === sesion.membresiaId) {
      throw new Error('No puedes quitarte a ti mismo del personal.')
    }
    const { data, error } = await sesion.supabase
      .from('membresias')
      .delete()
      .eq('id', membresiaId)
      .eq('institucion_id', sesion.institucionId)
      .select('id')
    if (error) {
      throw new Error(
        mensajeBD(error, {
          enUso: 'Esta persona aparece como quien recibió pagos, así que no se puede quitar sin perder ese registro.',
        })
      )
    }
    if (!data?.length) throw new Error('Esa persona ya no está en el personal.')

    revalidatePath('/institucion', 'layout')
    return 'La persona salió del personal.'
  })
}
