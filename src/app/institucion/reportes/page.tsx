import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { ui } from '@/lib/ui'
import BarraAvance from '@/components/BarraAvance'
import BotonDescargarExcel from './BotonDescargarExcel'
import { ESTADOS, formatearFecha } from '@/lib/estadoEvento'
import {
  SIN_CURSO,
  cargarDatosReporte,
  cursosDisponibles,
  filtrosAParametros,
  leerFiltros,
  pagosFiltrados,
  pendientesDePago,
  pesos,
  recaudoPorPersona,
  resumenPorEvento,
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

function nombreCurso(c: string) {
  return c || 'Sin curso asignado'
}

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
  const hayFiltros = Boolean(
    f.evento || f.curso || (usaDineroFiltros && (f.desde || f.hasta || f.persona))
  )
  const vistaActual = VISTAS.find((v) => v.valor === f.vista)!

  return (
    <div className="flex flex-col">
      <h1 className={`${ui.titulo} mb-4`}>Reportes</h1>

      <nav className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
        {VISTAS.map((v) => (
          <Link
            key={v.valor}
            href={`/institucion/reportes?${filtrosAParametros(f, { vista: v.valor })}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              f.vista === v.valor
                ? 'border-primario font-medium text-primario'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            {v.etiqueta}
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-sm text-gray-700">{vistaActual.descripcion}</p>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3">
        {f.vista !== 'eventos' && <input type="hidden" name="vista" value={f.vista} />}
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-800">
          Evento
          <select
            name="evento"
            defaultValue={f.evento}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-primario"
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
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-800">
          Curso
          <select
            name="curso"
            defaultValue={f.curso}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-primario"
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
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-800">
              Pagos desde
              <input
                type="date"
                name="desde"
                defaultValue={f.desde}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-primario"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-800">
              hasta
              <input
                type="date"
                name="hasta"
                defaultValue={f.hasta}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-primario"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-800">
              Recibió
              <select
                name="persona"
                defaultValue={f.persona}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-primario"
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
          className="rounded-lg bg-primario px-3 py-1.5 text-sm font-medium text-white hover:bg-primario-hover"
        >
          Aplicar
        </button>
        {hayFiltros && (
          <Link
            href={`/institucion/reportes${f.vista !== 'eventos' ? `?vista=${f.vista}` : ''}`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
        <BotonDescargarExcel parametros={filtrosAParametros(f, { vista: f.vista })} />
      </form>

      {datos.errores.length > 0 && (
        <p className={`${ui.avisoRojo} mb-4`}>
          No se pudo cargar toda la información: {datos.errores.join(' · ')}
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

function Tarjeta({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-700">{titulo}</p>
      <p className="text-xl font-semibold text-gray-900">{valor}</p>
      {nota && <p className="text-xs text-gray-600">{nota}</p>}
    </div>
  )
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
        <Tarjeta
          titulo="Total recaudado"
          valor={pesos(totalRecaudado)}
          nota={filtroDinero ? 'según las fechas / persona elegidas' : undefined}
        />
        <Tarjeta titulo="Pagos registrados" valor={String(totalPagos)} />
        <Tarjeta titulo="Devueltas pendientes" valor={pesos(totalDevueltas)} />
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
          const estado = ESTADOS[x.evento.estado]
          return (
            <li key={x.evento.id} className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/institucion/eventos/${x.evento.id}/pagos`}
                  className={ui.enlace}
                >
                  {x.evento.nombre}
                </Link>
                <span className={`rounded px-1.5 py-0.5 text-xs ${estado.clase}`}>
                  {estado.etiqueta}
                </span>
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
                  <p className={`font-semibold ${x.faltan ? 'text-amber-700' : ''}`}>{x.faltan}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Devueltas pendientes</p>
                  <p className={`font-semibold ${x.devueltasPendientes ? 'text-amber-700' : ''}`}>
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
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-primario">Ver por curso</summary>
                  <table className="mt-2 w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-gray-600">
                        <th className="py-1">Curso</th>
                        <th className="py-1">Pagaron</th>
                        <th className="py-1">Faltan</th>
                        <th className="py-1 text-right">Recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {x.cursos.map((c) => (
                        <tr key={c.curso || SIN_CURSO} className="border-t border-gray-100">
                          <td className="py-1">{nombreCurso(c.curso)}</td>
                          <td className="py-1">
                            {c.pagaron} de {c.estudiantes}
                          </td>
                          <td className={`py-1 ${c.faltan ? 'text-amber-700' : ''}`}>{c.faltan}</td>
                          <td className="py-1 text-right">{pesos(c.recaudado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function VistaRecaudo({ datos, f }: PropsVista) {
  const filas = recaudoPorPersona(datos, f)
  const pagos = pagosFiltrados(datos, f)
  const total = pagos.reduce((s, p) => s + p.monto, 0)

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Tarjeta titulo="Total recibido en efectivo" valor={pesos(total)} />
        <Tarjeta
          titulo="Pagos registrados"
          valor={String(new Set(pagos.map((p) => p.grupo_pago_id)).size)}
        />
      </section>

      {!filas.length && <p className="text-gray-700">No hay pagos con estos filtros.</p>}

      <ul className="flex flex-col gap-3">
        {filas.map((x) => (
          <li key={x.personaId || 'sin'} className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{x.nombre}</p>
              <p className="text-lg font-semibold">{pesos(x.total)}</p>
            </div>
            <p className="text-sm text-gray-600">
              {x.pagos} pago(s)
              {x.devueltasPendientes > 0 && (
                <span className="text-amber-700">
                  {' '}
                  · debe {x.devueltasPendientes} devuelta(s) por{' '}
                  {pesos(x.valorDevueltasPendientes)}
                </span>
              )}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-primario">Ver por día</summary>
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-gray-600">
                    <th className="py-1">Día</th>
                    <th className="py-1">Pagos</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {x.porDia.map((d) => (
                    <tr key={d.fecha} className="border-t border-gray-100">
                      <td className="py-1">{formatearFecha(d.fecha)}</td>
                      <td className="py-1">{d.pagos}</td>
                      <td className="py-1 text-right">{pesos(d.total)}</td>
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
        <section key={g.evento.id} className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {g.evento.nombre}{' '}
              <span className="font-normal text-gray-600">
                ({Array.from(g.cursos.values()).reduce((s, l) => s + l.length, 0)})
              </span>
            </p>
            {g.evento.estado !== 'finalizado' && (
              <Link
                href={`/institucion/eventos/${g.evento.id}/pagos/rapido`}
                className="rounded-lg bg-primario px-2.5 py-1 text-xs font-medium text-white hover:bg-primario-hover"
              >
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
