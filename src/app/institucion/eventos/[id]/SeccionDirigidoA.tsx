import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import FormularioAccion from '@/components/FormularioAccion'
import Ventana from '@/components/Ventana'
import { ui } from '@/lib/ui'
import {
  agregarGrupoPorCurso,
  agregarGrupoPorEstudiante,
  agregarGrupoPorGrupoDeCursos,
  quitarGrupo,
} from '../actions'
import { Plus, X } from 'lucide-react'
import { icono, iconoGrande } from '@/lib/iconos'
import { compararCursos, compararEstudiantes } from '@/lib/formato'
import { agrupar } from '@/lib/colecciones'

type Opcion = { id: string; nombre: string }
type EstudianteOpcion = { id: string; nombres: string; apellidos: string; curso_grado: string | null }
export type GrupoDirigido = {
  id: string
  curso_grado: string | null
  estudiante_id: string | null
  estudiantes: Omit<EstudianteOpcion, 'id'> | null
}

const conCurso = (e: { curso_grado: string | null }) => (e.curso_grado ? ` (${e.curso_grado})` : '')

// Para elegir un estudiante puntual: por salón de menor a mayor y, dentro, por apellido.
function agruparPorSalon(estudiantes: EstudianteOpcion[]) {
  return Array.from(agrupar(estudiantes, (e) => e.curso_grado ?? ''), ([salon, lista]) => ({
    salon,
    estudiantes: [...lista].sort(compararEstudiantes),
  })).sort((a, b) => compararCursos(a.salon, b.salon))
}

export default function SeccionDirigidoA({
  eventoId,
  grados,
  gruposCurso,
  estudiantes,
  cursosDirigidos,
  estudiantesDirigidos,
}: {
  eventoId: string
  grados: Opcion[]
  gruposCurso: Opcion[]
  estudiantes: EstudianteOpcion[]
  cursosDirigidos: GrupoDirigido[]
  estudiantesDirigidos: GrupoDirigido[]
}) {
  const grupos = [...cursosDirigidos, ...estudiantesDirigidos]
  return (
    <section className={`${ui.tarjeta} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={ui.subtitulo}>Dirigido a</h2>
          <p className={ui.ayuda}>Solo los acudientes de estos estudiantes ven el evento.</p>
        </div>
        <div className={ui.accionesPagina}>
          <Ventana textoBoton={
                <>
                  <Plus {...iconoGrande} />
                  Agregar
                </>
              } titulo="¿A quién va dirigido?" variante="secundario">
            <div className="flex flex-col gap-5">
              {gruposCurso.length > 0 && (
                <FormularioAccion
                  action={agregarGrupoPorGrupoDeCursos.bind(null, eventoId)}
                  className="flex flex-col gap-2"
                >
                  <label className={ui.etiqueta}>
                    Un grupo de cursos (ej.: Primaria)
                    <select name="grupo_curso_id" required defaultValue="" className={ui.campo}>
                      <option value="" disabled>
                        Selecciona un grupo
                      </option>
                      {gruposCurso.map((gc) => (
                        <option key={gc.id} value={gc.id}>
                          {gc.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className={`${ui.botonPrimario} self-start`}>
                    Agregar grupo
                  </button>
                </FormularioAccion>
              )}
              <FormularioAccion
                action={agregarGrupoPorCurso.bind(null, eventoId)}
                className="flex flex-col gap-2 border-t border-gray-200 pt-4 first:border-0 first:pt-0"
              >
                <label className={ui.etiqueta}>
                  Un curso completo
                  <select name="curso_grado" required defaultValue="" className={ui.campo}>
                    <option value="" disabled>
                      Selecciona un curso
                    </option>
                    {grados.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Agregar curso
                </button>
              </FormularioAccion>
              <FormularioAccion
                action={agregarGrupoPorEstudiante.bind(null, eventoId)}
                className="flex flex-col gap-2 border-t border-gray-200 pt-4"
              >
                <label className={ui.etiqueta}>
                  Un estudiante puntual
                  <select name="estudiante_id" required defaultValue="" className={ui.campo}>
                    <option value="" disabled>
                      Selecciona un estudiante
                    </option>
                    {agruparPorSalon(estudiantes).map(({ salon, estudiantes: delSalon }) => (
                      <optgroup key={salon || 'sin-curso'} label={salon || 'Sin curso'}>
                        {delSalon.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.apellidos} {e.nombres}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Agregar estudiante
                </button>
              </FormularioAccion>
            </div>
          </Ventana>
        </div>
      </div>

      {!grupos.length ? (
        <p className={ui.avisoAmbar}>
          Todavía no está dirigido a nadie, así que ningún acudiente puede verlo.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {cursosDirigidos.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {cursosDirigidos.map((g) => (
                <li key={g.id} className={ui.chip}>
                  {g.curso_grado}
                  <FormularioAccion action={quitarGrupo.bind(null, eventoId, g.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`¿Quitar el curso ${g.curso_grado} de este evento?`}
                      ariaLabel={`Quitar el curso ${g.curso_grado}`}
                      className={ui.botonChip}
                    >
                      <X {...icono} />
                    </ConfirmSubmitButton>
                  </FormularioAccion>
                </li>
              ))}
            </ul>
          )}
          {estudiantesDirigidos.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">Estudiantes puntuales</p>
              <ul className="flex flex-wrap gap-2">
                {estudiantesDirigidos.map((g) => (
                  <li key={g.id} className={ui.chip}>
                    {g.estudiantes?.apellidos} {g.estudiantes?.nombres}
                    {g.estudiantes && conCurso(g.estudiantes)}
                    <FormularioAccion action={quitarGrupo.bind(null, eventoId, g.id)}>
                      <ConfirmSubmitButton
                        confirmMessage="¿Quitar a este estudiante del evento?"
                        ariaLabel={`Quitar a ${g.estudiantes?.nombres ?? 'este estudiante'} del evento`}
                        className={ui.botonChip}
                      >
                        <X {...icono} />
                      </ConfirmSubmitButton>
                    </FormularioAccion>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
