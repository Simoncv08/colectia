import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import {
  agregarGrados,
  eliminarGrado,
  crearGrupoCurso,
  eliminarGrupoCurso,
  agregarGradosAGrupo,
  quitarGradoDeGrupo,
} from './actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import Ventana from '@/components/Ventana'
import { ordenarGrados } from '@/lib/ordenarGrados'
import { ui } from '@/lib/ui'
import FormularioAccion from '@/components/FormularioAccion'

// Casillas en vez de un <select multiple>, que obliga a mantener Ctrl presionado.
function CasillasCursos({ cursos }: { cursos: { id: string; nombre: string }[] }) {
  if (!cursos.length) {
    return <p className={ui.ayuda}>No hay más cursos para agregar.</p>
  }
  return (
    <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      {cursos.map((g) => (
        <label
          key={g.id}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 has-[:checked]:border-primario has-[:checked]:bg-primario-suave"
        >
          <input type="checkbox" name="grado_ids" value={g.id} />
          {g.nombre}
        </label>
      ))}
    </div>
  )
}

export const metadata = { title: 'Cursos' }

export default async function CursosPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId, esAdmin } = sesion

  const { data: gradosCrudos } = await supabase
    .from('grados')
    .select('id, nombre')
    .eq('institucion_id', institucionId)
  const grados = ordenarGrados(gradosCrudos ?? [])

  const { data: gruposCrudos } = await supabase
    .from('grupos_curso')
    .select('id, nombre, grupo_curso_grados(id, grados(id, nombre))')
    .eq('institucion_id', institucionId)

  const grupos = (gruposCrudos ?? [])
    .map((grupo) => ({
      ...grupo,
      miembros: ordenarGrados(
        grupo.grupo_curso_grados
          .filter((m) => m.grados)
          .map((m) => ({ membresiaId: m.id, id: m.grados!.id, nombre: m.grados!.nombre }))
      ),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }))

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={ui.titulo}>Cursos</h1>
            <p className={ui.textoSecundario}>{grados.length} curso(s)</p>
          </div>
          {esAdmin && (
            <Ventana textoBoton="+ Agregar cursos" titulo="Agregar cursos">
              <FormularioAccion action={agregarGrados} className="flex flex-col gap-4">
                <label className={ui.etiqueta}>
                  Un curso por línea (o separados por comas)
                  <textarea
                    name="nombres"
                    rows={6}
                    required
                    placeholder={'1A\n1B\n2A\n…'}
                    className={`${ui.campo} font-mono`}
                  />
                </label>
                <p className={ui.ayuda}>Si alguno ya existe, no se duplica.</p>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Agregar
                </button>
              </FormularioAccion>
            </Ventana>
          )}
        </div>

        {grados.length ? (
          <ul className="flex flex-wrap gap-2">
            {grados.map((g) => (
              <li key={g.id} className={ui.chip}>
                {g.nombre}
                {esAdmin && (
                  <FormularioAccion action={eliminarGrado.bind(null, g.id, g.nombre)}>
                    <ConfirmSubmitButton
                      confirmMessage={`¿Eliminar el curso "${g.nombre}"? Solo se puede si ya no tiene estudiantes.`}
                      ariaLabel={`Eliminar el curso ${g.nombre}`}
                      className={ui.botonChip}
                    >
                      ×
                    </ConfirmSubmitButton>
                  </FormularioAccion>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.textoSecundario}>Todavía no hay cursos.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Grupos de cursos</h2>
            <p className={ui.textoSecundario}>
              Para dirigir un evento a varios cursos de una vez (por ejemplo, &quot;Primaria&quot;).
            </p>
          </div>
          {esAdmin && grados.length > 0 && (
            <Ventana textoBoton="+ Crear grupo" titulo="Crear grupo de cursos" variante="secundario">
              <FormularioAccion action={crearGrupoCurso} className="flex flex-col gap-4">
                <label className={ui.etiqueta}>
                  Nombre del grupo
                  <input name="nombre" required placeholder="Ej.: Primaria" className={ui.campo} />
                </label>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-800">Cursos que incluye</p>
                  <CasillasCursos cursos={grados} />
                </div>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Crear grupo
                </button>
              </FormularioAccion>
            </Ventana>
          )}
        </div>

        {!grupos.length && <p className={ui.textoSecundario}>Todavía no hay grupos de cursos.</p>}

        <ul className="flex flex-col gap-2">
          {grupos.map((grupo) => {
            const idsMiembros = new Set(grupo.miembros.map((m) => m.id))
            return (
              <li
                key={grupo.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{grupo.nombre}</p>
                  <p className="text-sm text-gray-700">
                    {grupo.miembros.length
                      ? grupo.miembros.map((m) => m.nombre).join(', ')
                      : 'Sin cursos todavía'}
                  </p>
                </div>
                {esAdmin && (
                  <Ventana textoBoton="Editar" titulo={`Grupo "${grupo.nombre}"`} variante="secundario">
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-800">Cursos del grupo</p>
                        {grupo.miembros.length ? (
                          <ul className="flex flex-wrap gap-2">
                            {grupo.miembros.map((m) => (
                              <li key={m.membresiaId} className={ui.chip}>
                                {m.nombre}
                                <FormularioAccion action={quitarGradoDeGrupo.bind(null, m.membresiaId)}>
                                  <button
                                    type="submit"
                                    aria-label={`Quitar ${m.nombre} del grupo`}
                                    className={ui.botonChip}
                                  >
                                    ×
                                  </button>
                                </FormularioAccion>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={ui.ayuda}>Este grupo todavía no tiene cursos.</p>
                        )}
                      </div>
                      <FormularioAccion
                        action={agregarGradosAGrupo.bind(null, grupo.id)}
                        className="flex flex-col gap-3 border-t border-gray-200 pt-4"
                      >
                        <p className="text-sm font-medium text-gray-800">Agregar cursos</p>
                        <CasillasCursos cursos={grados.filter((g) => !idsMiembros.has(g.id))} />
                        <button type="submit" className={`${ui.botonPrimario} self-start`}>
                          Agregar al grupo
                        </button>
                      </FormularioAccion>
                      <FormularioAccion
                        action={eliminarGrupoCurso.bind(null, grupo.id)}
                        className="border-t border-gray-200 pt-4"
                      >
                        <ConfirmSubmitButton
                          confirmMessage={`¿Eliminar el grupo "${grupo.nombre}"? Los cursos no se eliminan, solo el grupo.`}
                          className={ui.botonPeligro}
                        >
                          Eliminar grupo
                        </ConfirmSubmitButton>
                      </FormularioAccion>
                    </div>
                  </Ventana>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
