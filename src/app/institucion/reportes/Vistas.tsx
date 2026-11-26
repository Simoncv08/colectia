import Link from 'next/link'
import { formatearFecha } from '@/lib/estadoEvento'
import { pesos } from '@/lib/formato'
import {
  NOTA_FILTROS_DINERO,
  contarPagos,
  filtraDinero,
  hrefInforme,
  pagosFiltrados,
  resumenPorEvento,
  sumarMontos,
  type FilaProducto,
  type FiltrosReporte,
} from '@/lib/reportes'
import type { DatosReporte } from '@/lib/reportesDatos'
import { agruparPendientes, pendientesDePago, recaudoPorPersona } from '@/lib/reportesDetalle'
import { ui } from '@/lib/ui'
import BarraAvance from '@/components/BarraAvance'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import { InformePorCurso } from './_componentes/InformeBarras'
import InformeDesplegable from './_componentes/InformeDesplegable'
import InformePendientes from './_componentes/InformePendientes'
import TarjetaDato from '@/components/TarjetaDato'

// Las tres pestañas de reportes.

type PropsVista = { datos: DatosReporte; f: FiltrosReporte }

const tarjeta = 'rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xs sm:p-5'

const PRODUCTOS_EN_TARJETA = 3

// "Camiseta: 12 unidades ($ 360.000) · Gorra: 4 unidades ($ 60.000) · y 2 más"
function lineaProductos(productos: FilaProducto[]) {
  const vendidos = productos.filter((p) => p.unidades > 0)
  const partes = vendidos
    .slice(0, PRODUCTOS_EN_TARJETA)
    .map((p) => `${p.nombre}: ${p.unidades} ${p.unidades === 1 ? 'unidad' : 'unidades'} (${pesos(p.recaudado)})`)
  const resto = vendidos.length - PRODUCTOS_EN_TARJETA
  if (resto > 0) partes.push(`y ${resto} más`)
  return partes.join(' · ')
}

