import Link from 'next/link'
import EstadoPago from '@/components/EstadoPago'
import { pesos } from '@/lib/formato'
import { estadoEvento, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { obtenerSesionAcudiente, type EstudianteVinculado } from '@/lib/sesionAcudiente'
import { cobrosPorEvento } from '@/lib/saldoAcudiente'
import { estiloPaleta } from '@/lib/paletas'
import { ui } from '@/lib/ui'

export const metadata = { title: 'Mis estudiantes' }

export default async function AcudientePage() {
  const { supabase, vinculos, apariencias } = await obtenerSesionAcudiente()

  // La RLS ya deja solo los eventos de sus estudiantes y oculta los finalizados.
  const { data: eventosCrudos, error: errorEventos } = await supabase
    .from('eventos')
    .select(
      'id, institucion_id, nombre, descripcion, imagen_url, fecha_limite_pago, fecha_evento, finalizado_en, instituciones(nombre), productos(id, nombre, tipo, precio_unitario, cantidad_maxima_por_estudiante)'
    )
    .order('created_at', { ascending: false })

  const hoy = hoyColombia()
  const eventos = (eventosCrudos ?? [])
    .map((ev) => ({ ...ev, estado: estadoEvento(ev, hoy) }))
    .filter((ev) => ev.estado !== 'finalizado')

  // Las dos consultas solo devuelven filas de sus propios estudiantes (RLS).
  const ids = eventos.map((ev) => ev.id)
  const [{ data: grupos }, { data: pagos }] = ids.length
    ? await Promise.all([
        supabase.from('evento_grupos').select('evento_id, curso_grado, estudiante_id').in('evento_id', ids),
        supabase.from('registros_pago').select('evento_id, estudiante_id, monto').in('evento_id', ids),
      ])
    : [{ data: [] }, { data: [] }]
  const cobros = cobrosPorEvento(
    eventos,
    grupos ?? [],
    pagos ?? [],
    vinculos.map((v) => v.estudiantes)
  )

  // Resumen de arriba, sin hablar de deudas: muchas actividades son opcionales.
  const abiertas = eventos.filter((ev) => ev.estado === 'abierto').length
  const conPago = eventos.filter((ev) =>
    cobros.get(ev.id)?.estudiantes.some((x) => x.estado === 'pagado')
  ).length

  type Seccion = {
    id: string
    nombre: string
    estado: string | null
    estudiantes: (EstudianteVinculado & { vinculoId: string })[]
    eventos: typeof eventos
  }
  const secciones = new Map<string, Seccion>()
  function seccion(id: string, nombre: string, estado: string | null = null) {
    let g = secciones.get(id)
    if (!g) {
      g = { id, nombre, estado, estudiantes: [], eventos: [] }
      secciones.set(id, g)
    }
    return g
  }
  for (const v of vinculos) {
    const e = v.estudiantes
    seccion(e.institucion_id, e.instituciones?.nombre ?? 'Institución', e.instituciones?.estado ?? null)
      .estudiantes.push({ ...e, vinculoId: v.id })
  }
  for (const ev of eventos) {
    seccion(ev.institucion_id, ev.instituciones?.nombre ?? 'Institución').eventos.push(ev)
  }
  const listaSecciones = Array.from(secciones.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  )

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className={ui.titulo}>Mis estudiantes</h1>
        {vinculos.length > 0 && (
          <Link href="/acudiente/cuenta#estudiantes" className={`${ui.enlace} text-sm`}>
            Gestionar estudiantes
          </Link>
        )}
      </div>

      {errorEventos && (
        <p className={ui.avisoRojo}>No se pudieron cargar las actividades: {errorEventos.message}</p>
      )}

      {!listaSecciones.length ? (
        <div className={`${ui.tarjeta} text-center`}>
          <p className="text-gray-800">Todavía no tienes ningún estudiante vinculado a tu cuenta.</p>
          <p className={`${ui.textoSecundario} mt-1`}>
            Vincúlalo con el código o el documento que te dio el colegio.
          </p>
          <Link href="/acudiente/cuenta#estudiantes" className={`${ui.botonPrimario} mt-4`}>
            + Vincular estudiante
          </Link>
        </div>
      ) : (
        <section aria-labelledby="titulo-resumen" className={ui.resumen}>
          <h2 id="titulo-resumen" className="text-sm font-medium text-white">
            Actividades de tus estudiantes
          </h2>
          <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {abiertas === 0 ? 'Ninguna abierta' : abiertas === 1 ? '1 abierta' : `${abiertas} abiertas`}
          </p>
          <p className="mt-2 text-sm text-white">
            {conPago === 1 ? '1 actividad con pago registrado' : `${conPago} actividades con pago registrado`}
          </p>
          <p className="mt-4 border-t border-white/25 pt-3 text-sm text-white">
            Por ahora los pagos se hacen en efectivo en el colegio. Cuando el colegio registra tu
            pago, aquí aparece como Pagado.
          </p>
        </section>
      )}

      {listaSecciones.map((g) => {
        const apariencia = apariencias.get(g.id)
        return (
          <section
            key={g.id}
            aria-labelledby={`colegio-${g.id}`}
            className="flex flex-col gap-4"
            style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}
          >
            <div className="border-l-4 border-primario pl-3">
              <h2 id={`colegio-${g.id}`} className="text-lg font-semibold text-gray-900">
                {g.nombre}
              </h2>
              {g.estudiantes.length > 0 && (
                <p className={ui.textoSecundario}>
                  {g.estudiantes
                    .map((e) => `${e.nombres} ${e.apellidos}${e.curso_grado ? ` (${e.curso_grado})` : ''}`)
                    .join(' · ')}
                </p>
              )}
            </div>

            {g.estado === 'suspendida' && (
              <p className={ui.avisoAmbar}>
                Esta institución está suspendida temporalmente: puede que no veas actividades nuevas
                hasta que se reactive.
              </p>
            )}

            {!g.eventos.length && (
              <p className={`${ui.tarjeta} ${ui.textoSecundario}`}>
                Por ahora no hay actividades para tus estudiantes en esta institución.
              </p>
            )}

            {g.eventos.map((ev) => {
              const cobro = cobros.get(ev.id)
              const productos = ev.productos ?? []
              return (
                <article key={ev.id} className={`${ui.tarjeta} flex flex-col gap-4`}>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {ev.imagen_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.imagen_url}
                        alt=""
                        className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-32"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900">{ev.nombre}</h3>
                      {(ev.fecha_limite_pago || ev.fecha_evento) && (
                        <p className="mt-1 text-sm text-gray-700">
                          {ev.fecha_limite_pago &&
                            (ev.estado === 'pago_cerrado'
                              ? `El plazo para pagar terminó el ${formatearFecha(ev.fecha_limite_pago)}`
                              : `Paga hasta el ${formatearFecha(ev.fecha_limite_pago)}`)}
                          {ev.fecha_limite_pago && ev.fecha_evento && ' · '}
                          {ev.fecha_evento && `Se realiza el ${formatearFecha(ev.fecha_evento)}`}
                        </p>
                      )}
                      {ev.descripcion && <p className="mt-1 text-sm text-gray-700">{ev.descripcion}</p>}
                    </div>
                  </div>

                  {productos.length ? (
                    <ul className="flex flex-col gap-1 text-sm text-gray-800">
                      {productos.map((p) => (
                        <li key={p.id} className="flex justify-between gap-3">
                          <span>
                            {p.nombre}
                            {p.cantidad_maxima_por_estudiante && (
                              <span className="text-gray-600"> · máximo {p.cantidad_maxima_por_estudiante}</span>
                            )}
                          </span>
                          <span className="whitespace-nowrap">
                            {pesos(Number(p.precio_unitario))}
                            {p.tipo === 'precio_variable' && <span className="text-gray-600"> c/u</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={ui.textoSecundario}>Esta actividad todavía no tiene precios.</p>
                  )}

                  {cobro && productos.length > 0 && cobro.estudiantes.length > 0 && (
                    <ul className="divide-y divide-gray-100 border-t border-gray-200">
                      {cobro.estudiantes.map((x) => (
                        <li
                          key={x.estudiante.id}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 last:pb-0"
                        >
                          <span className="font-medium text-gray-900">
                            {x.estudiante.nombres} {x.estudiante.apellidos}
                          </span>
                          <span className="flex items-center gap-3">
                            <EstadoPago estado={x.estado} />
                            {x.estado === 'pagado' ? (
                              <span className="font-semibold text-gray-900">{pesos(x.pagado)}</span>
                            ) : (
                              <span className="text-gray-600">
                                Valor {cobro.desde ? 'desde ' : ''}
                                {pesos(x.valor)}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
