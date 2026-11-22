import type { createClient } from '@/lib/supabase/server'
import { enTrozos, traerTodasLasFilas } from '@/lib/consultas'
import { estadoEvento, hoyColombia, type EstadoEvento } from '@/lib/estadoEvento'

// Reportes y su Excel salen de los mismos cálculos, para que la pantalla y el archivo coincidan.

type Supabase = Awaited<ReturnType<typeof createClient>>

const ZONA = 'America/Bogota'

export type Vista = 'eventos' | 'recaudo' | 'pendientes'

export type FiltrosReporte = {
  vista: Vista
  evento: string
  curso: string
  desde: string
  hasta: string
  persona: string
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export function leerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosReporte {
  const texto = (clave: string) => {
    const v = sp[clave]
    return (Array.isArray(v) ? v[0] : v ?? '').trim()
  }
  const vista = texto('vista')
  return {
    vista: vista === 'recaudo' || vista === 'pendientes' ? vista : 'eventos',
    evento: texto('evento'),
    curso: texto('curso'),
    desde: FECHA.test(texto('desde')) ? texto('desde') : '',
    hasta: FECHA.test(texto('hasta')) ? texto('hasta') : '',
    persona: texto('persona'),
  }
}

export function filtrosAParametros(f: FiltrosReporte, cambios: Partial<FiltrosReporte> = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...f, ...cambios })) {
    if (v && !(k === 'vista' && v === 'eventos')) p.set(k, v)
  }
  return p.toString()
}

export const SIN_CURSO = '__sin__'

export function compararCursos(a: string, b: string) {
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
}

export function pesos(valor: number) {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

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
  productosPorId: Map<string, { id: string; nombre: string }>
  personalPorId: Map<string, string> // membresía → nombre
  pagos: PagoR[]
  // Incluye a quien pagó aunque ya no esté dirigido (por ejemplo, si cambió de curso).
  estudiantesPorEvento: Map<string, Set<string>>
  // Por grupo de pago: dinero recibido menos la suma de sus líneas.
  devueltaPorGrupo: Map<string, { valor: number; pendiente: boolean }>
  errores: string[]
}

