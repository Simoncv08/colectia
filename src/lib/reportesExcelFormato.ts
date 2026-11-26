import type { Border, BorderStyle, Cell, Fill, Font, Workbook, Worksheet } from 'exceljs'

// Piezas con el estilo de Colectia para armar las hojas del Excel de reportes: títulos, bloques,
// tablas con totales y hojas planas para filtrar. Todo en Arial, con tinta y miel.

const COLOR = {
  tinta: 'FF14213D',
  miel: 'FFF5C400',
  blanco: 'FFFFFFFF',
  texto: 'FF0F172A',
  secundario: 'FF475467',
  borde: 'FFE4E7EC',
  superficie: 'FFF2F4F7',
} as const

export type Formato = 'texto' | 'entero' | 'pesos' | 'porcentaje'

const FORMATOS: Record<Formato, string | null> = {
  texto: null,
  entero: '#,##0',
  pesos: '"$ "#,##0',
  porcentaje: '0%',
}

export type Enlace = { texto: string; enlace: string }
export type Valor = string | number | null | Enlace

// 'suma' suma la columna; 'cociente' divide los totales de otras dos columnas (índices desde 0).
export type Total = 'suma' | { cociente: [number, number] }

export type Columna = { titulo: string; formato?: Formato; total?: Total }

const borde = (color: string, style: BorderStyle = 'thin'): Partial<Border> => ({
  style,
  color: { argb: color },
})

const relleno = (color: string): Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: color },
})

function esEnlace(valor: Valor): valor is Enlace {
  return typeof valor === 'object' && valor !== null
}

// Los textos se guardan como texto aunque empiecen por "="; nunca se escriben como fórmula.
export function poner(
  celda: Cell,
  valor: Valor,
  formato: Formato = 'texto',
  fuente: Partial<Font> = {}
) {
  if (esEnlace(valor)) {
    celda.value = { text: valor.texto, hyperlink: valor.enlace }
    fuente = { underline: true, ...fuente }
  } else {
    celda.value = valor
  }
  celda.font = { name: 'Arial', size: 10, color: { argb: COLOR.texto }, ...fuente }
  const numFmt = FORMATOS[formato]
  if (numFmt) celda.numFmt = numFmt
}

// Para saltar a otra hoja del mismo archivo.
export function enlaceAHoja(nombreHoja: string, texto: string): Enlace {
  return { texto, enlace: `#'${nombreHoja.replace(/'/g, "''")}'!A1` }
}

const PROHIBIDOS_EN_HOJA = /[[\]:*?/\\]/g

// Excel exige nombres de hoja únicos (sin distinguir mayúsculas), de máximo 31 caracteres y sin
// []:*?/\ ni apóstrofo al principio o al final.
export function nombreHoja(nombre: string, usados: Set<string>) {
  const base =
    nombre.replace(PROHIBIDOS_EN_HOJA, ' ').replace(/\s+/g, ' ').trim().replace(/^'+|'+$/g, '') ||
    'Evento'
  for (let i = 1; ; i++) {
    const sufijo = i === 1 ? '' : ` (${i})`
    const recorte = base
      .slice(0, 31 - sufijo.length)
      .replace(/[\uD800-\uDBFF]$/, '')
      .replace(/'+$/, '')
      .trim()
    const candidato = recorte + sufijo
    if (!usados.has(candidato.toLowerCase())) {
      usados.add(candidato.toLowerCase())
      return candidato
    }
  }
}

export function nuevaHoja(libro: Workbook, nombre: string, anchos: number[], horizontal = false) {
  const hoja = libro.addWorksheet(nombre, {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: horizontal ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })
  hoja.columns = anchos.map((width) => ({ width }))
  return hoja
}

// Título de la hoja sobre tinta con una línea miel debajo, y las líneas de contexto en gris.
export function escribirEncabezado(
  hoja: Worksheet,
  fila: number,
  ancho: number,
  titulo: string,
  lineas: Valor[]
) {
  hoja.mergeCells(fila, 1, fila, ancho)
  const celda = hoja.getCell(fila, 1)
  poner(celda, titulo, 'texto', { size: 16, bold: true, color: { argb: COLOR.blanco } })
  celda.fill = relleno(COLOR.tinta)
  celda.alignment = { vertical: 'middle', indent: 1 }
  celda.border = { bottom: borde(COLOR.miel, 'thick') }
  hoja.getRow(fila).height = 32
  let actual = fila + 1
  for (const linea of lineas) {
    hoja.mergeCells(actual, 1, actual, ancho)
    poner(hoja.getCell(actual, 1), linea, 'texto', { color: { argb: COLOR.secundario } })
    actual++
  }
  return actual + 1
}

export function escribirTituloBloque(hoja: Worksheet, fila: number, ancho: number, titulo: string) {
  hoja.mergeCells(fila, 1, fila, ancho)
  const celda = hoja.getCell(fila, 1)
  poner(celda, titulo, 'texto', { size: 12, bold: true, color: { argb: COLOR.tinta } })
  celda.fill = relleno(COLOR.miel)
  celda.alignment = { vertical: 'middle', indent: 1 }
  hoja.getRow(fila).height = 22
  return fila + 1
}

export type Par = { etiqueta: string; valor: Valor; formato?: Formato }

// Indicadores como etiqueta y valor, uno por fila.
export function escribirPares(hoja: Worksheet, fila: number, pares: Par[]) {
  pares.forEach((par, i) => {
    const etiqueta = hoja.getCell(fila + i, 1)
    const valor = hoja.getCell(fila + i, 2)
    poner(etiqueta, par.etiqueta, 'texto', { color: { argb: COLOR.secundario } })
    poner(valor, par.valor, par.formato, { size: 11, bold: true })
    valor.alignment = { horizontal: 'right' }
    for (const c of [etiqueta, valor]) c.border = { bottom: borde(COLOR.borde) }
  })
  return fila + pares.length + 1
}

function escribirEncabezadoTabla(hoja: Worksheet, fila: number, columnas: Columna[]) {
  columnas.forEach((col, i) => {
    const celda = hoja.getCell(fila, i + 1)
    poner(celda, col.titulo, 'texto', { bold: true, color: { argb: COLOR.blanco } })
    celda.fill = relleno(COLOR.tinta)
    celda.alignment = {
      vertical: 'middle',
      wrapText: true,
      horizontal: col.formato && col.formato !== 'texto' ? 'right' : 'left',
    }
  })
  hoja.getRow(fila).height = 30
}

function letra(columna: number) {
  let n = columna
  let texto = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    texto = String.fromCharCode(65 + resto) + texto
    n = Math.floor((n - 1) / 26)
  }
  return texto
}

