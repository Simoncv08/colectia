import ExcelJS from 'exceljs'
import type { createClient } from '@/lib/supabase/server'
import { ESTADOS, fechaNumerica, hoyColombia } from '@/lib/estadoEvento'
import { formatearFechaHora, nombreCurso, normalizar } from '@/lib/formato'
import { informeEvento } from '@/lib/informeEvento'
import {
  NOTA_FILTROS_DINERO,
  etiquetasFiltros,
  filtraDinero,
  filtrosEfectivos,
  proporcionDe,
  resumenPorEvento,
  type FilaEvento,
  type FiltrosReporte,
} from '@/lib/reportes'
import { cargarDatosReporte, type DatosReporte } from '@/lib/reportesDatos'
import { detallePagos, pendientesDePago, recaudoPorPersona } from '@/lib/reportesDetalle'
import { escribirFicha } from '@/lib/reportesExcelFicha'
import {
  agregarHojaPlana,
  enlaceAHoja,
  escribirEncabezado,
  escribirPares,
  escribirTabla,
  escribirTituloBloque,
  nombreHoja,
  nuevaHoja,
} from '@/lib/reportesExcelFormato'

// Un solo libro para todas las pestañas: resumen, una ficha por evento y las hojas de detalle,
// todo con los filtros de la pantalla. Quien llama ya verificó que es administrador.

type Supabase = Awaited<ReturnType<typeof createClient>>

// Cada ficha es una hoja; más de 40 hacen el archivo pesado y difícil de recorrer.
const MAXIMO_FICHAS = 40

const HOJAS = {
  resumen: 'Resumen',
  porPersona: 'Recaudo por persona',
  pagos: 'Detalle de pagos',
  pendientes: 'Quién no ha pagado',
} as const

const ANCHOS_RESUMEN = [40, 16, 12, 14, 12, 10, 10, 11, 15, 15, 9, 13, 15]

// Primero los eventos que siguen abiertos o en cobro; dentro de cada grupo, el orden del reporte.
function eventosConFicha(filas: FilaEvento[]) {
  return [...filas]
    .sort((a, b) => Number(a.evento.estado === 'finalizado') - Number(b.evento.estado === 'finalizado'))
    .slice(0, MAXIMO_FICHAS)
    .map((x) => x.evento.id)
}

function textoFiltros(datos: DatosReporte, f: FiltrosReporte) {
  const etiquetas = etiquetasFiltros(datos, f, fechaNumerica).map((e) => e.etiqueta)
  return etiquetas.length ? `Filtros: ${etiquetas.join(' · ')}` : 'Sin filtros: todos los eventos, cursos, fechas y personas.'
}

