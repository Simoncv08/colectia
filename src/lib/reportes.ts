import { agrupar } from '@/lib/colecciones'
import { formatearFecha } from '@/lib/estadoEvento'
import { SIN_CURSO, compararCursos, nombreCurso } from '@/lib/formato'
import type { DatosReporte, EventoR, PagoR, TipoProducto } from '@/lib/reportesDatos'

// Filtros y cálculos de los reportes. Reportes, informe por evento y Excel salen de las mismas
// funciones, para que la pantalla y el archivo coincidan.

// El inicio del panel importa la carga desde aquí.
export { cargarDatosReporte } from '@/lib/reportesDatos'

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

// Lo que llega en la URL, tal cual. Antes de calcular, pásalo por filtrosEfectivos.
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

// "Quién no ha pagado" no mira fechas ni quién recibió: no hay dinero que filtrar.
export function vistaUsaFiltrosDeDinero(vista: Vista) {
  return vista !== 'pendientes'
}

// Los filtros que de verdad aplican a la vista. Las URLs conservan los de la URL, para que al
// volver a otra pestaña sigan ahí.
export function filtrosEfectivos(f: FiltrosReporte): FiltrosReporte {
  return vistaUsaFiltrosDeDinero(f.vista) ? f : { ...f, desde: '', hasta: '', persona: '' }
}

export function filtrosAParametros(f: FiltrosReporte, cambios: Partial<FiltrosReporte> = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...f, ...cambios })) {
    if (v && !(k === 'vista' && v === 'eventos')) p.set(k, v)
  }
  return p.toString()
}

// El informe completo siempre es de la vista de eventos; el evento va en la ruta.
export function hrefInforme(eventoId: string, f: FiltrosReporte, cambios: Partial<FiltrosReporte> = {}) {
  const parametros = filtrosAParametros({ ...f, vista: 'eventos', evento: '' }, cambios)
  return `/institucion/reportes/evento/${eventoId}${parametros ? `?${parametros}` : ''}`
}

// Fechas y quién recibió cambian los valores en dinero, no quién pagó.
export function filtraDinero(f: FiltrosReporte) {
  return Boolean(f.desde || f.hasta || f.persona)
}

export const NOTA_FILTROS_DINERO =
  '"Pagaron" y "faltan" cuentan todos los pagos del evento; las fechas y quién recibió solo cambian los valores en dinero.'

export type EtiquetaFiltro = { campo: keyof FiltrosReporte; etiqueta: string }

// Los filtros aplicados en palabras: chips en pantalla y encabezado del Excel.
export function etiquetasFiltros(
  datos: DatosReporte,
  f: FiltrosReporte,
  formatoFecha: (fecha: string) => string = formatearFecha
): EtiquetaFiltro[] {
  const lista: EtiquetaFiltro[] = []
  if (f.evento) {
    const nombre = datos.eventos.find((e) => e.id === f.evento)?.nombre ?? 'elegido'
    lista.push({ campo: 'evento', etiqueta: `Evento: ${nombre}` })
  }
  if (f.curso) {
    lista.push({ campo: 'curso', etiqueta: `Curso: ${nombreCurso(f.curso === SIN_CURSO ? '' : f.curso)}` })
  }
  if (f.desde) lista.push({ campo: 'desde', etiqueta: `Desde ${formatoFecha(f.desde)}` })
  if (f.hasta) lista.push({ campo: 'hasta', etiqueta: `Hasta ${formatoFecha(f.hasta)}` })
  if (f.persona) {
    const nombre = datos.personalPorId.get(f.persona) ?? 'otra persona'
    lista.push({ campo: 'persona', etiqueta: `Recibió: ${nombre}` })
  }
  return lista
}

export function cursoDe(datos: DatosReporte, estudianteId: string) {
  return datos.estudiantesPorId.get(estudianteId)?.curso_grado ?? ''
}

export function coincideCurso(datos: DatosReporte, estudianteId: string, curso: string) {
  if (!curso) return true
  const c = cursoDe(datos, estudianteId)
  return curso === SIN_CURSO ? !c : c === curso
}

export function nombreDeQuienRecibio(datos: DatosReporte, membresiaId: string | null) {
  if (!membresiaId) return 'Sin registrar'
  return datos.personalPorId.get(membresiaId) ?? 'Persona que ya no está en el personal'
}

// El Excel guarda la proporción exacta (0,6667) y la pantalla el porcentaje redondeado (67).
export function proporcionDe(parte: number, total: number) {
  return total ? parte / total : 0
}

export function porcentajeDe(parte: number, total: number) {
  return Math.round(proporcionDe(parte, total) * 100)
}

export function sumarMontos(pagos: PagoR[]) {
  return pagos.reduce((s, p) => s + p.monto, 0)
}

// Un pago es un grupo de líneas (una por producto).
export function contarPagos(pagos: PagoR[]) {
  return new Set(pagos.map((p) => p.grupo_pago_id)).size
}

// Las sumas de dinero respetan todos los filtros, incluidas fechas y quién recibió.
export function pagosFiltrados(datos: DatosReporte, f: FiltrosReporte) {
  const base = f.evento ? datos.pagosPorEvento.get(f.evento) ?? [] : datos.pagos
  return base.filter(
    (p) =>
      coincideCurso(datos, p.estudiante_id, f.curso) &&
      (!f.desde || p.fecha >= f.desde) &&
      (!f.hasta || p.fecha <= f.hasta) &&
      (!f.persona || p.registrado_por === f.persona)
  )
}

