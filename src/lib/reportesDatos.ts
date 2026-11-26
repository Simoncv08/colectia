import type { createClient } from '@/lib/supabase/server'
import { agrupar } from '@/lib/colecciones'
import { enTrozos, traerTodasLasFilas } from '@/lib/consultas'
import { estadoEvento, hoyColombia, type EstadoEvento } from '@/lib/estadoEvento'
import { agruparPagos, cargarPersonal } from '@/lib/pagos'

// Lo que leen de la base los reportes, el informe por evento y el Excel.

type Supabase = Awaited<ReturnType<typeof createClient>>

const ZONA = 'America/Bogota'

export type EventoR = {
  id: string
  nombre: string
  fecha_limite_pago: string | null
  fecha_evento: string | null
  finalizado_en: string | null
  created_at: string
  estado: EstadoEvento
}

export type EstudianteR = {
  id: string
  codigo_institucional: string
  nombres: string
  apellidos: string
  curso_grado: string | null
}

export type TipoProducto = 'precio_unico' | 'precio_variable'

export type ProductoR = {
  id: string
  evento_id: string
  nombre: string
  tipo: TipoProducto
  precio_unitario: number
}

type ProductoCrudo = Omit<ProductoR, 'tipo'> & { tipo: string }

type GrupoCrudo = { evento_id: string; curso_grado: string | null; estudiante_id: string | null }

type PagoCrudo = {
  id: string
  evento_id: string
  estudiante_id: string
  producto_id: string | null
  cantidad: number
  monto: number
  dinero_recibido: number | null
  devuelta_pendiente: boolean
  grupo_pago_id: string
  registrado_por: string | null
  comprobante: string | null
  pagado_en: string
}

export type PagoR = PagoCrudo & {
  fecha: string // AAAA-MM-DD, hora de Colombia
  hora: string // HH:MM, hora de Colombia
}

export type DatosReporte = {
  eventos: EventoR[]
  estudiantes: EstudianteR[]
  estudiantesPorId: Map<string, EstudianteR>
  productosPorId: Map<string, ProductoR>
  // En el orden en que se crearon, como en la configuración del evento.
  productosPorEvento: Map<string, ProductoR[]>
  personalPorId: Map<string, string> // membresía → nombre
  pagos: PagoR[] // del más reciente al más antiguo
  pagosPorEvento: Map<string, PagoR[]>
  // Incluye a quien pagó aunque ya no esté dirigido (por ejemplo, si cambió de curso).
  estudiantesPorEvento: Map<string, Set<string>>
  // Por grupo de pago: dinero recibido menos la suma de sus líneas.
  devueltaPorGrupo: Map<string, { valor: number; pendiente: boolean }>
  // Para el registro del servidor; a la persona se le muestra un mensaje general.
  errores: string[]
}

