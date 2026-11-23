'use server'

import { revalidatePath } from 'next/cache'
import { requerirPersonal, type SesionInstitucion } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'

function revalidarCursos() {
  revalidatePath('/institucion', 'layout')
}

function leerIds(formData: FormData) {
  return formData.getAll('grado_ids').map(String).filter(Boolean)
}

async function exigirGrupoPropio(sesion: SesionInstitucion, grupoCursoId: string) {
  const { data } = await sesion.supabase
    .from('grupos_curso')
    .select('id')
    .eq('id', grupoCursoId)
    .eq('institucion_id', sesion.institucionId)
    .maybeSingle()
  if (!data) throw new Error('Ese grupo de cursos ya no existe.')
}

export async function agregarGrados(formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const nombres = Array.from(
      new Set(
        String(formData.get('nombres') ?? '')
          .split(/[\n,]/)
          .map((n) => n.trim())
          .filter(Boolean)
      )
    )
    if (!nombres.length) throw new Error('Escribe al menos un curso (uno por línea).')

    const { error } = await sesion.supabase.from('grados').upsert(
      nombres.map((nombre) => ({ institucion_id: sesion.institucionId, nombre })),
      { onConflict: 'institucion_id,nombre', ignoreDuplicates: true }
    )
    if (error) throw new Error(mensajeBD(error))

    revalidarCursos()
    return nombres.length === 1 ? `El curso ${nombres[0]} quedó listo.` : `${nombres.length} cursos quedaron listos.`
  })
}

export async function eliminarGrado(gradoId: string, nombreGrado: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const { count, error: errorConteo } = await sesion.supabase
      .from('estudiantes')
      .select('id', { count: 'exact', head: true })
      .eq('institucion_id', sesion.institucionId)
      .eq('curso_grado', nombreGrado)
    if (errorConteo) throw new Error(mensajeBD(errorConteo))
    if (count) {
      throw new Error(
        `No puedes eliminar ${nombreGrado}: todavía tiene ${count} estudiante(s). Cámbialos de curso primero.`
      )
    }

    const { error } = await sesion.supabase
      .from('grados')
      .delete()
      .eq('id', gradoId)
      .eq('institucion_id', sesion.institucionId)
    if (error) throw new Error(mensajeBD(error))

    revalidarCursos()
    return `El curso ${nombreGrado} quedó eliminado.`
  })
}

// Grupos de cursos (por ejemplo "Primaria"). Un curso puede estar en varios grupos.
export async function crearGrupoCurso(formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const nombre = String(formData.get('nombre') ?? '').trim()
    if (!nombre) throw new Error('El nombre del grupo es obligatorio.')

    const { data: grupo, error } = await sesion.supabase
      .from('grupos_curso')
      .insert({ institucion_id: sesion.institucionId, nombre })
      .select('id')
      .single()
    if (error) throw new Error(mensajeBD(error, { duplicado: 'Ya existe un grupo con ese nombre.' }))

    const gradoIds = leerIds(formData)
    if (gradoIds.length) {
      const { error: errorMiembros } = await sesion.supabase
        .from('grupo_curso_grados')
        .insert(gradoIds.map((grado_id) => ({ grupo_curso_id: grupo.id, grado_id })))
      if (errorMiembros) throw new Error(mensajeBD(errorMiembros))
    }

    revalidarCursos()
    return `El grupo "${nombre}" quedó creado.`
  })
}

export async function eliminarGrupoCurso(id: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const { error } = await sesion.supabase
      .from('grupos_curso')
      .delete()
      .eq('id', id)
      .eq('institucion_id', sesion.institucionId)
    if (error) throw new Error(mensajeBD(error))

    revalidarCursos()
    return 'El grupo quedó eliminado. Los cursos siguen igual.'
  })
}

export async function agregarGradosAGrupo(grupoCursoId: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const gradoIds = leerIds(formData)
    if (!gradoIds.length) throw new Error('Marca al menos un curso para agregar al grupo.')
    await exigirGrupoPropio(sesion, grupoCursoId)

    const { error } = await sesion.supabase.from('grupo_curso_grados').upsert(
      gradoIds.map((grado_id) => ({ grupo_curso_id: grupoCursoId, grado_id })),
      { onConflict: 'grupo_curso_id,grado_id', ignoreDuplicates: true }
    )
    if (error) throw new Error(mensajeBD(error))

    revalidarCursos()
    return gradoIds.length === 1 ? 'El curso quedó en el grupo.' : `${gradoIds.length} cursos quedaron en el grupo.`
  })
}

export async function quitarGradoDeGrupo(id: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const { error } = await sesion.supabase.from('grupo_curso_grados').delete().eq('id', id)
    if (error) throw new Error(mensajeBD(error))

    revalidarCursos()
    return 'El curso salió del grupo.'
  })
}
