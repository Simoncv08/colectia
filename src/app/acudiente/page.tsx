import Link from 'next/link'
import { CalendarDays, Info, Plus, UserRoundPlus, WalletCards } from 'lucide-react'
import EstadoPago from '@/components/EstadoPago'
import Ventana from '@/components/Ventana'
import { pesos } from '@/lib/formato'
import { estadoEvento, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { obtenerSesionAcudiente, type EstudianteVinculado } from '@/lib/sesionAcudiente'
import { cobrosPorEvento, type CobroEvento } from '@/lib/saldoAcudiente'
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

  const estudiantes = vinculos.map((v) => v.estudiantes)


  return (
    <>
      {/* Saludo con el color del colegio, para que la página no sea toda blanca. */}
      <div className="rounded-xl bg-primario px-5 py-5 text-white shadow-xs sm:px-6">
        <h1 className="text-[22px] font-bold leading-8 sm:text-2xl">
          Hola{persona.nombres ? `, ${persona.nombres.split(' ')[0]}` : ''}
        </h1>
        <p className="text-[15px] text-white/85">
          {!estudiantes.length
            ? 'Vincula a tus estudiantes para ver sus actividades.'
            : abiertas === 1
              ? 'Hay 1 actividad abierta para tus estudiantes.'
              : abiertas
                ? `Hay ${abiertas} actividades abiertas para tus estudiantes.`
                : 'Por ahora no hay actividades abiertas.'}
        </p>
      </div>

      {errorEventos && (
        <p className={ui.avisoRojo}>No se pudieron cargar las actividades. Recarga la página para intentar de nuevo.</p>
      )}

      {!estudiantes.length ? (
        <div className={`${ui.tarjeta} flex flex-col items-center gap-3 text-center`}>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primario-suave text-primario">
            <UserRoundPlus {...iconoGrande} />
          </span>
          <p className="font-semibold text-gray-900">Aún no tienes estudiantes vinculados</p>
          <p className={ui.textoSecundario}>Vincúlalo con el código o el documento que te dio el colegio.</p>
          <Link href="/acudiente/cuenta#estudiantes" className={`${ui.botonPrimario} w-full sm:w-auto`}>
            <Plus {...iconoGrande} />
            Vincular estudiante
          </Link>
        </div>
      ) : (
        <>
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
              const precio = precioDeActividad(productos)
              const conPago = cobro?.estudiantes.filter((x) => x.estado === 'pagado').length ?? 0
              const dirigidos = cobro?.estudiantes.length ?? 0
              const fechas = (ev.fecha_limite_pago || ev.fecha_evento) && (
                <p className="text-sm text-gray-700">
                  {ev.fecha_limite_pago &&
                    (ev.estado === 'pago_cerrado'
                      ? `El plazo para pagar terminó el ${formatearFecha(ev.fecha_limite_pago)}`
                      : `Paga hasta el ${formatearFecha(ev.fecha_limite_pago)}`)}
                  {ev.fecha_limite_pago && ev.fecha_evento && ' · '}
                  {ev.fecha_evento && `Se realiza el ${formatearFecha(ev.fecha_evento)}`}
                </p>
              )
              return (
                <article
                  key={ev.id}
                  className={`${ui.tarjeta} flex flex-col gap-4 overflow-hidden`}
                  style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}
                >
                  {ev.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.imagen_url} alt="" className="aspect-video w-full rounded-lg object-cover" />
                  ) : (
                    <div aria-hidden="true" className="-mx-4 -mt-4 h-1.5 bg-primario sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold leading-snug text-gray-900">{ev.nombre}</h3>
                      <p className="text-[13px] text-gray-600">{ev.instituciones?.nombre}</p>
                    </div>
                    {precio && (
                      <div className="shrink-0 rounded-lg bg-primario-suave px-3 py-1.5 text-right text-primario">
                        {precio.desde && <p className="text-xs font-medium">Desde</p>}
                        <p className={`${ui.monto} text-[17px] leading-6`}>{pesos(precio.valor)}</p>
                      </div>
                    )}
                  </div>

                  {(fechas || conPago > 0) && (
                    <div className="flex flex-col items-start gap-2">
                      {fechas}
                      {conPago > 0 && (
                        <EstadoPago
                          estado="pagado"
                          texto={dirigidos > 1 ? `Pagado · ${conPago} de ${dirigidos} estudiantes` : 'Pagado'}
                        />
                      )}
                    </div>
                  )}

                  <div className="[&>button]:w-full">
                    <Ventana textoBoton="Ver detalles" titulo={ev.nombre} variante="secundario">
                      <DetalleActividad ev={ev} productos={productos} cobro={cobro} fechas={fechas} />
                    </Ventana>
                  </div>
                </article>
              )
            })}
          </section>

          <section aria-labelledby="titulo-estudiantes" className={`${ui.tarjeta} flex flex-col gap-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-estudiantes" className={ui.subtitulo}>
                Mis estudiantes
              </h2>
              <Link href="/acudiente/cuenta#estudiantes" className={`${ui.botonSecundario} shrink-0 px-3`}>
                <Plus {...iconoGrande} />
                <span className="sm:hidden">Vincular</span>
                <span className="hidden sm:inline">Vincular estudiante</span>
              </Link>
            </div>
            <ul className="divide-y divide-gray-200">
              {estudiantes.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primario-suave text-sm font-bold text-primario"
                  >
                    {iniciales(e.nombres, e.apellidos)}
                  </span>
                  <span className="flex min-w-0 flex-col">
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
                  </span>
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

type ProductoActividad = {
  id: string
  nombre: string
  tipo: string
  precio_unitario: number
  cantidad_maxima_por_estudiante: number | null
}

// Un solo producto de precio fijo: su precio. Si hay varios o es de precio variable: "Desde" el
// más barato.
function precioDeActividad(productos: ProductoActividad[]) {
  if (!productos.length) return null
  if (productos.length === 1 && productos[0].tipo !== 'precio_variable') {
    return { valor: Number(productos[0].precio_unitario), desde: false }
  }
  return { valor: Math.min(...productos.map((p) => Number(p.precio_unitario))), desde: true }
}

function iniciales(nombres: string, apellidos: string) {
  return `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase()
}

