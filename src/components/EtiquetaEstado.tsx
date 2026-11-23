import { CalendarCheck, CalendarX, Flag } from 'lucide-react'
import { ESTADOS, type EstadoEvento } from '@/lib/estadoEvento'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

const ICONOS = { abierto: CalendarCheck, pago_cerrado: CalendarX, finalizado: Flag }

export default function EtiquetaEstado({ estado }: { estado: EstadoEvento }) {
  const { etiqueta, clase } = ESTADOS[estado]
  const Icono = ICONOS[estado]
  return (
    <span className={`${ui.pildora} ${clase}`}>
      <Icono {...icono} size={14} />
      {etiqueta}
    </span>
  )
}
