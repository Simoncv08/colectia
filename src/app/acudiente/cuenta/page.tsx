import { obtenerSesionAcudiente } from '@/lib/sesionAcudiente'
import { desvincularEstudiante } from '../actions'
import FormularioVincular from '../FormularioVincular'
import FormularioDatos from './FormularioDatos'
import FormularioContrasena from '@/components/FormularioContrasena'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import Ventana from '@/components/Ventana'
import { ui } from '@/lib/ui'
import FormularioAccion from '@/components/FormularioAccion'

export const metadata = { title: 'Mi cuenta' }

export default async function CuentaAcudientePage() {
  const sesion = await obtenerSesionAcudiente()
  const { supabase, vinculos, persona } = sesion

  const { data: instituciones } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .in('estado', ['activa', 'en_prueba'])
    .order('nombre', { ascending: true })

  return (
    <>
      <h1 className={ui.titulo}>Mi cuenta</h1>

      <section className={ui.tarjeta}>
        <h2 className={`${ui.subtitulo} mb-4`}>Mis datos</h2>
        <FormularioDatos
          nombres={persona.nombres}
          apellidos={persona.apellidos}
          telefono={persona.telefono}
          correo={sesion.correo}
        />
      </section>

      <section id="estudiantes" className={`${ui.tarjeta} scroll-mt-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={ui.subtitulo}>Estudiantes vinculados</h2>
            <p className={ui.textoSecundario}>
              Los estudiantes de los que ves actividades y pagos.
            </p>
          </div>
          <Ventana
            textoBoton="+ Vincular estudiante"
            titulo="Vincular un estudiante"
            variante={vinculos.length ? 'secundario' : 'primario'}
          >
            <FormularioVincular instituciones={instituciones ?? []} />
          </Ventana>
        </div>

        {vinculos.length ? (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {vinculos.map((v) => {
              const e = v.estudiantes
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {e.nombres} {e.apellidos}
                    </p>
                    <p className="text-sm text-gray-700">
                      {e.instituciones?.nombre ?? 'Institución'}
                      {e.curso_grado ? ` · ${e.curso_grado}` : ''}
                    </p>
                  </div>
                  <FormularioAccion action={desvincularEstudiante.bind(null, v.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`¿Quitar a ${e.nombres} ${e.apellidos} de tu cuenta? Dejarás de ver sus actividades. Puedes volver a vincularlo cuando quieras.`}
                      className={ui.botonPeligro}
                    >
                      Quitar de mi cuenta
                    </ConfirmSubmitButton>
                  </FormularioAccion>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={ui.textoSecundario}>
            Todavía no tienes estudiantes vinculados. Usa <strong>+ Vincular estudiante</strong>{' '}
            con el código o el documento que te dio el colegio.
          </p>
        )}
        <p className={`${ui.ayuda} mt-3`}>
          Quitar a un estudiante de tu cuenta no lo borra del colegio ni elimina sus pagos.
        </p>
      </section>

      <section className={ui.tarjeta}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={ui.subtitulo}>Contraseña</h2>
            <p className={ui.textoSecundario}>
              Si entras con Google o con enlace al correo, también puedes crear una contraseña.
            </p>
          </div>
          <Ventana
            textoBoton="Cambiar contraseña"
            titulo="Cambiar contraseña"
            variante="secundario"
          >
            <FormularioContrasena />
          </Ventana>
        </div>
      </section>
    </>
  )
}
