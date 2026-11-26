import { agrupar } from '@/lib/colecciones'
import { compararCursos, compararEstudiantes } from '@/lib/formato'
import {
  coincideCurso,
  contarPagos,
  devueltasDe,
  nombreDeQuienRecibio,
  pagosFiltrados,
  sumarMontos,
  type FiltrosReporte,
} from '@/lib/reportes'
import type { DatosReporte, EstudianteR, EventoR } from '@/lib/reportesDatos'

// Recaudo por persona, detalle de pagos y pendientes: las pestañas de reportes, el informe por
// evento y las hojas de detalle del Excel.

export type DiaPersona = { fecha: string; pagos: number; total: number }

export type FilaPersona = {
  personaId: string
  nombre: string
  pagos: number
  total: number
  devueltasPendientes: number
  valorDevueltasPendientes: number
  porDia: DiaPersona[] // del más reciente al más antiguo
}

export function recaudoPorPersona(datos: DatosReporte, f: FiltrosReporte): FilaPersona[] {
  const porPersona = agrupar(pagosFiltrados(datos, f), (p) => p.registrado_por)

  return Array.from(porPersona.entries())
    .map(([personaId, lista]) => {
      const devueltas = devueltasDe(datos, lista)
      return {
        personaId: personaId ?? '',
        nombre: nombreDeQuienRecibio(datos, personaId),
        pagos: contarPagos(lista),
        total: sumarMontos(lista),
        devueltasPendientes: devueltas.cantidad,
        valorDevueltasPendientes: devueltas.valor,
        porDia: Array.from(agrupar(lista, (p) => p.fecha).entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([fecha, l]) => ({ fecha, pagos: contarPagos(l), total: sumarMontos(l) })),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export type FilaDetallePago = {
  fecha: string
  hora: string
  evento: string
  codigo: string
  estudiante: string
  curso: string
  producto: string
  cantidad: number
  monto: number
  dineroRecibido: number | null
  devuelta: number
  devueltaPendiente: boolean
  recibio: string
  comprobante: string
  grupo: string
}

// Una fila por producto pagado.
export function detallePagos(datos: DatosReporte, f: FiltrosReporte): FilaDetallePago[] {
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
      recibio: nombreDeQuienRecibio(datos, p.registrado_por),
      comprobante: p.comprobante ?? '',
      grupo: p.grupo_pago_id,
    }
  })
}

export type FilaPendiente = {
  evento: EventoR
  curso: string
  estudiante: EstudianteR
}

// Sin evento elegido, revisa todos los eventos que no estén finalizados.
export function pendientesDePago(datos: DatosReporte, f: FiltrosReporte): FilaPendiente[] {
  const eventos = f.evento
    ? datos.eventos.filter((e) => e.id === f.evento)
    : datos.eventos.filter((e) => e.estado !== 'finalizado')

  const filas: FilaPendiente[] = []
  for (const ev of eventos) {
    const conPago = new Set((datos.pagosPorEvento.get(ev.id) ?? []).map((p) => p.estudiante_id))
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
      compararEstudiantes(a.estudiante, b.estudiante)
  )
}

export type CursoPendiente = { curso: string; estudiantes: EstudianteR[] }
export type EventoPendiente = { evento: EventoR; total: number; cursos: CursoPendiente[] }

// Espera las filas en el orden de pendientesDePago (evento, curso y apellido).
export function agruparPendientes(filas: FilaPendiente[]): EventoPendiente[] {
  const grupos: EventoPendiente[] = []
  for (const fila of filas) {
    let g = grupos.at(-1)
    if (!g || g.evento.id !== fila.evento.id) {
      g = { evento: fila.evento, total: 0, cursos: [] }
      grupos.push(g)
    }
    let c = g.cursos.at(-1)
    if (!c || c.curso !== fila.curso) {
      c = { curso: fila.curso, estudiantes: [] }
      g.cursos.push(c)
    }
    c.estudiantes.push(fila.estudiante)
    g.total++
  }
  return grupos
}

export function cursosDisponibles(datos: DatosReporte) {
  return Array.from(new Set(datos.estudiantes.map((e) => e.curso_grado ?? ''))).sort(
    compararCursos
  )
}
