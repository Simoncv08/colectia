import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { crearEvento } from './actions'
import CamposEvento from './CamposEvento'
import Ventana from '@/components/Ventana'
import { estadoEvento, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { ui } from '@/lib/ui'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import FormularioAccion from '@/components/FormularioAccion'
import { ChevronRight, Plus } from 'lucide-react'
import { icono, iconoGrande } from '@/lib/iconos'

type Evento = {
  id: string
  nombre: string
  created_at: string
  fecha_limite_pago: string | null
  fecha_evento: string | null
  finalizado_en: string | null
}

export const metadata = { title: 'Eventos' }

export default async function EventosPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion
  const institucionActiva = sesion.institucion.estado === 'activa'

  const { data: eventosCrudos, error } = await supabase
    .from('eventos')
    .select('id, nombre, created_at, fecha_limite_pago, fecha_evento, finalizado_en')
    .eq('institucion_id', institucionId)
    .order('created_at', { ascending: false })

  const hoy = hoyColombia()
  const eventos = ((eventosCrudos ?? []) as Evento[]).map((ev) => ({
    ...ev,
    estado: estadoEvento(ev, hoy),
  }))
  const vigentes = eventos.filter((ev) => ev.estado !== 'finalizado')
  const finalizados = eventos.filter((ev) => ev.estado === 'finalizado')

  function tarjeta(ev: (typeof eventos)[number]) {
    return (
      <li
        key={ev.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-xs"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{ev.nombre}</p>
            <EtiquetaEstado estado={ev.estado} />
          </div>
          {(ev.fecha_limite_pago || ev.fecha_evento) && (
            <p className="mt-0.5 text-[13px] text-gray-600">
              {ev.fecha_limite_pago && `Pago hasta el ${formatearFecha(ev.fecha_limite_pago)}`}
              {ev.fecha_limite_pago && ev.fecha_evento && ' · '}
              {ev.fecha_evento && `Se realiza el ${formatearFecha(ev.fecha_evento)}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/institucion/eventos/${ev.id}`} className={ui.botonSecundario}>
            Configurar
          </Link>
          <Link href={`/institucion/eventos/${ev.id}/pagos`} className={ui.botonSecundario}>
            Ver pagos
          </Link>
        </div>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Eventos</h1>
          <p className={ui.textoSecundario}>{vigentes.length} evento(s) vigente(s)</p>
        </div>
        {institucionActiva ? (
          <Ventana textoBoton={
              <>
                <Plus {...iconoGrande} />
                Crear evento
              </>
            } titulo="Crear evento" tamano="lg">
            <FormularioAccion
              action={crearEvento}
              className="flex flex-col gap-4"
            >
              <CamposEvento institucionId={institucionId} />
              <p className={ui.ayuda}>
                Después de crearlo, entra a <strong>Configurar</strong> para elegir a qué cursos va
                dirigido y agregar sus productos.
              </p>
              <button type="submit" className={`${ui.botonPrimario} self-start`}>
                Crear evento
              </button>
            </FormularioAccion>
          </Ventana>
        ) : (
          <p className={ui.avisoAmbar}>Tu institución no está activa, así que no puedes crear eventos.</p>
        )}
      </div>

      {error && <p className={ui.avisoRojo}>No se pudieron cargar los eventos. Recarga la página para intentar de nuevo.</p>}

      {vigentes.length ? (
        <ul className="flex flex-col gap-2">
          {vigentes.map(tarjeta)}
        </ul>
      ) : (
        <p className={ui.textoSecundario}>
          {eventos.length ? 'No hay eventos vigentes.' : 'Todavía no hay eventos.'}
        </p>
      )}

      {finalizados.length > 0 && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-800">
            <ChevronRight {...icono} className="transition-transform duration-200 group-open:rotate-90" />
            Eventos finalizados ({finalizados.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {finalizados.map(tarjeta)}
          </ul>
        </details>
      )}
    </div>
  )
}
