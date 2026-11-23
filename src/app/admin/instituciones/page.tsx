import { obtenerSesionSuperAdmin } from '@/lib/sesionSuperAdmin'
import { crearInstitucion, cambiarEstadoInstitucion, asignarAdminInstitucion } from './actions'
import { ui } from '@/lib/ui'
import FormularioAccion from '@/components/FormularioAccion'
import EstadoInstitucion from '@/components/EstadoInstitucion'

export const metadata = { title: 'Instituciones' }

export default async function InstitucionesPage() {
  const sesion = await obtenerSesionSuperAdmin()
  if (!sesion) return null
  const { supabase } = sesion

  const { data: instituciones, error } = await supabase
    .from('instituciones')
    .select('id, nombre, prefijo_codigo, estado, plan, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={ui.titulo}>Instituciones</h1>
        <p className={ui.textoSecundario}>Crea colegios, cambia su estado y asigna su primer administrador.</p>
      </div>

      <FormularioAccion action={crearInstitucion} className={`${ui.tarjeta} grid grid-cols-1 gap-4 sm:grid-cols-3`}>
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

      {error && <p className={ui.avisoRojo}>No se pudieron cargar las instituciones. Recarga la página para intentar de nuevo.</p>}

      {instituciones?.length ? (
        <div className={ui.contenedorTabla}>
          <table className={`${ui.tablaResponsiva} sm:min-w-[720px]`}>
            <thead className={ui.encabezadoResponsivo}>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Código</th>
                <th scope="col">Estado</th>
                <th scope="col">Plan</th>
                <th scope="col">
                  <span className="sr-only">Cambiar estado</span>
                </th>
                <th scope="col">Asignar administrador</th>
              </tr>
            </thead>
            <tbody className={ui.cuerpoResponsivo}>
              {instituciones.map((inst) => (
                <tr key={inst.id} className={ui.filaResponsiva}>
                  <td className={ui.celdaTitulo}>{inst.nombre}</td>
                  <td data-titulo="Código" className={ui.celdaResponsiva}>{inst.prefijo_codigo}</td>
                  <td data-titulo="Estado" className={ui.celdaResponsiva}>
                    <EstadoInstitucion estado={inst.estado} />
                  </td>
                  <td data-titulo="Plan" className={ui.celdaResponsiva}>{inst.plan ?? 'Sin plan'}</td>
                  <td data-titulo="Cambiar estado" className={ui.celdaResponsiva}>
                    <FormularioAccion
                      action={cambiarEstadoInstitucion.bind(
                        null,
                        inst.id,
                        inst.estado === 'activa' ? 'suspendida' : 'activa'
                      )}
                    >
                      <button type="submit" className={ui.botonCompacto}>
                        {inst.estado === 'activa' ? 'Suspender' : 'Activar'}
                      </button>
                    </FormularioAccion>
                  </td>
                  <td data-titulo="Asignar administrador" className={ui.celdaBloque}>
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
                        className={`${ui.campoCompacto} w-52`}
                      />
                      <button type="submit" className={ui.botonCompacto}>
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
    </div>
  )
}
