'use server'

import { revalidatePath } from 'next/cache'
import { requerirPersonal } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'
import { FONDOS, PALETAS } from '@/lib/paletas'

// La función de la base de datos vuelve a revisar que sea el administrador.
export async function guardarApariencia(formData: FormData) {
  return accion(async () => {
    const paleta = String(formData.get('paleta') ?? '')
    const fondo = String(formData.get('fondo') ?? '')
    if (!PALETAS.some((p) => p.id === paleta) || !FONDOS.some((f) => f.id === fondo)) {
      throw new Error('Elige una paleta y un fondo válidos.')
    }

    const sesion = await requerirPersonal({ soloAdmin: true })
    const { error } = await sesion.supabase.rpc('actualizar_apariencia_institucion', {
      p_institucion_id: sesion.institucionId,
      p_paleta: paleta,
      p_fondo: fondo,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidatePath('/', 'layout')
    return 'Los colores quedaron guardados.'
  })
}
