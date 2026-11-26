import { SIN_CURSO, nombreCurso, pesos } from '@/lib/formato'
import type { FilaCurso } from '@/lib/reportes'
import { ui } from '@/lib/ui'
import BarraAvance from '@/components/BarraAvance'

export type FilaBarra = {
  clave: string
  nombre: string
  subtitulo?: string
  porcentaje: number
  detalle: string // va al lado de la barra: el número siempre escrito, nunca solo la barra
  valor: string
  descripcion: string
}

// Barras horizontales con su número escrito al lado (DESIGN.md 7.7). En celular cada fila ocupa
// dos líneas: el nombre y el valor, y debajo la barra.
export default function InformeBarras({
  encabezados,
  filas,
}: {
  encabezados: [nombre: string, barra: string, valor: string]
  filas: FilaBarra[]
}) {
  const columnas = 'grid grid-cols-[1fr_auto] items-center gap-x-3 sm:grid-cols-[minmax(3rem,11rem)_1fr_7rem]'
  return (
    <div className="text-sm">
      <div aria-hidden="true" className={`${columnas} hidden py-2 text-[13px] font-medium text-gray-600 sm:grid`}>
        <span>{encabezados[0]}</span>
        <span>{encabezados[1]}</span>
        <span className="text-right">{encabezados[2]}</span>
      </div>
      <ul>
        {filas.map((f) => (
          <li
            key={f.clave}
            title={f.descripcion}
            className={`${columnas} gap-y-1.5 border-t border-gray-200 py-2.5 sm:py-2`}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <span className="block font-medium text-gray-900">{f.nombre}</span>
              {f.subtitulo && <span className="block text-[13px] text-gray-600">{f.subtitulo}</span>}
            </span>
            <span className={`${ui.monto} text-right sm:order-last`}>{f.valor}</span>
            <div className="col-span-2 sm:col-span-1">
              <BarraAvance porcentaje={f.porcentaje} texto={f.detalle} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// "detallado" agrega debajo del curso cuántos faltan (en el informe completo).
export function InformePorCurso({ cursos, detallado = false }: { cursos: FilaCurso[]; detallado?: boolean }) {
  return (
    <InformeBarras
      encabezados={['Curso', 'Estudiantes con pago', 'Recaudado']}
      filas={cursos.map((c) => ({
        clave: c.curso || SIN_CURSO,
        nombre: nombreCurso(c.curso),
        subtitulo: detallado ? (c.faltan ? `Faltan ${c.faltan}` : 'Todos tienen pago') : undefined,
        porcentaje: c.porcentaje,
        valor: pesos(c.recaudado),
        descripcion: `${nombreCurso(c.curso)}: ${c.pagaron} de ${c.estudiantes} con pago (${c.porcentaje}%), faltan ${c.faltan}`,
        detalle: `${c.pagaron} de ${c.estudiantes} (${c.porcentaje}%)`,
      }))}
    />
  )
}
