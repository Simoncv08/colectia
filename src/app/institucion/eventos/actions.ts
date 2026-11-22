'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { leerFecha, validarFechas } from '@/lib/estadoEvento'

// Enlace público del bucket "eventos" (supabase/storage_imagenes_eventos.sql).
const PREFIJO_IMAGENES = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/eventos/`

function validarImagenUrl(imagen_url: string) {
  if (imagen_url && !/^https?:\/\//i.test(imagen_url)) {
    throw new Error('El enlace de la imagen debe empezar por http:// o https://')
  }
}

// Si falla no pasa nada: el evento ya quedó guardado y solo queda un archivo suelto.
async function borrarImagenSubida(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagen_url: string | null
) {
  if (!imagen_url || !imagen_url.startsWith(PREFIJO_IMAGENES)) return
  const ruta = decodeURIComponent(imagen_url.slice(PREFIJO_IMAGENES.length))
  await supabase.storage.from('eventos').remove([ruta])
}

// Admin y recaudador pueden manejar eventos de una institución activa; la RLS lo exige
// (rls_policies.sql, sección 7) y aquí solo se dan mensajes más claros.
export async function crearEvento(
  institucionId: string,
  membresiaId: string | null,
  formData: FormData
) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim()
  const imagen_url = String(formData.get('imagen_url') ?? '').trim()
  const fecha_limite_pago = leerFecha(formData, 'fecha_limite_pago')
  const fecha_evento = leerFecha(formData, 'fecha_evento')

  if (!nombre) {
    throw new Error('El nombre del evento es obligatorio.')
  }
  validarImagenUrl(imagen_url)
  validarFechas(fecha_limite_pago, fecha_evento)

  const supabase = await createClient()
  const { error } = await supabase.from('eventos').insert({
    institucion_id: institucionId,
    nombre,
    descripcion: descripcion || null,
    imagen_url: imagen_url || null,
    fecha_limite_pago,
    fecha_evento,
    creado_por: membresiaId,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/eventos')
}

// Borrar un evento borra en cascada sus pagos, así que no se permite si tiene alguno.
export async function eliminarEvento(id: string, _formData: FormData) {
  const supabase = await createClient()

  const { count, error: errorConteo } = await supabase
    .from('registros_pago')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', id)

  if (errorConteo) {
    throw new Error(errorConteo.message)
  }

  if (count) {
    throw new Error(
      `Este evento tiene ${count} pago(s) registrado(s), así que no se puede eliminar (se perderían esos registros de pago).`
    )
  }

  const { data: anterior } = await supabase
    .from('eventos')
    .select('imagen_url')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('eventos').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  await borrarImagenSubida(supabase, anterior?.imagen_url ?? null)

  revalidatePath('/institucion/eventos')
  revalidatePath('/acudiente')
  redirect('/institucion/eventos')
}

export async function actualizarEvento(eventoId: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim()
  const imagen_url = String(formData.get('imagen_url') ?? '').trim()
  const fecha_limite_pago = leerFecha(formData, 'fecha_limite_pago')
  const fecha_evento = leerFecha(formData, 'fecha_evento')

  if (!nombre) {
    throw new Error('El nombre del evento es obligatorio.')
  }
  validarImagenUrl(imagen_url)
  validarFechas(fecha_limite_pago, fecha_evento)

  const supabase = await createClient()

  const { data: anterior } = await supabase
    .from('eventos')
    .select('imagen_url')
    .eq('id', eventoId)
    .maybeSingle()

  if (!anterior) {
    throw new Error('El evento ya no existe.')
  }

  const { error } = await supabase
    .from('eventos')
    .update({
      nombre,
      descripcion: descripcion || null,
      imagen_url: imagen_url || null,
      fecha_limite_pago,
      fecha_evento,
    })
    .eq('id', eventoId)

  if (error) {
    throw new Error(error.message)
  }

  if (anterior.imagen_url && anterior.imagen_url !== imagen_url) {
    await borrarImagenSubida(supabase, anterior.imagen_url)
  }

  revalidatePath('/institucion/eventos')
  revalidatePath(`/institucion/eventos/${eventoId}`)
  revalidatePath('/acudiente')
}

// Los acudientes dejan de verlo. Sin este botón, se finaliza solo el día después del evento.
export async function finalizarEvento(eventoId: string, _formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('eventos')
    .update({ finalizado_en: new Date().toISOString() })
    .eq('id', eventoId)
    .is('finalizado_en', null)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/eventos')
  revalidatePath(`/institucion/eventos/${eventoId}`)
  revalidatePath('/acudiente')
}

// Si la fecha del evento ya pasó, sigue finalizado hasta que se le cambie la fecha.
export async function reabrirEvento(eventoId: string, _formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('eventos')
    .update({ finalizado_en: null })
    .eq('id', eventoId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/eventos')
  revalidatePath(`/institucion/eventos/${eventoId}`)
  revalidatePath('/acudiente')
}

// A quién va dirigido un evento (evento_grupos): el acudiente solo lo ve si cubre a uno de sus estudiantes.
export async function agregarGrupoPorCurso(eventoId: string, formData: FormData) {
  const curso_grado = String(formData.get('curso_grado') ?? '').trim()

  if (!curso_grado) {
    throw new Error('Escribe el curso o grado al que aplica el evento.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evento_grupos')
    .insert({ evento_id: eventoId, curso_grado })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}`)
}

