'use server'

import { revalidatePath } from 'next/cache'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { FONDOS, PALETAS } from '@/lib/paletas'

// La función de la base de datos vuelve a revisar que sea el administrador.
export async function guardarApariencia(formData: FormData) {
  const paleta = String(formData.get('paleta') ?? '')
  const fondo = String(formData.get('fondo') ?? '')

  if (!PALETAS.some((p) => p.id === paleta) || !FONDOS.some((f) => f.id === fondo)) {
    throw new Error('Elige una paleta y un fondo válidos.')
  }

  const sesion = await obtenerSesionInstitucion()
  if (!sesion?.esAdmin) {
    throw new Error('Solo el administrador de la institución puede cambiar sus colores.')
  }

  const { error } = await sesion.supabase.rpc('actualizar_apariencia_institucion', {
    p_institucion_id: sesion.institucionId,
    p_paleta: paleta,
    p_fondo: fondo,
  })

  if (error) {
    throw new Error(
      error.message.includes('actualizar_apariencia_institucion')
        ? 'Falta correr el script supabase/personalizacion_setup.sql en Supabase.'
        : error.message
    )
  }

  revalidatePath('/', 'layout')
}
