import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { ui } from '@/lib/ui'
import BarraAvance from '@/components/BarraAvance'
import BotonDescargarExcel from './BotonDescargarExcel'
import { formatearFecha } from '@/lib/estadoEvento'
import { SIN_CURSO, nombreCurso, pesos } from '@/lib/formato'
import TarjetaDato from '@/components/TarjetaDato'
import FiltrosActivos from '@/components/FiltrosActivos'
import { ChevronRight } from 'lucide-react'
import { icono } from '@/lib/iconos'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import {
  cargarDatosReporte,
  cursosDisponibles,
  filtrosAParametros,
  leerFiltros,
  pagosFiltrados,
  pendientesDePago,
  recaudoPorPersona,
  resumenPorEvento,
  type FilaEvento,
  type FilaPendiente,
  type Vista,
} from '@/lib/reportes'

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const VISTAS: { valor: Vista; etiqueta: string; descripcion: string }[] = [
  {
    valor: 'eventos',
    etiqueta: 'Resumen por evento',
    descripcion: 'Cuánto se ha recaudado en cada evento, cuántos pagaron y cuántos faltan.',
  },
  {
    valor: 'recaudo',
    etiqueta: 'Recaudo por persona',
    descripcion:
      'Cuánto dinero en efectivo recibió cada persona del personal, y en qué días (para cuadrar caja).',
  },
  {
    valor: 'pendientes',
    etiqueta: 'Quién no ha pagado',
    descripcion: 'Estudiantes que todavía no tienen ningún pago en el evento, por curso.',
  },
]


export const metadata = { title: 'Reportes' }