export function VistaEventos({ datos, f }: PropsVista) {
  const filas = resumenPorEvento(datos, f)
  const totalRecaudado = filas.reduce((s, x) => s + x.recaudado, 0)
  const totalPagos = filas.reduce((s, x) => s + x.pagos, 0)
  const totalDevueltas = filas.reduce((s, x) => s + x.valorDevueltasPendientes, 0)
  const conFiltroDinero = filtraDinero(f)

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaDato
          titulo="Total recaudado"
          valor={pesos(totalRecaudado)}
          nota={conFiltroDinero ? 'según las fechas / persona elegidas' : undefined}
        />
        <TarjetaDato titulo="Pagos registrados" valor={String(totalPagos)} />
        <TarjetaDato titulo="Devueltas pendientes" valor={pesos(totalDevueltas)} />
      </section>

      {conFiltroDinero && <p className="mb-4 text-xs text-gray-600">{NOTA_FILTROS_DINERO}</p>}

      {!filas.length && <p className="text-gray-700">No hay eventos.</p>}

      <ul className="flex flex-col gap-3">
        {filas.map((x) => {
          const productos = lineaProductos(x.productos)
          return (
            <li key={x.evento.id} className={tarjeta}>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={hrefInforme(x.evento.id, f)} className={ui.enlace}>
                  {x.evento.nombre}
                </Link>
                <EtiquetaEstado estado={x.evento.estado} />
                {x.evento.fecha_limite_pago && (
                  <span className="text-xs text-gray-600">
                    Pago hasta el {formatearFecha(x.evento.fecha_limite_pago)}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-600">Recaudado</p>
                  <p className="font-semibold">{pesos(x.recaudado)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Pagaron</p>
                  <p className="font-semibold">
                    {x.pagaron} de {x.estudiantes}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Faltan</p>
                  <p className={`font-semibold ${x.faltan ? 'text-alerta' : ''}`}>{x.faltan}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Devueltas pendientes</p>
                  <p className={`font-semibold ${x.devueltasPendientes ? 'text-alerta' : ''}`}>
                    {x.devueltasPendientes
                      ? `${x.devueltasPendientes} (${pesos(x.valorDevueltasPendientes)})`
                      : '0'}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <BarraAvance porcentaje={x.porcentaje} />
              </div>

              {x.recaudado > 0 && (
                <p className="mt-3 text-[13px] text-gray-600">
                  Promedio de {pesos(x.promedioPorEstudiante)} por estudiante que pagó
                  {productos && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="block sm:inline">{productos}</span>
                    </>
                  )}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
                {x.cursos.length > 0 && (
                  <InformeDesplegable
                    titulo="Ver por curso"
                    abierto={Boolean(f.evento)}
                    className="[&[open]]:basis-full"
                  >
                    <InformePorCurso cursos={x.cursos} />
                  </InformeDesplegable>
                )}
                <Link href={hrefInforme(x.evento.id, f)} className={`${ui.enlaceFila} ml-auto text-sm`}>
                  Ver informe completo
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function VistaRecaudo({ datos, f }: PropsVista) {
  const filas = recaudoPorPersona(datos, f)
  const pagos = pagosFiltrados(datos, f)

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TarjetaDato titulo="Total recibido en efectivo" valor={pesos(sumarMontos(pagos))} />
        <TarjetaDato titulo="Pagos registrados" valor={String(contarPagos(pagos))} />
      </section>

      {!filas.length && <p className="text-gray-700">No hay pagos con estos filtros.</p>}

      <ul className="flex flex-col gap-3">
        {filas.map((x) => (
          <li key={x.personaId || 'sin'} className={tarjeta}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{x.nombre}</p>
              <p className="text-lg font-semibold">{pesos(x.total)}</p>
            </div>
            <p className="text-sm text-gray-600">
              {x.pagos} pago(s)
              {x.devueltasPendientes > 0 && (
                <span className="text-alerta">
                  {' '}
                  · debe {x.devueltasPendientes} devuelta(s) por{' '}
                  {pesos(x.valorDevueltasPendientes)}
                </span>
              )}
            </p>
            <InformeDesplegable titulo="Ver por día" className="mt-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-gray-600">
                    <th scope="col" className="py-1">Día</th>
                    <th scope="col" className="py-1">Pagos</th>
                    <th scope="col" className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {x.porDia.map((d) => (
                    <tr key={d.fecha} className="border-t border-gray-200">
                      <td className="py-1">{formatearFecha(d.fecha)}</td>
                      <td className="py-1">{d.pagos}</td>
                      <td className={`py-1 text-right ${ui.monto}`}>{pesos(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </InformeDesplegable>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-600">
        El Excel incluye además el detalle de cada pago (fecha, hora, estudiante, producto, valor y
        quién lo recibió) y una ficha completa por evento.
      </p>
    </>
  )
}

export function VistaPendientes({ datos, f }: PropsVista) {
  const grupos = agruparPendientes(pendientesDePago(datos, f))
  if (!grupos.length) {
    return <p className="text-gray-700">Nadie tiene pagos pendientes con estos filtros.</p>
  }
  const total = grupos.reduce((s, g) => s + g.total, 0)

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-700">
        <span className="font-semibold">{total}</span> pendiente(s) de pago.
      </p>
      {grupos.map((g) => (
        <section key={g.evento.id} className={tarjeta}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {g.evento.nombre} <span className="font-normal text-gray-600">({g.total})</span>
            </p>
            {g.evento.estado !== 'finalizado' && (
              <Link href={`/institucion/eventos/${g.evento.id}/pagos/rapido`} className={ui.botonCompacto}>
                Cobro por salón
              </Link>
            )}
          </div>
          <InformePendientes cursos={g.cursos} />
        </section>
      ))}
    </div>
  )
}
