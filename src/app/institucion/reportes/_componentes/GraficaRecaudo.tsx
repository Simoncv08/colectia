'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatearFecha } from '@/lib/estadoEvento'
import { pesos } from '@/lib/formato'
import type { PuntoRecaudo, SerieRecaudo, UnidadSerie } from '@/lib/informeEvento'

// Recaudo en el tiempo como dos paneles alineados sobre el mismo eje de fechas: arriba el
// acumulado (línea) y abajo lo de cada día o semana (columnas). Dos escalas distintas nunca
// comparten un eje. La tabla equivalente va aparte, en la página.

const IZQUIERDA = 64
const DERECHA = 24
const ACUMULADO = { titulo: 16, arriba: 40, abajo: 172 }
const PERIODO = { titulo: 204, arriba: 228, abajo: 308 }
const ALTO = 334
const ANCHO_MAXIMO_COLUMNA = 24
const SEPARACION_ETIQUETAS = 88
const ANCHO_AVISO = 184

// Valores limpios para el eje: el primero que cubre el máximo en "partes" pasos de 1, 2, 2,5 o 5.
function marcasDelEje(maximo: number, partes: number) {
  if (maximo <= 0) return [0]
  const bruto = maximo / partes
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto
  return Array.from({ length: Math.ceil(maximo / paso - 1e-9) + 1 }, (_, i) => i * paso)
}

// "$ 250 mil", "$ 1,5 M". Sin Intl compacto, para que el servidor y el navegador escriban igual.
function pesosCortos(valor: number) {
  const decimal = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
  if (valor >= 1_000_000) return `$ ${decimal(valor / 1_000_000)} M`
  if (valor >= 1_000) return `$ ${decimal(valor / 1_000)} mil`
  return `$ ${valor}`
}

// "22 nov." a partir de "22 nov. 2026".
function fechaCorta(fecha: string) {
  return formatearFecha(fecha).replace(/ \d{4}$/, '')
}

