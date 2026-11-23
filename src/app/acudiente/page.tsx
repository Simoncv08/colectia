import Link from 'next/link'
import { CalendarDays, Info, Plus, UserRoundPlus } from 'lucide-react'
import EstadoPago from '@/components/EstadoPago'
import TarjetaDato from '@/components/TarjetaDato'
import { pesos } from '@/lib/formato'
import { estadoEvento, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { obtenerSesionAcudiente } from '@/lib/sesionAcudiente'
import { cobrosPorEvento } from '@/lib/saldoAcudiente'
import { estiloPaleta } from '@/lib/paletas'
import { icono, iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

export const metadata = { title: 'Mis estudiantes' }

export default async function AcudientePage() {
  const { supabase, vinculos, apariencias, persona } = await obtenerSesionAcudiente()

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
    // Primero las que cierran antes; las que no tienen fecha límite, al final.
    .sort((a, b) => (a.fecha_limite_pago ?? '9999').localeCompare(b.fecha_limite_pago ?? '9999'))

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

  const estudiantes = vinculos.map((v) => v.estudiantes)

  return (
    <>
      <div>
        <h1 className={ui.titulo}>Hola{persona.nombres ? `, ${persona.nombres.split(' ')[0]}` : ''}</h1>
        <p className={ui.textoSecundario}>Las actividades de tus estudiantes y lo que ya pagaste.</p>
      </div>

      {errorEventos && (
        <p className={ui.avisoRojo}>No se pudieron cargar las actividades. Recarga la página para intentar de nuevo.</p>
      )}

      {!estudiantes.length ? (
        <div className={`${ui.tarjeta} flex flex-col items-center gap-3 text-center`}>
          <UserRoundPlus {...iconoGrande} className="text-gray-500" />
          <p className="font-semibold text-gray-900">Aún no tienes estudiantes vinculados</p>
          <p className={ui.textoSecundario}>Vincúlalo con el código o el documento que te dio el colegio.</p>
          <Link href="/acudiente/cuenta#estudiantes" className={`${ui.botonPrimario} w-full sm:w-auto`}>
            <Plus {...iconoGrande} />
            Vincular estudiante
          </Link>
        </div>
      ) : (
        <>
          <section aria-label="Resumen" className="grid grid-cols-2 gap-3">
            <TarjetaDato titulo="Actividades abiertas" valor={abiertas} />
            <TarjetaDato titulo="Con pago registrado" valor={conPago} />
          </section>

          <section aria-labelledby="titulo-actividades" className="flex flex-col gap-4">
            <h2 id="titulo-actividades" className={ui.subtitulo}>
              Actividades
            </h2>
            {!eventos.length && (
              <div className={`${ui.tarjeta} flex flex-col items-center gap-2 text-center`}>
                <CalendarDays {...iconoGrande} className="text-gray-500" />
                <p className={ui.textoSecundario}>Por ahora no hay actividades para tus estudiantes.</p>
              </div>
            )}
            {eventos.map((ev) => {
              const cobro = cobros.get(ev.id)
              const productos = ev.productos ?? []
              const apariencia = apariencias.get(ev.institucion_id)
              return (
                <article
                  key={ev.id}
                  className={`${ui.tarjeta} flex flex-col gap-4`}
                  style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}
                >
                  {ev.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.imagen_url} alt="" className="aspect-video w-full rounded-lg object-cover" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{ev.nombre}</h3>
                    <p className="text-[13px] text-gray-600">{ev.instituciones?.nombre}</p>
                    {(ev.fecha_limite_pago || ev.fecha_evento) && (
                      <p className="mt-2 text-sm text-gray-700">
                        {ev.fecha_limite_pago &&
                          (ev.estado === 'pago_cerrado'
                            ? `El plazo para pagar terminó el ${formatearFecha(ev.fecha_limite_pago)}`
                            : `Paga hasta el ${formatearFecha(ev.fecha_limite_pago)}`)}
                        {ev.fecha_limite_pago && ev.fecha_evento && ' · '}
                        {ev.fecha_evento && `Se realiza el ${formatearFecha(ev.fecha_evento)}`}
                      </p>
                    )}
                    {ev.descripcion && <p className="mt-2 text-[15px] text-gray-700">{ev.descripcion}</p>}
                  </div>

                  {productos.length ? (
                    <ul className="flex flex-col gap-1 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-800">
                      {productos.map((p) => (
                        <li key={p.id} className="flex justify-between gap-3">
                          <span>
                            {p.nombre}
                            {p.cantidad_maxima_por_estudiante && (
                              <span className="text-gray-600"> · máximo {p.cantidad_maxima_por_estudiante} por estudiante</span>
                            )}
                          </span>
                          <span className={`${ui.monto} whitespace-nowrap`}>
                            {pesos(Number(p.precio_unitario))}
                            {p.tipo === 'precio_variable' && <span className="font-normal text-gray-600"> c/u</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={ui.textoSecundario}>Esta actividad todavía no tiene precios.</p>
                  )}

                  {cobro && productos.length > 0 && cobro.estudiantes.length > 0 && (
                    <ul className="divide-y divide-gray-200 border-t border-gray-200">
                      {cobro.estudiantes.map((x) => (
                        <li
                          key={x.estudiante.id}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 last:pb-0"
                        >
                          <span className="font-semibold text-gray-900">
                            {x.estudiante.nombres} {x.estudiante.apellidos}
                          </span>
                          <span className="flex items-center gap-3">
                            <EstadoPago estado={x.estado} />
                            {x.estado === 'pagado' ? (
                              <span className={`${ui.monto} text-gray-900`}>{pesos(x.pagado)}</span>
                            ) : (
                              <span className="text-sm text-gray-600">
                                Valor {cobro.desde ? 'desde ' : ''}
                                <span className={ui.monto}>{pesos(x.valor)}</span>
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

          <section aria-labelledby="titulo-estudiantes" className={`${ui.tarjeta} flex flex-col gap-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="titulo-estudiantes" className={ui.subtitulo}>
                Mis estudiantes
              </h2>
              <Link href="/acudiente/cuenta#estudiantes" className={ui.botonSecundario}>
                <Plus {...iconoGrande} />
                Vincular estudiante
              </Link>
            </div>
            <ul className="divide-y divide-gray-200">
              {estudiantes.map((e) => (
                <li key={e.id} className="flex flex-col py-3 first:pt-0 last:pb-0">
                  <span className="font-semibold text-gray-900">
                    {e.nombres} {e.apellidos}
                  </span>
                  <span className="text-[13px] text-gray-600">
                    {e.instituciones?.nombre}
                    {e.curso_grado ? ` · ${e.curso_grado}` : ''}
                  </span>
                  {e.instituciones?.estado === 'suspendida' && (
                    <span className="mt-1 text-[13px] text-alerta">
                      Esta institución está suspendida temporalmente; puede que no veas actividades nuevas.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="flex items-start gap-2 text-[13px] text-gray-600">
        <Info {...icono} className="mt-0.5 shrink-0" />
        ¿Pagaste en efectivo en el colegio? El recaudador lo registrará y aparecerá aquí como Pagado.
      </p>
    </>
  )
}