export function devueltasDe(datos: DatosReporte, pagos: PagoR[]) {
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

export type FilaCurso = {
  curso: string
  estudiantes: number
  pagaron: number
  faltan: number
  porcentaje: number
  recaudado: number
}

export type FilaProducto = {
  productoId: string // vacío para pagos antiguos que no quedaron ligados a un producto
  nombre: string
  tipo: TipoProducto | null
  precio: number | null
  unidades: number
  estudiantes: number
  recaudado: number
  porcentaje: number // del recaudado del evento
}

// "Pagaron" y "faltan" cuentan todos los pagos del evento, sin mirar fechas ni quién recibió;
// los valores en dinero sí respetan todos los filtros.
export type FilaEvento = {
  evento: EventoR
  estudiantes: number
  pagaron: number
  faltan: number
  porcentaje: number
  recaudado: number
  pagos: number
  // Recaudado entre los estudiantes con algún pago dentro de los filtros.
  promedioPorEstudiante: number
  devueltasPendientes: number
  valorDevueltasPendientes: number
  cursos: FilaCurso[]
  productos: FilaProducto[]
}

function filasPorCurso(datos: DatosReporte, universo: string[], conPago: Set<string>, pagos: PagoR[]) {
  const porCurso = new Map<string, FilaCurso>()
  const fila = (curso: string) => {
    let f = porCurso.get(curso)
    if (!f) {
      f = { curso, estudiantes: 0, pagaron: 0, faltan: 0, porcentaje: 0, recaudado: 0 }
      porCurso.set(curso, f)
    }
    return f
  }
  for (const id of universo) {
    const f = fila(cursoDe(datos, id))
    f.estudiantes++
    if (conPago.has(id)) f.pagaron++
    else f.faltan++
  }
  for (const p of pagos) fila(cursoDe(datos, p.estudiante_id)).recaudado += p.monto
  return Array.from(porCurso.values())
    .map((f) => ({ ...f, porcentaje: porcentajeDe(f.pagaron, f.estudiantes) }))
    .sort((a, b) => compararCursos(a.curso, b.curso))
}

// Todos los productos del evento, también los que nadie ha comprado; el que más recauda primero.
function filasPorProducto(datos: DatosReporte, eventoId: string, pagos: PagoR[], total: number) {
  const productos = datos.productosPorEvento.get(eventoId) ?? []
  const delEvento = new Set(productos.map((p) => p.id))
  const porProducto = agrupar(pagos, (p) => (p.producto_id && delEvento.has(p.producto_id) ? p.producto_id : ''))

  const fila = (
    productoId: string,
    nombre: string,
    tipo: TipoProducto | null,
    precio: number | null
  ): FilaProducto => {
    const lista = porProducto.get(productoId) ?? []
    const recaudado = sumarMontos(lista)
    return {
      productoId,
      nombre,
      tipo,
      precio,
      unidades: lista.reduce((s, p) => s + p.cantidad, 0),
      estudiantes: new Set(lista.map((p) => p.estudiante_id)).size,
      recaudado,
      porcentaje: porcentajeDe(recaudado, total),
    }
  }
  const filas = productos.map((p) => fila(p.id, p.nombre, p.tipo, p.precio_unitario))
  if (porProducto.has('')) filas.push(fila('', 'Sin producto', null, null))
  return filas.sort((a, b) => b.recaudado - a.recaudado)
}

export function resumenEvento(datos: DatosReporte, ev: EventoR, f: FiltrosReporte): FilaEvento {
  const todos = datos.pagosPorEvento.get(ev.id) ?? []
  const pagosEvento = pagosFiltrados(datos, { ...f, evento: ev.id })
  const universo = Array.from(datos.estudiantesPorEvento.get(ev.id) ?? []).filter((id) =>
    coincideCurso(datos, id, f.curso)
  )
  const conPago = new Set(todos.map((p) => p.estudiante_id))
  const pagaron = universo.filter((id) => conPago.has(id)).length
  const recaudado = sumarMontos(pagosEvento)
  const estudiantesConPagoFiltrado = new Set(pagosEvento.map((p) => p.estudiante_id)).size
  const devueltas = devueltasDe(datos, pagosEvento)

  return {
    evento: ev,
    estudiantes: universo.length,
    pagaron,
    faltan: universo.length - pagaron,
    porcentaje: porcentajeDe(pagaron, universo.length),
    recaudado,
    pagos: contarPagos(pagosEvento),
    promedioPorEstudiante: estudiantesConPagoFiltrado ? recaudado / estudiantesConPagoFiltrado : 0,
    devueltasPendientes: devueltas.cantidad,
    valorDevueltasPendientes: devueltas.valor,
    cursos: filasPorCurso(datos, universo, conPago, pagosEvento),
    productos: filasPorProducto(datos, ev.id, pagosEvento, recaudado),
  }
}

export function resumenPorEvento(datos: DatosReporte, f: FiltrosReporte): FilaEvento[] {
  const eventos = f.evento ? datos.eventos.filter((e) => e.id === f.evento) : datos.eventos
  return eventos.map((ev) => resumenEvento(datos, ev, f))
}
