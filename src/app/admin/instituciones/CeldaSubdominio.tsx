import FormularioAccion from '@/components/FormularioAccion'
import CampoSubdominio from '@/components/CampoSubdominio'
import EtiquetaSubdominio from '@/components/EtiquetaSubdominio'
import { direccionColegio, type EstadoSubdominio } from '@/lib/subdominios'
import { ui } from '@/lib/ui'
import { aprobarSubdominio, rechazarSubdominio } from './actions'

// Propuesto: aprobar o rechazar con motivo. Sin dirección o rechazado: asignar una. Aprobado:
// cambiarla (excepcional).
export default function CeldaSubdominio({
  institucionId,
  nombre,
  subdominio,
  estado,
  motivo,
}: {
  institucionId: string
  nombre: string
  subdominio: string | null
  estado: EstadoSubdominio | null
  motivo: string | null
}) {
  return (
    <div className="flex flex-col gap-2">
      {estado && subdominio && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{direccionColegio(subdominio)}</span>
          <EtiquetaSubdominio estado={estado} />
        </div>
      )}
      {estado === 'rechazado' && motivo && <p className={ui.ayuda}>Motivo: {motivo}</p>}

      {estado === 'propuesto' ? (
        <div className="flex flex-col gap-2">
          <FormularioAccion action={aprobarSubdominio.bind(null, institucionId)}>
            <button type="submit" className={ui.botonCompacto}>
              Aprobar
            </button>
          </FormularioAccion>
          <FormularioAccion action={rechazarSubdominio.bind(null, institucionId)} className="flex items-center gap-2">
            <input
              name="motivo"
              required
              maxLength={300}
              aria-label={`Motivo del rechazo para ${nombre}`}
              placeholder="Motivo del rechazo"
              className={`${ui.campoCompacto} w-52`}
            />
            <button type="submit" className={ui.botonCompacto}>
              Rechazar
            </button>
          </FormularioAccion>
        </div>
      ) : (
        <FormularioAccion action={aprobarSubdominio.bind(null, institucionId)} className="flex items-end gap-2">
          <div className="w-56">
            <CampoSubdominio
              compacto
              etiqueta={`${estado === 'aprobado' ? 'Cambiar' : 'Asignar'} la dirección de ${nombre}`}
            />
          </div>
          <button type="submit" className={ui.botonCompacto}>
            {estado === 'aprobado' ? 'Cambiar' : 'Asignar'}
          </button>
        </FormularioAccion>
      )}
    </div>
  )
}
