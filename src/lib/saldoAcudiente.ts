import type { EstadoEvento } from '@/lib/estadoEvento'
import type { TipoEstadoPago } from '@/components/EstadoPago'

type Producto = { precio_unitario: number; tipo: string }
type Evento = { id: string; institucion_id: string; estado: EstadoEvento; productos: Producto[] | null }
type Grupo = { evento_id: string; curso_grado: string | null; estudiante_id: string | null }
type Pago = { evento_id: string; estudiante_id: string; monto: number }
type Estudiante = { id: string; institucion_id: string; curso_grado: string | null }

export type CobroEstudiante<E extends Estudiante> = {
  estudiante: E
  estado: TipoEstadoPago
  pagado: number
  // Una unidad de cada producto. Con productos de precio variable es un mínimo ("desde").
  valor: number
}

export type CobroEvento<E extends Estudiante> = {
  valor: number
  desde: boolean
  estudiantes: CobroEstudiante<E>[]
}

// Pagado = el estudiante tiene al menos un pago en la actividad, igual que en el panel del personal.
export function cobrosPorEvento<E extends Estudiante>(
  eventos: Evento[],
  grupos: Grupo[],
  pagos: Pago[],
  estudiantes: E[]
) {
  const resultado = new Map<string, CobroEvento<E>>()
  for (const ev of eventos) {
    const productos = ev.productos ?? []
    const valor = productos.reduce((s, p) => s + Number(p.precio_unitario), 0)
    const gruposEv = grupos.filter((g) => g.evento_id === ev.id)
    const dirigidos = estudiantes.filter(
      (e) =>
        e.institucion_id === ev.institucion_id &&
        gruposEv.some(
          (g) => g.estudiante_id === e.id || (g.curso_grado !== null && g.curso_grado === e.curso_grado)
        )
    )
    resultado.set(ev.id, {
      valor,
      desde: productos.some((p) => p.tipo === 'precio_variable'),
      estudiantes: dirigidos.map((estudiante) => {
        const pagado = pagos
          .filter((p) => p.evento_id === ev.id && p.estudiante_id === estudiante.id)
          .reduce((s, p) => s + Number(p.monto), 0)
        const estado: TipoEstadoPago = pagado > 0 ? 'pagado' : ev.estado === 'abierto' ? 'disponible' : 'cerrado'
        return { estudiante, estado, pagado, valor }
      }),
    })
  }
  return resultado
}
