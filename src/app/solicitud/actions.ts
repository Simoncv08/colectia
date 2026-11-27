'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { accion, mensajeBD } from '@/lib/resultado'
import { direccionColegio, leerSubdominio } from '@/lib/subdominios'

// Mientras la dirección no está aprobada, el administrador la cambia desde www. La base revisa
// que sea el administrador de ese colegio y que la dirección no esté aprobada.
export async function cambiarDireccionSolicitada(formData: FormData) {
  return accion(async () => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Tu sesión venció. Vuelve a entrar.')

    const { data: persona } = await supabase.from('personas').select('institucion_id').eq('id', user.id).maybeSingle()
    if (!persona?.institucion_id) throw new Error('Tu cuenta no tiene una solicitud de colegio.')

    const subdominio = leerSubdominio(formData)
    const { error } = await supabase.rpc('proponer_subdominio', {
      p_institucion_id: persona.institucion_id,
      p_subdominio: subdominio,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidatePath('/solicitud')
    return `Enviamos ${direccionColegio(subdominio)} para aprobación.`
  })
}
