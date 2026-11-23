import ExcelJS from 'exceljs'
import type { createClient } from '@/lib/supabase/server'
import { ESTADOS, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { SIN_CURSO, nombreCurso } from '@/lib/formato'
import {
  cargarDatosReporte,
  detallePagos,
  pendientesDePago,
  recaudoPorPersona,
  resumenPorEvento,
  type FiltrosReporte,
} from '@/lib/reportes'

type Supabase = Awaited<ReturnType<typeof createClient>>

const FORMATO_PESOS = '"$"#,##0'

type Columna = { titulo: string; ancho: number; pesos?: boolean }

function agregarHoja(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Columna[],
  filas: (string | number | null)[][]
) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = columnas.map((c) => ({ header: c.titulo, width: c.ancho }))
  hoja.getRow(1).font = { bold: true }
  hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
  for (const fila of filas) hoja.addRow(fila)
  columnas.forEach((c, i) => {
    if (c.pesos) hoja.getColumn(i + 1).numFmt = FORMATO_PESOS
  })
  if (filas.length) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }
  }
  return hoja
}


// Misma vista y mismos filtros que la pantalla. Quien llama ya verificó que es administrador.
export async function construirExcelReporte(
  supabase: Supabase,
  institucion: { id: string; nombre: string },
  f: FiltrosReporte
): Promise<
  { ok: true; nombreArchivo: string; contenido: Uint8Array } | { ok: false; error: string }