export default async function ReportesPage({ searchParams }: Params) {
  const f = leerFiltros(await searchParams)
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion

  if (!sesion.esAdmin) {
    return (
      <p className={ui.textoSecundario}>
        Solo el administrador de la institución puede ver los reportes.
      </p>
    )
  }

  const datos = await cargarDatosReporte(supabase, institucionId)
  const cursos = cursosDisponibles(datos)
  const personal = Array.from(datos.personalPorId.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], 'es')
  )
  const usaDineroFiltros = f.vista !== 'pendientes'
  const vistaActual = VISTAS.find((v) => v.valor === f.vista)!
  const quitar = (campo: keyof typeof f) => `/institucion/reportes?${filtrosAParametros(f, { [campo]: '' })}`
  const nombreEvento = datos.eventos.find((e) => e.id === f.evento)?.nombre
  const filtrosActivos = [
    ...(f.evento ? [{ etiqueta: `Evento: ${nombreEvento ?? 'elegido'}`, hrefQuitar: quitar('evento') }] : []),
    ...(f.curso
      ? [{ etiqueta: `Curso: ${nombreCurso(f.curso === SIN_CURSO ? '' : f.curso)}`, hrefQuitar: quitar('curso') }]
      : []),
    ...(usaDineroFiltros && f.desde ? [{ etiqueta: `Desde ${formatearFecha(f.desde)}`, hrefQuitar: quitar('desde') }] : []),
    ...(usaDineroFiltros && f.hasta ? [{ etiqueta: `Hasta ${formatearFecha(f.hasta)}`, hrefQuitar: quitar('hasta') }] : []),
    ...(usaDineroFiltros && f.persona
      ? [{ etiqueta: `Recibió: ${datos.personalPorId.get(f.persona) ?? 'otra persona'}`, hrefQuitar: quitar('persona') }]
      : []),
  ]

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className={ui.titulo}>Reportes</h1>
        <BotonDescargarExcel parametros={filtrosAParametros(f, { vista: f.vista })} />
      </div>

      <nav aria-label="Tipo de reporte" className={`${ui.pestanas} mb-4`}>
        {VISTAS.map((v) => (
          <Link
            key={v.valor}
            href={`/institucion/reportes?${filtrosAParametros(f, { vista: v.valor })}`}
            aria-current={f.vista === v.valor ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-4 text-sm ${
              f.vista === v.valor
                ? 'border-primario font-semibold text-primario'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            {v.etiqueta}
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-sm text-gray-700">{vistaActual.descripcion}</p>

      <form method="get" className={`${ui.tarjeta} ${ui.filtros} mb-6 md:p-4`}>
        {f.vista !== 'eventos' && <input type="hidden" name="vista" value={f.vista} />}
        <label className={`${ui.etiqueta} col-span-2`}>
          Evento
          <select
            name="evento"
            defaultValue={f.evento}
            className={ui.campoCompacto}
          >
            <option value="">
              {f.vista === 'pendientes' ? 'Todos los eventos vigentes' : 'Todos los eventos'}
            </option>
            {datos.eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.estado === 'finalizado' ? ' (finalizado)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.etiqueta}>
          Curso
          <select
            name="curso"
            defaultValue={f.curso}
            className={ui.campoCompacto}
          >
            <option value="">Todos</option>
            {cursos.map((c) => (
              <option key={c || SIN_CURSO} value={c || SIN_CURSO}>
                {nombreCurso(c)}
              </option>
            ))}
          </select>
        </label>
        {usaDineroFiltros && (
          <>
            <label className={ui.etiqueta}>
              Pagos desde
              <input
                type="date"
                name="desde"
                defaultValue={f.desde}
                className={ui.campoCompacto}
              />
            </label>
            <label className={ui.etiqueta}>
              hasta
              <input
                type="date"
                name="hasta"
                defaultValue={f.hasta}
                className={ui.campoCompacto}
              />
            </label>
            <label className={ui.etiqueta}>
              Recibió
              <select
                name="persona"
                defaultValue={f.persona}
                className={ui.campoCompacto}
              >
                <option value="">Todo el personal</option>
                {personal.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button
          type="submit"
          className={`${ui.botonPrimario} col-span-2 sm:min-h-9`}
        >
          Aplicar filtros
        </button>
      </form>

      {filtrosActivos.length > 0 && (
        <div className="-mt-3 mb-6">
          <FiltrosActivos
            filtros={filtrosActivos}
            hrefLimpiar={`/institucion/reportes${f.vista !== 'eventos' ? `?vista=${f.vista}` : ''}`}
          />
        </div>
      )}

      {datos.errores.length > 0 && (
        <p className={`${ui.avisoRojo} mb-4`}>
          No se pudo cargar toda la información. Recarga la página para intentar de nuevo.
        </p>
      )}

      {f.vista === 'eventos' && <VistaEventos datos={datos} f={f} />}
      {f.vista === 'recaudo' && <VistaRecaudo datos={datos} f={f} />}
      {f.vista === 'pendientes' && <VistaPendientes filas={pendientesDePago(datos, f)} />}
    </div>
  )
}

type PropsVista = {
  datos: Awaited<ReturnType<typeof cargarDatosReporte>>
  f: ReturnType<typeof leerFiltros>
}

function VistaEventos({ datos, f }: PropsVista) {
  const filas = resumenPorEvento(datos, f)
  const totalRecaudado = filas.reduce((s, x) => s + x.recaudado, 0)
  const totalPagos = filas.reduce((s, x) => s + x.pagos, 0)
  const totalDevueltas = filas.reduce((s, x) => s + x.valorDevueltasPendientes, 0)
  const filtroDinero = Boolean(f.desde || f.hasta || f.persona)

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaDato
          titulo="Total recaudado"
          valor={pesos(totalRecaudado)}
          nota={filtroDinero ? 'según las fechas / persona elegidas' : undefined}
        />
        <TarjetaDato titulo="Pagos registrados" valor={String(totalPagos)} />
        <TarjetaDato titulo="Devueltas pendientes" valor={pesos(totalDevueltas)} />
      </section>

      {filtroDinero && (
        <p className="mb-4 text-xs text-gray-600">
          Nota: &quot;pagaron&quot; y &quot;faltan&quot; siempre cuentan todos los pagos del
          evento; los filtros de fechas y de quién recibió solo cambian los valores en dinero.
        </p>
      )}

      {!filas.length && <p className="text-gray-700">No hay eventos.</p>}

      <ul className="flex flex-col gap-3">
        {filas.map((x) => {
          return (
            <li key={x.evento.id} className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/institucion/eventos/${x.evento.id}/pagos`}
                  className={ui.enlace}
                >
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

              {x.cursos.length > 0 && (
                <details className="group mt-3" open={Boolean(f.evento)}>
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primario">
                    <ChevronRight {...icono} className="transition-transform duration-200 group-open:rotate-90" />
                    Ver por curso
                  </summary>
                  <PorCurso cursos={x.cursos} />
                </details>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

// Barras horizontales del porcentaje con pago por curso, con su número escrito al lado (DESIGN.md 7.7).
function PorCurso({ cursos }: { cursos: FilaEvento['cursos'] }) {
  return (
    <table className="mt-2 w-full text-left text-sm">
      <thead className="text-[13px] text-gray-600">
        <tr>
          <th scope="col" className="py-2 pr-3 font-medium">Curso</th>
          <th scope="col" className="w-1/2 py-2 pr-3 font-medium">Estudiantes con pago</th>
          <th scope="col" className="py-2 text-right font-medium">Recaudado</th>
        </tr>
      </thead>
      <tbody>
        {cursos.map((c) => {
          const porcentaje = c.estudiantes ? Math.round((c.pagaron / c.estudiantes) * 100) : 0
          return (
            <tr
              key={c.curso || SIN_CURSO}
              title={`${nombreCurso(c.curso)}: ${c.pagaron} de ${c.estudiantes} con pago (${porcentaje}%)`}
              className="border-t border-gray-200 hover:bg-gray-50"
            >
              <td className="py-2 pr-3 font-medium text-gray-900">{nombreCurso(c.curso)}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                    <div className="h-full rounded bg-primario" style={{ width: `${porcentaje}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-gray-700">
                    {c.pagaron} de {c.estudiantes} <span className="text-gray-600">({porcentaje}%)</span>
                  </span>
                </div>
              </td>
              <td className={`py-2 text-right ${ui.monto}`}>{pesos(c.recaudado)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function VistaRecaudo({ datos, f }: PropsVista) {
  const filas = recaudoPorPersona(datos, f)
  const pagos = pagosFiltrados(datos, f)
  const total = pagos.reduce((s, p) => s + p.monto, 0)

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TarjetaDato titulo="Total recibido en efectivo" valor={pesos(total)} />
        <TarjetaDato
          titulo="Pagos registrados"
          valor={String(new Set(pagos.map((p) => p.grupo_pago_id)).size)}
        />
      </section>

      {!filas.length && <p className="text-gray-700">No hay pagos con estos filtros.</p>}

      <ul className="flex flex-col gap-3">
        {filas.map((x) => (
          <li key={x.personaId || 'sin'} className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xs">
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
            <details className="group mt-2">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primario">
                <ChevronRight {...icono} className="transition-transform duration-200 group-open:rotate-90" />
                Ver por día
              </summary>
              <table className="mt-2 w-full text-left text-sm">
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
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-600">
        El Excel de esta pestaña incluye además el detalle de cada pago (fecha, hora, estudiante,
        producto, valor y quién lo recibió).
      </p>
    </>
  )
}

function VistaPendientes({ filas }: { filas: FilaPendiente[] }) {
  if (!filas.length) {
    return <p className="text-gray-700">Nadie tiene pagos pendientes con estos filtros.</p>
  }

  // Las filas ya vienen ordenadas por evento, curso y apellido.
  const porEvento: { evento: FilaPendiente['evento']; cursos: Map<string, FilaPendiente[]> }[] = []
  for (const fila of filas) {
    let grupo = porEvento[porEvento.length - 1]
    if (!grupo || grupo.evento.id !== fila.evento.id) {
      grupo = { evento: fila.evento, cursos: new Map() }
      porEvento.push(grupo)
    }
    const lista = grupo.cursos.get(fila.curso) ?? []
    lista.push(fila)
    grupo.cursos.set(fila.curso, lista)
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-700">
        <span className="font-semibold">{filas.length}</span> pendiente(s) de pago.
      </p>
      {porEvento.map((g) => (
        <section key={g.evento.id} className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {g.evento.nombre}{' '}
              <span className="font-normal text-gray-600">
                ({Array.from(g.cursos.values()).reduce((s, l) => s + l.length, 0)})
              </span>
            </p>
            {g.evento.estado !== 'finalizado' && (
              <Link href={`/institucion/eventos/${g.evento.id}/pagos/rapido`} className={ui.botonCompacto}>
                Cobro por salón
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {Array.from(g.cursos.entries()).map(([curso, lista]) => (
              <div key={curso || SIN_CURSO}>
                <p className="mb-1 border-b border-gray-100 text-sm font-semibold">
                  {nombreCurso(curso)} <span className="font-normal text-gray-600">({lista.length})</span>
                </p>
                <ul className="columns-1 text-sm sm:columns-2">
                  {lista.map((x) => (
                    <li key={x.estudiante.id} className="py-0.5">
                      {x.estudiante.apellidos} {x.estudiante.nombres}{' '}
                      <span className="text-xs text-gray-600">{x.estudiante.codigo_institucional}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
