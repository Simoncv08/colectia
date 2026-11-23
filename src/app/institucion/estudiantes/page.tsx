import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { cargarEstudiantesExcel, crearEstudiante } from './actions'
import { traerTodasLasFilas } from '@/lib/consultas'
import { ordenarGrados } from '@/lib/ordenarGrados'
import Ventana from '@/components/Ventana'
import { ui } from '@/lib/ui'
import { compararCursos, compararEstudiantes, normalizar } from '@/lib/formato'
import FormularioAccion from '@/components/FormularioAccion'

type Params = { searchParams: Promise<{ q?: string; curso?: string }> }

type Estudiante = {
  id: string
  codigo_institucional: string
  numero_documento: string | null
  nombres: string
  apellidos: string
  curso_grado: string | null
}

export const metadata = { title: 'Estudiantes' }

export default async function EstudiantesPage({ searchParams }: Params) {
  const { q = '', curso = '' } = await searchParams
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId, esAdmin } = sesion

  const { data: todos, error } = await traerTodasLasFilas<Estudiante>((desde, hasta) =>
    supabase
      .from('estudiantes')
      .select('id, codigo_institucional, numero_documento, nombres, apellidos, curso_grado')
      .eq('institucion_id', institucionId)
      .order('id', { ascending: true })
      .range(desde, hasta)
  )

  const { data: gradosCrudos } = await supabase
    .from('grados')
    .select('id, nombre')
    .eq('institucion_id', institucionId)
  const grados = ordenarGrados(gradosCrudos ?? [])

  const cursos = Array.from(new Set(todos.map((e) => e.curso_grado ?? ''))).sort(compararCursos)

  const busqueda = normalizar(q)
  const filtrados = todos.filter((e) => {
    if (curso && (e.curso_grado ?? '') !== (curso === '__sin__' ? '' : curso)) return false
    if (!busqueda) return true
    return normalizar(
      `${e.nombres} ${e.apellidos} ${e.apellidos} ${e.nombres} ${e.codigo_institucional} ${e.numero_documento ?? ''}`
    ).includes(busqueda)
  })

  const porCurso = new Map<string, Estudiante[]>()
  for (const e of filtrados) {
    const clave = e.curso_grado ?? ''
    const lista = porCurso.get(clave) ?? []
    lista.push(e)
    porCurso.set(clave, lista)
  }
  const secciones = Array.from(porCurso.entries())
    .sort(([a], [b]) => compararCursos(a, b))
    .map(([nombreCurso, lista]) => ({
      curso: nombreCurso,
      estudiantes: [...lista].sort(compararEstudiantes),
    }))

  const hayFiltro = Boolean(q || curso)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Estudiantes</h1>
          <p className={ui.textoSecundario}>{todos.length} estudiante(s) en total</p>
        </div>
        {esAdmin && (
          <div className="flex flex-wrap gap-2">
            <Ventana textoBoton="Cargar desde Excel" titulo="Cargar estudiantes desde Excel" variante="secundario">
              <FormularioAccion
                action={cargarEstudiantesExcel}
                className="flex flex-col gap-4"
              >
                <p className={ui.textoSecundario}>
                  1. Descarga la{' '}
                  <a href="/plantilla_estudiantes.xlsx" className={ui.enlace}>
                    plantilla de Excel
                  </a>{' '}
                  (trae instrucciones y ejemplos).
                  <br />
                  2. Borra las filas de ejemplo y agrega tus estudiantes.
                  <br />
                  3. Súbela aquí.
                </p>
                <input
                  name="archivo"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  required
                  className="text-sm text-gray-800"
                />
                <p className={ui.ayuda}>
                  Todas las columnas son obligatorias, y el curso de cada fila debe existir en la
                  pestaña Cursos. Si alguna fila tiene un error, no se guarda nada para que puedas
                  corregir y volver a intentar.
                </p>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Cargar archivo
                </button>
              </FormularioAccion>
            </Ventana>

            <Ventana textoBoton="+ Agregar estudiante" titulo="Agregar estudiante">
              {grados.length ? (
                <FormularioAccion
                  action={crearEstudiante}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <label className={ui.etiqueta}>
                    Nombres
                    <input name="nombres" required className={ui.campo} />
                  </label>
                  <label className={ui.etiqueta}>
                    Apellidos
                    <input name="apellidos" required className={ui.campo} />
                  </label>
                  <label className={ui.etiqueta}>
                    Código del estudiante
                    <input name="codigo_institucional" required className={ui.campo} />
                  </label>
                  <label className={ui.etiqueta}>
                    Curso
                    <select name="curso_grado" required defaultValue="" className={ui.campo}>
                      <option value="" disabled>
                        Selecciona el curso
                      </option>
                      {grados.map((g) => (
                        <option key={g.id} value={g.nombre}>
                          {g.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={ui.etiqueta}>
                    Número de documento
                    <input name="numero_documento" required className={ui.campo} />
                  </label>
                  <label className={ui.etiqueta}>
                    Fecha de nacimiento
                    <input name="fecha_nacimiento" type="date" required className={ui.campo} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className={ui.botonPrimario}>
                      Agregar estudiante
                    </button>
                  </div>
                </FormularioAccion>
              ) : (
                <p className={ui.textoSecundario}>
                  Primero crea al menos un curso en la pestaña{' '}
                  <Link href="/institucion/grados" className={ui.enlace}>
                    Cursos
                  </Link>
                  .
                </p>
              )}
            </Ventana>
          </div>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className={`${ui.etiqueta} min-w-0 flex-1 basis-56`}>
          Buscar
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre, apellido o código"
            className={ui.campo}
          />
        </label>
        <label className={ui.etiqueta}>
          Curso
          <select name="curso" defaultValue={curso} className={ui.campo}>
            <option value="">Todos los cursos</option>
            {cursos.map((c) => (
              <option key={c || '__sin__'} value={c || '__sin__'}>
                {c || 'Sin curso asignado'}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={ui.botonPrimario}>
          Buscar
        </button>
        {hayFiltro && (
          <Link href="/institucion/estudiantes" className={ui.botonSecundario}>
            Limpiar
          </Link>
        )}
      </form>

      {error && <p className={ui.avisoRojo}>No se pudieron cargar los estudiantes: {error.message}</p>}

      {!filtrados.length && (
        <p className={ui.textoSecundario}>
          {hayFiltro ? 'Ningún estudiante coincide con la búsqueda.' : 'Todavía no hay estudiantes.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {secciones.map((s) => (
          <details
            key={s.curso || '__sin__'}
            open={hayFiltro}
            className="group rounded-xl border border-gray-200 bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3">
              <span className="font-semibold text-gray-900">{s.curso || 'Sin curso asignado'}</span>
              <span className="text-sm text-gray-700">
                {s.estudiantes.length} estudiante(s)
                <span className="ml-2 inline-block transition group-open:rotate-180">▾</span>
              </span>
            </summary>
            <ul className="divide-y divide-gray-100 border-t border-gray-200">
              {s.estudiantes.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="text-gray-900">
                    {e.apellidos} {e.nombres}
                    <span className="ml-2 text-gray-600">{e.codigo_institucional}</span>
                  </span>
                  {esAdmin && (
                    <Link href={`/institucion/estudiantes/${e.id}`} className={ui.enlace}>
                      Editar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
