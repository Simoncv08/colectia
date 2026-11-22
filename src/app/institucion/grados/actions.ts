'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// La RLS ya exige admin_institucion; la revisión de aquí es para dar un mensaje claro.
export async function agregarGrados(institucionId: string, formData: FormData) {
  const texto = String(formData.get('nombres') ?? '')

  const nombres = Array.from(
    new Set(
      texto
        .split(/[\n,]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    )
  )

  if (nombres.length === 0) {
    throw new Error('Escribe al menos un curso o grado (uno por línea).')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('grados').upsert(
    nombres.map((nombre) => ({ institucion_id: institucionId, nombre })),
    { onConflict: 'institucion_id,nombre', ignoreDuplicates: true }
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/grados')
  revalidatePath('/institucion')
}

export async function eliminarGrado(
  institucionId: string,
  gradoId: string,
  nombreGrado: string,
  _formData: FormData
) {
  const supabase = await createClient()

  const { count, error: errorConteo } = await supabase
    .from('estudiantes')
    .select('id', { count: 'exact', head: true })
    .eq('institucion_id', institucionId)
    .eq('curso_grado', nombreGrado)

  if (errorConteo) {
    throw new Error(errorConteo.message)
  }

  if (count && count > 0) {
    throw new Error(
      `No puedes eliminar "${nombreGrado}" porque todavía hay ${count} estudiante(s) en ese curso/grado. Cámbialos de curso primero.`
    )
  }

  const { error } = await supabase.from('grados').delete().eq('id', gradoId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/grados')
  revalidatePath('/institucion')
}

// Grupos de cursos (por ejemplo "Primaria"). Un curso puede estar en varios grupos.

export async function crearGrupoCurso(institucionId: string, formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const gradoIds = formData
    .getAll('grado_ids')
    .map((v) => String(v))
    .filter(Boolean)

  if (!nombre) {
    throw new Error('El nombre del grupo de cursos es obligatorio.')
  }

  const supabase = await createClient()

  const { data: grupo, error: errorGrupo } = await supabase
    .from('grupos_curso')
    .insert({ institucion_id: institucionId, nombre })
    .select('id')
    .single()

  if (errorGrupo) {
    throw new Error(errorGrupo.message)
  }

  if (gradoIds.length > 0) {
    const { error: errorMiembros } = await supabase
      .from('grupo_curso_grados')
      .insert(gradoIds.map((grado_id) => ({ grupo_curso_id: grupo.id, grado_id })))

    if (errorMiembros) {
      throw new Error(errorMiembros.message)
    }
  }

  revalidatePath('/institucion/grados')
}

export async function eliminarGrupoCurso(id: string, _formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('grupos_curso').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/grados')
}

export async function agregarGradosAGrupo(grupoCursoId: string, formData: FormData) {
  const gradoIds = formData
    .getAll('grado_ids')
    .map((v) => String(v))
    .filter(Boolean)

  if (gradoIds.length === 0) {
    throw new Error('Selecciona al menos un curso/grado para agregar al grupo.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('grupo_curso_grados').upsert(
    gradoIds.map((grado_id) => ({ grupo_curso_id: grupoCursoId, grado_id })),
    { onConflict: 'grupo_curso_id,grado_id', ignoreDuplicates: true }
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/grados')
}

export async function quitarGradoDeGrupo(id: string, _formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('grupo_curso_grados').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion/grados')
}
