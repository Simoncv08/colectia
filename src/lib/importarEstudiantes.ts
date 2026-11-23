import ExcelJS from 'exceljs'
import { Readable } from 'stream'
import { normalizar } from '@/lib/formato'

export type FilaEstudiante = {
  codigo_institucional: string
  nombres: string
  apellidos: string
  curso_grado: string
  numero_documento: string
  fecha_nacimiento: string
}

const ENCABEZADOS: Record<string, keyof FilaEstudiante> = {
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

function fechaValida(a: number, m: number, d: number) {
  const fecha = new Date(Date.UTC(a, m - 1, d))
  const coincide =
    fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
  return coincide && a > 1900 ? fecha.toISOString().slice(0, 10) : null
}

// Acepta fechas de Excel, AAAA-MM-DD y DD/MM/AAAA (el orden de Colombia). Devuelve null si
// no es una fecha real, para no guardar 05/03 como 3 de mayo.
export function leerFecha(valor: unknown): string | null {
  if (valor instanceof Date) {
    return fechaValida(valor.getUTCFullYear(), valor.getUTCMonth() + 1, valor.getUTCDate())
  }
  // Número de serie de Excel: días desde el 30/12/1899.
  if (typeof valor === 'number' && valor > 1 && valor < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000).toISOString().slice(0, 10)
  }
  const texto = String(valor ?? '').trim()
  let m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return fechaValida(Number(m[1]), Number(m[2]), Number(m[3]))
  m = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return fechaValida(Number(m[3]), Number(m[2]), Number(m[1]))
  return null
}

// El texto de la celda tal como se ve, incluido el de celdas con formato o hipervínculo.
function leerTexto(valor: unknown): string {
  if (valor && typeof valor === 'object') {
    if ('richText' in valor && Array.isArray(valor.richText)) {
      return valor.richText.map((parte: { text: string }) => parte.text).join('').trim()
    }
    if ('text' in valor) return String(valor.text).trim()
    if ('result' in valor) return String(valor.result).trim()
  }
  return String(valor).trim()
}

async function leerHoja(archivo: File): Promise<ExcelJS.Worksheet | undefined> {
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const libro = new ExcelJS.Workbook()
  if (archivo.name.toLowerCase().endsWith('.csv')) {
    // map deja cada valor como texto: sin esto, ExcelJS convierte el código 00123 en 123.
    return libro.csv.read(Readable.from(buffer), { map: (valor: string) => valor })
  }
  await libro.xlsx.load(buffer as unknown as ArrayBuffer)
  return libro.worksheets[0]
}

// Lee el archivo y valida cada fila. cursos: nombre normalizado → nombre exacto en la institución.
export async function importarEstudiantes(
  archivo: File,
  cursos: Map<string, string>
): Promise<{ filas: FilaEstudiante[] } | { error: string }> {
  const hoja = await leerHoja(archivo)
  if (!hoja) return { error: 'No se pudo leer ninguna hoja del archivo.' }

  const columnas: (keyof FilaEstudiante | undefined)[] = []
  hoja.getRow(1).eachCell({ includeEmpty: false }, (celda, numero) => {
    columnas[numero] = ENCABEZADOS[normalizar(String(celda.value ?? ''))]
  })

  const filas: FilaEstudiante[] = []
  // En un objeto: TypeScript no sigue los cambios hechos dentro de los callbacks de eachRow.
  const estado: { error: string | null } = { error: null }

  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila === 1 || estado.error) return
    const datos: Partial<FilaEstudiante> = {}

    fila.eachCell({ includeEmpty: false }, (celda, numeroColumna) => {
      const clave = columnas[numeroColumna]
      const valor = celda.value
      if (!clave || valor === null || valor === undefined || valor === '' || estado.error) return
      if (clave === 'fecha_nacimiento') {
        const fecha = leerFecha(valor)
        if (fecha) datos.fecha_nacimiento = fecha
        else estado.error = `la fecha de nacimiento "${leerTexto(valor)}" no es válida (escríbela como DD/MM/AAAA)`
      } else {
        datos[clave] = leerTexto(valor)
      }
    })

    if (estado.error) {
      estado.error = `Fila ${numeroFila}: ${estado.error}`
      return
    }
    if (Object.keys(datos).length === 0) return

    const faltante = validarEstudiante(datos)
    if (faltante) {
      estado.error = `Fila ${numeroFila}: ${faltante.toLowerCase()}`
      return
    }
    const curso = cursos.get(normalizar(datos.curso_grado!))
    if (!curso) {
      estado.error = `Fila ${numeroFila}: el curso "${datos.curso_grado}" no existe en tu institución. Créalo primero en "Cursos", o corrige el nombre en el archivo`
      return
    }
    filas.push({ ...(datos as FilaEstudiante), curso_grado: curso })
  })

  if (estado.error) return { error: `${estado.error}. Revisa esa fila y vuelve a intentar.` }
  if (filas.length === 0) {
    return {
      error: 'El archivo no tiene filas de datos. Revisa que la primera fila tenga los encabezados de las columnas.',
    }
  }
  return { filas }
}

// Todos los datos son obligatorios: documento y fecha de nacimiento son con los que el acudiente
// verifica el vínculo. Devuelve el mensaje de lo que falta, o null.
export function validarEstudiante(datos: Partial<FilaEstudiante>): string | null {
  const faltan = (
    [
      ['codigo_institucional', 'el código'],
      ['nombres', 'los nombres'],
      ['apellidos', 'los apellidos'],
      ['curso_grado', 'el curso'],
      ['numero_documento', 'el documento'],
      ['fecha_nacimiento', 'la fecha de nacimiento'],
    ] as const
  )
    .filter(([clave]) => !datos[clave])
    .map(([, nombre]) => nombre)
  if (!faltan.length) return null
  return `Falta ${faltan.join(', ')}.`
}
