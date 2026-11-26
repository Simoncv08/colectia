'use server'

import { revalidatePath } from 'next/cache'
import { accion, mensajeBD, type Resultado } from '@/lib/resultado'
import { DOCUMENTOS_LEGALES, esTipoLegal } from '@/lib/legal'
import { requerirSuperAdmin } from '@/lib/sesionSuperAdmin'

const LARGO_MAXIMO = 200000

// La base vuelve a revisar que quien publica sea super administrador con la sesión verificada.
export async function publicarDocumentoLegal(tipo: string, formData: FormData): Promise<Resultado> {
  if (!esTipoLegal(tipo)) return { tipo: 'error', texto: 'Ese documento no existe.' }

  const contenido = String(formData.get('contenido') ?? '').trim()
  const resumen = String(formData.get('resumen') ?? '').trim()
  const requiereAceptacion = formData.get('requiere_aceptacion') === 'on'

  if (!contenido) return { tipo: 'error', texto: 'Escribe el texto del documento.' }
  if (contenido.length > LARGO_MAXIMO) return { tipo: 'error', texto: 'El documento es demasiado largo.' }
  if (resumen.length > 500) return { tipo: 'error', texto: 'El resumen de los cambios puede tener máximo 500 caracteres.' }

  return accion(async () => {
    const { supabase } = await requerirSuperAdmin()
    const { data: version, error } = await supabase.rpc('publicar_documento_legal', {
      p_tipo: tipo,
      p_contenido: contenido,
      p_resumen: resumen,
      p_requiere_aceptacion: requiereAceptacion,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidatePath('/', 'layout')
    return `Publicaste la versión ${version} de ${DOCUMENTOS_LEGALES[tipo].titulo.toLowerCase()}.`
  })
}
