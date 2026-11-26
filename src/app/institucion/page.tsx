import Link from 'next/link'
import { Banknote, CalendarPlus, ListChecks } from 'lucide-react'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { leerFiltros, resumenPorEvento } from '@/lib/reportes'
import { cargarDatosReporte } from '@/lib/reportesDatos'
import { pesos } from '@/lib/formato'
import { formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import TarjetaDato from '@/components/TarjetaDato'
import BarraAvance from '@/components/BarraAvance'

export const metadata = { title: 'Inicio' }

export default async function InicioInstitucionPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null

  const datos = await cargarDatosReporte(sesion.supabase, sesion.institucionId)
  const activos = resumenPorEvento(datos, leerFiltros({})).filter((x) => x.evento.estado !== 'finalizado')

  const hoy = hoyColombia()
  const totalRecaudado = activos.reduce((s, x) => s + x.recaudado, 0)
  const conPago = activos.reduce((s, x) => s + x.pagaron, 0)
  const dirigidos = activos.reduce((s, x) => s + x.estudiantes, 0)
  const pagosHoy = new Set(datos.pagos.filter((p) => p.fecha === hoy).map((p) => p.grupo_pago_id)).size
  const totalDevueltas = activos.reduce((s, x) => s + x.valorDevueltasPendientes, 0)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Inicio</h1>
          <p className={ui.textoSecundario}>Cómo va el recaudo de los eventos abiertos.</p>
        </div>
        <div className={ui.accionesPagina}>
          <Link href="/institucion/eventos" className={ui.botonSecundario}>
            <Banknote {...iconoGrande} />
            Registrar pago en efectivo
          </Link>
          <Link href="/institucion/eventos" className={ui.botonPrimario}>
            <CalendarPlus {...iconoGrande} />
            Crear evento
          </Link>
        </div>
      </div>

      {datos.errores.length > 0 && (
        <p className={ui.avisoRojo}>No se pudo cargar toda la información. Recarga la página para intentar de nuevo.</p>
      )}

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato titulo="Total recaudado" valor={pesos(totalRecaudado)} nota="En los eventos abiertos" ancho />
        <TarjetaDato titulo="Eventos abiertos" valor={activos.length} />
        <TarjetaDato titulo="Pagos en efectivo de hoy" valor={pagosHoy} />
        <TarjetaDato titulo="Estudiantes con pago" valor={conPago} nota={`de ${dirigidos}`} ancho />
      </section>

      {totalDevueltas > 0 && (
        <p className={ui.avisoAmbar}>Hay devueltas por entregar por {pesos(totalDevueltas)} en total.</p>
      )}

      <section aria-labelledby="titulo-activos" className="flex flex-col gap-4">
        <h2 id="titulo-activos" className={ui.subtitulo}>
          Eventos abiertos
        </h2>

        {activos.length === 0 && (
          <div className={`${ui.tarjeta} flex flex-col items-center gap-3 text-center`}>
            <ListChecks {...iconoGrande} className="text-gray-500" />
            <p className={ui.textoSecundario}>
              No hay eventos abiertos. Cuando crees uno, aparecerá aquí con su recaudo y su avance.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {activos.map((x) => (
            <article key={x.evento.id} className={`${ui.tarjeta} flex flex-col gap-4`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{x.evento.nombre}</h3>
                  <EtiquetaEstado estado={x.evento.estado} />
                </div>
                {(x.evento.fecha_limite_pago || x.evento.fecha_evento) && (
                  <p className="mt-1 text-[13px] text-gray-600">
                    {x.evento.fecha_limite_pago && `Pago hasta el ${formatearFecha(x.evento.fecha_limite_pago)}`}
                    {x.evento.fecha_limite_pago && x.evento.fecha_evento && ' · '}
                    {x.evento.fecha_evento && `Se realiza el ${formatearFecha(x.evento.fecha_evento)}`}
                  </p>
                )}
              </div>

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-gray-600">Recaudado</p>
                  <p className="text-2xl font-bold text-gray-900">{pesos(x.recaudado)}</p>
                </div>
                <p className="text-right text-sm text-gray-600">
                  <span className={`${ui.monto} text-gray-900`}>{x.pagaron}</span> de {x.estudiantes} con pago
                </p>
              </div>

              <BarraAvance porcentaje={x.porcentaje} />

              {x.devueltasPendientes > 0 && (
                <p className="text-sm text-alerta">
                  {x.devueltasPendientes} devuelta(s) por entregar por {pesos(x.valorDevueltasPendientes)}
                </p>
              )}

              <div className="mt-auto grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Link href={`/institucion/eventos/${x.evento.id}/pagos`} className={ui.botonSecundario}>
                  Ver pagos
                </Link>
                <Link href={`/institucion/eventos/${x.evento.id}/pagos/rapido`} className={ui.botonSecundario}>
                  Cobro por salón
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
