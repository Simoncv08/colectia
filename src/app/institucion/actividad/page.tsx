import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { ui } from '@/lib/ui'
import FiltrosActivos from '@/components/FiltrosActivos'
import { nombrePersona, pesos } from '@/lib/formato'

type Params = {
  searchParams: Promise<{ categoria?: string; persona?: string; antes?: string }>
}

type Actividad = {
  id: number
  persona_id: string | null
  actor_nombre: string
  categoria: string
  accion: string
  descripcion: string
  detalle: { grupo?: string; monto?: number } | null
  transaccion: number
  created_at: string
}

const ZONA = 'America/Bogota'
const PASO = 150

const CATEGORIAS: Record<string, { etiqueta: string; clase: string }> = {
  pagos: { etiqueta: 'Pagos', clase: 'bg-exito-suave text-exito' },
  estudiantes: { etiqueta: 'Estudiantes', clase: 'bg-neutro-suave text-neutro' },
  eventos: { etiqueta: 'Eventos', clase: 'bg-neutro-suave text-neutro' },
  personal: { etiqueta: 'Personal', clase: 'bg-neutro-suave text-neutro' },
  cursos: { etiqueta: 'Cursos', clase: 'bg-neutro-suave text-neutro' },
  acudientes: { etiqueta: 'Acudientes', clase: 'bg-neutro-suave text-neutro' },
}

const VERBOS: Record<string, string> = { crear: 'agregó', editar: 'editó', eliminar: 'eliminó' }

// Página siguiente: "fecha|id" de la última fila mostrada. La fecha va tal cual sale de la base,
// con microsegundos, para que la comparación sea exacta.
function leerCursor(valor: string | undefined) {
  const m = /^([0-9T:.+\- ]{10,40})\|(\d{1,19})$/.exec(valor ?? '')
  return m ? { fecha: m[1], id: m[2] } : null
}

// AAAA-MM-DD en hora de Colombia.
function claveDia(fecha: Date) {
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA })
}

// Una sola frase para una operación grande (un Excel de 300 estudiantes, un pago con varios productos).
function resumenGrupo(items: Actividad[]) {
  const { categoria, accion } = items[0]
  const n = items.length
  if (categoria === 'pagos') {
    const pagos = new Set(items.map((i) => i.detalle?.grupo ?? String(i.id))).size
    const total = items.reduce((sum, i) => sum + Number(i.detalle?.monto ?? 0), 0)
    if (accion === 'crear') {
      return pagos === 1
        ? `registró un pago en efectivo por ${pesos(total)} (${n} productos)`
        : `registró ${pagos} pagos en efectivo por un total de ${pesos(total)}`
    }
    if (accion === 'eliminar') {
      return `eliminó ${pagos} pago(s) por un total de ${pesos(total)}`
    }
    return `actualizó ${pagos} pago(s)`
  }
  if (categoria === 'estudiantes') {
    return `${VERBOS[accion] ?? 'modificó'} ${n} estudiantes`
  }
  return `hizo ${n} cambios en ${(CATEGORIAS[categoria]?.etiqueta ?? categoria).toLowerCase()}`
}

export const metadata = { title: 'Actividad' }

