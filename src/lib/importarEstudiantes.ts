import ExcelJS from 'exceljs'
import { Readable } from 'stream'
import { inflateRawSync } from 'zlib'
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

// Límites del archivo: un .xlsx es un ZIP y puede ocupar mucho más al descomprimirse.
export const MAX_BYTES_ARCHIVO = 1_000_000
const MAX_BYTES_DESCOMPRIMIDO = 20_000_000
const MAX_ENTRADAS_ZIP = 200
export const MAX_FILAS_IMPORTACION = 5000

// Revisa el ZIP antes de entregárselo a ExcelJS: descomprime cada parte con un tope real de
// tamaño, así un archivo pequeño que se infla a cientos de MB se rechaza sin agotar la memoria.
function revisarZip(buffer: Buffer): string | null {
  const invalido = 'El archivo no es un Excel (.xlsx) válido.'
  const grande = 'El archivo es demasiado grande. Divide la lista en varios archivos.'
  const inicioBusqueda = Math.max(0, buffer.length - 65_557)
  let fin = -1
  for (let i = buffer.length - 22; i >= inicioBusqueda; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      fin = i
      break
    }
  }
  if (fin < 0) return invalido

  const entradas = buffer.readUInt16LE(fin + 10)
  let pos = buffer.readUInt32LE(fin + 16)
  if (entradas === 0xffff || pos === 0xffffffff) return grande // ZIP64: no se necesita para una lista
  if (entradas > MAX_ENTRADAS_ZIP) return grande

  let total = 0
  for (let n = 0; n < entradas; n++) {
    if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) return invalido
    const metodo = buffer.readUInt16LE(pos + 10)
    const comprimido = buffer.readUInt32LE(pos + 20)
    const largoNombre = buffer.readUInt16LE(pos + 28)
    const largoExtra = buffer.readUInt16LE(pos + 30)
    const largoComentario = buffer.readUInt16LE(pos + 32)
    const local = buffer.readUInt32LE(pos + 42)
    pos += 46 + largoNombre + largoExtra + largoComentario

    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) return invalido
    const inicio = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
    if (inicio + comprimido > buffer.length) return invalido
    const datos = buffer.subarray(inicio, inicio + comprimido)

    if (metodo === 0) {
      total += datos.length
    } else if (metodo === 8) {
      try {
        total += inflateRawSync(datos, { maxOutputLength: MAX_BYTES_DESCOMPRIMIDO - total + 1 }).length
      } catch (e) {
        return (e as { code?: string })?.code === 'ERR_BUFFER_TOO_LARGE' ? grande : invalido
      }
    } else {
      return invalido
    }
    if (total > MAX_BYTES_DESCOMPRIMIDO) return grande
  }
  return null
}

async function leerHoja(archivo: File): Promise<ExcelJS.Worksheet | string | undefined> {
  if (archivo.size > MAX_BYTES_ARCHIVO) return 'El archivo es demasiado grande (máximo 1 MB). Divide la lista en varios archivos.'
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const libro = new ExcelJS.Workbook()
  if (archivo.name.toLowerCase().endsWith('.csv')) {
    // map deja cada valor como texto: sin esto, ExcelJS convierte el código 00123 en 123.
    return libro.csv.read(Readable.from(buffer), { map: (valor: string) => valor })
  }
  const problema = revisarZip(buffer)
  if (problema) return problema
  await libro.xlsx.load(buffer as unknown as ArrayBuffer)
  return libro.worksheets[0]
}

// Lee el archivo y valida cada fila. cursos: nombre normalizado → nombre exacto en la institución.
export async function importarEstudiantes(
  archivo: File,
  cursos: Map<string, string>
): Promise<{ filas: FilaEstudiante[] } | { error: string }> {
  let hoja: Awaited<ReturnType<typeof leerHoja>>
  try {
    hoja = await leerHoja(archivo)
  } catch {
    return { error: 'No se pudo leer el archivo. Revisa que sea un Excel (.xlsx) o un CSV.' }
  }
  if (typeof hoja === 'string') return { error: hoja }
  if (!hoja) return { error: 'No se pudo leer ninguna hoja del archivo.' }
  if (hoja.rowCount > MAX_FILAS_IMPORTACION + 1) {
    return { error: `El archivo tiene más de ${MAX_FILAS_IMPORTACION} filas. Divide la lista en varios archivos.` }
  }

  const columnas: (keyof FilaEstudiante | undefined)[] = []
  hoja.getRow(1).eachCell({ includeEmpty: false }, (celda, numero) => {
    const clave = normalizar(String(celda.value ?? ''))
    columnas[numero] = Object.hasOwn(ENCABEZADOS, clave) ? ENCABEZADOS[clave] : undefined
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
