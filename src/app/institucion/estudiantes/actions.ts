'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requerirPersonal, type SesionInstitucion } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'
import { normalizar } from '@/lib/formato'
import { importarEstudiantes, validarEstudiante, type FilaEstudiante } from '@/lib/importarEstudiantes'

function leerEstudiante(formData: FormData): FilaEstudiante {
  const campo = (nombre: string) => String(formData.get(nombre) ?? '').trim()
  const datos = {
    codigo_institucional: campo('codigo_institucional'),
    nombres: campo('nombres'),
    apellidos: campo('apellidos'),
    curso_grado: campo('curso_grado'),
    numero_documento: campo('numero_documento'),
    fecha_nacimiento: campo('fecha_nacimiento'),
  }
  const faltante = validarEstudiante(datos)
  if (faltante) throw new Error(faltante)
  return datos
}

// Solo cursos existentes, para que coincidan con los que se usan al dirigir eventos.
async function exigirCurso(sesion: SesionInstitucion, curso: string) {
  const { data } = await sesion.supabase
    .from('grados')
    .select('id')
    .eq('institucion_id', sesion.institucionId)
    .eq('nombre', curso)
    .maybeSingle()
  if (!data) {
    throw new Error(`"${curso}" no es un curso de tu institución. Créalo primero en "Cursos".`)
  }
}

const DUPLICADO = 'Ya hay un estudiante con ese código en tu institución.'

export async function crearEstudiante(formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true, institucionActiva: true })
    const datos = leerEstudiante(formData)
    await exigirCurso(sesion, datos.curso_grado)

    const { error } = await sesion.supabase
      .from('estudiantes')
      .insert({ ...datos, institucion_id: sesion.institucionId })
    if (error) throw new Error(mensajeBD(error, { duplicado: DUPLICADO }))

    revalidatePath('/institucion', 'layout')
    return `${datos.nombres} ${datos.apellidos} quedó agregado.`
  })
}

export async function actualizarEstudiante(id: string, formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const datos = leerEstudiante(formData)
    await exigirCurso(sesion, datos.curso_grado)

    const { data, error } = await sesion.supabase
      .from('estudiantes')
      .update(datos)
      .eq('id', id)
      .eq('institucion_id', sesion.institucionId)
      .select('id')
    if (error) throw new Error(mensajeBD(error, { duplicado: DUPLICADO }))
    if (!data?.length) throw new Error('Ese estudiante ya no existe.')

    revalidatePath('/institucion', 'layout')
    redirect('/admin/estudiantes')
  })
}

export async function eliminarEstudiante(id: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const { error } = await sesion.supabase
      .from('estudiantes')
      .delete()
      .eq('id', id)
      .eq('institucion_id', sesion.institucionId)
    if (error) {
      throw new Error(
        mensajeBD(error, { enUso: 'Este estudiante tiene pagos registrados, así que no se puede eliminar.' })
      )
    }

    revalidatePath('/institucion', 'layout')
    redirect('/admin/estudiantes')
  })
}

export async function cargarEstudiantesExcel(formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true, institucionActiva: true })
    const archivo = formData.get('archivo')
    if (!(archivo instanceof File) || archivo.size === 0) {
      throw new Error('Selecciona un archivo de Excel (.xlsx) o CSV primero.')
    }

    const { data: grados } = await sesion.supabase
      .from('grados')
      .select('nombre')
      .eq('institucion_id', sesion.institucionId)
    if (!grados?.length) {
      throw new Error('Todavía no has creado ningún curso. Créalos en "Cursos" antes de cargar el archivo.')
    }

    const leido = await importarEstudiantes(
      archivo,
      new Map(grados.map((g) => [normalizar(g.nombre), g.nombre]))
    )
    if ('error' in leido) throw new Error(leido.error)

    const { error } = await sesion.supabase
      .from('estudiantes')
      .insert(leido.filas.map((f) => ({ ...f, institucion_id: sesion.institucionId })))
    if (error) {
      throw new Error(
        `No se guardó ningún estudiante: ${mensajeBD(error, {
          duplicado: 'el archivo trae un código que ya existe en tu institución o que está repetido.',
        })}`
      )
    }

    revalidatePath('/institucion', 'layout')
    return `Se cargaron ${leido.filas.length} estudiante(s).`
  })
}
