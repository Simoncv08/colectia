import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { cargarDatosReporte, leerFiltros, resumenPorEvento } from '@/lib/reportes'
import { pesos } from '@/lib/formato'
import { formatearFecha } from '@/lib/estadoEvento'
import { ui } from '@/lib/ui'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import BarraAvance from '@/components/BarraAvance'

export const metadata = { title: 'Inicio' }

export default async function InicioInstitucionPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null

  const datos = await cargarDatosReporte(sesion.supabase, sesion.institucionId)
  const activos = resumenPorEvento(datos, leerFiltros({})).filter(
    (x) => x.evento.estado !== 'finalizado'
  )

  const totalRecaudado = activos.reduce((s, x) => s + x.recaudado, 0)
  const totalFaltan = activos.reduce((s, x) => s + x.faltan, 0)
  const totalDevueltas = activos.reduce((s, x) => s + x.valorDevueltasPendientes, 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Inicio</h1>

      {activos.length > 0 && (
        <section aria-labelledby="titulo-resumen" className={ui.resumen}>
          <h2 id="titulo-resumen" className="text-sm font-medium text-white">
            Recaudado en eventos activos
          </h2>
          <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{pesos(totalRecaudado)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/25 pt-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-white">Eventos en curso</dt>
              <dd className="text-lg font-semibold">{activos.length}</dd>
            </div>
            <div>
              <dt className="text-white">Estudiantes por pagar</dt>
              <dd className="text-lg font-semibold">{totalFaltan}</dd>
            </div>
            <div>
              <dt className="text-white">Devueltas por entregar</dt>
              <dd className="text-lg font-semibold">{pesos(totalDevueltas)}</dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Eventos activos</h2>
        <Link href="/institucion/eventos" className={ui.botonSecundario}>
          Ver todos los eventos
        </Link>
      </div>

      {datos.errores.length > 0 && (
        <p className={ui.avisoRojo}>No se pudo cargar toda la información: {datos.errores.join(' · ')}</p>
      )}

      {activos.length === 0 && (
        <div className={`${ui.tarjeta} text-center`}>
          <p className={ui.textoSecundario}>
            No hay eventos activos. Cuando crees uno, aparecerá aquí con su recaudo y su avance.
          </p>
          <Link href="/institucion/eventos" className={`${ui.botonPrimario} mt-4`}>
            Ir a Eventos
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {activos.map((x) => {
          return (
            <article key={x.evento.id} className={`${ui.tarjeta} flex flex-col gap-4`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{x.evento.nombre}</h2>
                  <EtiquetaEstado estado={x.evento.estado} />
                </div>
                {(x.evento.fecha_limite_pago || x.evento.fecha_evento) && (
                  <p className="mt-1 text-sm text-gray-700">
                    {x.evento.fecha_limite_pago && `Pago hasta el ${formatearFecha(x.evento.fecha_limite_pago)}`}
                    {x.evento.fecha_limite_pago && x.evento.fecha_evento && ' · '}
                    {x.evento.fecha_evento && `Se realiza el ${formatearFecha(x.evento.fecha_evento)}`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-600">Recaudado</p>
                  <p className="text-lg font-semibold text-gray-900">{pesos(x.recaudado)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Pagaron</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {x.pagaron}
                    <span className="text-sm font-normal text-gray-600"> de {x.estudiantes}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Faltan</p>
                  <p className={`text-lg font-semibold ${x.faltan ? 'text-amber-800' : 'text-gray-900'}`}>
                    {x.faltan}
                  </p>
                </div>
              </div>

              <BarraAvance porcentaje={x.porcentaje} />

              {x.devueltasPendientes > 0 && (
                <p className="text-sm text-amber-800">
                  {x.devueltasPendientes} devuelta(s) pendiente(s) por {pesos(x.valorDevueltasPendientes)}
                </p>
              )}

              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/institucion/eventos/${x.evento.id}/pagos`} className={ui.botonPrimario}>
                  Pagos
                </Link>
                <Link
                  href={`/institucion/eventos/${x.evento.id}/pagos/rapido`}
                  className={ui.botonSecundario}
                >
                  Cobro por salón
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
