import type { Workbook } from 'exceljs'
import { ESTADOS, fechaNumerica } from '@/lib/estadoEvento'
import { nombreCurso, pesos } from '@/lib/formato'
import type { InformeEvento } from '@/lib/informeEvento'
import { proporcionDe } from '@/lib/reportes'
import type { TipoProducto } from '@/lib/reportesDatos'
import {
  enlaceAHoja,
  escribirEncabezado,
  escribirPares,
  escribirTabla,
  escribirTituloBloque,
  nuevaHoja,
  type Par,
} from '@/lib/reportesExcelFormato'

// La ficha de un evento: los mismos bloques del informe en pantalla, uno debajo del otro.

const ANCHOS = [38, 15, 15, 15, 15, 16, 14]
const ANCHO = ANCHOS.length

const TIPO_PRODUCTO: Record<TipoProducto, string> = {
  precio_unico: 'Precio único',
  precio_variable: 'Por unidad',
}

function fechasDelEvento({ resumen }: InformeEvento) {
  const { evento } = resumen
  return [
    ESTADOS[evento.estado].etiqueta,
    evento.fecha_limite_pago && `Pago hasta el ${fechaNumerica(evento.fecha_limite_pago)}`,
    evento.fecha_evento && `Evento el ${fechaNumerica(evento.fecha_evento)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function indicadores({ resumen: r, esperado }: InformeEvento): Par[] {
  const pares: Par[] = [
    { etiqueta: 'Recaudado', valor: r.recaudado, formato: 'pesos' },
    { etiqueta: 'Estudiantes a quienes va dirigido', valor: r.estudiantes, formato: 'entero' },
    { etiqueta: 'Estudiantes con pago', valor: r.pagaron, formato: 'entero' },
    { etiqueta: 'Porcentaje con pago', valor: proporcionDe(r.pagaron, r.estudiantes), formato: 'porcentaje' },
    { etiqueta: 'Faltan por pagar', valor: r.faltan, formato: 'entero' },
    { etiqueta: 'Promedio pagado por estudiante', valor: Math.round(r.promedioPorEstudiante), formato: 'pesos' },
    { etiqueta: 'Pagos registrados', valor: r.pagos, formato: 'entero' },
    { etiqueta: 'Devueltas pendientes', valor: r.devueltasPendientes, formato: 'entero' },
    { etiqueta: 'Valor de las devueltas pendientes', valor: r.valorDevueltasPendientes, formato: 'pesos' },
  ]
  if (esperado) {
    pares.push(
      {
        etiqueta: `Recaudo esperado (${esperado.estudiantes} estudiantes × ${pesos(esperado.precio)})`,
        valor: esperado.esperado,
        formato: 'pesos',
      },
      { etiqueta: 'Falta para llegar al esperado', valor: esperado.falta, formato: 'pesos' }
    )
  }
  return pares
}

export function escribirFicha(
  libro: Workbook,
  nombre: string,
  informe: InformeEvento,
  contexto: { filtros: string; hojaResumen: string }
) {
  const { resumen, serie, porPersona, pendientes } = informe
  const hoja = nuevaHoja(libro, nombre, ANCHOS)
  hoja.properties.tabColor = { argb: 'FFF5C400' }

  let fila = escribirEncabezado(hoja, 1, ANCHO, resumen.evento.nombre, [
    fechasDelEvento(informe),
    contexto.filtros,
    enlaceAHoja(contexto.hojaResumen, 'Volver al resumen'),
  ])

  fila = escribirTituloBloque(hoja, fila, ANCHO, 'Indicadores')
  fila = escribirPares(hoja, fila, indicadores(informe))

  fila = escribirTituloBloque(hoja, fila, ANCHO, 'Por producto')
  fila = escribirTabla(
    hoja,
    fila,
    [
      { titulo: 'Producto' },
      { titulo: 'Tipo' },
      { titulo: 'Precio', formato: 'pesos' },
      { titulo: 'Unidades', formato: 'entero', total: 'suma' },
      { titulo: 'Estudiantes que lo compraron', formato: 'entero' },
      { titulo: 'Recaudado', formato: 'pesos', total: 'suma' },
      { titulo: '% del recaudo', formato: 'porcentaje' },
    ],
    resumen.productos.map((p) => [
      p.nombre,
      p.tipo && TIPO_PRODUCTO[p.tipo],
      p.precio,
      p.unidades,
      p.estudiantes,
      p.recaudado,
      proporcionDe(p.recaudado, resumen.recaudado),
    ]),
    'El evento no tiene productos.'
  )

  fila = escribirTituloBloque(hoja, fila, ANCHO, 'Por curso')
  fila = escribirTabla(
    hoja,
    fila,
    [
      { titulo: 'Curso' },
      { titulo: 'Estudiantes', formato: 'entero', total: 'suma' },
      { titulo: 'Pagaron', formato: 'entero', total: 'suma' },
      { titulo: 'Faltan', formato: 'entero', total: 'suma' },
      { titulo: '% con pago', formato: 'porcentaje', total: { cociente: [2, 1] } },
      { titulo: 'Recaudado', formato: 'pesos', total: 'suma' },
    ],
    resumen.cursos.map((c) => [
      nombreCurso(c.curso),
      c.estudiantes,
      c.pagaron,
      c.faltan,
      proporcionDe(c.pagaron, c.estudiantes),
      c.recaudado,
    ]),
    'El evento todavía no está dirigido a ningún curso.'
  )

  const porSemana = serie.unidad === 'semana'
  fila = escribirTituloBloque(hoja, fila, ANCHO, porSemana ? 'Recaudo por semana' : 'Recaudo por día')
  fila = escribirTabla(
    hoja,
    fila,
    [
      { titulo: porSemana ? 'Semana del' : 'Día' },
      { titulo: 'Pagos', formato: 'entero', total: 'suma' },
      { titulo: 'Recaudado', formato: 'pesos', total: 'suma' },
      { titulo: 'Acumulado', formato: 'pesos' },
    ],
    serie.puntos
      .filter((p) => p.recaudado > 0)
      .map((p) => [fechaNumerica(p.fecha), p.pagos, p.recaudado, p.acumulado]),
    'Todavía no hay pagos.'
  )

  fila = escribirTituloBloque(hoja, fila, ANCHO, 'Quién recibió el dinero')
  fila = escribirTabla(
    hoja,
    fila,
    [
      { titulo: 'Persona' },
      { titulo: 'Pagos', formato: 'entero', total: 'suma' },
      { titulo: 'Total recibido', formato: 'pesos', total: 'suma' },
      { titulo: 'Devueltas pendientes', formato: 'entero', total: 'suma' },
      { titulo: 'Valor devueltas', formato: 'pesos', total: 'suma' },
    ],
    porPersona.map((p) => [p.nombre, p.pagos, p.total, p.devueltasPendientes, p.valorDevueltasPendientes]),
    'Todavía no hay pagos.'
  )

  const sinPago = pendientes.flatMap((c) =>
    c.estudiantes.map((e) => [`${e.apellidos} ${e.nombres}`, nombreCurso(c.curso), e.codigo_institucional])
  )
  fila = escribirTituloBloque(hoja, fila, ANCHO, `Quién no ha pagado (${sinPago.length})`)
  escribirTabla(
    hoja,
    fila,
    [{ titulo: 'Estudiante' }, { titulo: 'Curso' }, { titulo: 'Código' }],
    sinPago,
    'Todos los estudiantes tienen pago.'
  )
}