export async function agregarGrupoPorEstudiante(eventoId: string, formData: FormData) {
  const estudiante_id = String(formData.get('estudiante_id') ?? '').trim()

  if (!estudiante_id) {
    throw new Error('Selecciona un estudiante.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evento_grupos')
    .insert({ evento_id: eventoId, estudiante_id })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}`)
}

// Un grupo de cursos se guarda como una fila por curso, sin filas especiales en evento_grupos.
export async function agregarGrupoPorGrupoDeCursos(eventoId: string, formData: FormData) {
  const grupoCursoId = String(formData.get('grupo_curso_id') ?? '').trim()

  if (!grupoCursoId) {
    throw new Error('Selecciona un grupo de cursos.')
  }

  const supabase = await createClient()

  const { data: miembros, error: errorMiembros } = await supabase
    .from('grupo_curso_grados')
    .select('grados(nombre)')
    .eq('grupo_curso_id', grupoCursoId)

  if (errorMiembros) {
    throw new Error(errorMiembros.message)
  }

  const nombres = Array.from(
    new Set(
      (miembros ?? [])
        .map((m) => (m.grados as unknown as { nombre: string } | null)?.nombre)
        .filter((n): n is string => Boolean(n))
    )
  )

  if (nombres.length === 0) {
    throw new Error('Ese grupo de cursos todavía no tiene ningún curso/grado agregado.')
  }

  const { error } = await supabase.from('evento_grupos').upsert(
    nombres.map((curso_grado) => ({ evento_id: eventoId, curso_grado })),
    { onConflict: 'evento_id,curso_grado', ignoreDuplicates: true }
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}`)
}

export async function quitarGrupo(
  eventoId: string,
  grupoId: string,
  _formData: FormData
) {
  const supabase = await createClient()
  const { error } = await supabase.from('evento_grupos').delete().eq('id', grupoId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}`)
}

// Productos del evento, con tope opcional de cantidad por estudiante.
export async function crearProducto(eventoId: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const tipo = String(formData.get('tipo') ?? '').trim()
  const precioTexto = String(formData.get('precio_unitario') ?? '').trim()
  const cantidadTexto = String(
    formData.get('cantidad_maxima_por_estudiante') ?? ''
  ).trim()

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
    if (
      !Number.isInteger(cantidad_maxima_por_estudiante) ||
      cantidad_maxima_por_estudiante <= 0
    ) {
      throw new Error(
        'La cantidad máxima por estudiante debe ser un número entero mayor a cero.'
      )
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('productos').insert({
    evento_id: eventoId,
    nombre,
    tipo,
    precio_unitario,
    cantidad_maxima_por_estudiante,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}`)
}

export async function eliminarProducto(
  eventoId: string,
  productoId: string,
  _formData: FormData
) {
  const supabase = await createClient()
  const { error } = await supabase.from('productos').delete().eq('id', productoId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}`)
}
