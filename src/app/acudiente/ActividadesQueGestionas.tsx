import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import { formatearFecha, type EstadoEvento } from '@/lib/estadoEvento'
import { pesos } from '@/lib/formato'
import { ROLES_PERSONAL } from '@/lib/membresias'
import type { PersonalEn } from '@/lib/sesionAcudiente'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

type EventoGestion = {
  id: string
  nombre: string
  institucion_id: string
  fecha_limite_pago: string | null
  estado: EstadoEvento
  productos: { precio_unitario: number }[] | null
}

// Eventos del colegio donde la cuenta es personal y que no van dirigidos a sus estudiantes.
// Aquí solo se muestran; se manejan en el panel del colegio.
export default function ActividadesQueGestionas({
  eventos,
  personal,
}: {
  eventos: EventoGestion[]
  personal: PersonalEn[]
}) {
  const rolPorInstitucion = new Map(personal.map((p) => [p.institucionId, p.rol]))

  return (
    <section aria-labelledby="titulo-gestion" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="titulo-gestion" className={ui.subtitulo}>
            Actividades que gestionas
          </h2>
          <span className={`${ui.pildora} ${ui.estadoNeutro}`}>Solo informativo</span>
        </div>
        <p className={ui.textoSecundario}>
          Las ves porque eres{' '}
          {personal.map((p) => `${ROLES_PERSONAL[p.rol]} de ${p.institucion}`).join(' y ')}, no porque sean de
          tus estudiantes.
        </p>
      </div>

      {eventos.length ? (
        <ul className={`${ui.tarjeta} divide-y divide-gray-200 p-0`}>
          {eventos.map((ev) => {
            const precios = (ev.productos ?? []).map((p) => Number(p.precio_unitario))
            return (
              <li key={ev.id}>
                <Link
                  href={
                    // El recaudador trabaja en los pagos; el administrador, en la configuración.
                    rolPorInstitucion.get(ev.institucion_id) === 'recaudador'
                      ? `/admin/eventos/${ev.id}/pagos`
                      : `/admin/eventos/${ev.id}`
                  }
                  className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-gray-50 sm:px-5"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold text-gray-900">{ev.nombre}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gray-600">
                      <EtiquetaEstado estado={ev.estado} />
                      {ev.fecha_limite_pago && <span>Pago hasta el {formatearFecha(ev.fecha_limite_pago)}</span>}
                      {precios.length > 0 && (
                        <span>
                          {precios.length > 1 ? 'Desde ' : ''}
                          {pesos(Math.min(...precios))}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight {...icono} className="shrink-0 text-gray-500" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={ui.textoSecundario}>No hay actividades vigentes en el colegio.</p>
      )}
    </section>
  )
}
