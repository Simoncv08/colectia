import { ui } from '@/lib/ui'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { FONDOS, FONDO_POR_DEFECTO, PALETAS, PALETA_POR_DEFECTO, estiloPaleta } from '@/lib/paletas'
import { guardarApariencia } from './actions'
import FormularioAccion from '@/components/FormularioAccion'

export const metadata = { title: 'Personalización' }

export default async function PersonalizacionPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null

  if (!sesion.esAdmin) {
    return <p className="text-gray-700">Solo el administrador puede cambiar los colores.</p>
  }

  const paletaActual = sesion.institucion.paleta ?? PALETA_POR_DEFECTO
  const fondoActual = sesion.institucion.fondo ?? FONDO_POR_DEFECTO

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Personalización</h1>
        <p className="mt-1 text-sm text-gray-700">
          Elige los colores de tu institución. Los verán tu personal en este panel y los
          acudientes en los eventos de tu institución. Todas las paletas están pensadas para que
          el texto se lea bien.
        </p>
      </div>

      <FormularioAccion action={guardarApariencia} vaciarAlTerminar={false} className="flex flex-col gap-6">
        <fieldset className={ui.tarjeta}>
          <legend className="px-1 text-sm font-semibold text-gray-900">Paleta de colores</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PALETAS.map((p) => (
              <label
                key={p.id}
                className="cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-3 has-[:checked]:border-gray-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primario"
              >
                <input
                  type="radio"
                  name="paleta"
                  value={p.id}
                  defaultChecked={p.id === paletaActual}
                  className="sr-only"
                />
                <div className="flex gap-1">
                  <span className="h-8 flex-1 rounded" style={{ background: p.primario }} />
                  <span className="h-8 flex-1 rounded" style={{ background: p.suave }} />
                  <span className="h-8 flex-1 rounded border border-gray-200" style={{ background: p.tinte }} />
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">{p.nombre}</p>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={ui.tarjeta}>
          <legend className="px-1 text-sm font-semibold text-gray-900">Color de fondo</legend>
          <div className="flex flex-wrap gap-3">
            {FONDOS.map((f) => (
              <label
                key={f.id}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border-2 border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 has-[:checked]:border-gray-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primario"
              >
                <input
                  type="radio"
                  name="fondo"
                  value={f.id}
                  defaultChecked={f.id === fondoActual}
                  className="sr-only"
                />
                {f.nombre}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <button
            type="submit"
            className="rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-hover"
          >
            Guardar colores
          </button>
        </div>
      </FormularioAccion>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Así se ve ahora</h2>
        <div
          className="rounded-xl border border-gray-200 bg-fondo p-4"
          style={estiloPaleta(paletaActual, fondoActual)}
        >
          <div className={ui.tarjeta}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-gray-900">Salida al Parque del Café</p>
              <EtiquetaEstado estado="abierto" />
            </div>
            <p className="mt-1 text-[13px] text-gray-600">Paga hasta el 28 sept. 2026 · Se realiza el 1 oct. 2026</p>
            <div className="mt-3 flex gap-2">
              <span className={ui.botonPrimario}>Botón principal</span>
              <span className={ui.botonSecundario}>Botón secundario</span>
              <span className={`${ui.enlace} self-center text-sm`}>Enlace</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
