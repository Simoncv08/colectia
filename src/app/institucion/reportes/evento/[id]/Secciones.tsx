import type { ReactNode } from 'react'
import Link from 'next/link'
import { formatearFecha } from '@/lib/estadoEvento'
import { pesos } from '@/lib/formato'
import type { SerieRecaudo } from '@/lib/informeEvento'
import type { FilaProducto } from '@/lib/reportes'
import type { CursoPendiente, FilaPersona } from '@/lib/reportesDetalle'
import { ui } from '@/lib/ui'
import GraficaRecaudo from '../../_componentes/GraficaRecaudo'
import InformeBarras from '../../_componentes/InformeBarras'
import InformeDesplegable from '../../_componentes/InformeDesplegable'
import InformePendientes from '../../_componentes/InformePendientes'

// Bloques del informe de un evento, en el mismo orden que la ficha del Excel.

// Si no hay pagos, puede ser porque los filtros los dejan por fuera.
function sinPagos(conFiltros: boolean) {
  return conFiltros ? 'No hay pagos con estos filtros.' : 'Todavía no hay pagos registrados.'
}

export function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className={ui.subtitulo}>{titulo}</h2>
        {descripcion && <p className="text-sm text-gray-600">{descripcion}</p>}
      </div>
      {children}
    </section>
  )
}

export function RecaudoEnElTiempo({ serie, conFiltros }: { serie: SerieRecaudo; conFiltros: boolean }) {
  const { puntos, unidad } = serie
  if (!puntos.length) {
    return (
      <Seccion titulo="Recaudo en el tiempo">
        <p className={`${ui.tarjeta} ${ui.textoSecundario}`}>
          {sinPagos(conFiltros)} Con cada pago, aquí verás cómo va entrando el dinero.
        </p>
      </Seccion>
    )
  }
  const porSemana = unidad === 'semana'
  const conPagos = puntos.filter((p) => p.recaudado > 0)
  return (
    <Seccion
      titulo="Recaudo en el tiempo"
      descripcion={`Lo que entró cada ${porSemana ? 'semana' : 'día'} y el total acumulado, del ${formatearFecha(puntos[0].fecha)} al ${formatearFecha(puntos[puntos.length - 1].fecha)}.`}
    >
      <div className={`${ui.tarjeta} flex flex-col gap-2`}>
        <GraficaRecaudo serie={serie} />
        <InformeDesplegable titulo="Ver como tabla">
          <div className="overflow-x-auto">
            <table className={ui.tabla}>
              <thead className={ui.encabezadoTabla}>
                <tr>
                  <th scope="col">{porSemana ? 'Semana del' : 'Día'}</th>
                  <th scope="col" className="text-right">Pagos</th>
                  <th scope="col" className="text-right">Recaudado</th>
                  <th scope="col" className="text-right">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {conPagos.map((p) => (
                  <tr key={p.fecha} className={ui.filaTabla}>
                    <td className="whitespace-nowrap">{formatearFecha(p.fecha)}</td>
                    <td className="text-right">{p.pagos}</td>
                    <td className={`text-right ${ui.monto}`}>{pesos(p.recaudado)}</td>
                    <td className="text-right">{pesos(p.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InformeDesplegable>
      </div>
    </Seccion>
  )
}

export function PorProducto({ productos }: { productos: FilaProducto[] }) {
  return (
    <Seccion titulo="Por producto" descripcion="Qué se vendió y cuánto aporta cada producto al recaudo.">
      <div className={ui.tarjeta}>
        {productos.length ? (
          <InformeBarras
            encabezados={['Producto', 'Parte del recaudo', 'Recaudado']}
            filas={productos.map((p) => ({
              clave: p.productoId || 'sin-producto',
              nombre: p.nombre,
              subtitulo: [
                p.precio !== null && `${pesos(p.precio)}${p.tipo === 'precio_variable' ? ' c/u' : ''}`,
                `${p.unidades} ${p.unidades === 1 ? 'unidad' : 'unidades'}`,
                `${p.estudiantes} ${p.estudiantes === 1 ? 'estudiante' : 'estudiantes'}`,
              ]
                .filter(Boolean)
                .join(' · '),
              porcentaje: p.porcentaje,
              detalle: `${p.porcentaje}%`,
              valor: pesos(p.recaudado),
              descripcion: `${p.nombre}: ${p.unidades} unidades, ${pesos(p.recaudado)} (${p.porcentaje}% del recaudo)`,
            }))}
          />
        ) : (
          <p className={ui.textoSecundario}>El evento todavía no tiene productos.</p>
        )}
      </div>
    </Seccion>
  )
}

export function PorPersona({ filas, conFiltros }: { filas: FilaPersona[]; conFiltros: boolean }) {
  return (
    <Seccion
      titulo="Quién recibió el dinero"
      descripcion="Dinero que recibió y registró cada persona del personal, para cuadrar caja."
    >
      {filas.length ? (
        <div className={ui.contenedorTabla}>
          <table className={ui.tablaResponsiva}>
            <thead className={ui.encabezadoResponsivo}>
              <tr>
                <th scope="col">Persona</th>
                <th scope="col" className="text-right">Pagos</th>
                <th scope="col" className="text-right">Total recibido</th>
                <th scope="col" className="text-right">Devueltas pendientes</th>
              </tr>
            </thead>
            <tbody className={ui.cuerpoResponsivo}>
              {filas.map((p) => (
                <tr key={p.personaId || 'sin'} className={ui.filaResponsiva}>
                  <td className={ui.celdaTitulo}>{p.nombre}</td>
                  <td data-titulo="Pagos" className={`${ui.celdaResponsiva} sm:text-right`}>
                    {p.pagos}
                  </td>
                  <td data-titulo="Total recibido" className={`${ui.celdaResponsiva} ${ui.monto} sm:text-right`}>
                    {pesos(p.total)}
                  </td>
                  <td
                    data-titulo="Devueltas pendientes"
                    className={`${ui.celdaResponsiva} sm:text-right ${p.devueltasPendientes ? 'text-alerta' : ''}`}
                  >
                    {p.devueltasPendientes
                      ? `${p.devueltasPendientes} (${pesos(p.valorDevueltasPendientes)})`
                      : 'Ninguna'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={`${ui.tarjeta} ${ui.textoSecundario}`}>{sinPagos(conFiltros)}</p>
      )}
    </Seccion>
  )
}

export function Pendientes({
  cursos,
  eventoId,
  cobroAbierto,
}: {
  cursos: CursoPendiente[]
  eventoId: string
  cobroAbierto: boolean
}) {
  const total = cursos.reduce((s, c) => s + c.estudiantes.length, 0)
  return (
    <Seccion titulo={`Quién no ha pagado (${total})`}>
      <div className={`${ui.tarjeta} flex flex-col gap-2`}>
        {total ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={ui.textoSecundario}>
                {total === 1 ? 'Un estudiante' : `${total} estudiantes`} sin ningún pago en este evento.
              </p>
              {cobroAbierto && (
                <Link href={`/admin/eventos/${eventoId}/pagos/rapido`} className={ui.botonCompacto}>
                  Cobro por salón
                </Link>
              )}
            </div>
            <InformeDesplegable titulo="Ver la lista por curso">
              <InformePendientes cursos={cursos} />
            </InformeDesplegable>
          </>
        ) : (
          <p className={ui.textoSecundario}>Todos los estudiantes tienen pago.</p>
        )}
      </div>
    </Seccion>
  )
}
