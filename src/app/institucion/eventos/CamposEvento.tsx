import SelectorImagen from '@/components/SelectorImagen'
import { ui } from '@/lib/ui'

type DatosEvento = {
  nombre: string
  descripcion: string | null
  fecha_limite_pago: string | null
  fecha_evento: string | null
  imagen_url: string | null
}

// Campos del evento, iguales al crear y al editar. Sin "evento" es el formulario de creación.
export default function CamposEvento({ evento }: { evento?: DatosEvento }) {
  const opcional = evento ? '' : ' (opcional)'
  return (
    <>
      <label className={ui.etiqueta}>
        Nombre del evento
        <input
          name="nombre"
          required
          defaultValue={evento?.nombre}
          placeholder="Ej.: Salida al Parque del Café"
          className={ui.campo}
        />
      </label>
      <label className={ui.etiqueta}>
        Descripción (opcional)
        <textarea name="descripcion" rows={3} defaultValue={evento?.descripcion ?? ''} className={ui.campo} />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={ui.etiqueta}>
          Pago hasta el{opcional}
          <input
            name="fecha_limite_pago"
            type="date"
            defaultValue={evento?.fecha_limite_pago ?? ''}
            className={ui.campo}
          />
        </label>
        <label className={ui.etiqueta}>
          Se realiza el{opcional}
          <input name="fecha_evento" type="date" defaultValue={evento?.fecha_evento ?? ''} className={ui.campo} />
        </label>
      </div>
      <p className={ui.ayuda}>
        Después de la fecha límite los acudientes verán &quot;pago no disponible&quot;, y desde el
        día siguiente al evento ya no lo verán.
      </p>
      {evento ? (
        // La key reinicia el selector cuando cambia la imagen guardada.
        <SelectorImagen key={evento.imagen_url ?? 'sin-imagen'} valorInicial={evento.imagen_url} />
      ) : (
        <SelectorImagen limpiarAlReiniciar />
      )}
    </>
  )
}
