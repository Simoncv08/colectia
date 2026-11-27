import FormularioAccion from '@/components/FormularioAccion'
import CampoSubdominio from '@/components/CampoSubdominio'
import EtiquetaSubdominio from '@/components/EtiquetaSubdominio'
import { direccionColegio, type EstadoSubdominio } from '@/lib/subdominios'
import { ui } from '@/lib/ui'
import { proponerSubdominio } from './actions'

// La dirección del colegio (lcp.colectia.co). Se propone aquí y la aprueba Colectia; ya
// aprobada, solo soporte la cambia.
export default function TarjetaDireccion({
  subdominio,
  estado,
  motivo,
}: {
  subdominio: string | null
  estado: EstadoSubdominio | null
  motivo: string | null
}) {
  return (
    <section className={`${ui.tarjeta} flex flex-col gap-3`} aria-labelledby="titulo-direccion">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="titulo-direccion" className={ui.subtitulo}>
          Dirección del colegio
        </h2>
        {estado && <EtiquetaSubdominio estado={estado} />}
      </div>

      {estado === 'aprobado' && subdominio ? (
        <p className="text-gray-700">
          Tu personal y las familias entran por{' '}
          <span className="font-semibold text-gray-900">{direccionColegio(subdominio)}</span>. Para
          cambiarla, escribe a soporte.
        </p>
      ) : (
        <>
          <p className={ui.textoSecundario}>
            Es la dirección por la que entrarán tu personal y las familias. Usa las siglas o el
            nombre corto del colegio. Colectia la revisa antes de activarla.
          </p>
          {estado === 'propuesto' && subdominio && (
            <p className={ui.avisoInfo}>
              {direccionColegio(subdominio)} está en revisión. Puedes cambiarla mientras tanto.
            </p>
          )}
          {estado === 'rechazado' && motivo && (
            <p className={ui.avisoAmbar}>
              No se aprobó {subdominio ? direccionColegio(subdominio) : 'la dirección'}: {motivo}
            </p>
          )}
          <FormularioAccion
            action={proponerSubdominio}
            vaciarAlTerminar={false}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="sm:w-96">
              <CampoSubdominio etiqueta="Dirección" valorInicial={estado === 'rechazado' ? null : subdominio} />
            </div>
            <button type="submit" className={ui.botonPrimario}>
              {estado === 'propuesto' ? 'Cambiar propuesta' : 'Enviar para aprobación'}
            </button>
          </FormularioAccion>
        </>
      )}
    </section>
  )
}
