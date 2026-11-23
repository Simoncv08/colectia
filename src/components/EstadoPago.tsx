import { ui } from '@/lib/ui'

// Sin etiqueta para lo que no se ha pagado: muchas actividades son opcionales.
export type TipoEstadoPago = 'pagado' | 'disponible' | 'cerrado'

const ESTILO: Record<Exclude<TipoEstadoPago, 'disponible'>, { etiqueta: string; clase: string }> = {
  pagado: { etiqueta: 'Pagado', clase: ui.estadoPagado },
  cerrado: { etiqueta: 'Plazo terminado', clase: ui.estadoNeutro },
}

export default function EstadoPago({ estado }: { estado: TipoEstadoPago }) {
  if (estado === 'disponible') return null
  const { etiqueta, clase } = ESTILO[estado]
  return <span className={`${ui.pildora} ${clase}`}>{etiqueta}</span>
}
