import { SIN_CURSO, nombreCurso } from '@/lib/formato'
import type { CursoPendiente } from '@/lib/reportesDetalle'

// Estudiantes sin ningún pago, por curso, en dos columnas desde sm.
export default function InformePendientes({ cursos }: { cursos: CursoPendiente[] }) {
  return (
    <div className="flex flex-col gap-3">
      {cursos.map((c) => (
        <div key={c.curso || SIN_CURSO}>
          <p className="mb-1 border-b border-gray-100 text-sm font-semibold">
            {nombreCurso(c.curso)} <span className="font-normal text-gray-600">({c.estudiantes.length})</span>
          </p>
          <ul className="columns-1 text-sm sm:columns-2">
            {c.estudiantes.map((e) => (
              <li key={e.id} className="py-0.5">
                {e.apellidos} {e.nombres} <span className="text-xs text-gray-600">{e.codigo_institucional}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
