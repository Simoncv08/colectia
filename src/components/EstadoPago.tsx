import { Banknote, Circle, CircleCheck, Clock } from 'lucide-react'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

// "disponible" no lleva etiqueta: con las familias no se habla de deudas (DESIGN.md).
// "sin_pago" es solo para el personal.
export type TipoEstadoPago = 'pagado' | 'pagado_efectivo' | 'sin_pago' | 'cerrado' | 'disponible'

const ESTILO = {
  pagado: { etiqueta: 'Pagado', clase: ui.estadoPagado, Icono: CircleCheck },
  pagado_efectivo: { etiqueta: 'Pagado · efectivo', clase: ui.estadoPagado, Icono: Banknote },
  sin_pago: { etiqueta: 'Sin pago', clase: ui.estadoNeutro, Icono: Circle },
  cerrado: { etiqueta: 'Plazo terminado', clase: ui.estadoNeutro, Icono: Clock },
}

export default function EstadoPago({ estado, texto }: { estado: TipoEstadoPago; texto?: string }) {
  if (estado === 'disponible') return null
  const { etiqueta, clase, Icono } = ESTILO[estado]
  return (
    <span className={`${ui.pildora} ${clase}`}>
      <Icono {...icono} size={14} />
      {texto ?? etiqueta}
    </span>
  )
}