export async function cargarDatosReporte(
  supabase: Supabase,
  institucionId: string
): Promise<DatosReporte> {
  const errores: string[] = []
  const hoy = hoyColombia()

  const { data: eventosCrudos, error: errorEventos } = await traerTodasLasFilas<
    Omit<EventoR, 'estado'>
  >((desde, hasta) =>
    supabase
      .from('eventos')
      .select('id, nombre, fecha_limite_pago, fecha_evento, finalizado_en, created_at')
      .eq('institucion_id', institucionId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(desde, hasta)
  )
  if (errorEventos) errores.push(`eventos: ${errorEventos.message}`)
  const eventos: EventoR[] = eventosCrudos.map((e) => ({ ...e, estado: estadoEvento(e, hoy) }))
  const eventoIds = eventos.map((e) => e.id)

  const { data: estudiantes, error: errorEst } = await traerTodasLasFilas<EstudianteR>(
    (desde, hasta) =>
      supabase
        .from('estudiantes')
        .select('id, codigo_institucional, nombres, apellidos, curso_grado')
        .eq('institucion_id', institucionId)
        .order('id', { ascending: true })
        .range(desde, hasta)
  )
  if (errorEst) errores.push(`estudiantes: ${errorEst.message}`)
  const estudiantesPorId = new Map(estudiantes.map((e) => [e.id, e]))

  const grupos: { evento_id: string; curso_grado: string | null; estudiante_id: string | null }[] =
    []
  const productos: { id: string; nombre: string }[] = []
  const pagosCrudos: PagoCrudo[] = []

  for (const trozo of enTrozos(eventoIds)) {
    const { data: g, error: eg } = await traerTodasLasFilas<(typeof grupos)[number]>(
      (desde, hasta) =>
        supabase
          .from('evento_grupos')
          .select('evento_id, curso_grado, estudiante_id')
          .in('evento_id', trozo)
          .order('id', { ascending: true })
          .range(desde, hasta)
    )
    if (eg) errores.push(`grupos: ${eg.message}`)
    grupos.push(...g)

    const { data: p, error: ep } = await traerTodasLasFilas<{ id: string; nombre: string }>(
      (desde, hasta) =>
        supabase
          .from('productos')
          .select('id, nombre')
          .in('evento_id', trozo)
          .order('id', { ascending: true })
          .range(desde, hasta)
    )
    if (ep) errores.push(`productos: ${ep.message}`)
    productos.push(...p)

    const { data: pg, error: epg } = await traerTodasLasFilas<PagoCrudo>((desde, hasta) =>
      supabase
        .from('registros_pago')
        .select(
          'id, evento_id, estudiante_id, producto_id, cantidad, monto, dinero_recibido, devuelta_pendiente, grupo_pago_id, registrado_por, comprobante, pagado_en'
        )
        .in('evento_id', trozo)
        .order('id', { ascending: true })
        .range(desde, hasta)
    )
    if (epg) errores.push(`pagos: ${epg.message}`)
    pagosCrudos.push(...pg)
  }

  const { data: staffCrudo } = await supabase
    .from('membresias')
    .select('id, personas(nombres, apellidos, correo)')
    .eq('institucion_id', institucionId)
    .in('rol', ['admin_institucion', 'recaudador'])

  const personalPorId = new Map<string, string>()
  for (const s of (staffCrudo ?? []) as unknown as {
    id: string
    personas: { nombres: string | null; apellidos: string | null; correo: string | null } | null
  }[]) {
    personalPorId.set(
      s.id,
      [s.personas?.nombres, s.personas?.apellidos].filter(Boolean).join(' ').trim() ||
        s.personas?.correo ||
        'Sin nombre'
    )
  }

  const pagos: PagoR[] = pagosCrudos
    .map((p) => {
      const d = new Date(p.pagado_en)
      return {
        ...p,
        monto: Number(p.monto),
        dinero_recibido: p.dinero_recibido == null ? null : Number(p.dinero_recibido),
        fecha: d.toLocaleDateString('en-CA', { timeZone: ZONA }),
        hora: d.toLocaleTimeString('es-CO', {
          timeZone: ZONA,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      }
    })
    .sort((a, b) => b.pagado_en.localeCompare(a.pagado_en))

  const porCurso = new Map<string, string[]>()
  for (const e of estudiantes) {
    if (!e.curso_grado) continue
    const lista = porCurso.get(e.curso_grado) ?? []
    lista.push(e.id)
    porCurso.set(e.curso_grado, lista)
  }
  const estudiantesPorEvento = new Map<string, Set<string>>()
  for (const ev of eventos) estudiantesPorEvento.set(ev.id, new Set())
  for (const g of grupos) {
    const set = estudiantesPorEvento.get(g.evento_id)
    if (!set) continue
    if (g.curso_grado) for (const id of porCurso.get(g.curso_grado) ?? []) set.add(id)
    if (g.estudiante_id) set.add(g.estudiante_id)
  }
  for (const p of pagos) estudiantesPorEvento.get(p.evento_id)?.add(p.estudiante_id)

  const sumaPorGrupo = new Map<string, { suma: number; recibido: number | null; pendiente: boolean }>()
  for (const p of pagos) {
    const g = sumaPorGrupo.get(p.grupo_pago_id) ?? {
      suma: 0,
      recibido: p.dinero_recibido,
      pendiente: p.devuelta_pendiente,
    }
    g.suma += p.monto
    sumaPorGrupo.set(p.grupo_pago_id, g)
  }
  const devueltaPorGrupo = new Map<string, { valor: number; pendiente: boolean }>()
  for (const [id, g] of sumaPorGrupo) {
    const valor = g.recibido != null ? Math.max(0, g.recibido - g.suma) : 0
    devueltaPorGrupo.set(id, { valor, pendiente: g.pendiente && valor > 0 })
  }

  return {
    eventos,
    estudiantes,
    estudiantesPorId,
    productosPorId: new Map(productos.map((p) => [p.id, p])),
    personalPorId,
    pagos,
    estudiantesPorEvento,
    devueltaPorGrupo,
    errores,
  }
}

function cursoDe(datos: DatosReporte, estudianteId: string) {
  return datos.estudiantesPorId.get(estudianteId)?.curso_grado ?? ''
}

function coincideCurso(datos: DatosReporte, estudianteId: string, curso: string) {
  if (!curso) return true
  const c = cursoDe(datos, estudianteId)
  return curso === SIN_CURSO ? !c : c === curso
}

// Las sumas de dinero respetan todos los filtros, incluidas fechas y quién recibió.
export function pagosFiltrados(datos: DatosReporte, f: FiltrosReporte) {
  return datos.pagos.filter(
    (p) =>
      (!f.evento || p.evento_id === f.evento) &&
      coincideCurso(datos, p.estudiante_id, f.curso) &&
      (!f.desde || p.fecha >= f.desde) &&
      (!f.hasta || p.fecha <= f.hasta) &&
      (!f.persona || p.registrado_por === f.persona)
  )
}

function devueltasDe(datos: DatosReporte, pagos: PagoR[]) {
  let cantidad = 0
  let valor = 0
  for (const id of new Set(pagos.map((p) => p.grupo_pago_id))) {
    const d = datos.devueltaPorGrupo.get(id)
    if (d?.pendiente) {
      cantidad++
      valor += d.valor
    }
  }
  return { cantidad, valor }
}

// "Pagaron" y "faltan" cuentan todos los pagos del evento, sin mirar fechas ni quién recibió.

export type FilaCurso = {
  curso: string
  estudiantes: number
  pagaron: number
  faltan: number
  recaudado: number
}

export type FilaEvento = {
  evento: EventoR
  estudiantes: number
  pagaron: number
  faltan: number
  porcentaje: number
  recaudado: number
  pagos: number
  devueltasPendientes: number
  valorDevueltasPendientes: number
  cursos: FilaCurso[]
}

export function resumenPorEvento(datos: DatosReporte, f: FiltrosReporte): FilaEvento[] {
  const filtrados = pagosFiltrados(datos, f)
  const eventos = f.evento ? datos.eventos.filter((e) => e.id === f.evento) : datos.eventos

  return eventos.map((ev) => {
    const universo = Array.from(datos.estudiantesPorEvento.get(ev.id) ?? []).filter((id) =>
      coincideCurso(datos, id, f.curso)
    )
    const conPago = new Set(
      datos.pagos.filter((p) => p.evento_id === ev.id).map((p) => p.estudiante_id)
    )
    const pagosEvento = filtrados.filter((p) => p.evento_id === ev.id)
    const devueltas = devueltasDe(datos, pagosEvento)

    const porCurso = new Map<string, FilaCurso>()
    for (const id of universo) {
      const c = cursoDe(datos, id)
      const fila = porCurso.get(c) ?? { curso: c, estudiantes: 0, pagaron: 0, faltan: 0, recaudado: 0 }
      fila.estudiantes++
      if (conPago.has(id)) fila.pagaron++
      else fila.faltan++
      porCurso.set(c, fila)
    }
    for (const p of pagosEvento) {
      const c = cursoDe(datos, p.estudiante_id)
      const fila = porCurso.get(c) ?? { curso: c, estudiantes: 0, pagaron: 0, faltan: 0, recaudado: 0 }
      fila.recaudado += p.monto
      porCurso.set(c, fila)
    }

    const pagaron = universo.filter((id) => conPago.has(id)).length
    return {
      evento: ev,
      estudiantes: universo.length,
      pagaron,
      faltan: universo.length - pagaron,
      porcentaje: universo.length ? Math.round((pagaron / universo.length) * 100) : 0,
      recaudado: pagosEvento.reduce((s, p) => s + p.monto, 0),
      pagos: new Set(pagosEvento.map((p) => p.grupo_pago_id)).size,
      devueltasPendientes: devueltas.cantidad,
      valorDevueltasPendientes: devueltas.valor,
      cursos: Array.from(porCurso.values()).sort((a, b) => compararCursos(a.curso, b.curso)),
    }
  })
}

export type FilaPersona = {
  personaId: string
  nombre: string
  pagos: number
  total: number
  devueltasPendientes: number
  valorDevueltasPendientes: number
  porDia: { fecha: string; pagos: number; total: number }[]
}

export function recaudoPorPersona(datos: DatosReporte, f: FiltrosReporte): FilaPersona[] {
  const filtrados = pagosFiltrados(datos, f)
  const porPersona = new Map<string, PagoR[]>()
  for (const p of filtrados) {
    const clave = p.registrado_por ?? ''
    const lista = porPersona.get(clave) ?? []
    lista.push(p)
    porPersona.set(clave, lista)
  }

  return Array.from(porPersona.entries())
    .map(([personaId, lista]) => {
      const dias = new Map<string, PagoR[]>()
      for (const p of lista) {
        const l = dias.get(p.fecha) ?? []
        l.push(p)
        dias.set(p.fecha, l)
      }
      const devueltas = devueltasDe(datos, lista)
      return {
        personaId,
        nombre: personaId
          ? datos.personalPorId.get(personaId) ?? 'Persona que ya no está en el personal'
          : 'Sin registrar',
        pagos: new Set(lista.map((p) => p.grupo_pago_id)).size,
        total: lista.reduce((s, p) => s + p.monto, 0),
        devueltasPendientes: devueltas.cantidad,
        valorDevueltasPendientes: devueltas.valor,
        porDia: Array.from(dias.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([fecha, l]) => ({
            fecha,
            pagos: new Set(l.map((p) => p.grupo_pago_id)).size,
            total: l.reduce((s, p) => s + p.monto, 0),
          })),
      }
    })
    .sort((a, b) => b.total - a.total)
}

// Una fila por producto pagado.
export function detallePagos(datos: DatosReporte, f: FiltrosReporte) {
  const eventos = new Map(datos.eventos.map((e) => [e.id, e.nombre]))
  return pagosFiltrados(datos, f).map((p) => {
    const est = datos.estudiantesPorId.get(p.estudiante_id)
    const devuelta = datos.devueltaPorGrupo.get(p.grupo_pago_id)
    return {
      fecha: p.fecha,
      hora: p.hora,
      evento: eventos.get(p.evento_id) ?? '',
      codigo: est?.codigo_institucional ?? '',
      estudiante: est ? `${est.apellidos} ${est.nombres}` : '(estudiante eliminado)',
      curso: est?.curso_grado ?? '',
      producto: (p.producto_id && datos.productosPorId.get(p.producto_id)?.nombre) || '',
      cantidad: p.cantidad,
      monto: p.monto,
      dineroRecibido: p.dinero_recibido,
      devuelta: devuelta?.valor ?? 0,
      devueltaPendiente: Boolean(devuelta?.pendiente),
      recibio: p.registrado_por
        ? datos.personalPorId.get(p.registrado_por) ?? 'Persona que ya no está en el personal'
        : 'Sin registrar',
      comprobante: p.comprobante ?? '',
      grupo: p.grupo_pago_id,
    }
  })
}

// Sin evento elegido, revisa todos los eventos que no estén finalizados.

export type FilaPendiente = {
  evento: EventoR
  curso: string
  estudiante: EstudianteR
}

export function pendientesDePago(datos: DatosReporte, f: FiltrosReporte): FilaPendiente[] {
  const eventos = f.evento
    ? datos.eventos.filter((e) => e.id === f.evento)
    : datos.eventos.filter((e) => e.estado !== 'finalizado')

  const filas: FilaPendiente[] = []
  for (const ev of eventos) {
    const conPago = new Set(
      datos.pagos.filter((p) => p.evento_id === ev.id).map((p) => p.estudiante_id)
    )
    for (const id of datos.estudiantesPorEvento.get(ev.id) ?? []) {
      if (conPago.has(id) || !coincideCurso(datos, id, f.curso)) continue
      const est = datos.estudiantesPorId.get(id)
      if (!est) continue
      filas.push({ evento: ev, curso: est.curso_grado ?? '', estudiante: est })
    }
  }

  const ordenEvento = new Map(eventos.map((e, i) => [e.id, i]))
  return filas.sort(
    (a, b) =>
      (ordenEvento.get(a.evento.id) ?? 0) - (ordenEvento.get(b.evento.id) ?? 0) ||
      compararCursos(a.curso, b.curso) ||
      a.estudiante.apellidos.localeCompare(b.estudiante.apellidos, 'es', { sensitivity: 'base' }) ||
      a.estudiante.nombres.localeCompare(b.estudiante.nombres, 'es', { sensitivity: 'base' })
  )
}

export function cursosDisponibles(datos: DatosReporte) {
  return Array.from(new Set(datos.estudiantes.map((e) => e.curso_grado ?? ''))).sort(
    compararCursos
  )
}
