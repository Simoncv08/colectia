'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type ResultadoVinculo = { tipo: 'ok' | 'error'; texto: string } | null

const MENSAJES: Record<string, ResultadoVinculo> = {
  ok: { tipo: 'ok', texto: 'Listo, el estudiante quedó vinculado a tu cuenta.' },
  ya_vinculado: { tipo: 'error', texto: 'Ya tienes vinculado a este estudiante.' },
  no_encontrado: {
    tipo: 'error',
    texto:
      'No encontramos ningún estudiante con esos datos en esa institución. Revisa que el código (o el documento) y la fecha de nacimiento sean los que tiene el colegio.',
  },
  institucion_no_disponible: {
    tipo: 'error',
    texto: 'Esa institución no está disponible en este momento. Contacta al colegio.',
  },
}

// Verificar y vincular ocurren juntos en vincular_estudiante (fix_vincular_estudiante.sql),
// así no se puede crear un vínculo sin pasar la verificación.
export async function vincularEstudiante(
  _anterior: ResultadoVinculo,
  formData: FormData
): Promise<ResultadoVinculo> {
  const metodo = String(formData.get('metodo') ?? '')
  const institucionId = String(formData.get('institucion_id') ?? '').trim()
  const codigo = String(formData.get('codigo') ?? '').trim()
  const numeroDocumento = String(formData.get('numero_documento') ?? '').trim()
  const fechaNacimiento = String(formData.get('fecha_nacimiento') ?? '').trim()

  const dato = metodo === 'documento' ? numeroDocumento : codigo
  if (!institucionId || !dato || !fechaNacimiento) {
    return {
      tipo: 'error',
      texto:
        metodo === 'documento'
          ? 'Selecciona la institución y escribe el número de documento y la fecha de nacimiento.'
          : 'Selecciona la institución y escribe el código y la fecha de nacimiento del estudiante.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vincular_estudiante', {
    p_institucion_id: institucionId,
    p_codigo: metodo === 'documento' ? null : codigo,
    p_numero_documento: metodo === 'documento' ? numeroDocumento : null,
    p_fecha_nacimiento: fechaNacimiento,
  })

  if (error) {
    if (error.message.includes('vincular_estudiante')) {
      return {
        tipo: 'error',
        texto:
          'Falta un paso en la base de datos: corre supabase/fix_vincular_estudiante.sql en Supabase.',
      }
    }
    return { tipo: 'error', texto: `No se pudo vincular: ${error.message}` }
  }

  const resultado = MENSAJES[String(data)] ?? {
    tipo: 'error' as const,
    texto: 'No se pudo vincular al estudiante. Intenta de nuevo.',
  }
  if (resultado?.tipo === 'ok') {
    revalidatePath('/acudiente', 'layout')
  }
  return resultado
}

// Borra el vínculo, no al estudiante.
export async function desvincularEstudiante(id: string, _formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('acudiente_estudiante').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/acudiente', 'layout')
}

export type ResultadoDatos = { tipo: 'ok' | 'error'; texto: string } | null

// El correo no se cambia aquí: es con el que se inicia sesión.
export async function actualizarDatos(
  _anterior: ResultadoDatos,
  formData: FormData
): Promise<ResultadoDatos> {
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
    return { tipo: 'error', texto: `No se pudieron guardar los cambios: ${error.message}` }
  }
  if (!data?.length) {
    return { tipo: 'error', texto: 'No se encontró tu cuenta. Cierra sesión y vuelve a entrar.' }
  }

  revalidatePath('/acudiente', 'layout')
  return { tipo: 'ok', texto: 'Tus datos quedaron guardados.' }
}
