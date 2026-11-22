import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { eliminarPago, marcarDevueltaEntregada } from './actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import { obtenerEstudiantesDirigidos } from '@/lib/estudiantesDirigidos'
import { enTrozos, traerTodasLasFilas } from '@/lib/consultas'
import { ESTADOS, estadoEvento, formatearFecha } from '@/lib/estadoEvento'
import { pesos } from '@/lib/reportes'
import { ui } from '@/lib/ui'

type Params = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sin_pago?: string; devueltas?: string }>
}

type Estudiante = { id: string; nombres: string; apellidos: string; curso_grado: string | null }

type Pago = {
  id: string
  estudiante_id: string
  producto_id: string | null
  cantidad: number
  monto: number
  comprobante: string | null
  registrado_por: string | null
  dinero_recibido: number | null
  devuelta_pendiente: boolean
  grupo_pago_id: string
  pagado_en: string
}

type GrupoPago = {
  grupoPagoId: string
  estudianteId: string
  lineas: Pago[]
  montoTotal: number
  dineroRecibido: number | null
  devueltaPendiente: boolean
  comprobante: string | null
  registradoPor: string | null
  pagadoEn: string
}

export const metadata = { title: 'Pagos del evento' }

export default async function PagosEventoPage({ params, searchParams }: Params) {
  const { id } = await params
  const filtros = await searchParams
  const mostrarSinPago = filtros.sin_pago === '1'
  const soloDevueltas = filtros.devueltas === '1'
  function urlFiltros(cambios: { sin_pago?: boolean; devueltas?: boolean }) {
    const sinPago = cambios.sin_pago ?? mostrarSinPago
    const devueltas = cambios.devueltas ?? soloDevueltas
    const partes = [sinPago && 'sin_pago=1', devueltas && 'devueltas=1'].filter(Boolean)
    return `/institucion/eventos/${id}/pagos${partes.length ? `?${partes.join('&')}` : ''}`
  }

  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion

  const { data: evento } = await supabase
    .from('eventos')
    .select('id, institucion_id, nombre, fecha_limite_pago, fecha_evento, finalizado_en')
    .eq('id', id)
    .eq('institucion_id', institucionId)
    .maybeSingle()

  if (!evento) {
    notFound()
  }

  const [{ data: staffCrudo }, { data: productosCrudos }, estudiantesDirigidos, { data: pagos, error: errorPagos }] =
    await Promise.all([
      supabase
        .from('membresias')
        .select('id, personas(correo, nombres, apellidos)')
        .eq('institucion_id', institucionId)
        .in('rol', ['admin_institucion', 'recaudador']),
      supabase.from('productos').select('id, nombre').eq('evento_id', evento.id),
      obtenerEstudiantesDirigidos(supabase, evento.id, institucionId),
      traerTodasLasFilas<Pago>((desde, hasta) =>
        supabase
          .from('registros_pago')
          .select(
            'id, estudiante_id, producto_id, cantidad, monto, comprobante, registrado_por, dinero_recibido, devuelta_pendiente, grupo_pago_id, pagado_en'
          )
          .eq('evento_id', evento.id)
          .order('pagado_en', { ascending: false })
          .order('id', { ascending: true })
          .range(desde, hasta)
      ),
    ])

  // Un recaudador solo puede leer su propia fila de personal; los demás salen como "otra persona".
  const personal = new Map(
    ((staffCrudo ?? []) as unknown as {
      id: string
      personas: { correo: string | null; nombres: string | null; apellidos: string | null } | null
    }[]).map((s) => [
      s.id,
      [s.personas?.nombres, s.personas?.apellidos].filter(Boolean).join(' ').trim() ||
        s.personas?.correo ||
        'Sin nombre',
    ])
  )
  const productoPorId = new Map((productosCrudos ?? []).map((p) => [p.id, p.nombre]))

  // Quien pagó y luego cambió de curso se sigue mostrando, para no ocultar su pago.
  const idsDirigidos = new Set(estudiantesDirigidos.map((e) => e.id))
  const idsExtra = Array.from(
    new Set(pagos.map((p) => p.estudiante_id).filter((eid) => !idsDirigidos.has(eid)))
  )
  const extra: Estudiante[] = []
  for (const trozo of enTrozos(idsExtra)) {
    const { data } = await supabase
      .from('estudiantes')
      .select('id, nombres, apellidos, curso_grado')
      .in('id', trozo)
    extra.push(...((data ?? []) as Estudiante[]))
  }
  const estudiantes: Estudiante[] = [...estudiantesDirigidos, ...extra]

  const gruposPorId = new Map<string, GrupoPago>()
  for (const p of pagos) {
    let g = gruposPorId.get(p.grupo_pago_id)
    if (!g) {
      g = {
        grupoPagoId: p.grupo_pago_id,
        estudianteId: p.estudiante_id,
        lineas: [],
        montoTotal: 0,
        dineroRecibido: p.dinero_recibido == null ? null : Number(p.dinero_recibido),
        devueltaPendiente: p.devuelta_pendiente,
        comprobante: p.comprobante,
        registradoPor: p.registrado_por,
        pagadoEn: p.pagado_en,
      }
      gruposPorId.set(p.grupo_pago_id, g)
    }
    g.lineas.push(p)
    g.montoTotal += Number(p.monto)
  }
  const gruposPorEstudiante = new Map<string, GrupoPago[]>()
  for (const g of gruposPorId.values()) {
    const lista = gruposPorEstudiante.get(g.estudianteId) ?? []
    lista.push(g)
    gruposPorEstudiante.set(g.estudianteId, lista)
  }

  const devuelta = (g: GrupoPago) =>
    g.dineroRecibido != null ? Math.max(0, g.dineroRecibido - g.montoTotal) : 0
  const totalRecaudado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const devueltasPendientes = Array.from(gruposPorId.values()).filter(
    (g) => g.devueltaPendiente && devuelta(g) > 0
  )
  const pagaronTotal = estudiantes.filter((e) => gruposPorEstudiante.has(e.id)).length

  const porSalon = new Map<string, Estudiante[]>()
  for (const e of estudiantes) {
    const clave = e.curso_grado ?? ''
    porSalon.set(clave, [...(porSalon.get(clave) ?? []), e])
  }
  const salones = Array.from(porSalon.entries())
    .sort(([a], [b]) => {
      if (!a) return 1
      if (!b) return -1
      return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
    })
    .map(([salon, lista]) => {
      const ordenados = [...lista].sort(
        (x, y) =>
          x.apellidos.localeCompare(y.apellidos, 'es', { sensitivity: 'base' }) ||
          x.nombres.localeCompare(y.nombres, 'es', { sensitivity: 'base' })
      )
      const gruposDe = (eid: string) => gruposPorEstudiante.get(eid) ?? []
      const conPago = ordenados.filter((e) => gruposDe(e.id).length > 0)
      const conDevuelta = ordenados.filter((e) =>
        gruposDe(e.id).some((g) => g.devueltaPendiente && devuelta(g) > 0)
      )
      return {
        salon,
        total: ordenados.length,
        pagaron: conPago.length,
        recaudado: conPago.reduce(
          (s, e) => s + gruposDe(e.id).reduce((t, g) => t + g.montoTotal, 0),
          0
        ),
        devueltas: conDevuelta.length,
        estudiantes: soloDevueltas ? conDevuelta : mostrarSinPago ? ordenados : conPago,
      }
    })
    .filter((s) => s.estudiantes.length > 0)

  const estado = estadoEvento(evento)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/institucion/eventos" className={`${ui.enlace} text-sm`}>
            ← Eventos
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className={ui.titulo}>{evento.nombre}</h1>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${ESTADOS[estado].clase}`}>
              {ESTADOS[estado].etiqueta}
            </span>
          </div>
          <p className={ui.textoSecundario}>
            Pagos
            {evento.fecha_limite_pago && ` · pago hasta el ${formatearFecha(evento.fecha_limite_pago)}`}
          </p>
        </div>
        <Link href={`/institucion/eventos/${evento.id}/pagos/rapido`} className={ui.botonPrimario}>
          Cobro por salón
        </Link>
      </div>

      {estado === 'finalizado' && (
        <p className={ui.avisoAmbar}>Este evento ya finalizó; los acudientes ya no lo ven.</p>
      )}
      {errorPagos && <p className={ui.avisoRojo}>No se pudieron cargar los pagos: {errorPagos.message}</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={ui.tarjeta}>
          <p className="text-xs text-gray-600">Recaudado</p>
          <p className="text-xl font-semibold text-gray-900">{pesos(totalRecaudado)}</p>
        </div>
        <div className={ui.tarjeta}>
          <p className="text-xs text-gray-600">Pagaron</p>
          <p className="text-xl font-semibold text-gray-900">
            {pagaronTotal}
            <span className="text-sm font-normal text-gray-600"> de {estudiantes.length}</span>
          </p>
        </div>
        <div className={ui.tarjeta}>
          <p className="text-xs text-gray-600">Faltan</p>
          <p className="text-xl font-semibold text-gray-900">{estudiantes.length - pagaronTotal}</p>
        </div>
        <div className={ui.tarjeta}>
          <p className="text-xs text-gray-600">Devueltas pendientes</p>
          <p
            className={`text-xl font-semibold ${devueltasPendientes.length ? 'text-amber-800' : 'text-gray-900'}`}
          >
            {devueltasPendientes.length
              ? pesos(devueltasPendientes.reduce((s, g) => s + devuelta(g), 0))
              : '0'}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Por salón</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={urlFiltros({ devueltas: !soloDevueltas })}
              scroll={false}
              className={`rounded-full border px-3 py-1 text-sm ${
                soloDevueltas
                  ? 'border-amber-600 bg-amber-100 font-medium text-amber-900'
                  : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              Solo devueltas pendientes ({devueltasPendientes.length})
            </Link>
            {!soloDevueltas && (
              <Link
                href={urlFiltros({ sin_pago: !mostrarSinPago })}
                scroll={false}
                className={`rounded-full border px-3 py-1 text-sm ${
                  mostrarSinPago
                    ? 'border-primario bg-primario-suave font-medium text-primario'
                    : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {mostrarSinPago ? 'Mostrando también quién no ha pagado' : 'Mostrar también quién no ha pagado'}
              </Link>
            )}
          </div>
        </div>

        {!salones.length && (
          <p className={ui.textoSecundario}>
            {!estudiantes.length
              ? 'Este evento todavía no está dirigido a ningún estudiante.'
              : soloDevueltas
                ? 'No hay devueltas pendientes.'
                : 'Todavía nadie ha pagado. Usa "Cobro por salón" para registrar pagos.'}
          </p>
        )}

        {salones.map((s) => (
          <details
            key={s.salon || '__sin__'}
            open={soloDevueltas}
            className="group rounded-xl border border-gray-200 bg-white"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span className="font-semibold text-gray-900">{s.salon || 'Sin curso asignado'}</span>
              <span className="flex items-center gap-3 text-sm text-gray-700">
                <span>
                  pagaron <strong className="text-gray-900">{s.pagaron}</strong> de {s.total}
                </span>
                <span className="font-medium text-gray-900">{pesos(s.recaudado)}</span>
                {s.devueltas > 0 && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                    {s.devueltas} devuelta(s)
                  </span>
                )}
                <span className="inline-block transition group-open:rotate-180">▾</span>
              </span>
            </summary>

            <ul className="divide-y divide-gray-100 border-t border-gray-200">
              {s.estudiantes.map((e) => {
                const todos = gruposPorEstudiante.get(e.id) ?? []
                const visibles = soloDevueltas
                  ? todos.filter((g) => g.devueltaPendiente && devuelta(g) > 0)
                  : todos
                return (
                  <li key={e.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-gray-900">
                        {e.apellidos} {e.nombres}
                      </p>
                      {todos.length ? (
                        <p className="text-sm font-medium text-gray-900">
                          {pesos(todos.reduce((t, g) => t + g.montoTotal, 0))}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">Sin pagos</p>
                      )}
                    </div>
                    {visibles.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-1">
                        {visibles.map((g) => (
                          <li key={g.grupoPagoId} className="text-sm text-gray-700">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                {g.lineas
                                  .map(
                                    (l) =>
                                      `${l.cantidad} × ${(l.producto_id && productoPorId.get(l.producto_id)) || 'Producto eliminado'}`
                                  )
                                  .join(', ')}{' '}
                                · {pesos(g.montoTotal)} ·{' '}
                                {new Date(g.pagadoEn).toLocaleDateString('es-CO', {
                                  timeZone: 'America/Bogota',
                                })}{' '}
                                · recibió{' '}
                                {(g.registradoPor && personal.get(g.registradoPor)) ||
                                  (g.registradoPor ? 'otra persona del personal' : 'sin registrar')}
                                {g.comprobante ? ` · ${g.comprobante}` : ''}
                              </span>
                              <form action={eliminarPago.bind(null, evento.id, g.grupoPagoId)}>
                                <ConfirmSubmitButton
                                  confirmMessage="¿Eliminar este pago (con todos sus productos)? No se puede deshacer."
                                  className={ui.botonQuitar}
                                >
                                  Eliminar
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                            {devuelta(g) > 0 && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                  className={
                                    g.devueltaPendiente ? 'font-medium text-amber-900' : 'text-gray-600'
                                  }
                                >
                                  Recibió {pesos(g.dineroRecibido ?? 0)} · devuelta {pesos(devuelta(g))}
                                  {g.devueltaPendiente ? ' · pendiente por entregar' : ' · ya entregada'}
                                </span>
                                {g.devueltaPendiente && (
                                  <form action={marcarDevueltaEntregada.bind(null, evento.id, g.grupoPagoId)}>
                                    <button
                                      type="submit"
                                      className="rounded border border-amber-400 bg-amber-50 px-2 py-0.5 font-medium text-amber-900 hover:bg-amber-100"
                                    >
                                      Marcar como entregada
                                    </button>
                                  </form>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </details>
        ))}
      </section>
    </div>
  )
}
