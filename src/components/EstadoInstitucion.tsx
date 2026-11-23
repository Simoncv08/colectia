import { CircleCheck, CirclePause, CircleX, FlaskConical } from 'lucide-react'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

const ESTILO: Record<string, { etiqueta: string; clase: string; Icono: typeof CircleCheck }> = {
  activa: { etiqueta: 'Activa', clase: ui.estadoPagado, Icono: CircleCheck },
  en_prueba: { etiqueta: 'En prueba', clase: ui.estadoPendiente, Icono: FlaskConical },
  suspendida: { etiqueta: 'Suspendida', clase: ui.estadoPeligro, Icono: CirclePause },
  cancelada: { etiqueta: 'Cancelada', clase: ui.estadoNeutro, Icono: CircleX },
}

export default function EstadoInstitucion({ estado }: { estado: string }) {
  const e = ESTILO[estado]
  if (!e) return null
  return (
    <span className={`${ui.pildora} ${e.clase}`}>
      <e.Icono {...icono} size={14} />
      {e.etiqueta}
    </span>
  )
}
