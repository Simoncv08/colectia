import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { crearInstitucion, cambiarEstadoInstitucion, asignarAdminInstitucion } from './actions'
import { cerrarSesion } from '@/app/actions'
import { ui } from '@/lib/ui'
import FormularioAccion from '@/components/FormularioAccion'

export const metadata = { title: 'Instituciones' }

export default async function InstitucionesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membresiaSuperAdmin } = await supabase
    .from('membresias')
    .select('id')
    .eq('persona_id', user.id)
    .eq('rol', 'super_admin')
    .maybeSingle()

  if (!membresiaSuperAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className={ui.subtitulo}>No tienes permiso para ver esta página</h1>
        <p className={ui.textoSecundario}>Sesión actual: {user.email}</p>
        <form action={cerrarSesion}>
          <button type="submit" className={ui.botonSecundario}>
            Cerrar sesión
          </button>
        </form>
      </main>
    )
  }

  const { data: instituciones, error } = await supabase
    .from('instituciones')
    .select('id, nombre, prefijo_codigo, estado, plan, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 text-gray-900 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.titulo}>Instituciones</h1>
        <form action={cerrarSesion}>
          <button type="submit" className={ui.botonSecundario}>
            Cerrar sesión
          </button>
        </form>
      </div>

      <FormularioAccion action={crearInstitucion} className={`${ui.tarjeta} grid gap-4 sm:grid-cols-3`}>
        <h2 className={`${ui.subtitulo} sm:col-span-3`}>Crear institución</h2>
        <label className={ui.etiqueta}>
          Nombre
          <input name="nombre" required className={ui.campo} />
        </label>
        <label className={ui.etiqueta}>
          Prefijo de código
          <input name="prefijo_codigo" required placeholder="Ej.: LCP" className={ui.campo} />
        </label>
        <label className={ui.etiqueta}>
          Plan o tamaño (opcional)
          <input name="plan" className={ui.campo} />
        </label>
        <div className="sm:col-span-3">
          <button type="submit" className={ui.botonPrimario}>
            Crear institución
          </button>
        </div>
      </FormularioAccion>

      {error && <p className={ui.avisoRojo}>No se pudieron cargar las instituciones: {error.message}</p>}

      {instituciones?.length ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-700">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Cambiar estado</span>
                </th>
                <th className="px-3 py-2">Asignar administrador</th>
              </tr>
            </thead>
            <tbody>
              {instituciones.map((inst) => (
                <tr key={inst.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">{inst.nombre}</td>
                  <td className="px-3 py-2">{inst.prefijo_codigo}</td>
                  <td className="px-3 py-2">{inst.estado.replace('_', ' ')}</td>
                  <td className="px-3 py-2">{inst.plan ?? 'Sin plan'}</td>
                  <td className="px-3 py-2">
                    <FormularioAccion
                      action={cambiarEstadoInstitucion.bind(
                        null,
                        inst.id,
                        inst.estado === 'activa' ? 'suspendida' : 'activa'
                      )}
                    >
                      <button type="submit" className={ui.botonSecundario}>
                        {inst.estado === 'activa' ? 'Suspender' : 'Activar'}
                      </button>
                    </FormularioAccion>
                  </td>
                  <td className="px-3 py-2">
                    <FormularioAccion
                      action={asignarAdminInstitucion.bind(null, inst.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="correo"
                        type="email"
                        required
                        aria-label={`Correo del administrador de ${inst.nombre}`}
                        placeholder="correo@ejemplo.com"
                        className={`${ui.campo} w-48`}
                      />
                      <button type="submit" className={ui.botonSecundario}>
                        Asignar
                      </button>
                    </FormularioAccion>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && <p className={ui.textoSecundario}>Todavía no hay instituciones creadas.</p>
      )}
    </main>
  )
}
