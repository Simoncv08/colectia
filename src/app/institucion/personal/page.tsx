import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { eliminarMiembro, invitarMiembro } from '../actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import Ventana from '@/components/Ventana'
import { ui } from '@/lib/ui'

type Miembro = {
  id: string
  persona_id: string
  rol: string
  personas: { correo: string | null; nombres: string | null; apellidos: string | null } | null
}

export const metadata = { title: 'Personal' }

export default async function PersonalPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null

  if (!sesion.esAdmin) {
    return <p className="text-gray-700">Solo el administrador puede ver el personal.</p>
  }

  const { data } = await sesion.supabase
    .from('membresias')
    .select('id, persona_id, rol, personas(correo, nombres, apellidos)')
    .eq('institucion_id', sesion.institucionId)
    .in('rol', ['admin_institucion', 'recaudador'])
    .order('created_at', { ascending: true })

  const miembros = (data ?? []) as unknown as Miembro[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Personal</h1>
          <p className={ui.textoSecundario}>
            Las personas que pueden registrar pagos y administrar la institución.
          </p>
        </div>
        <Ventana textoBoton="+ Invitar persona" titulo="Invitar persona al personal">
          <form action={invitarMiembro.bind(null, sesion.institucionId)} className="flex flex-col gap-4">
            <label className={ui.etiqueta}>
              Correo de Google
              <input name="correo" type="email" required className={ui.campo} />
            </label>
            <label className={ui.etiqueta}>
              Rol
              <select name="rol" required className={ui.campo}>
                <option value="recaudador">Recaudador (registra pagos)</option>
                <option value="admin_institucion">Administrador (puede hacer todo)</option>
              </select>
            </label>
            <p className={ui.ayuda}>
              La persona debe haber iniciado sesión con Google al menos una vez en Colectia antes
              de poder invitarla.
            </p>
            <button type="submit" className={`${ui.botonPrimario} self-start`}>
              Invitar
            </button>
          </form>
        </Ventana>
      </div>

      <ul className={`${ui.tarjeta} divide-y divide-gray-100 p-0`}>
        {miembros.map((m) => {
          const nombre =
            [m.personas?.nombres, m.personas?.apellidos].filter(Boolean).join(' ').trim() ||
            m.personas?.correo ||
            'Sin nombre'
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium text-gray-900">
                  {nombre}
                  {m.persona_id === sesion.userId && (
                    <span className="ml-2 text-xs font-normal text-gray-600">(tú)</span>
                  )}
                </p>
                {m.personas?.correo && nombre !== m.personas.correo && (
                  <p className="text-sm text-gray-600">{m.personas.correo}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    m.rol === 'admin_institucion'
                      ? 'bg-primario-suave text-primario'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.rol === 'admin_institucion' ? 'Administrador' : 'Recaudador'}
                </span>
                {m.persona_id !== sesion.userId && (
                  <form action={eliminarMiembro.bind(null, m.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`¿Quitar a ${nombre} del personal de la institución?`}
                      className={ui.botonQuitar}
                    >
                      Quitar
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