function escribirResumen(
  libro: ExcelJS.Workbook,
  contexto: {
    institucion: string
    filtros: string
    f: FiltrosReporte
    filas: FilaEvento[]
    hojaDe: Map<string, string>
  }
) {
  const { filas, hojaDe, f } = contexto
  const hoja = nuevaHoja(libro, HOJAS.resumen, ANCHOS_RESUMEN, true)
  hoja.properties.tabColor = { argb: 'FF14213D' }
  const ancho = ANCHOS_RESUMEN.length

  const lineas = [
    contexto.institucion,
    `Generado el ${formatearFechaHora(new Date().toISOString())} (hora de Colombia)`,
    contexto.filtros,
  ]
  if (filtraDinero(f)) lineas.push(NOTA_FILTROS_DINERO)
  if (hojaDe.size < filas.length) {
    lineas.push(
      `Este archivo trae la ficha de ${hojaDe.size} de los ${filas.length} eventos, primero los que no han finalizado. Para la ficha de otro evento, filtra por ese evento y descarga de nuevo.`
    )
  }
  let fila = escribirEncabezado(hoja, 1, ancho, 'Reporte de recaudo', lineas)

  const suma = (campo: 'recaudado' | 'pagos' | 'devueltasPendientes' | 'valorDevueltasPendientes') =>
    filas.reduce((s, x) => s + x[campo], 0)
  fila = escribirTituloBloque(hoja, fila, ancho, 'Totales')
  fila = escribirPares(hoja, fila, [
    { etiqueta: 'Eventos', valor: filas.length, formato: 'entero' },
    { etiqueta: 'Recaudado', valor: suma('recaudado'), formato: 'pesos' },
    { etiqueta: 'Pagos registrados', valor: suma('pagos'), formato: 'entero' },
    { etiqueta: 'Devueltas pendientes', valor: suma('devueltasPendientes'), formato: 'entero' },
    { etiqueta: 'Valor de las devueltas pendientes', valor: suma('valorDevueltasPendientes'), formato: 'pesos' },
  ])

  fila = escribirTituloBloque(hoja, fila, ancho, 'Eventos')
  escribirTabla(
    hoja,
    fila,
    [
      { titulo: 'Evento' },
      { titulo: 'Estado' },
      { titulo: 'Pago hasta' },
      { titulo: 'Fecha del evento' },
      { titulo: 'Estudiantes', formato: 'entero', total: 'suma' },
      { titulo: 'Pagaron', formato: 'entero', total: 'suma' },
      { titulo: 'Faltan', formato: 'entero', total: 'suma' },
      { titulo: '% con pago', formato: 'porcentaje', total: { cociente: [5, 4] } },
      { titulo: 'Recaudado', formato: 'pesos', total: 'suma' },
      { titulo: 'Promedio por estudiante', formato: 'pesos' },
      { titulo: 'Pagos', formato: 'entero', total: 'suma' },
      { titulo: 'Devueltas pendientes', formato: 'entero', total: 'suma' },
      { titulo: 'Valor devueltas', formato: 'pesos', total: 'suma' },
    ],
    filas.map((x) => {
      const ficha = hojaDe.get(x.evento.id)
      return [
        ficha ? enlaceAHoja(ficha, x.evento.nombre) : x.evento.nombre,
        ESTADOS[x.evento.estado].etiqueta,
        fechaNumerica(x.evento.fecha_limite_pago),
        fechaNumerica(x.evento.fecha_evento),
        x.estudiantes,
        x.pagaron,
        x.faltan,
        proporcionDe(x.pagaron, x.estudiantes),
        x.recaudado,
        Math.round(x.promedioPorEstudiante),
        x.pagos,
        x.devueltasPendientes,
        x.valorDevueltasPendientes,
      ]
    }),
    'No hay eventos con estos filtros.'
  )
}

function escribirPorPersona(libro: ExcelJS.Workbook, datos: DatosReporte, f: FiltrosReporte, filtros: string) {
  const filas = recaudoPorPersona(datos, f)
  const anchos = [32, 14, 16, 14, 16]
  const hoja = nuevaHoja(libro, HOJAS.porPersona, anchos)
  let fila = escribirEncabezado(hoja, 1, anchos.length, 'Recaudo por persona', [
    'Dinero en efectivo que recibió cada persona del personal, para cuadrar caja.',
    filtros,
  ])
  fila = escribirTituloBloque(hoja, fila, anchos.length, 'Por persona')
  fila = escribirTabla(
    hoja,
    fila,
    [
      { titulo: 'Recibió' },
      { titulo: 'Pagos', formato: 'entero', total: 'suma' },
      { titulo: 'Total recibido', formato: 'pesos', total: 'suma' },
      { titulo: 'Devueltas pendientes', formato: 'entero', total: 'suma' },
      { titulo: 'Valor devueltas', formato: 'pesos', total: 'suma' },
    ],
    filas.map((x) => [x.nombre, x.pagos, x.total, x.devueltasPendientes, x.valorDevueltasPendientes]),
    'No hay pagos con estos filtros.'
  )
  fila = escribirTituloBloque(hoja, fila, anchos.length, 'Por persona y día')
  escribirTabla(
    hoja,
    fila,
    [
      { titulo: 'Recibió' },
      { titulo: 'Día' },
      { titulo: 'Pagos', formato: 'entero', total: 'suma' },
      { titulo: 'Total', formato: 'pesos', total: 'suma' },
    ],
    filas.flatMap((x) => x.porDia.map((d) => [x.nombre, fechaNumerica(d.fecha), d.pagos, d.total])),
    'No hay pagos con estos filtros.'
  )
}