function aPago(p: PagoCrudo): PagoR {
  const d = new Date(p.pagado_en)
  return {
    ...p,
    monto: Number(p.monto),
    dinero_recibido: p.dinero_recibido == null ? null : Number(p.dinero_recibido),
    fecha: d.toLocaleDateString('en-CA', { timeZone: ZONA }),
    hora: d.toLocaleTimeString('es-CO', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

function aProducto(p: ProductoCrudo): ProductoR {
  return {
    ...p,
    tipo: p.tipo === 'precio_variable' ? 'precio_variable' : 'precio_unico',
    precio_unitario: Number(p.precio_unitario),
  }
}

// Grupos, productos y pagos de un trozo de eventos (con cientos de ids la URL se vuelve muy larga).
function cargarTrozo(supabase: Supabase, trozo: string[]) {
  return Promise.all([
    traerTodasLasFilas<GrupoCrudo>((desde, hasta) =>
      supabase
        .from('evento_grupos')
        .select('evento_id, curso_grado, estudiante_id')
        .in('evento_id', trozo)
        .order('id', { ascending: true })
        .range(desde, hasta)
    ),
    traerTodasLasFilas<ProductoCrudo>((desde, hasta) =>
      supabase
        .from('productos')
        .select('id, evento_id, nombre, tipo, precio_unitario')
        .in('evento_id', trozo)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(desde, hasta)
    ),
    traerTodasLasFilas<PagoCrudo>((desde, hasta) =>
      supabase
        .from('registros_pago')
        .select(
          'id, evento_id, estudiante_id, producto_id, cantidad, monto, dinero_recibido, devuelta_pendiente, grupo_pago_id, registrado_por, comprobante, pagado_en'
        )
        .in('evento_id', trozo)
        .order('id', { ascending: true })
        .range(desde, hasta)
    ),
  ])
}

// Con eventoId solo trae ese evento (el informe completo); los estudiantes siempre son todos,
// porque los cursos dirigidos se resuelven con ellos.
export async function cargarDatosReporte(
  supabase: Supabase,
  institucionId: string,
  opciones: { eventoId?: string } = {}
): Promise<DatosReporte> {
  const errores: string[] = []
  const hoy = hoyColombia()

  const [respuestaEventos, respuestaEstudiantes, personalPorId] = await Promise.all([
    traerTodasLasFilas<Omit<EventoR, 'estado'>>((desde, hasta) => {
      let consulta = supabase
        .from('eventos')
        .select('id, nombre, fecha_limite_pago, fecha_evento, finalizado_en, created_at')
        .eq('institucion_id', institucionId)
      if (opciones.eventoId) consulta = consulta.eq('id', opciones.eventoId)
      return consulta
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(desde, hasta)
    }),
    traerTodasLasFilas<EstudianteR>((desde, hasta) =>
      supabase
        .from('estudiantes')
        .select('id, codigo_institucional, nombres, apellidos, curso_grado')
        .eq('institucion_id', institucionId)
        .order('id', { ascending: true })
        .range(desde, hasta)
    ),
    cargarPersonal(supabase, institucionId),
  ])
  if (respuestaEventos.error) errores.push(`eventos: ${respuestaEventos.error.message}`)
  if (respuestaEstudiantes.error) errores.push(`estudiantes: ${respuestaEstudiantes.error.message}`)
  const eventos: EventoR[] = respuestaEventos.data.map((e) => ({ ...e, estado: estadoEvento(e, hoy) }))
  const estudiantes = respuestaEstudiantes.data

  const trozos = await Promise.all(enTrozos(eventos.map((e) => e.id)).map((t) => cargarTrozo(supabase, t)))
  const grupos: GrupoCrudo[] = []
  const productos: ProductoR[] = []
  const pagosCrudos: PagoCrudo[] = []
  for (const [g, p, pg] of trozos) {
    if (g.error) errores.push(`grupos: ${g.error.message}`)
    if (p.error) errores.push(`productos: ${p.error.message}`)
    if (pg.error) errores.push(`pagos: ${pg.error.message}`)
    grupos.push(...g.data)
    productos.push(...p.data.map(aProducto))
    pagosCrudos.push(...pg.data)
  }

  const pagos = pagosCrudos.map(aPago).sort((a, b) => b.pagado_en.localeCompare(a.pagado_en))

  const porCurso = agrupar(
    estudiantes.filter((e) => e.curso_grado),
    (e) => e.curso_grado
  )
  const estudiantesPorEvento = new Map<string, Set<string>>()
  for (const ev of eventos) estudiantesPorEvento.set(ev.id, new Set())
  for (const g of grupos) {
    const set = estudiantesPorEvento.get(g.evento_id)
    if (!set) continue
    if (g.curso_grado) for (const e of porCurso.get(g.curso_grado) ?? []) set.add(e.id)
    if (g.estudiante_id) set.add(g.estudiante_id)
  }
  for (const p of pagos) estudiantesPorEvento.get(p.evento_id)?.add(p.estudiante_id)

  const devueltaPorGrupo = new Map(
    agruparPagos(pagos).map((g) => [g.grupoPagoId, { valor: g.devuelta, pendiente: g.devueltaPendiente }])
  )

  return {
    eventos,
    estudiantes,
    estudiantesPorId: new Map(estudiantes.map((e) => [e.id, e])),
    productosPorId: new Map(productos.map((p) => [p.id, p])),
    productosPorEvento: agrupar(productos, (p) => p.evento_id),
    personalPorId,
    pagos,
    pagosPorEvento: agrupar(pagos, (p) => p.evento_id),
    estudiantesPorEvento,
    devueltaPorGrupo,
    errores,
  }
}
