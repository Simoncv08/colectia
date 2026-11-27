'use server'

import { revalidatePath } from 'next/cache'
import { requerirPersonal } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'

// "Avísame cuando esté listo": la base revisa que sea el administrador y un módulo próximo.
export async function pedirAvisoModulo(modulo: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true, institucionActiva: false })
    const { error } = await sesion.supabase.rpc('pedir_aviso_modulo', {
      p_institucion_id: sesion.institucionId,
      p_modulo: modulo,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidatePath('/institucion/modulos')
    return 'Listo. Te contaremos cuando este módulo esté disponible.'
  })
}
