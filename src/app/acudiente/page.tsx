import Link from 'next/link'
import { estadoEvento, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { obtenerSesionAcudiente, type EstudianteVinculado } from '@/lib/sesionAcudiente'
import { estiloPaleta } from '@/lib/paletas'
import { ui } from '@/lib/ui'

type ProductoDisponible = {
  id: string
  nombre: string
  tipo: string
  precio_unitario: number
  cantidad_maxima_por_estudiante: number | null
}

type EventoDisponible = {
  id: string
  institucion_id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  fecha_limite_pago: string | null
  fecha_evento: string | null
  finalizado_en: string | null
  instituciones: { nombre: string } | null
  productos: ProductoDisponible[] | null
}

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
  const eventos = ((eventosCrudos ?? []) as unknown as EventoDisponible[])
    .map((ev) => ({ ...ev, estado: estadoEvento(ev, hoy) }))
    .filter((ev) => ev.estado !== 'finalizado')

  type Grupo = {
    id: string
    nombre: string
    estado: string | null
    estudiantes: (EstudianteVinculado & { vinculoId: string })[]
    eventos: typeof eventos
  }
  const grupos = new Map<string, Grupo>()
  function grupo(id: string, nombre: string, estado: string | null = null) {
    let g = grupos.get(id)
    if (!g) {
      g = { id, nombre, estado, estudiantes: [], eventos: [] }
      grupos.set(id, g)
    }
    return g
  }
  for (const v of vinculos) {
    const e = v.estudiantes
    grupo(e.institucion_id, e.instituciones?.nombre ?? 'Institución', e.instituciones?.estado ?? null)
      .estudiantes.push({ ...e, vinculoId: v.id })
  }
  for (const ev of eventos) {
    grupo(ev.institucion_id, ev.instituciones?.nombre ?? 'Institución').eventos.push(ev)
  }
  const listaGrupos = Array.from(grupos.values()).sort((a, b) =>
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
        <p className={ui.avisoRojo}>
          No se pudieron cargar las actividades: {errorEventos.message}
        </p>
      )}

      {!listaGrupos.length && (
        <div className={`${ui.tarjeta} text-center`}>
          <p className="text-gray-800">
            Todavía no tienes ningún estudiante vinculado a tu cuenta.
          </p>
          <p className={`${ui.textoSecundario} mt-1`}>
            Vincúlalo con el código o el documento que te dio el colegio.
          </p>
          <Link href="/acudiente/cuenta#estudiantes" className={`${ui.botonPrimario} mt-4`}>
            + Vincular estudiante
          </Link>
        </div>
      )}

      {listaGrupos.map((g) => {
        const apariencia = apariencias.get(g.id)
        return (
          <section
            key={g.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}
          >
            <div className="bg-primario px-5 py-3 text-white">
              <p className="font-semibold">{g.nombre}</p>
            </div>

            <div className="flex flex-col gap-5 p-5">
              {g.estado === 'suspendida' && (
                <p className={ui.avisoAmbar}>
                  Esta institución está suspendida temporalmente: puede que no veas actividades
                  nuevas hasta que se reactive.
                </p>
              )}

              {g.estudiantes.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {g.estudiantes.map((e) => (
                    <li key={e.vinculoId} className={ui.chip}>
                      <span>
                        <span className="font-medium">
                          {e.nombres} {e.apellidos}
                        </span>
                        {e.curso_grado ? ` · ${e.curso_grado}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-3">
                <h2 className={ui.subtitulo}>Actividades disponibles</h2>
                {!g.eventos.length && (
                  <p className={ui.textoSecundario}>
                    Por ahora no hay actividades para tus estudiantes en esta institución.
                  </p>
                )}
                {g.eventos.map((ev) => (
                  <article
                    key={ev.id}
                    className={`rounded-lg border p-4 ${
                      ev.estado === 'pago_cerrado'
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-primario-borde bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {ev.imagen_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.imagen_url}
                          alt={ev.nombre}
                          className="h-32 w-full rounded-lg object-cover sm:w-40"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{ev.nombre}</p>
                          {ev.estado === 'pago_cerrado' && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                              Pago no disponible
                            </span>
                          )}
                        </div>
                        {(ev.fecha_limite_pago || ev.fecha_evento) && (
                          <p className="mt-1 text-sm text-gray-700">
                            {ev.fecha_limite_pago &&
                              (ev.estado === 'pago_cerrado'
                                ? `El plazo para pagar terminó el ${formatearFecha(ev.fecha_limite_pago)}`
                                : `Puedes pagar hasta el ${formatearFecha(ev.fecha_limite_pago)}`)}
                            {ev.fecha_limite_pago && ev.fecha_evento && ' · '}
                            {ev.fecha_evento && `Se realiza el ${formatearFecha(ev.fecha_evento)}`}
                          </p>
                        )}
                        {ev.descripcion && (
                          <p className="mt-1 text-sm text-gray-700">{ev.descripcion}</p>
                        )}
                        <ul className="mt-3 flex flex-col gap-1 border-t border-gray-200 pt-2">
                          {(ev.productos ?? []).map((p) => (
                            <li
                              key={p.id}
                              className="flex items-center justify-between gap-2 text-sm text-gray-900"
                            >
                              <span>{p.nombre}</span>
                              <span className="font-medium">
                                ${Number(p.precio_unitario).toLocaleString('es-CO')}
                                {p.tipo === 'precio_variable' && (
                                  <span className="font-normal text-gray-600"> c/u</span>
                                )}
                                {p.cantidad_maxima_por_estudiante && (
                                  <span className="font-normal text-gray-600">
                                    {' '}
                                    · máx. {p.cantidad_maxima_por_estudiante}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                          {!ev.productos?.length && (
                            <li className="text-sm text-gray-600">
                              Esta actividad todavía no tiene precios.
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      <p className={ui.ayuda}>
        El pago en línea todavía no está disponible. Por ahora, paga estas actividades
        directamente en la institución (en efectivo).
      </p>
    </>
  )
}