function columnaRedondeada(x: number, y: number, ancho: number, base: number) {
  const r = Math.min(4, ancho / 2, base - y)
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + ancho - r}Q${x + ancho},${y} ${x + ancho},${y + r}V${base}Z`
}

type PuntosNoVacios = [PuntoRecaudo, ...PuntoRecaudo[]]

function tienePuntos(puntos: PuntoRecaudo[]): puntos is PuntosNoVacios {
  return puntos.length > 0
}

function Lienzo({ puntos, unidad }: { puntos: PuntosNoVacios; unidad: UnidadSerie }) {
  const contenedor = useRef<HTMLDivElement>(null)
  // Se dibuja al conocer el ancho real: escalar un ancho supuesto deja el texto diminuto en celular.
  const [medido, setMedido] = useState<number | null>(null)
  const [activo, setActivo] = useState<number | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const ancho = medido ?? 0

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const observador = new ResizeObserver(([entrada]) => setMedido(Math.round(entrada.contentRect.width)))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  const n = puntos.length
  const ultimo = puntos[n - 1]
  const anchoPlot = Math.max(1, ancho - IZQUIERDA - DERECHA)
  const banda = anchoPlot / n
  const centro = (i: number) => IZQUIERDA + banda * (i + 0.5)
  const anchoColumna = Math.max(1, Math.min(ANCHO_MAXIMO_COLUMNA, banda - 2))

  const marcasAcumulado = marcasDelEje(ultimo.acumulado, 3)
  const marcasPeriodo = marcasDelEje(Math.max(...puntos.map((p) => p.recaudado)), 1)
  const topeAcumulado = marcasAcumulado[marcasAcumulado.length - 1] || 1
  const topePeriodo = marcasPeriodo[marcasPeriodo.length - 1] || 1
  const yAcumulado = (v: number) =>
    ACUMULADO.abajo - (v / topeAcumulado) * (ACUMULADO.abajo - ACUMULADO.arriba)
  const yPeriodo = (v: number) => PERIODO.abajo - (v / topePeriodo) * (PERIODO.abajo - PERIODO.arriba)

  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${centro(i)},${yAcumulado(p.acumulado)}`).join('')
  const area = `${linea}L${centro(n - 1)},${ACUMULADO.abajo}L${centro(0)},${ACUMULADO.abajo}Z`

  // Fechas a intervalos iguales contando desde la última, que siempre lleva su fecha.
  const pasoEtiquetas = Math.ceil(n / Math.max(1, Math.floor(anchoPlot / SEPARACION_ETIQUETAS)))
  const conEtiqueta = (i: number) => (n - 1 - i) % pasoEtiquetas === 0

  const periodo = unidad === 'semana' ? 'semana' : 'día'
  const fechaLarga = (fecha: string) =>
    unidad === 'semana' ? `Semana del ${formatearFecha(fecha)}` : formatearFecha(fecha)

  function alMover(e: PointerEvent<SVGSVGElement>) {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    setActivo(Math.min(n - 1, Math.max(0, Math.floor((x - IZQUIERDA) / banda))))
  }

  function irConTeclado(i: number) {
    const p = puntos[i]
    setActivo(i)
    setAnuncio(`${fechaLarga(p.fecha)}: ${pesos(p.recaudado)} ${textoPagos(p.pagos)}. Acumulado ${pesos(p.acumulado)}.`)
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const actual = activo ?? n - 1
    const destino = { ArrowLeft: actual - 1, ArrowRight: actual + 1, Home: 0, End: n - 1 }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    irConTeclado(Math.min(n - 1, Math.max(0, destino)))
  }

  const punto = activo === null ? null : puntos[activo]

  return (
    <div
      ref={contenedor}
      tabIndex={0}
      role="group"
      aria-label={`Recaudo acumulado de ${pesos(ultimo.acumulado)} entre ${fechaLarga(puntos[0].fecha)} y ${fechaLarga(ultimo.fecha)}. Usa las flechas para recorrer cada ${periodo}.`}
      onKeyDown={alTeclear}
      onFocus={() => irConTeclado(activo ?? n - 1)}
      onBlur={() => setActivo(null)}
      className="relative rounded-lg"
      style={{ minHeight: ALTO }}
    >
      {medido !== null && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${ancho} ${ALTO}`}
          className="block h-auto w-full touch-pan-y select-none text-[12px] tabular-nums"
          onPointerMove={alMover}
          onPointerDown={alMover}
          // En celular el aviso se queda después de tocar; se cambia tocando otro día.
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActivo(null)}
        >
          <text x={0} y={ACUMULADO.titulo} className="fill-gray-600 font-medium">
            Acumulado
          </text>
          <text x={0} y={PERIODO.titulo} className="fill-gray-600 font-medium">
            Por {periodo}
          </text>

          {marcasAcumulado.map((m) => (
            <g key={`a${m}`}>
              <line x1={IZQUIERDA} x2={ancho - DERECHA} y1={yAcumulado(m)} y2={yAcumulado(m)} className="stroke-gray-200" />
              <text x={IZQUIERDA - 8} y={yAcumulado(m) + 4} textAnchor="end" className="fill-gray-600">
                {pesosCortos(m)}
              </text>
            </g>
          ))}
          {[0, topePeriodo].map((m) => (
            <g key={`p${m}`}>
              <line x1={IZQUIERDA} x2={ancho - DERECHA} y1={yPeriodo(m)} y2={yPeriodo(m)} className="stroke-gray-200" />
              <text x={IZQUIERDA - 8} y={yPeriodo(m) + 4} textAnchor="end" className="fill-gray-600">
                {pesosCortos(m)}
              </text>
            </g>
          ))}

          <path d={area} className="fill-primario/10" />
          <path d={linea} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-primario" />

          {puntos.map((p, i) =>
            p.recaudado > 0 ? (
              <path
                key={p.fecha}
                d={columnaRedondeada(centro(i) - anchoColumna / 2, yPeriodo(p.recaudado), anchoColumna, PERIODO.abajo)}
                className={i === activo ? 'fill-primario-hover' : 'fill-primario'}
              />
            ) : null
          )}

          {puntos.map((p, i) =>
            conEtiqueta(i) ? (
              <text key={p.fecha} x={centro(i)} y={ALTO - 6} textAnchor="middle" className="fill-gray-600">
                {fechaCorta(p.fecha)}
              </text>
            ) : null
          )}

          {activo === null ? (
            <>
              <circle cx={centro(n - 1)} cy={yAcumulado(ultimo.acumulado)} r={4} strokeWidth={2} className="fill-primario stroke-white" />
              <text
                x={centro(n - 1)}
                y={Math.max(ACUMULADO.arriba - 8, yAcumulado(ultimo.acumulado) - 12)}
                textAnchor={n > 1 ? 'end' : 'middle'}
                className="fill-gray-900 font-semibold"
              >
                {pesos(ultimo.acumulado)}
              </text>
            </>
          ) : (
            <>
              <line
                x1={centro(activo)}
                x2={centro(activo)}
                y1={ACUMULADO.arriba}
                y2={PERIODO.abajo}
                className="stroke-gray-400"
              />
              <circle cx={centro(activo)} cy={yAcumulado(puntos[activo].acumulado)} r={4} strokeWidth={2} className="fill-primario stroke-white" />
            </>
          )}
        </svg>
      )}

      {punto && activo !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] shadow-lg"
          style={{
            width: ANCHO_AVISO,
            left: Math.min(Math.max(0, centro(activo) - ANCHO_AVISO / 2), Math.max(0, ancho - ANCHO_AVISO)),
          }}
        >
          <p className="text-gray-600">{fechaLarga(punto.fecha)}</p>
          <p>
            <span className="font-semibold text-gray-900">{pesos(punto.recaudado)}</span>{' '}
            <span className="text-gray-600">{textoPagos(punto.pagos)}</span>
          </p>
          <p className="text-gray-600">
            Acumulado <span className="font-semibold text-gray-900">{pesos(punto.acumulado)}</span>
          </p>
        </div>
      )}
      {/* Solo se anuncia lo que se recorre con el teclado; el mouse no llena el lector de pantalla. */}
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </div>
  )
}

function textoPagos(pagos: number) {
  return pagos === 1 ? 'en 1 pago' : `en ${pagos} pagos`
}

export default function GraficaRecaudo({ serie }: { serie: SerieRecaudo }) {
  const { puntos, unidad } = serie
  return tienePuntos(puntos) ? <Lienzo puntos={puntos} unidad={unidad} /> : null
}