export default async function ActividadPage({ searchParams }: Params) {
  const filtros = await searchParams
  const categoria = filtros.categoria && CATEGORIAS[filtros.categoria] ? filtros.categoria : ''
  const persona = filtros.persona ?? ''
  const cursor = leerCursor(filtros.antes)

  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion

  if (!sesion.esAdmin) {
    return (
      <p className={ui.textoSecundario}>
        Solo el administrador de la institución puede ver el registro de actividad.
      </p>
    )
  }

  const { data: staffCrudo } = await supabase
    .from('membresias')
    .select('persona_id, personas(nombres, apellidos, correo)')
    .eq('institucion_id', institucionId)
    .in('rol', ['admin_institucion', 'recaudador'])

  const personal = Array.from(
    new Map(
      (staffCrudo ?? []).map((s) => [
        s.persona_id,
        nombrePersona(s.personas),
      ])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], 'es'))

  let consulta = supabase
    .from('actividad')
    .select(
      'id, persona_id, actor_nombre, categoria, accion, descripcion, detalle, transaccion, created_at'
    )
    .eq('institucion_id', institucionId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PASO + 1)

  if (categoria) consulta = consulta.eq('categoria', categoria)
  if (persona === 'sistema') consulta = consulta.is('persona_id', null)
  else if (persona) consulta = consulta.eq('persona_id', persona)
  if (cursor) {
    consulta = consulta.or(
      `created_at.lt."${cursor.fecha}",and(created_at.eq."${cursor.fecha}",id.lt.${cursor.id})`
    )
  }

  const { data: filasCrudas, error } = await consulta
  const hayMas = (filasCrudas ?? []).length > PASO
  const filas = ((filasCrudas ?? []) as Actividad[]).slice(0, PASO)
  const ultima = filas[filas.length - 1]

  // Misma transacción, persona y tipo de cambio = una sola tarjeta.
  const tarjetas: Actividad[][] = []
  for (const fila of filas) {
    const previa = tarjetas[tarjetas.length - 1]
    const ref = previa?.[0]
    if (
      ref &&
      ref.transaccion === fila.transaccion &&
      ref.persona_id === fila.persona_id &&
      ref.categoria === fila.categoria &&
      ref.accion === fila.accion
    ) {
      previa.push(fila)
    } else {
      tarjetas.push([fila])
    }
  }

  const ahora = new Date()
  const hoy = claveDia(ahora)
  const ayer = claveDia(new Date(ahora.getTime() - 24 * 60 * 60 * 1000))
  const dias: { clave: string; titulo: string; tarjetas: Actividad[][] }[] = []
  for (const t of tarjetas) {
    const fecha = new Date(t[0].created_at)
    const clave = claveDia(fecha)
    let dia = dias[dias.length - 1]
    if (!dia || dia.clave !== clave) {
      const titulo =
        clave === hoy
          ? 'Hoy'
          : clave === ayer
            ? 'Ayer'
            : fecha.toLocaleDateString('es-CO', {
                timeZone: ZONA,
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
      dia = { clave, titulo, tarjetas: [] }
      dias.push(dia)
    }
    dia.tarjetas.push(t)
  }

  const nombres = new Map(personal)

  function urlCon(cambios: Record<string, string>) {
    const p = new URLSearchParams()
    const valores = { categoria, persona, ...cambios }
    for (const [k, v] of Object.entries(valores)) if (v) p.set(k, v)
    const qs = p.toString()
    return `/institucion/actividad${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={ui.titulo}>Actividad</h1>
        <p className={ui.textoSecundario}>
          Todo lo que se ha hecho en {sesion.institucion.nombre}, del más reciente al más
          antiguo. Solo el administrador puede ver esta página.
        </p>
      </div>

      <form method="get" className={ui.filtros}>
        <label className={ui.etiqueta}>
          Tipo de cambio
          <select
            name="categoria"
            defaultValue={categoria}
            className={ui.campoCompacto}
          >
            <option value="">Todos</option>
            {Object.entries(CATEGORIAS).map(([valor, c]) => (
              <option key={valor} value={valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.etiqueta}>
          Quién
          <select
            name="persona"
            defaultValue={persona}
            className={ui.campoCompacto}
          >
            <option value="">Todo el personal</option>
            {personal.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
            <option value="sistema">Cambios hechos directamente en Supabase</option>
          </select>
        </label>
        <button
          type="submit"
          className={`${ui.botonPrimario} col-span-2 sm:min-h-9`}
        >
          Filtrar
        </button>
      </form>

      <FiltrosActivos
        hrefLimpiar="/institucion/actividad"
        filtros={[
          ...(categoria
            ? [{ etiqueta: `Tipo: ${CATEGORIAS[categoria].etiqueta}`, hrefQuitar: urlCon({ categoria: '' }) }]
            : []),
          ...(persona
            ? [
                {
                  etiqueta: `Quién: ${persona === 'sistema' ? 'cambios directos en Supabase' : nombres.get(persona) ?? 'otra persona'}`,
                  hrefQuitar: urlCon({ persona: '' }),
                },
              ]
            : []),
        ]}
      />

      {error && (
        <p className={ui.avisoRojo}>
          No se pudo cargar la actividad. Recarga la página para intentar de nuevo.
        </p>
      )}

      {!error && !dias.length && (
        <p className={ui.textoSecundario}>
          {categoria || persona
            ? 'No hay cambios que coincidan con el filtro.'
            : 'Todavía no hay actividad registrada. Los cambios empiezan a aparecer aquí desde que se activó el registro.'}
        </p>
      )}

      <div className="flex flex-col gap-8">
        {dias.map((dia) => (
          <section key={dia.clave}>
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-sm font-semibold capitalize text-gray-700">
              {dia.titulo}
            </h2>
            <ul className="flex flex-col gap-2">
              {dia.tarjetas.map((items) => {
                const primero = items[0]
                const cat = CATEGORIAS[primero.categoria]
                const hora = new Date(primero.created_at).toLocaleTimeString('es-CO', {
                  timeZone: ZONA,
                  hour: 'numeric',
                  minute: '2-digit',
                })
                return (
                  <li
                    key={primero.id}
                    className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900"
                  >
                    <span className="w-16 shrink-0 text-xs text-gray-600">{hora}</span>
                    <div className="min-w-0 flex-1">
                      <p>
                        <span
                          className={`${ui.pildora} mr-2 border-transparent ${cat?.clase ?? 'bg-gray-100'}`}
                        >
                          {cat?.etiqueta ?? primero.categoria}
                        </span>
                        <span className="font-medium">{primero.actor_nombre}</span>{' '}
                        {items.length === 1 ? primero.descripcion : resumenGrupo(items)}
                      </p>
                      {items.length > 1 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs font-medium text-primario">
                            Ver detalle ({items.length})
                          </summary>
                          <ul className="mt-1 list-disc pl-5 text-xs text-gray-700">
                            {items.map((i) => (
                              <li key={i.id}>{i.descripcion}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {(hayMas || cursor) && (
        <div className="flex flex-wrap justify-center gap-2">
          {cursor && (
            <Link href={urlCon({})} className={ui.botonSecundario}>
              Volver a lo más reciente
            </Link>
          )}
          {hayMas && ultima && (
            <Link href={urlCon({ antes: `${ultima.created_at}|${ultima.id}` })} className={ui.botonSecundario}>
              Ver actividad más antigua
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
