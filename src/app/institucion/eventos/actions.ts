'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEventoPropio, requerirPersonal, type SesionInstitucion } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'
import { leerFecha, validarFechas } from '@/lib/estadoEvento'

// Enlace público del bucket "eventos" (supabase/migraciones/10_storage_imagenes_eventos.sql).
const PREFIJO_IMAGENES = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/eventos/`

function leerDatosEvento(formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim()
  const imagen_url = String(formData.get('imagen_url') ?? '').trim()
  const fecha_limite_pago = leerFecha(formData, 'fecha_limite_pago')
  const fecha_evento = leerFecha(formData, 'fecha_evento')

  if (!nombre) throw new Error('El nombre del evento es obligatorio.')
  if (imagen_url && !/^https:\/\//i.test(imagen_url)) {
    throw new Error('El enlace de la imagen debe empezar por https://')
  }
  validarFechas(fecha_limite_pago, fecha_evento)

  return {
    nombre,
    descripcion: descripcion || null,
    imagen_url: imagen_url || null,
    fecha_limite_pago,
    fecha_evento,
  }
}

// Si falla no pasa nada: el evento ya quedó guardado y solo queda un archivo suelto.
async function borrarImagenSubida(sesion: SesionInstitucion, imagen_url: string | null) {
  if (!imagen_url || !imagen_url.startsWith(PREFIJO_IMAGENES)) return
  const ruta = decodeURIComponent(imagen_url.slice(PREFIJO_IMAGENES.length))
  await sesion.supabase.storage.from('eventos').remove([ruta])
}

function revalidarEvento(eventoId?: string) {
  revalidatePath('/institucion', 'layout')
  if (eventoId) revalidatePath(`/institucion/eventos/${eventoId}`)
  revalidatePath('/acudiente', 'layout')
}

export async function crearEvento(formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ institucionActiva: true })
    const datos = leerDatosEvento(formData)

    const { error } = await sesion.supabase.from('eventos').insert({
      ...datos,
      institucion_id: sesion.institucionId,
      creado_por: sesion.membresiaId,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidarEvento()
    return `"${datos.nombre}" quedó creado. Entra a Configurar para elegir a quién va dirigido y sus productos.`
  })
}

export async function actualizarEvento(eventoId: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    const datos = leerDatosEvento(formData)

    const { data: anterior } = await sesion.supabase
      .from('eventos')
      .select('imagen_url')
      .eq('id', eventoId)
      .eq('institucion_id', sesion.institucionId)
      .maybeSingle()
    if (!anterior) throw new Error('Ese evento ya no existe.')

    const { error } = await sesion.supabase
      .from('eventos')
      .update(datos)
      .eq('id', eventoId)
      .eq('institucion_id', sesion.institucionId)
    if (error) throw new Error(mensajeBD(error))

    if (anterior.imagen_url && anterior.imagen_url !== datos.imagen_url) {
      await borrarImagenSubida(sesion, anterior.imagen_url)
    }

    revalidarEvento(eventoId)
    return 'Los datos del evento quedaron guardados.'
  })
}

export async function eliminarEvento(id: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    const { data: anterior } = await sesion.supabase
      .from('eventos')
      .select('imagen_url')
      .eq('id', id)
      .eq('institucion_id', sesion.institucionId)
      .maybeSingle()
    if (!anterior) throw new Error('Ese evento ya no existe.')

    const { error } = await sesion.supabase.from('eventos').delete().eq('id', id)
    if (error) {
      throw new Error(
        mensajeBD(error, { enUso: 'Este evento tiene pagos registrados, así que no se puede eliminar.' })
      )
    }

    await borrarImagenSubida(sesion, anterior.imagen_url)
    revalidarEvento()
    redirect('/institucion/eventos')
  })
}

// Los acudientes dejan de verlo. Sin este botón, se finaliza solo el día después del evento.
export async function finalizarEvento(eventoId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    const { error } = await sesion.supabase
      .from('eventos')
      .update({ finalizado_en: new Date().toISOString() })
      .eq('id', eventoId)
      .eq('institucion_id', sesion.institucionId)
      .is('finalizado_en', null)
    if (error) throw new Error(mensajeBD(error))

    revalidarEvento(eventoId)
    return 'El evento quedó finalizado. Los acudientes ya no lo ven.'
  })
}

// Si la fecha del evento ya pasó, sigue finalizado hasta que se le cambie la fecha.
export async function reabrirEvento(eventoId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    const { error } = await sesion.supabase
      .from('eventos')
      .update({ finalizado_en: null })
      .eq('id', eventoId)
      .eq('institucion_id', sesion.institucionId)
    if (error) throw new Error(mensajeBD(error))

    revalidarEvento(eventoId)
    return 'El evento quedó abierto de nuevo.'
  })
}

// A quién va dirigido (evento_grupos): el acudiente solo ve el evento si cubre a uno de sus estudiantes.
const YA_DIRIGIDO = 'El evento ya estaba dirigido a eso.'

export async function agregarGrupoPorCurso(eventoId: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ institucionActiva: true })
    const curso_grado = String(formData.get('curso_grado') ?? '').trim()
    if (!curso_grado) throw new Error('Elige el curso al que va dirigido el evento.')
    await exigirEventoPropio(sesion, eventoId)

    const { error } = await sesion.supabase
      .from('evento_grupos')
      .insert({ evento_id: eventoId, curso_grado })
    if (error) throw new Error(mensajeBD(error, { duplicado: YA_DIRIGIDO }))

    revalidarEvento(eventoId)
    return `El evento ahora va dirigido a ${curso_grado}.`
  })
}

export async function agregarGrupoPorEstudiante(eventoId: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ institucionActiva: true })
    const estudiante_id = String(formData.get('estudiante_id') ?? '').trim()
    if (!estudiante_id) throw new Error('Elige un estudiante.')
    await exigirEventoPropio(sesion, eventoId)

    const { error } = await sesion.supabase
      .from('evento_grupos')
      .insert({ evento_id: eventoId, estudiante_id })
    if (error) throw new Error(mensajeBD(error, { duplicado: YA_DIRIGIDO }))

    revalidarEvento(eventoId)
    return 'El estudiante quedó agregado al evento.'
  })
}

// Un grupo de cursos se guarda como una fila por curso, sin filas especiales en evento_grupos.
export async function agregarGrupoPorGrupoDeCursos(eventoId: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ institucionActiva: true })
    const grupoCursoId = String(formData.get('grupo_curso_id') ?? '').trim()
    if (!grupoCursoId) throw new Error('Elige un grupo de cursos.')
    await exigirEventoPropio(sesion, eventoId)

    const { data: miembros, error: errorMiembros } = await sesion.supabase
      .from('grupo_curso_grados')
      .select('grados(nombre)')
      .eq('grupo_curso_id', grupoCursoId)
    if (errorMiembros) throw new Error(mensajeBD(errorMiembros))

    const nombres = Array.from(
      new Set(
        (miembros ?? [])
          .map((m) => m.grados?.nombre)
          .filter((n): n is string => Boolean(n))
      )
    )
    if (!nombres.length) throw new Error('Ese grupo de cursos todavía no tiene cursos.')

    const { error } = await sesion.supabase.from('evento_grupos').upsert(
      nombres.map((curso_grado) => ({ evento_id: eventoId, curso_grado })),
      { onConflict: 'evento_id,curso_grado', ignoreDuplicates: true }
    )
    if (error) throw new Error(mensajeBD(error))

    revalidarEvento(eventoId)
    return `El evento ahora va dirigido a ${nombres.join(', ')}.`
  })
}

export async function quitarGrupo(eventoId: string, grupoId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    await exigirEventoPropio(sesion, eventoId)
    const { error } = await sesion.supabase
      .from('evento_grupos')
      .delete()
      .eq('id', grupoId)
      .eq('evento_id', eventoId)
    if (error) throw new Error(mensajeBD(error))

    revalidarEvento(eventoId)
    return 'Se quitó del evento.'
  })
}

export async function crearProducto(eventoId: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ institucionActiva: true })
    const nombre = String(formData.get('nombre') ?? '').trim()
    const tipo = String(formData.get('tipo') ?? '').trim()
    const precioTexto = String(formData.get('precio_unitario') ?? '').trim()
    const cantidadTexto = String(formData.get('cantidad_maxima_por_estudiante') ?? '').trim()

    if (!nombre || !['precio_unico', 'precio_variable'].includes(tipo) || !precioTexto) {
      throw new Error('El nombre, el tipo y el precio del producto son obligatorios.')
    }
    const precio_unitario = Number(precioTexto)
    if (Number.isNaN(precio_unitario) || precio_unitario <= 0) {
      throw new Error('El precio debe ser un número mayor a cero.')
    }
    let cantidad_maxima_por_estudiante: number | null = null
    if (cantidadTexto) {
      cantidad_maxima_por_estudiante = Number(cantidadTexto)
      if (!Number.isInteger(cantidad_maxima_por_estudiante) || cantidad_maxima_por_estudiante <= 0) {
        throw new Error('La cantidad máxima por estudiante debe ser un número entero mayor a cero.')
      }
    }
    await exigirEventoPropio(sesion, eventoId)

    const { error } = await sesion.supabase.from('productos').insert({
      evento_id: eventoId,
      nombre,
      tipo,
      precio_unitario,
      cantidad_maxima_por_estudiante,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidarEvento(eventoId)
    return `"${nombre}" quedó agregado.`
  })
}

export async function eliminarProducto(eventoId: string, productoId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    await exigirEventoPropio(sesion, eventoId)
    const { error } = await sesion.supabase
      .from('productos')
      .delete()
      .eq('id', productoId)
      .eq('evento_id', eventoId)
    if (error) {
      throw new Error(
        mensajeBD(error, { enUso: 'Este producto ya tiene pagos registrados, así que no se puede eliminar.' })
      )
    }

    revalidarEvento(eventoId)
    return 'El producto quedó eliminado.'
  })
}
