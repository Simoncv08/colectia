import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { eliminarPago, marcarDevueltaEntregada } from './actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import TarjetaDato from '@/components/TarjetaDato'
import FormularioAccion from '@/components/FormularioAccion'
import { obtenerEstudiantesDirigidos } from '@/lib/estudiantesDirigidos'
import { enTrozos, traerTodasLasFilas } from '@/lib/consultas'
import { estadoEvento, formatearFecha } from '@/lib/estadoEvento'
import {
  SIN_CURSO,
  compararCursos,
  compararEstudiantes,
  formatearFechaHora,
  nombreCurso,
  pesos,
} from '@/lib/formato'
import { ChevronDown } from 'lucide-react'
import { icono } from '@/lib/iconos'
import EstadoPago from '@/components/EstadoPago'
import { agruparPagos, cargarPersonal, type GrupoPago } from '@/lib/pagos'
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
    return `/admin/eventos/${id}/pagos${partes.length ? `?${partes.join('&')}` : ''}`
  }

  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId, esAdmin } = sesion

  const { data: evento } = await supabase
    .from('eventos')
    .select('id, institucion_id, nombre, fecha_limite_pago, fecha_evento, finalizado_en')
    .eq('id', id)
    .eq('institucion_id', institucionId)
    .maybeSingle()

  if (!evento) {
    notFound()
  }

  const [personal, { data: productosCrudos }, estudiantesDirigidos, { data: pagos, error: errorPagos }] =
    await Promise.all([
      cargarPersonal(supabase, institucionId),
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

  const grupos = agruparPagos(pagos)
  const gruposPorEstudiante = new Map<string, GrupoPago<Pago>[]>()
  for (const g of grupos) {
    gruposPorEstudiante.set(g.estudianteId, [...(gruposPorEstudiante.get(g.estudianteId) ?? []), g])
  }
  const gruposDe = (eid: string) => gruposPorEstudiante.get(eid) ?? []
  const totalDe = (eid: string) => gruposDe(eid).reduce((t, g) => t + g.monto, 0)

  const totalRecaudado = grupos.reduce((s, g) => s + g.monto, 0)
  const devueltasPendientes = grupos.filter((g) => g.devueltaPendiente)
  const pagaronTotal = estudiantes.filter((e) => gruposPorEstudiante.has(e.id)).length

  const porSalon = new Map<string, Estudiante[]>()
  for (const e of estudiantes) {
    const clave = e.curso_grado ?? ''
    porSalon.set(clave, [...(porSalon.get(clave) ?? []), e])
  }
  const salones = Array.from(porSalon.entries())
    .sort(([a], [b]) => compararCursos(a, b))
    .map(([salon, lista]) => {
      const ordenados = [...lista].sort(compararEstudiantes)
      const conPago = ordenados.filter((e) => gruposDe(e.id).length > 0)
      const conDevuelta = ordenados.filter((e) => gruposDe(e.id).some((g) => g.devueltaPendiente))
      return {
        salon,
        total: ordenados.length,
        pagaron: conPago.length,
        recaudado: conPago.reduce((s, e) => s + totalDe(e.id), 0),
        devueltas: conDevuelta.length,
        estudiantes: soloDevueltas ? conDevuelta : mostrarSinPago ? ordenados : conPago,
      }
    })
    .filter((s) => s.estudiantes.length > 0)

  const estado = estadoEvento(evento)
  // Un recaudador no ve los nombres del resto del personal.
  const quienRecibio = (membresiaId: string | null) =>
    membresiaId ? personal.get(membresiaId) ?? 'otra persona del personal' : 'sin registrar'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/eventos" className={`${ui.enlace} text-sm`}>
            ← Eventos
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className={ui.titulo}>{evento.nombre}</h1>
            <EtiquetaEstado estado={estado} />
          </div>
          <p className={ui.textoSecundario}>
            Pagos
            {evento.fecha_limite_pago && ` · pago hasta el ${formatearFecha(evento.fecha_limite_pago)}`}
          </p>
        </div>
        <div className={ui.accionesPagina}>
          <Link href={`/admin/eventos/${evento.id}/pagos/rapido`} className={ui.botonPrimario}>
            Cobro por salón
          </Link>
        </div>
      </div>

      {estado === 'finalizado' && (
        <p className={ui.avisoAmbar}>Este evento ya finalizó; los acudientes ya no lo ven.</p>
      )}
      {errorPagos && <p className={ui.avisoRojo}>No se pudieron cargar los pagos. Recarga la página para intentar de nuevo.</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TarjetaDato titulo="Recaudado" valor={pesos(totalRecaudado)} ancho />
        <TarjetaDato
          titulo="Pagaron"
          valor={
            <>
              {pagaronTotal}
              <span className="text-sm font-normal text-gray-600"> de {estudiantes.length}</span>
            </>
          }
        />
        <TarjetaDato titulo="Faltan" valor={estudiantes.length - pagaronTotal} />
        <TarjetaDato
          titulo="Devueltas pendientes"
          ancho
          alerta={devueltasPendientes.length > 0}
          valor={pesos(devueltasPendientes.reduce((s, g) => s + g.devuelta, 0))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={ui.subtitulo}>Por salón</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={urlFiltros({ devueltas: !soloDevueltas })}
              scroll={false}
              aria-pressed={soloDevueltas}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium sm:min-h-9 ${
                soloDevueltas
                  ? 'border-alerta bg-alerta-suave text-alerta'
                  : 'border-borde-campo bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              Solo devueltas pendientes ({devueltasPendientes.length})
            </Link>
            {!soloDevueltas && (
              <Link
                href={urlFiltros({ sin_pago: !mostrarSinPago })}
                scroll={false}
                aria-pressed={mostrarSinPago}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium sm:min-h-9 ${
                  mostrarSinPago
                    ? 'border-primario bg-primario-suave text-primario'
                    : 'border-borde-campo bg-white text-gray-800 hover:bg-gray-100'
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
            key={s.salon || SIN_CURSO}
            open={soloDevueltas}
            className="group rounded-xl border border-gray-200 bg-white shadow-xs"
          >
            <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 hover:bg-gray-50 sm:px-5">
              <span className="font-semibold text-gray-900">{nombreCurso(s.salon)}</span>
              <span className="flex items-center gap-3 text-sm text-gray-700">
                <span>
                  <span className={`${ui.monto} text-gray-900`}>{s.pagaron}</span> de {s.total} con pago
                </span>
                <span className={`${ui.monto} text-gray-900`}>{pesos(s.recaudado)}</span>
                {s.devueltas > 0 && (
                  <span className={`${ui.pildora} ${ui.estadoPendiente}`}>
                    {s.devueltas} devuelta(s)
                  </span>
                )}
                <ChevronDown {...icono} className="transition-transform duration-200 group-open:rotate-180" />
              </span>
            </summary>

            <ul className="divide-y divide-gray-200 border-t border-gray-200">
              {s.estudiantes.map((e) => {
                const todos = gruposDe(e.id)
                const visibles = soloDevueltas ? todos.filter((g) => g.devueltaPendiente) : todos
                return (
                  <li key={e.id} className="px-4 py-3 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 pt-0.5 font-medium text-gray-900">
                        {e.apellidos} {e.nombres}
                      </p>
                      <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <EstadoPago estado={todos.length ? 'pagado_efectivo' : 'sin_pago'} />
                        {todos.length > 0 && (
                          <span className={`${ui.monto} text-gray-900`}>{pesos(totalDe(e.id))}</span>
                        )}
                      </span>
                    </div>
                    {visibles.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-1">
                        {visibles.map((g) => (
                          <li key={g.grupoPagoId} className="text-sm text-gray-700">
                            <div className="flex items-start justify-between gap-2">
                              <span className="min-w-0 flex-1 pt-1">
                                {g.lineas
                                  .map(
                                    (l) =>
                                      `${l.cantidad} × ${(l.producto_id && productoPorId.get(l.producto_id)) || 'Producto eliminado'}`
                                  )
                                  .join(', ')}{' '}
                                · {pesos(g.monto)} ·{' '}
                                {formatearFechaHora(g.lineas[0].pagado_en)}{' '}
                                · recibió{' '}
                                {quienRecibio(g.lineas[0].registrado_por)}
                                {g.lineas[0].comprobante ? ` · ${g.lineas[0].comprobante}` : ''}
                              </span>
                              {esAdmin && (
                                <FormularioAccion action={eliminarPago.bind(null, evento.id, g.grupoPagoId)}>
                                  <ConfirmSubmitButton
                                    confirmMessage="¿Eliminar este pago (con todos sus productos)? No se puede deshacer."
                                    className={ui.botonQuitar}
                                  >
                                    Eliminar
                                  </ConfirmSubmitButton>
                                </FormularioAccion>
                              )}
                            </div>
                            {g.devuelta > 0 && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                  className={
                                    g.devueltaPendiente ? 'font-medium text-alerta' : 'text-gray-600'
                                  }
                                >
                                  Recibió {pesos(g.recibido ?? 0)} · devuelta {pesos(g.devuelta)}
                                  {g.devueltaPendiente ? ' · pendiente por entregar' : ' · ya entregada'}
                                </span>
                                {g.devueltaPendiente && (
                                  <FormularioAccion action={marcarDevueltaEntregada.bind(null, evento.id, g.grupoPagoId)}>
                                    <button
                                      type="submit"
                                      className={ui.botonCompacto}
                                    >
                                      Marcar como entregada
                                    </button>
                                  </FormularioAccion>
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