> {
  const datos = await cargarDatosReporte(supabase, institucion.id)
  if (datos.errores.length) {
    return { ok: false, error: `No se pudo cargar la información: ${datos.errores.join(' · ')}` }
  }

  const libro = new ExcelJS.Workbook()
  libro.creator = 'Colectia'
  libro.created = new Date()

  const nombreEvento = datos.eventos.find((e) => e.id === f.evento)?.nombre
  const nombrePersona = f.persona ? datos.personalPorId.get(f.persona) : undefined
  const hoy = hoyColombia()

  if (f.vista === 'eventos') {
    const filas = resumenPorEvento(datos, f)
    agregarHoja(
      libro,
      'Resumen por evento',
      [
        { titulo: 'Evento', ancho: 32 },
        { titulo: 'Estado', ancho: 14 },
        { titulo: 'Pago hasta', ancho: 12 },
        { titulo: 'Fecha del evento', ancho: 16 },
        { titulo: 'Estudiantes', ancho: 12 },
        { titulo: 'Pagaron', ancho: 10 },
        { titulo: 'Faltan', ancho: 10 },
        { titulo: '% avance', ancho: 10 },
        { titulo: 'Recaudado', ancho: 14, pesos: true },
        { titulo: 'Pagos', ancho: 8 },
        { titulo: 'Devueltas pendientes', ancho: 20 },
        { titulo: 'Valor devueltas pendientes', ancho: 24, pesos: true },
      ],
      filas.map((x) => [
        x.evento.nombre,
        ESTADOS[x.evento.estado].etiqueta,
        formatearFecha(x.evento.fecha_limite_pago),
        formatearFecha(x.evento.fecha_evento),
        x.estudiantes,
        x.pagaron,
        x.faltan,
        x.porcentaje / 100,
        x.recaudado,
        x.pagos,
        x.devueltasPendientes,
        x.valorDevueltasPendientes,
      ])
    ).getColumn(8).numFmt = '0%'
    agregarHoja(
      libro,
      'Por curso',
      [
        { titulo: 'Evento', ancho: 32 },
        { titulo: 'Curso', ancho: 16 },
        { titulo: 'Estudiantes', ancho: 12 },
        { titulo: 'Pagaron', ancho: 10 },
        { titulo: 'Faltan', ancho: 10 },
        { titulo: 'Recaudado', ancho: 14, pesos: true },
      ],
      filas.flatMap((x) =>
        x.cursos.map((c) => [
          x.evento.nombre,
          nombreCurso(c.curso),
          c.estudiantes,
          c.pagaron,
          c.faltan,
          c.recaudado,
        ])
      )
    )
  } else if (f.vista === 'recaudo') {
    const filas = recaudoPorPersona(datos, f)
    agregarHoja(
      libro,
      'Por persona',
      [
        { titulo: 'Recibió', ancho: 28 },
        { titulo: 'Pagos', ancho: 8 },
        { titulo: 'Total recibido', ancho: 16, pesos: true },
        { titulo: 'Devueltas pendientes', ancho: 20 },
        { titulo: 'Valor devueltas pendientes', ancho: 24, pesos: true },
      ],
      filas.map((x) => [
        x.nombre,
        x.pagos,
        x.total,
        x.devueltasPendientes,
        x.valorDevueltasPendientes,
      ])
    )
    agregarHoja(
      libro,
      'Por día',
      [
        { titulo: 'Recibió', ancho: 28 },
        { titulo: 'Día', ancho: 12 },
        { titulo: 'Pagos', ancho: 8 },
        { titulo: 'Total', ancho: 14, pesos: true },
      ],
      filas.flatMap((x) =>
        x.porDia.map((d) => [x.nombre, formatearFecha(d.fecha), d.pagos, d.total])
      )
    )
    agregarHoja(
      libro,
      'Detalle de pagos',
      [
        { titulo: 'Fecha', ancho: 12 },
        { titulo: 'Hora', ancho: 8 },
        { titulo: 'Evento', ancho: 28 },
        { titulo: 'Código', ancho: 12 },
        { titulo: 'Estudiante', ancho: 30 },
        { titulo: 'Curso', ancho: 10 },
        { titulo: 'Producto', ancho: 22 },
        { titulo: 'Cantidad', ancho: 10 },
        { titulo: 'Valor', ancho: 12, pesos: true },
        { titulo: 'Dinero recibido (pago completo)', ancho: 28, pesos: true },
        { titulo: 'Devuelta (pago completo)', ancho: 22, pesos: true },
        { titulo: 'Devuelta pendiente', ancho: 18 },
        { titulo: 'Recibió', ancho: 24 },
        { titulo: 'Comprobante', ancho: 18 },
        { titulo: 'Id del pago', ancho: 38 },
      ],
      detallePagos(datos, f).map((d) => [
        formatearFecha(d.fecha),
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
  } else {
    agregarHoja(
      libro,
      'Quién no ha pagado',
      [
        { titulo: 'Evento', ancho: 32 },
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

  const info = libro.addWorksheet('Filtros')
  info.columns = [{ width: 22 }, { width: 50 }]
  const filasInfo: [string, string][] = [
    ['Institución', institucion.nombre],
    ['Generado el', `${formatearFecha(hoy)} (hora de Colombia)`],
    ['Evento', nombreEvento ?? (f.vista === 'pendientes' ? 'Todos los vigentes' : 'Todos')],
    ['Curso', f.curso ? (f.curso === SIN_CURSO ? nombreCurso('') : f.curso) : 'Todos'],
  ]
  if (f.vista !== 'pendientes') {
    filasInfo.push(
      ['Pagos desde', f.desde ? formatearFecha(f.desde) : 'Sin límite'],
      ['Pagos hasta', f.hasta ? formatearFecha(f.hasta) : 'Sin límite'],
      ['Recibió', nombrePersona ?? 'Todo el personal']
    )
  }
  for (const fila of filasInfo) info.addRow(fila)
  info.getColumn(1).font = { bold: true }

  const buffer = await libro.xlsx.writeBuffer()
  const nombreArchivo = `reporte-${
    { eventos: 'por-evento', recaudo: 'recaudo', pendientes: 'no-han-pagado' }[f.vista]
  }-${hoy}.xlsx`

  return { ok: true, nombreArchivo, contenido: new Uint8Array(buffer as ArrayBuffer) }
}
