import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { actualizarEstudiante, eliminarEstudiante } from '../../actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import { ordenarGrados } from '@/lib/ordenarGrados'
import { ui } from '@/lib/ui'

type Params = { params: Promise<{ id: string }> }

export const metadata = { title: 'Editar estudiante' }

export default async function EditarEstudiantePage({ params }: Params) {
  const { id } = await params
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase } = sesion

  if (!sesion.esAdmin) {
    return (
      <p className="text-gray-700">
        Solo el administrador de la institución puede editar estudiantes.{' '}
        <Link href="/institucion/estudiantes" className={ui.enlace}>
          Volver a estudiantes
        </Link>
      </p>
    )
  }

  const { data: estudiante } = await supabase
    .from('estudiantes')
    .select(
      'id, institucion_id, codigo_institucional, nombres, apellidos, curso_grado, numero_documento, fecha_nacimiento'
    )
    .eq('id', id)
    .eq('institucion_id', sesion.institucionId)
    .maybeSingle()

  if (!estudiante) {
    notFound()
  }

  const { data: gradosCrudos } = await supabase
    .from('grados')
    .select('id, nombre')
    .eq('institucion_id', estudiante.institucion_id)

  const grados = ordenarGrados(gradosCrudos ?? [])
  const cursoActualExiste =
    !estudiante.curso_grado || grados.some((g) => g.nombre === estudiante.curso_grado)

  const { count: pagosDelEstudiante } = await supabase
    .from('registros_pago')
    .select('id', { count: 'exact', head: true })
    .eq('estudiante_id', estudiante.id)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/institucion/estudiantes" className={`${ui.enlace} text-sm`}>
          ← Estudiantes
        </Link>
        <h1 className={`${ui.titulo} mt-1`}>
          {estudiante.apellidos} {estudiante.nombres}
        </h1>
      </div>

      <form
        action={actualizarEstudiante.bind(null, estudiante.id, estudiante.institucion_id)}
        className={`${ui.tarjeta} grid gap-4 sm:grid-cols-2`}
      >
        <label className={ui.etiqueta}>
          Nombres
          <input name="nombres" defaultValue={estudiante.nombres} required className={ui.campo} />
        </label>
        <label className={ui.etiqueta}>
          Apellidos
          <input name="apellidos" defaultValue={estudiante.apellidos} required className={ui.campo} />
        </label>
        <label className={ui.etiqueta}>
          Código del estudiante
          <input
            name="codigo_institucional"
            defaultValue={estudiante.codigo_institucional}
            required
            className={ui.campo}
          />
        </label>
        <label className={ui.etiqueta}>
          Curso
          <select
            name="curso_grado"
            defaultValue={estudiante.curso_grado ?? ''}
            required
            className={ui.campo}
          >
            <option value="" disabled>
              Selecciona el curso
            </option>
            {!cursoActualExiste && estudiante.curso_grado && (
              <option value={estudiante.curso_grado} disabled>
                {estudiante.curso_grado} (ya no existe en Cursos)
              </option>
            )}
            {grados.map((g) => (
              <option key={g.id} value={g.nombre}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.etiqueta}>
          Número de documento
          <input
            name="numero_documento"
            defaultValue={estudiante.numero_documento ?? ''}
            required
            className={ui.campo}
          />
        </label>
        <label className={ui.etiqueta}>
          Fecha de nacimiento
          <input
            name="fecha_nacimiento"
            type="date"
            defaultValue={estudiante.fecha_nacimiento ?? ''}
            required
            className={ui.campo}
          />
        </label>
        <p className={`${ui.ayuda} sm:col-span-2`}>
          Si cambias el curso, al estudiante le aparecerán los eventos de su nuevo curso en lugar
          de los del anterior. Los pagos que ya tenga registrados se conservan.
        </p>
        <div className="sm:col-span-2">
          <button type="submit" className={ui.botonPrimario}>
            Guardar cambios
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-red-200 bg-white p-5">
        <h2 className="text-base font-semibold text-red-800">Eliminar estudiante</h2>
        {pagosDelEstudiante ? (
          <p className="mt-1 text-sm text-gray-700">
            Este estudiante tiene {pagosDelEstudiante} pago(s) registrado(s), así que no se puede
            eliminar: se perderían esos registros de pago.
          </p>
        ) : (
          <form action={eliminarEstudiante.bind(null, estudiante.id)} className="mt-2">
            <p className="mb-3 text-sm text-gray-700">
              Se borrará al estudiante y su vínculo con los acudientes. No se puede deshacer.
            </p>
            <ConfirmSubmitButton
              confirmMessage={`¿Eliminar a ${estudiante.nombres} ${estudiante.apellidos}? Esto no se puede deshacer.`}
              className={ui.botonPeligro}
            >
              Eliminar estudiante
            </ConfirmSubmitButton>
          </form>
        )}
      </section>
    </div>
  )
}