function escribirDetalles(libro: ExcelJS.Workbook, datos: DatosReporte, f: FiltrosReporte) {
  agregarHojaPlana(
    libro,
    HOJAS.pagos,
    [
      { titulo: 'Fecha', ancho: 12 },
      { titulo: 'Hora', ancho: 8 },
      { titulo: 'Evento', ancho: 28 },
      { titulo: 'Código', ancho: 12 },
      { titulo: 'Estudiante', ancho: 30 },
      { titulo: 'Curso', ancho: 10 },
      { titulo: 'Producto', ancho: 22 },
      { titulo: 'Cantidad', ancho: 10, formato: 'entero' },
      { titulo: 'Valor', ancho: 12, formato: 'pesos' },
      { titulo: 'Dinero recibido (pago completo)', ancho: 18, formato: 'pesos' },
      { titulo: 'Devuelta (pago completo)', ancho: 14, formato: 'pesos' },
      { titulo: 'Devuelta pendiente', ancho: 12 },
      { titulo: 'Recibió', ancho: 24 },
      { titulo: 'Comprobante', ancho: 18 },
      { titulo: 'Id del pago', ancho: 38 },
    ],
    detallePagos(datos, f).map((d) => [
      fechaNumerica(d.fecha),
      d.hora,
      d.evento,
      d.codigo,
      d.estudiante,
      d.curso,
      d.producto,
      d.cantidad,
      d.monto,
      d.dineroRecibido,
      d.devuelta || null,
      d.devueltaPendiente ? 'Sí' : '',
      d.recibio,
      d.comprobante,
      d.grupo,
    ])
  )
  agregarHojaPlana(
    libro,
    HOJAS.pendientes,
    [
      { titulo: f.evento ? 'Evento' : 'Evento (solo los que no han finalizado)', ancho: 34 },
      { titulo: 'Curso', ancho: 14 },
      { titulo: 'Código', ancho: 12 },
      { titulo: 'Apellidos', ancho: 24 },
      { titulo: 'Nombres', ancho: 24 },
    ],
    pendientesDePago(datos, f).map((x) => [
      x.evento.nombre,
      nombreCurso(x.curso),
      x.estudiante.codigo_institucional,
      x.estudiante.apellidos,
      x.estudiante.nombres,
    ])
  )
}

function nombreArchivo(datos: DatosReporte, f: FiltrosReporte, hoy: string) {
  const evento = f.evento && datos.eventos.find((e) => e.id === f.evento)?.nombre
  const parte = evento
    ? normalizar(evento).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'evento'
    : 'colectia'
  return `reporte-${parte}-${hoy}.xlsx`
}

export async function construirExcelReporte(
  supabase: Supabase,
  institucion: { id: string; nombre: string },
  filtrosPantalla: FiltrosReporte
): Promise<
  { ok: true; nombreArchivo: string; contenido: Uint8Array } | { ok: false; error: string }
> {
  const f = filtrosEfectivos(filtrosPantalla)
  const datos = await cargarDatosReporte(supabase, institucion.id, { eventoId: f.evento || undefined })
  if (datos.errores.length) {
    console.error('Excel de reportes:', datos.errores)
    return { ok: false, error: 'No se pudo cargar la información del reporte. Intenta de nuevo.' }
  }

  const libro = new ExcelJS.Workbook()
  libro.creator = 'Colectia'
  libro.created = new Date()

  const filas = resumenPorEvento(datos, f)
  const filtros = textoFiltros(datos, f)
  // Los nombres de las fichas se reservan antes de escribir el resumen, que las enlaza.
  const usados = new Set<string>(['history', ...Object.values(HOJAS).map((h) => h.toLowerCase())])
  const conFicha = new Set(eventosConFicha(filas))
  const fichas = filas
    .filter((x) => conFicha.has(x.evento.id))
    .map((x) => ({ resumen: x, hoja: nombreHoja(x.evento.nombre, usados) }))
  const hojaDe = new Map(fichas.map((x) => [x.resumen.evento.id, x.hoja]))

  escribirResumen(libro, { institucion: institucion.nombre, filtros, f, filas, hojaDe })
  for (const { resumen, hoja } of fichas) {
    escribirFicha(libro, hoja, informeEvento(datos, resumen, f), { filtros, hojaResumen: HOJAS.resumen })
  }
  escribirPorPersona(libro, datos, f, filtros)
  escribirDetalles(libro, datos, f)

  const buffer = await libro.xlsx.writeBuffer()
  return {
    ok: true,
    nombreArchivo: nombreArchivo(datos, f, hoyColombia()),
    contenido: new Uint8Array(buffer as ArrayBuffer),
  }
}
