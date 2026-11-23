import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { eliminarMiembro, invitarMiembro } from './actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import Ventana from '@/components/Ventana'
import { ui } from '@/lib/ui'
import { nombrePersona } from '@/lib/formato'
import FormularioAccion from '@/components/FormularioAccion'
import { Plus } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'

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

  const miembros = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Personal</h1>
          <p className={ui.textoSecundario}>
            Las personas que pueden registrar pagos y administrar la institución.
          </p>
        </div>
        <div className={ui.accionesPagina}>
          <Ventana textoBoton={
                <>
                  <Plus {...iconoGrande} />
                  Invitar persona
                </>
              } titulo="Invitar persona al personal">
            <FormularioAccion action={invitarMiembro} className="flex flex-col gap-4">
              <label className={ui.etiqueta}>
                Correo con el que entra a Colectia
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
                La persona debe haber entrado una vez a Colectia y confirmado su correo. Si ya está
                en el personal con otro rol, se le cambia el rol.
              </p>
              <button type="submit" className={`${ui.botonPrimario} self-start`}>
                Invitar
              </button>
            </FormularioAccion>
          </Ventana>
        </div>
      </div>

      <ul className={`${ui.tarjeta} divide-y divide-gray-100 p-0`}>
        {miembros.map((m) => {
          const nombre = nombrePersona(m.personas)
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {nombre}
                  {m.persona_id === sesion.userId && (
                    <span className="ml-2 text-xs font-normal text-gray-600">(tú)</span>
                  )}
                </p>
                {m.personas?.correo && nombre !== m.personas.correo && (
                  <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{m.personas.correo}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span
                  className={`${ui.pildora} ${
                    m.rol === 'admin_institucion'
                      ? 'bg-primario-suave text-primario'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.rol === 'admin_institucion' ? 'Administrador' : 'Recaudador'}
                </span>
                {m.persona_id !== sesion.userId && (
                  <FormularioAccion action={eliminarMiembro.bind(null, m.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`¿Quitar a ${nombre} del personal de la institución?`}
                      className={ui.botonQuitar}
                    >
                      Quitar
                    </ConfirmSubmitButton>
                  </FormularioAccion>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
