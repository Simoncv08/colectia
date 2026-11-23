'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { accion, mensajeBD, type Resultado } from '@/lib/resultado'

const MENSAJES: Record<string, Resultado> = {
  ok: { tipo: 'ok', texto: 'Listo, el estudiante quedó vinculado a tu cuenta.' },
  ya_vinculado: { tipo: 'error', texto: 'Ya tienes vinculado a este estudiante.' },
  no_encontrado: {
    tipo: 'error',
    texto:
      'No encontramos ningún estudiante con esos datos en esa institución. Revisa que el código (o el documento) y la fecha de nacimiento sean los que tiene el colegio.',
  },
  demasiados_intentos: {
    tipo: 'error',
    texto:
      'Hiciste muchos intentos que no coincidieron. Espera una hora y vuelve a intentar, o pide los datos exactos al colegio.',
  },
  limite_vinculos: {
    tipo: 'error',
    texto: 'Ya tienes 10 estudiantes vinculados, el máximo por cuenta. Si necesitas más, contacta al colegio.',
  },
  institucion_no_disponible: {
    tipo: 'error',
    texto: 'Esa institución no está disponible en este momento. Contacta al colegio.',
  },
}

// Verificar y vincular ocurren juntos en vincular_estudiante (supabase/migraciones/19_seguridad_fase1.sql),
// así no se puede crear un vínculo sin pasar la verificación.
export async function vincularEstudiante(
  _anterior: Resultado | null,
  formData: FormData
): Promise<Resultado> {
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
    // La función trata '' como "no se envió".
    p_codigo: metodo === 'documento' ? '' : codigo,
    p_numero_documento: metodo === 'documento' ? numeroDocumento : '',
    p_fecha_nacimiento: fechaNacimiento,
  })

  if (error) {
    return { tipo: 'error', texto: 'No se pudo vincular al estudiante. Intenta de nuevo en un momento.' }
  }

  // 'no_encontrado:N' trae los intentos que quedan en la hora (21_intentos_restantes.sql).
  const [respuesta, quedan] = String(data).split(':')
  const base = MENSAJES[respuesta] ?? {
    tipo: 'error' as const,
    texto: 'No se pudo vincular al estudiante. Intenta de nuevo.',
  }
  const resultado: Resultado =
    quedan === undefined
      ? base
      : {
          ...base,
          texto:
            quedan === '0'
              ? `${base.texto} Ya no te quedan intentos por ahora: espera una hora para volver a intentar.`
              : `${base.texto} Te ${quedan === '1' ? 'queda 1 intento' : `quedan ${quedan} intentos`} en esta hora.`,
        }
  if (resultado.tipo === 'ok') {
    revalidatePath('/acudiente', 'layout')
  }
  return resultado
}

// Borra el vínculo, no al estudiante.
export async function desvincularEstudiante(id: string, _formData: FormData) {
  return accion(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('acudiente_estudiante')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw new Error(mensajeBD(error))
    if (!data?.length) throw new Error('Ese estudiante ya no estaba vinculado a tu cuenta.')

    revalidatePath('/acudiente', 'layout')
    return 'El estudiante salió de tu cuenta.'
  })
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

  revalidatePath('/acudiente', 'layout')
  return { tipo: 'ok', texto: 'Tus datos quedaron guardados.' }
}
