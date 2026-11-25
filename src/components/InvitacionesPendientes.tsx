import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { aceptarInvitacion, rechazarInvitacion } from '@/app/actions'
import FormularioAccion from '@/components/FormularioAccion'
import { ROLES_INVITACION, ROLES_PERSONAL, rolDeInvitacion } from '@/lib/membresias'
import { iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

// Aviso para quien fue invitado al personal de una institución. El rol solo se activa cuando la
// persona acepta; mientras tanto la institución no ve sus datos.
export default async function InvitacionesPendientes() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('membresias')
    .select('id, rol, instituciones(nombre)')
    .eq('persona_id', user.id)
    .in('rol', ROLES_INVITACION)
  if (!data?.length) return null

  return (
    <div className="flex flex-col gap-3">
      {data.map((inv) => {
        const rol = rolDeInvitacion(inv.rol)
        const institucion = inv.instituciones?.nombre ?? 'una institución'
        return (
          <div key={inv.id} role="status" className={`${ui.avisoInfo} flex flex-col gap-3 sm:flex-row sm:items-center`}>
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <UserPlus {...iconoGrande} className="mt-0.5 shrink-0 text-primario" />
              <p className="min-w-0">
                Te invitaron a ser <strong>{rol ? ROLES_PERSONAL[rol] : 'parte del personal'}</strong> de{' '}
                <strong>{institucion}</strong> en Colectia. Si aceptas, el colegio podrá ver tu nombre,
                correo y teléfono.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <FormularioAccion action={rechazarInvitacion.bind(null, inv.id)}>
                <button type="submit" className={ui.botonSecundario}>
                  Rechazar
                </button>
              </FormularioAccion>
              <FormularioAccion action={aceptarInvitacion.bind(null, inv.id)}>
                <button type="submit" className={ui.botonPrimario}>
                  Aceptar
                </button>
              </FormularioAccion>
            </div>
          </div>
        )
      })}
    </div>
  )
}
