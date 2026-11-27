import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { formatearFecha } from '@/lib/estadoEvento'
import { pesos } from '@/lib/formato'
import { informeEvento, type RecaudoEsperado } from '@/lib/informeEvento'
import {
  NOTA_FILTROS_DINERO,
  etiquetasFiltros,
  filtraDinero,
  filtrosAParametros,
  filtrosEfectivos,
  hrefInforme,
  leerFiltros,
  resumenEvento,
} from '@/lib/reportes'
import { cargarDatosReporte } from '@/lib/reportesDatos'
import { ui } from '@/lib/ui'
import BarraAvance from '@/components/BarraAvance'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import FiltrosActivos from '@/components/FiltrosActivos'
import { InformePorCurso } from '../../_componentes/InformeBarras'
import TarjetaDato from '@/components/TarjetaDato'
import BotonDescargarExcel from '../../BotonDescargarExcel'
import { Pendientes, PorPersona, PorProducto, RecaudoEnElTiempo, Seccion } from './Secciones'

type Params = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = { title: 'Informe del evento' }

export default async function InformeEventoPage({ params, searchParams }: Params) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null

  if (!sesion.esAdmin) {
    return (
      <p className={ui.textoSecundario}>
        Solo el administrador de la institución puede ver los reportes.
      </p>
    )
  }
  if (!UUID.test(id)) notFound()

  // El evento se busca dentro de la institución de la sesión: si es de otra, no aparece.
  const datos = await cargarDatosReporte(sesion.supabase, sesion.institucionId, { eventoId: id })
  const f = filtrosEfectivos({ ...leerFiltros(sp), vista: 'eventos', evento: id })
  const evento = datos.eventos.find((e) => e.id === id)
  if (!evento) {
    if (datos.errores.length) throw new Error('No se pudo cargar el informe del evento.')
    notFound()
  }

  const { resumen: r, esperado, serie, porPersona, pendientes } = informeEvento(
    datos,
    resumenEvento(datos, evento, f),
    f
  )
  const conFiltroDinero = filtraDinero(f)
  const filtros = etiquetasFiltros(datos, f)
    .filter((x) => x.campo !== 'evento')
    .map((x) => ({ etiqueta: x.etiqueta, hrefQuitar: hrefInforme(id, f, { [x.campo]: '' }) }))
  const conFiltros = filtros.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href={`/admin/reportes?${filtrosAParametros(f, { evento: '' })}`}
          className={`${ui.enlace} self-start text-sm`}
        >
          ← Reportes
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className={`${ui.titulo} [overflow-wrap:anywhere]`}>{evento.nombre}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              <EtiquetaEstado estado={evento.estado} />
              {evento.fecha_limite_pago && <span>Pago hasta el {formatearFecha(evento.fecha_limite_pago)}</span>}
              {evento.fecha_evento && <span>Evento el {formatearFecha(evento.fecha_evento)}</span>}
            </div>
          </div>
          <div className={ui.accionesPagina}>
            <Link href={`/admin/eventos/${id}/pagos`} className={ui.botonSecundario}>
              Ver pagos del evento
            </Link>
            <BotonDescargarExcel parametros={filtrosAParametros(f)} />
          </div>
        </div>
        {conFiltros && (
          <FiltrosActivos
            filtros={filtros}
            hrefLimpiar={hrefInforme(id, f, { curso: '', desde: '', hasta: '', persona: '' })}
          />
        )}
      </div>

      {datos.errores.length > 0 && (
        <p className={ui.avisoRojo}>
          No se pudo cargar toda la información. Recarga la página para intentar de nuevo.
        </p>
      )}

      <section aria-label="Indicadores" className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TarjetaDato
            titulo="Recaudado"
            valor={pesos(r.recaudado)}
            nota={
              r.recaudado
                ? `Promedio de ${pesos(r.promedioPorEstudiante)} por estudiante que pagó`
                : conFiltros
                  ? 'No hay pagos con estos filtros'
                  : 'Todavía no hay pagos'
            }
            ancho
          />
          <TarjetaDato
            titulo="Estudiantes con pago"
            valor={`${r.pagaron} de ${r.estudiantes}`}
            nota={<BarraAvance porcentaje={r.porcentaje} />}
            ancho
          />
          <TarjetaDato titulo="Faltan por pagar" valor={r.faltan} alerta={r.faltan > 0} nota="Sin ningún pago" />
          <TarjetaDato titulo="Pagos registrados" valor={r.pagos} nota="Cada pago puede tener varios productos" />
        </div>
        {conFiltroDinero && <p className="text-xs text-gray-600">{NOTA_FILTROS_DINERO}</p>}
        {r.devueltasPendientes > 0 && (
          <p className={ui.avisoAmbar}>
            Hay {r.devueltasPendientes === 1 ? '1 devuelta' : `${r.devueltasPendientes} devueltas`} por
            entregar por {pesos(r.valorDevueltasPendientes)}.{' '}
            <Link href={`/admin/eventos/${id}/pagos?devueltas=1`} className={ui.enlace}>
              Ver devueltas
            </Link>
          </p>
        )}
      </section>

      {esperado && <Meta esperado={esperado} recaudado={r.recaudado} />}

      <RecaudoEnElTiempo serie={serie} conFiltros={conFiltros} />

      <PorProducto productos={r.productos} />

      <Seccion
        titulo="Por curso"
        descripcion="Cuántos estudiantes de cada curso ya tienen pago y cuánto se ha recaudado en cada uno."
      >
        <div className={ui.tarjeta}>
          {r.cursos.length ? (
            <InformePorCurso cursos={r.cursos} detallado />
          ) : (
            <p className={ui.textoSecundario}>El evento todavía no está dirigido a ningún curso.</p>
          )}
        </div>
      </Seccion>

      <PorPersona filas={porPersona} conFiltros={conFiltros} />

      <Pendientes cursos={pendientes} eventoId={id} cobroAbierto={evento.estado !== 'finalizado'} />
    </div>
  )
}

// Solo existe con un único producto de precio único (ver recaudoEsperado).
function Meta({ esperado, recaudado }: { esperado: RecaudoEsperado; recaudado: number }) {
  return (
    <Seccion
      titulo="Recaudo esperado"
      descripcion={`Si los ${esperado.estudiantes} estudiantes pagan ${esperado.producto} (${pesos(esperado.precio)}), el evento recauda ${pesos(esperado.esperado)}.`}
    >
      <div className={`${ui.tarjeta} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[15px] text-gray-900">
            <span className={ui.monto}>{pesos(recaudado)}</span>{' '}
            <span className="text-gray-600">de {pesos(esperado.esperado)}</span>
          </p>
          <p className={`text-sm font-semibold ${esperado.falta ? 'text-alerta' : 'text-exito'}`}>
            {esperado.falta ? `Faltan ${pesos(esperado.falta)}` : 'Meta cumplida'}
          </p>
        </div>
        <BarraAvance porcentaje={esperado.porcentaje} texto={`${esperado.porcentaje}% del esperado`} />
      </div>
    </Seccion>
  )
}
