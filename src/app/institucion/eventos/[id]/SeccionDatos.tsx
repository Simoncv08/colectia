import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import FormularioAccion from '@/components/FormularioAccion'
import Ventana from '@/components/Ventana'
import { formatearFecha, type EstadoEvento } from '@/lib/estadoEvento'
import { ui } from '@/lib/ui'
import CamposEvento from '../CamposEvento'
import { actualizarEvento, eliminarEvento, finalizarEvento, reabrirEvento } from '../actions'

type Evento = {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  fecha_limite_pago: string | null
  fecha_evento: string | null
}

export default function SeccionDatos({
  evento,
  institucionId,
  estado,
  sePuedeReabrir,
  pagosDelEvento,
}: {
  evento: Evento
  institucionId: string
  estado: EstadoEvento
  sePuedeReabrir: boolean
  pagosDelEvento: number
}) {
  return (
    <section className={`${ui.tarjeta} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className={ui.subtitulo}>Datos del evento</h2>
        <div className={ui.accionesPagina}>
          <Ventana textoBoton="Editar datos" titulo="Editar evento" variante="secundario" tamano="lg">
            <FormularioAccion
              action={actualizarEvento.bind(null, evento.id)}
              vaciarAlTerminar={false}
              className="flex flex-col gap-4"
            >
              <CamposEvento institucionId={institucionId} evento={evento} />
              <button type="submit" className={`${ui.botonPrimario} self-start`}>
                Guardar cambios
              </button>
            </FormularioAccion>
          </Ventana>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {evento.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            referrerPolicy="no-referrer"
            src={evento.imagen_url}
            alt={evento.nombre}
            className="h-28 w-40 rounded-lg border border-gray-200 object-cover"
          />
        )}
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-600">Pago hasta el</dt>
            <dd className="font-medium text-gray-900">
              {formatearFecha(evento.fecha_limite_pago) || 'Sin fecha'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Se realiza el</dt>
            <dd className="font-medium text-gray-900">
              {formatearFecha(evento.fecha_evento) || 'Sin fecha'}
            </dd>
          </div>
          {evento.descripcion && (
            <div className="col-span-2">
              <dt className="text-gray-600">Descripción</dt>
              <dd className="text-gray-900">{evento.descripcion}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        {estado !== 'finalizado' && (
          <FormularioAccion action={finalizarEvento.bind(null, evento.id)}>
            <ConfirmSubmitButton
              confirmMessage={`¿Marcar "${evento.nombre}" como finalizado? Los acudientes ya no lo verán.`}
              className={ui.botonSecundario}
              peligro={false}
            >
              Marcar como finalizado
            </ConfirmSubmitButton>
          </FormularioAccion>
        )}
        {sePuedeReabrir && (
          <FormularioAccion action={reabrirEvento.bind(null, evento.id)}>
            <ConfirmSubmitButton
              confirmMessage={`¿Reabrir "${evento.nombre}"? Los acudientes lo volverán a ver.`}
              className={ui.botonSecundario}
              peligro={false}
            >
              Reabrir evento
            </ConfirmSubmitButton>
          </FormularioAccion>
        )}
        {pagosDelEvento ? (
          <p className="self-center text-xs text-gray-600">
            No se puede eliminar: tiene {pagosDelEvento} pago(s) registrado(s).
          </p>
        ) : (
          <FormularioAccion action={eliminarEvento.bind(null, evento.id)}>
            <ConfirmSubmitButton
              confirmMessage={`¿Eliminar el evento "${evento.nombre}"? Esto también elimina sus productos y a quién va dirigido. No se puede deshacer.`}
              className={ui.botonPeligro}
            >
              Eliminar evento
            </ConfirmSubmitButton>
          </FormularioAccion>
        )}
      </div>
    </section>
  )
}
