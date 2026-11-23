import { ESTADOS, type EstadoEvento } from '@/lib/estadoEvento'
import { ui } from '@/lib/ui'

export default function EtiquetaEstado({ estado }: { estado: EstadoEvento }) {
  const { etiqueta, clase } = ESTADOS[estado]
  return <span className={`${ui.pildora} ${clase}`}>{etiqueta}</span>
}
