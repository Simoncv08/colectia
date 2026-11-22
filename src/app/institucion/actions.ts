'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import ExcelJS from 'exceljs'
import { Readable } from 'stream'

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Solo se puede invitar a alguien que ya entró una vez a Colectia con su correo confirmado:
// así no se guardan datos de quien no ha aceptado usar la plataforma.
export async function invitarMiembro(institucionId: string, formData: FormData) {
  const correo = String(formData.get('correo') ?? '')
    .trim()
    .toLowerCase()
  const rol = String(formData.get('rol') ?? '').trim()

  if (!correo || !['admin_institucion', 'recaudador'].includes(rol)) {
    throw new Error('El correo y el rol son obligatorios.')
  }

  const supabase = await createClient()

  const { data: personaId, error: buscarError } = await supabase.rpc(
    'buscar_persona_id_por_correo',
    { p_correo: correo }
  )

  if (buscarError) {
    throw new Error(buscarError.message)
  }

  if (!personaId) {
    throw new Error(
      'Esa persona todavía no tiene cuenta en Colectia. Debe iniciar sesión con Google al menos una vez antes de poder invitarla.'
    )
  }

  const { error } = await supabase.from('membresias').insert({
    persona_id: personaId,
    institucion_id: institucionId,
    rol,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion', 'layout')
}

// La RLS ya exige admin_institucion; la revisión de aquí es para dar un mensaje claro.
export async function crearEstudiante(institucionId: string, formData: FormData) {
  const codigo_institucional = String(formData.get('codigo_institucional') ?? '').trim()
  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const curso_grado = String(formData.get('curso_grado') ?? '').trim()
  const numero_documento = String(formData.get('numero_documento') ?? '').trim()
  const fecha_nacimiento = String(formData.get('fecha_nacimiento') ?? '').trim()

  // Documento y fecha de nacimiento son obligatorios: con ellos el acudiente verifica el vínculo.
  if (
    !codigo_institucional ||
    !nombres ||
    !apellidos ||
    !curso_grado ||
    !numero_documento ||
    !fecha_nacimiento
  ) {
    throw new Error('Todos los campos son obligatorios.')
  }

  const supabase = await createClient()

  // Solo cursos existentes, para que coincidan con los que se usan al dirigir eventos.
  const { data: gradoValido } = await supabase
    .from('grados')
    .select('id')
    .eq('institucion_id', institucionId)
    .eq('nombre', curso_grado)
    .maybeSingle()

  if (!gradoValido) {
    throw new Error(
      `"${curso_grado}" no es un curso/grado de tu institución. Créalo primero en "Cursos/grados".`
    )
  }

  const { error } = await supabase.from('estudiantes').insert({
    institucion_id: institucionId,
    codigo_institucional,
    nombres,
    apellidos,
    curso_grado,
    numero_documento,
    fecha_nacimiento,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion', 'layout')
}

// Mismas reglas que al crearlo.
export async function actualizarEstudiante(
  id: string,
  institucionId: string,
  formData: FormData
) {
  const codigo_institucional = String(formData.get('codigo_institucional') ?? '').trim()
  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const curso_grado = String(formData.get('curso_grado') ?? '').trim()
  const numero_documento = String(formData.get('numero_documento') ?? '').trim()
  const fecha_nacimiento = String(formData.get('fecha_nacimiento') ?? '').trim()

  if (
    !codigo_institucional ||
    !nombres ||
    !apellidos ||
    !curso_grado ||
    !numero_documento ||
    !fecha_nacimiento
  ) {
    throw new Error('Todos los campos son obligatorios.')
  }

  const supabase = await createClient()

  const { data: gradoValido } = await supabase
    .from('grados')
    .select('id')
    .eq('institucion_id', institucionId)
    .eq('nombre', curso_grado)
    .maybeSingle()

  if (!gradoValido) {
    throw new Error(
      `"${curso_grado}" no es un curso/grado de tu institución. Créalo primero en "Cursos/grados".`
    )
  }

  const { data: actualizado, error } = await supabase
    .from('estudiantes')
    .update({
      codigo_institucional,
      nombres,
      apellidos,
      curso_grado,
      numero_documento,
      fecha_nacimiento,
    })
    .eq('id', id)
    .eq('institucion_id', institucionId)
    .select('id')

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `Ya hay otro estudiante con el código "${codigo_institucional}" en tu institución.`
      )
    }
    throw new Error(error.message)
  }

  if (!actualizado?.length) {
    throw new Error('No se pudo actualizar: el estudiante no existe o no tienes permiso para editarlo.')
  }

  revalidatePath('/institucion', 'layout')
  redirect('/institucion/estudiantes')
}

// Borrar un estudiante borra en cascada sus pagos, así que no se permite si tiene alguno.
export async function eliminarEstudiante(id: string, _formData: FormData) {
  const supabase = await createClient()

  const { count, error: errorConteo } = await supabase
    .from('registros_pago')
    .select('id', { count: 'exact', head: true })
    .eq('estudiante_id', id)

  if (errorConteo) {
    throw new Error(errorConteo.message)
  }

  if (count) {
    throw new Error(
      `Este estudiante tiene ${count} pago(s) registrado(s), así que no se puede eliminar (se perderían esos registros de pago).`
    )
  }

  const { error } = await supabase.from('estudiantes').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion', 'layout')
  redirect('/institucion/estudiantes')
}

// Borra la membresía, no la cuenta de Colectia.
export async function eliminarMiembro(membresiaId: string, _formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('membresias')
    .delete()
    .eq('id', membresiaId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/institucion', 'layout')
}

// Carga masiva de estudiantes desde Excel (.xlsx) o CSV.

type FilaEstudiante = {
  codigo_institucional: string
  nombres: string
  apellidos: string
  curso_grado: string
  numero_documento: string
  fecha_nacimiento: string
}

// "CÓDIGO" y "codigo", o "5 a" y "5A", se reconocen como lo mismo.
function normalizarEncabezado(valor: string): string {
  return valor
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Nombres de columna aceptados para cada dato.
const MAPA_ENCABEZADOS: Record<string, keyof FilaEstudiante> = {
  codigo: 'codigo_institucional',
  'codigo institucional': 'codigo_institucional',
  codigo_institucional: 'codigo_institucional',
  nombre: 'nombres',
  nombres: 'nombres',
  apellido: 'apellidos',
  apellidos: 'apellidos',
  curso: 'curso_grado',
  grado: 'curso_grado',
  'curso/grado': 'curso_grado',
  'curso grado': 'curso_grado',
  curso_grado: 'curso_grado',
  documento: 'numero_documento',
  cedula: 'numero_documento',
  'numero de documento': 'numero_documento',
  numero_documento: 'numero_documento',
  nacimiento: 'fecha_nacimiento',
  'fecha de nacimiento': 'fecha_nacimiento',
  fecha_nacimiento: 'fecha_nacimiento',
}

export async function cargarEstudiantesExcel(
  institucionId: string,
  formData: FormData
) {
  const archivo = formData.get('archivo') as File | null

  if (!archivo || archivo.size === 0) {
    throw new Error('Selecciona un archivo de Excel (.xlsx) o CSV primero.')
  }

  const buffer = Buffer.from(await archivo.arrayBuffer())
  const esCSV = archivo.name.toLowerCase().endsWith('.csv')

  const workbook = new ExcelJS.Workbook()
  let hoja: ExcelJS.Worksheet | undefined

  if (esCSV) {
    hoja = await workbook.csv.read(Readable.from(buffer))
  } else {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    hoja = workbook.worksheets[0]
  }

  if (!hoja) {
    throw new Error('No se pudo leer ninguna hoja del archivo.')
  }

  const supabase = await createClient()

  const { data: gradosInstitucion } = await supabase
    .from('grados')
    .select('nombre')
    .eq('institucion_id', institucionId)

  if (!gradosInstitucion || gradosInstitucion.length === 0) {
    throw new Error(
      'Todavía no has creado ningún curso/grado. Ve a "Cursos/grados" en el panel de institución y créalos antes de cargar el Excel.'
    )
  }

  const mapaGrados = new Map<string, string>()
  for (const g of gradosInstitucion) {
    mapaGrados.set(normalizarEncabezado(g.nombre), g.nombre)
  }

  const encabezados: string[] = []
  hoja.getRow(1).eachCell({ includeEmpty: false }, (celda, numeroColumna) => {
    encabezados[numeroColumna] = normalizarEncabezado(String(celda.value ?? ''))
  })

  const filas: FilaEstudiante[] = []
  let filaConError: number | null = null
  let motivoError: string = ''

  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila === 1 || filaConError !== null) return

    const datosFila: Partial<FilaEstudiante> = {}

    fila.eachCell({ includeEmpty: false }, (celda, numeroColumna) => {
      const encabezado = encabezados[numeroColumna]
      const clave = encabezado ? MAPA_ENCABEZADOS[encabezado] : undefined
      if (!clave) return

      const valor = celda.value
      if (valor === null || valor === undefined || valor === '') return

      if (clave === 'fecha_nacimiento' && valor instanceof Date) {
        datosFila.fecha_nacimiento = valor.toISOString().slice(0, 10)
      } else {
        datosFila[clave] = String(valor).trim()
      }
    })

    if (Object.keys(datosFila).length === 0) return

    if (
      !datosFila.codigo_institucional ||
      !datosFila.nombres ||
      !datosFila.apellidos ||
      !datosFila.curso_grado ||
      !datosFila.numero_documento ||
      !datosFila.fecha_nacimiento
    ) {
      filaConError = numeroFila
      motivoError =
        'falta algún dato obligatorio (código, nombres, apellidos, curso/grado, documento o fecha de nacimiento)'
      return
    }

    const gradoCanonico = mapaGrados.get(normalizarEncabezado(datosFila.curso_grado))
    if (!gradoCanonico) {
      filaConError = numeroFila
      motivoError = `el curso/grado "${datosFila.curso_grado}" no existe en tu institución. Créalo primero en "Cursos", o corrige el nombre en el archivo`
      return
    }

    filas.push({
      codigo_institucional: datosFila.codigo_institucional,
      nombres: datosFila.nombres,
      apellidos: datosFila.apellidos,
      curso_grado: gradoCanonico,
      numero_documento: datosFila.numero_documento,
      fecha_nacimiento: datosFila.fecha_nacimiento,
    })
  })

  if (filaConError !== null) {
    throw new Error(
      `Fila ${filaConError} del archivo: ${motivoError}. Revisa esa fila y vuelve a intentar.`
    )
  }

  if (filas.length === 0) {
    throw new Error(
      'El archivo no tiene filas de datos (revisa que la primera fila tenga los encabezados de las columnas).'
    )
  }

  const { error } = await supabase
    .from('estudiantes')
    .insert(filas.map((f) => ({ ...f, institucion_id: institucionId })))

  if (error) {
    throw new Error(
      `No se pudo cargar el archivo completo (no se guardó ningún estudiante todavía): ${error.message}`
    )
  }

  revalidatePath('/institucion', 'layout')
}
