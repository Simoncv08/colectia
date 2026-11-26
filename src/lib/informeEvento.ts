import { agrupar } from '@/lib/colecciones'
import {
  contarPagos,
  filtraDinero,
  pagosFiltrados,
  porcentajeDe,
  sumarMontos,
  type FilaEvento,
  type FiltrosReporte,
} from '@/lib/reportes'
import type { DatosReporte, PagoR } from '@/lib/reportesDatos'
import {
  agruparPendientes,
  pendientesDePago,
  recaudoPorPersona,
  type CursoPendiente,
  type FilaPersona,
} from '@/lib/reportesDetalle'

// Informe completo de un evento: lo usan la página del informe y la ficha del evento en el Excel.

export type UnidadSerie = 'dia' | 'semana'

export type PuntoRecaudo = {
  fecha: string // AAAA-MM-DD; con unidad 'semana', el lunes de esa semana
  recaudado: number
  pagos: number
  acumulado: number
}

export type SerieRecaudo = { unidad: UnidadSerie; puntos: PuntoRecaudo[] }

// Con más de tres meses entre el primer y el último pago, una barra por día ya no se lee.
const MAXIMO_DIAS_POR_DIA = 92

function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function lunesDe(fecha: string) {
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay()
  return sumarDias(fecha, -((diaSemana + 6) % 7))
}

// Del primer al último pago sin saltar días (o semanas): los días sin pagos cuentan como 0.
export function serieRecaudo(pagos: PagoR[]): SerieRecaudo {
  if (!pagos.length) return { unidad: 'dia', puntos: [] }
  const fechas = pagos.map((p) => p.fecha).sort()
  const primero = fechas[0]
  const ultimo = fechas[fechas.length - 1]
  const dias = (Date.parse(ultimo) - Date.parse(primero)) / 86_400_000 + 1
  const unidad: UnidadSerie = dias > MAXIMO_DIAS_POR_DIA ? 'semana' : 'dia'
  const inicio = unidad === 'semana' ? lunesDe : (fecha: string) => fecha
  const paso = unidad === 'semana' ? 7 : 1
  const porInicio = agrupar(pagos, (p) => inicio(p.fecha))

  const puntos: PuntoRecaudo[] = []
  let acumulado = 0
  for (let fecha = inicio(primero); fecha <= ultimo; fecha = sumarDias(fecha, paso)) {
    const lista = porInicio.get(fecha) ?? []
    const recaudado = sumarMontos(lista)
    acumulado += recaudado
    puntos.push({ fecha, recaudado, pagos: contarPagos(lista), acumulado })
  }
  return { unidad, puntos }
}

export type RecaudoEsperado = {
  producto: string
  precio: number
  estudiantes: number
  esperado: number
  falta: number
  porcentaje: number
}

// Solo con un único producto de precio único se sabe cuánto debería pagar cada estudiante. Con
// filtros de fechas o de quién recibió, lo recaudado es parcial y "lo que falta" sería inventado.
export function recaudoEsperado(
  datos: DatosReporte,
  fila: FilaEvento,
  f: FiltrosReporte
): RecaudoEsperado | null {
  const productos = datos.productosPorEvento.get(fila.evento.id) ?? []
  if (productos.length !== 1 || productos[0].tipo !== 'precio_unico' || filtraDinero(f)) return null
  const { nombre, precio_unitario } = productos[0]
  const esperado = fila.estudiantes * precio_unitario
  return {
    producto: nombre,
    precio: precio_unitario,
    estudiantes: fila.estudiantes,
    esperado,
    falta: Math.max(0, esperado - fila.recaudado),
    porcentaje: Math.min(100, porcentajeDe(fila.recaudado, esperado)),
  }
}

export type InformeEvento = {
  resumen: FilaEvento
  esperado: RecaudoEsperado | null
  serie: SerieRecaudo
  porPersona: FilaPersona[]
  pendientes: CursoPendiente[]
}

// `resumen` es el de resumenEvento con los mismos filtros; así el Excel no lo calcula dos veces.
export function informeEvento(datos: DatosReporte, resumen: FilaEvento, f: FiltrosReporte): InformeEvento {
  const filtros: FiltrosReporte = { ...f, vista: 'eventos', evento: resumen.evento.id }
  return {
    resumen,
    esperado: recaudoEsperado(datos, resumen, filtros),
    serie: serieRecaudo(pagosFiltrados(datos, filtros)),
    porPersona: recaudoPorPersona(datos, filtros),
    pendientes: agruparPendientes(pendientesDePago(datos, filtros))[0]?.cursos ?? [],
  }
}
