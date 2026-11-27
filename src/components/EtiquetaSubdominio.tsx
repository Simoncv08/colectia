import type { EstadoSubdominio } from '@/lib/subdominios'
import { ui } from '@/lib/ui'

const ESTADOS: Record<EstadoSubdominio, { etiqueta: string; clase: string }> = {
  aprobado: { etiqueta: 'Aprobado', clase: ui.estadoPagado },
  propuesto: { etiqueta: 'En revisión', clase: ui.estadoPendiente },
  rechazado: { etiqueta: 'Rechazado', clase: ui.estadoPeligro },
}

export default function EtiquetaSubdominio({ estado }: { estado: EstadoSubdominio }) {
  const { etiqueta, clase } = ESTADOS[estado]
  return <span className={`${ui.pildora} ${clase}`}>{etiqueta}</span>
}
