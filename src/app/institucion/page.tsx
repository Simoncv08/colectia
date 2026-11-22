import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { cargarDatosReporte, leerFiltros, pesos, resumenPorEvento } from '@/lib/reportes'
import { ESTADOS, formatearFecha } from '@/lib/estadoEvento'
import { ui } from '@/lib/ui'
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.titulo}>Eventos activos</h1>
          <p className={ui.textoSecundario}>
            {activos.length
              ? `${activos.length} evento(s) en curso · ${pesos(totalRecaudado)} recaudado · ${totalFaltan} estudiante(s) por pagar`
              : 'No hay eventos activos en este momento.'}
          </p>
        </div>
        <Link href="/institucion/eventos" className={ui.botonSecundario}>
          Ver todos los eventos
        </Link>
      </div>

      {totalDevueltas > 0 && (
        <p className={ui.avisoAmbar}>
          Hay devueltas pendientes por entregar por {pesos(totalDevueltas)} en total.
        </p>
      )}

      {datos.errores.length > 0 && (
        <p className={ui.avisoRojo}>No se pudo cargar toda la información: {datos.errores.join(' · ')}</p>
      )}

      {activos.length === 0 && (
        <div className={`${ui.tarjeta} text-center`}>
          <p className={ui.textoSecundario}>
            Cuando crees un evento aparecerá aquí con su recaudo y su avance.
          </p>
          <Link href="/institucion/eventos" className={`${ui.botonPrimario} mt-4`}>
            Ir a Eventos
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {activos.map((x) => {
          const estado = ESTADOS[x.evento.estado]
          return (
            <article key={x.evento.id} className={`${ui.tarjeta} flex flex-col gap-4`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{x.evento.nombre}</h2>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                    {estado.etiqueta}
                  </span>
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
