import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Marca from '@/components/Marca'
import CampoSubdominio from '@/components/CampoSubdominio'
import EtiquetaSubdominio from '@/components/EtiquetaSubdominio'
import FormularioAccion from '@/components/FormularioAccion'
import { cerrarSesion } from '@/app/actions'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { crearColegioRegistrado, leerRegistro } from '@/lib/registro'
import { SIN_INDEXAR } from '@/lib/sitio'
import { createClient } from '@/lib/supabase/server'
import { direccionColegio, type EstadoSubdominio } from '@/lib/subdominios'
import { ui } from '@/lib/ui'
import { urlDeZona } from '@/lib/zona'
import { zonaActual } from '@/lib/zonaServidor'
import { cambiarDireccionSolicitada } from './actions'

export const metadata: Metadata = { title: 'Solicitud en revisión', robots: SIN_INDEXAR }

// En www, para quien registró un colegio: crea el colegio con los datos del registro (cuando la
// cuenta ya está confirmada) y muestra la solicitud hasta que se apruebe la dirección.
export default async function SolicitudPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: persona } = await supabase
    .from('personas')
    .select('nombres, apellidos, instituciones(nombre, nit, subdominio, subdominio_estado, subdominio_motivo)')
    .eq('id', user.id)
    .maybeSingle()

  let colegio = persona?.instituciones ?? null
  let error: string | null = null
  if (!colegio) {
    const registro = leerRegistro(user.user_metadata)
    if (!registro) redirect('/sin-colegio')
    const creado = await crearColegioRegistrado(supabase, registro, {
      nombres: persona?.nombres ?? String(user.user_metadata?.nombres ?? ''),
      apellidos: persona?.apellidos ?? String(user.user_metadata?.apellidos ?? ''),
    })
    if (creado.error) {
      error = creado.error.message
    } else {
      const { data } = await supabase.from('instituciones').select('nombre, nit, subdominio, subdominio_estado, subdominio_motivo').eq('id', creado.data).maybeSingle()
      colegio = data
    }
  }

  if (colegio?.subdominio && colegio.subdominio_estado === 'aprobado') {
    const { host } = await zonaActual()
    redirect(urlDeZona(host, colegio.subdominio, '/admin'))
  }

  const estado = (colegio?.subdominio_estado as EstadoSubdominio | null) ?? null

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div className="flex justify-center">
          <Marca tamano="grande" />
        </div>
        <div className={`${ui.tarjeta} flex flex-col gap-4`}>
          {colegio ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={ui.subtitulo}>Solicitud de {colegio.nombre}</h1>
                {estado && <EtiquetaSubdominio estado={estado} />}
              </div>
              <p className={ui.textoSecundario}>
                NIT {colegio.nit}. Dirección solicitada:{' '}
                <span className="font-semibold text-gray-900">
                  {colegio.subdominio ? direccionColegio(colegio.subdominio) : 'sin dirección'}
                </span>
              </p>
              {estado === 'rechazado' ? (
                <p className={ui.avisoAmbar}>No se aprobó esa dirección: {colegio.subdominio_motivo}</p>
              ) : (
                <p className={ui.avisoInfo}>
                  Estamos revisando la dirección. Cuando la aprobemos empieza tu prueba gratis y entras al
                  panel de tu colegio desde esa dirección.
                </p>
              )}
              <FormularioAccion
                action={cambiarDireccionSolicitada}
                vaciarAlTerminar={false}
                className="flex flex-col gap-3"
              >
                <CampoSubdominio
                  etiqueta={estado === 'rechazado' ? 'Propón otra dirección' : 'Cambiar la dirección solicitada'}
                />
                <button type="submit" className={ui.botonSecundario}>
                  Enviar dirección
                </button>
              </FormularioAccion>
            </>
          ) : (
            <>
              <h1 className={ui.subtitulo}>No pudimos crear la solicitud</h1>
              <p className={ui.avisoRojo}>{error}</p>
              <p className={ui.textoSecundario}>
                Escríbenos a{' '}
                <a href={`mailto:${CORREO_CONTACTO}`} className={ui.enlace}>
                  {CORREO_CONTACTO}
                </a>{' '}
                y lo resolvemos.
              </p>
            </>
          )}
          <form action={cerrarSesion}>
            <button type="submit" className={`${ui.botonFantasma} w-full`}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