// Tabla de un bloque: encabezado tinta, filas con divisor y, si alguna columna lo pide, una fila de
// totales con fórmulas (con su resultado ya calculado para quien abra el archivo sin recalcular).
export function escribirTabla(
  hoja: Worksheet,
  fila: number,
  columnas: Columna[],
  filas: Valor[][],
  vacio = 'Sin datos.'
) {
  escribirEncabezadoTabla(hoja, fila, columnas)
  const primera = fila + 1
  if (!filas.length) {
    hoja.mergeCells(primera, 1, primera, columnas.length)
    poner(hoja.getCell(primera, 1), vacio, 'texto', { italic: true, color: { argb: COLOR.secundario } })
    return primera + 2
  }
  filas.forEach((valores, i) => {
    valores.forEach((v, j) => {
      const celda = hoja.getCell(primera + i, j + 1)
      poner(celda, v, columnas[j]?.formato)
      celda.border = { bottom: borde(COLOR.borde) }
    })
  })
  const ultima = primera + filas.length - 1
  if (!columnas.some((c) => c.total)) return ultima + 2

  const filaTotal = ultima + 1
  const resultados = columnas.map((c, j) =>
    c.total === 'suma' ? filas.reduce((s, f) => s + (typeof f[j] === 'number' ? (f[j] as number) : 0), 0) : 0
  )
  columnas.forEach((col, j) => {
    const celda = hoja.getCell(filaTotal, j + 1)
    const ref = (k: number) => `${letra(k + 1)}${filaTotal}`
    if (j === 0) poner(celda, 'Total')
    else if (col.total === 'suma') {
      poner(celda, null, col.formato)
      celda.value = {
        formula: `SUM(${letra(j + 1)}${primera}:${letra(j + 1)}${ultima})`,
        result: resultados[j],
        date1904: false,
      }
    } else if (col.total) {
      const [num, den] = col.total.cociente
      poner(celda, null, col.formato)
      celda.value = {
        formula: `IF(${ref(den)}=0,0,${ref(num)}/${ref(den)})`,
        result: resultados[den] ? resultados[num] / resultados[den] : 0,
        date1904: false,
      }
    } else poner(celda, null)
    celda.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR.texto } }
    celda.fill = relleno(COLOR.superficie)
    celda.border = { top: borde(COLOR.tinta) }
  })
  return filaTotal + 2
}

export type ColumnaPlana = Columna & { ancho: number }

// Hoja de datos crudos: encabezado fijo y filtros en cada columna, para ordenar y buscar.
export function agregarHojaPlana(
  libro: Workbook,
  nombre: string,
  columnas: ColumnaPlana[],
  filas: Valor[][]
) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = columnas.map((c) => ({ width: c.ancho }))
  escribirEncabezadoTabla(hoja, 1, columnas)
  filas.forEach((valores, i) => {
    valores.forEach((v, j) => poner(hoja.getCell(i + 2, j + 1), v, columnas[j]?.formato))
  })
  if (filas.length) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }
  }
  return hoja
}
