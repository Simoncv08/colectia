import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { cargarEstudiantesExcel, crearEstudiante } from './actions'
import { traerTodasLasFilas } from '@/lib/consultas'
import { ordenarGrados } from '@/lib/ordenarGrados'
import Ventana from '@/components/Ventana'
import { ui } from '@/lib/ui'
import { SIN_CURSO, compararCursos, compararEstudiantes, nombreCurso, normalizar } from '@/lib/formato'
import FormularioAccion from '@/components/FormularioAccion'
import { Plus, Search } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'
import FiltrosActivos from '@/components/FiltrosActivos'
import Paginacion from '@/components/Paginacion'

type Params = { searchParams: Promise<{ q?: string; curso?: string; pagina?: string }> }

const POR_PAGINA = 50

type Estudiante = {
  id: string
  codigo_institucional: string
  nombres: string
  apellidos: string
  curso_grado: string | null
}

export const metadata = { title: 'Estudiantes' }

export default async function EstudiantesPage({ searchParams }: Params) {
  const { q = '', curso = '', pagina: paginaTexto = '1' } = await searchParams
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId, esAdmin } = sesion

  const { data: todos, error } = await traerTodasLasFilas<Estudiante>((desde, hasta) =>
    supabase
      .from('estudiantes')
      .select('id, codigo_institucional, nombres, apellidos, curso_grado')
      .eq('institucion_id', institucionId)
      .order('id', { ascending: true })
      .range(desde, hasta)
  )

  // El número de documento solo lo puede leer el administrador (22_seguridad_fase2.sql),
  // así que solo él busca por documento.
  const { data: filasDocumento } = esAdmin
    ? await supabase.rpc('documentos_de_institucion', { p_institucion_id: institucionId })
    : { data: [] }
  const documentos = new Map((filasDocumento ?? []).map((d) => [d.id, d.numero_documento]))

  const { data: gradosCrudos } = await supabase
    .from('grados')
    .select('id, nombre')
    .eq('institucion_id', institucionId)
  const grados = ordenarGrados(gradosCrudos ?? [])

  const cursos = Array.from(new Set(todos.map((e) => e.curso_grado ?? ''))).sort(compararCursos)

  const busqueda = normalizar(q)
  const filtrados = todos.filter((e) => {
    if (curso && (e.curso_grado ?? '') !== (curso === SIN_CURSO ? '' : curso)) return false
    if (!busqueda) return true
    const documento = documentos.get(e.id) ?? ''
    return normalizar(
      `${e.nombres} ${e.apellidos} ${e.apellidos} ${e.nombres} ${e.codigo_institucional} ${documento}`
    ).includes(busqueda)
  })

  const ordenados = [...filtrados].sort(
    (a, b) => compararCursos(a.curso_grado, b.curso_grado) || compararEstudiantes(a, b)
  )
  const ultimaPagina = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number(paginaTexto) || 1), ultimaPagina)
  const enPagina = ordenados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function url(cambios: { q?: string; curso?: string; pagina?: number }) {
    const p = new URLSearchParams()
    const valores = { q, curso, pagina: 1, ...cambios }
    if (valores.q) p.set('q', valores.q)
    if (valores.curso) p.set('curso', valores.curso)
    if (valores.pagina > 1) p.set('pagina', String(valores.pagina))
    const texto = p.toString()
    return `/institucion/estudiantes${texto ? `?${texto}` : ''}`
  }
  const filtrosActivos = [
    ...(q ? [{ etiqueta: `Búsqueda: ${q}`, hrefQuitar: url({ q: '' }) }] : []),
    ...(curso
      ? [{ etiqueta: `Curso: ${nombreCurso(curso === SIN_CURSO ? '' : curso)}`, hrefQuitar: url({ curso: '' }) }]
      : []),
  ]

  const hayFiltro = Boolean(q || curso)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Estudiantes</h1>
          <p className={ui.textoSecundario}>{todos.length} estudiante(s) en total</p>
        </div>
        {esAdmin && (
          <div className={ui.accionesPagina}>
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

            <Ventana textoBoton={
              <>
                <Plus {...iconoGrande} />
                Agregar estudiante
              </>
            } titulo="Agregar estudiante">
              {grados.length ? (
                <FormularioAccion
                  action={crearEstudiante}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
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
                    <input name="numero_documento" required inputMode="numeric" className={ui.campo} />
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

      <form method="get" className={ui.filtros}>
        <label className={`${ui.etiqueta} col-span-2 sm:min-w-0 sm:flex-1 sm:basis-56`}>
          Buscar
          <input
            name="q"
            defaultValue={q}
            placeholder={esAdmin ? 'Nombre, código o documento' : 'Nombre, apellido o código'}
            className={ui.campo}
          />
        </label>
        <label className={ui.etiqueta}>
          Curso
          <select name="curso" defaultValue={curso} className={ui.campo}>
            <option value="">Todos los cursos</option>
            {cursos.map((c) => (
              <option key={c || SIN_CURSO} value={c || SIN_CURSO}>
                {nombreCurso(c)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={ui.botonSecundario}>
          <Search {...iconoGrande} />
          Buscar
        </button>
      </form>

      <FiltrosActivos filtros={filtrosActivos} hrefLimpiar="/institucion/estudiantes" />

      {error && <p className={ui.avisoRojo}>No se pudieron cargar los estudiantes. Recarga la página para intentar de nuevo.</p>}

      {!filtrados.length && (
        <p className={ui.textoSecundario}>
          {hayFiltro ? 'Ningún estudiante coincide con la búsqueda.' : 'Todavía no hay estudiantes.'}
        </p>
      )}

      {enPagina.length > 0 && (
        <div className={ui.contenedorTabla}>
          <table className={ui.tablaResponsiva}>
            <thead className={ui.encabezadoResponsivo}>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">Código</th>
                <th scope="col">Curso</th>
                {esAdmin && (
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={ui.cuerpoResponsivo}>
              {enPagina.map((e) => (
                <tr key={e.id} className={ui.filaLista}>
                  <td className={ui.celdaPrincipal}>
                    <span className={ui.nombreFila}>
                      {e.apellidos} {e.nombres}
                    </span>
                    <span className={ui.detalleMovil}>
                      {nombreCurso(e.curso_grado)} · Código {e.codigo_institucional}
                    </span>
                  </td>
                  <td className={`${ui.celdaEscritorio} text-gray-600`}>{e.codigo_institucional}</td>
                  <td className={`${ui.celdaEscritorio} text-gray-600`}>{nombreCurso(e.curso_grado)}</td>
                  {esAdmin && (
                    <td className={ui.celdaFinal}>
                      <Link
                        href={`/institucion/estudiantes/${e.id}`}
                        aria-label={`Editar a ${e.apellidos} ${e.nombres}`}
                        className={ui.enlaceFila}
                      >
                        Editar
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion total={ordenados.length} pagina={pagina} porPagina={POR_PAGINA} hrefPagina={(n) => url({ pagina: n })} />
    </div>
  )
}