// Lo que se ve al tocar "Ver detalles": descripción, fechas, productos y cada estudiante.
function DetalleActividad({
  ev,
  productos,
  cobro,
  fechas,
}: {
  ev: { descripcion: string | null; estado: string }
  productos: ProductoActividad[]
  cobro: CobroEvento<EstudianteVinculado> | undefined
  fechas: React.ReactNode
}) {
  const estudiantes = cobro?.estudiantes ?? []
  // El mismo valor que se ve en la tarjeta de la actividad.
  const precio = precioDeActividad(productos)
  const hayDisponibles = estudiantes.some((x) => x.estado === 'disponible')
  return (
    <div className="flex flex-col gap-5">
      {(ev.descripcion || fechas) && (
        <div className="flex flex-col gap-2">
          {ev.descripcion && <p className="text-[15px] text-gray-700">{ev.descripcion}</p>}
          {fechas}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold text-gray-900">
          {productos.length === 1 ? 'Qué incluye' : 'Qué puedes pagar'}
        </h3>
        {productos.length ? (
          <ul className="flex flex-col divide-y divide-gray-200 rounded-lg bg-gray-50 px-4 text-sm text-gray-800">
            {productos.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium text-gray-900">{p.nombre}</span>
                  {p.cantidad_maxima_por_estudiante && (
                    <span className="block text-[13px] text-gray-600">
                      Máximo {p.cantidad_maxima_por_estudiante} por estudiante
                    </span>
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
      </div>

      {productos.length > 0 && estudiantes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold text-gray-900">
            {estudiantes.length === 1 ? 'Tu estudiante' : 'Tus estudiantes'}
          </h3>
          <ul className="flex flex-col gap-2">
            {estudiantes.map((x) => (
              <li key={x.estudiante.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-semibold text-gray-900">
                    {x.estudiante.nombres} {x.estudiante.apellidos}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <EstadoPago estado={x.estado} />
                    {x.estado === 'pagado' ? (
                      <span className={`${ui.monto} text-gray-900`}>{pesos(x.pagado)}</span>
                    ) : (
                      precio && (
                        <span className="text-sm text-gray-600">
                          {precio.desde ? 'Desde ' : ''}
                          <span className={`${ui.monto} text-gray-900`}>{pesos(precio.valor)}</span>
                        </span>
                      )
                    )}
                  </span>
                </div>
                {x.estado === 'disponible' && (
                  // El pago en línea llega en la Fase 2 (PSE / Botón Bancolombia).
                  <button
                    type="button"
                    disabled
                    title="El pago en línea estará disponible pronto"
                    className={`${ui.botonPrimario} w-full`}
                  >
                    <WalletCards {...iconoGrande} />
                    Pagar en línea · Pronto
                  </button>
                )}
              </li>
            ))}
          </ul>
          {hayDisponibles && (
            <p className={ui.ayuda}>
              Muy pronto podrás pagar aquí con PSE o Botón Bancolombia. Por ahora paga en efectivo en el
              colegio y el recaudador lo registrará.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
