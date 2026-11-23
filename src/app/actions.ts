'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mensajeBD, type Resultado } from '@/lib/resultado'
import { esTipoLegal } from '@/lib/legal'

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// El correo no se cambia aquí: es con el que se inicia sesión.
export async function actualizarDatos(
  _anterior: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const telefono = String(formData.get('telefono') ?? '').trim()

  if (!nombres || !apellidos) {
    return { tipo: 'error', texto: 'Escribe tus nombres y apellidos.' }
  }
  if (nombres.length > 80 || apellidos.length > 80) {
    return { tipo: 'error', texto: 'El nombre o el apellido es demasiado largo.' }
  }
  if (telefono && !/^\+?[0-9 ()-]{7,20}$/.test(telefono)) {
    return {
      tipo: 'error',
      texto: 'El teléfono solo puede tener números (y opcionalmente +, espacios o guiones).',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { tipo: 'error', texto: 'Tu sesión venció. Vuelve a iniciar sesión.' }
  }

  const { data, error } = await supabase
    .from('personas')
    .update({ nombres, apellidos, telefono: telefono || null })
    .eq('id', user.id)
    .select('id')

  if (error) {
    return { tipo: 'error', texto: 'No se pudieron guardar los cambios. Intenta de nuevo en un momento.' }
  }
  if (!data?.length) {
    return { tipo: 'error', texto: 'No se encontró tu cuenta. Cierra sesión y vuelve a entrar.' }
  }

  revalidatePath('/', 'layout')
  return { tipo: 'ok', texto: 'Tus datos quedaron guardados.' }
}

// Acepta (o marca como vista) la versión vigente de cada documento. Sirve para todos los roles.
export async function aceptarDocumentosLegales(tipos: string[]): Promise<Resultado> {
  const validos = tipos.filter(esTipoLegal)
  if (!validos.length) return { tipo: 'error', texto: 'No hay documentos para aceptar.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('aceptar_documentos_legales', { p_tipos: validos })
  if (error) return { tipo: 'error', texto: mensajeBD(error) }

  revalidatePath('/', 'layout')
  return { tipo: 'ok', texto: 'Gracias. Ya puedes seguir usando Colectia.' }
}
