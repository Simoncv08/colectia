import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import FormularioAccion from '@/components/FormularioAccion'
import Ventana from '@/components/Ventana'
import { pesos } from '@/lib/formato'
import { ui } from '@/lib/ui'
import { crearProducto, eliminarProducto } from '../actions'
import { Plus } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'

export type Producto = {
  id: string
  nombre: string
  tipo: string
  precio_unitario: number
  cantidad_maxima_por_estudiante: number | null
}

export default function SeccionProductos({
  eventoId,
  productos,
}: {
  eventoId: string
  productos: Producto[]
}) {
  return (
    <section className={`${ui.tarjeta} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={ui.subtitulo}>Productos</h2>
          <p className={ui.ayuda}>Lo que se paga en este evento (entrada, camiseta, etc.).</p>
        </div>
        <div className={ui.accionesPagina}>
          <Ventana textoBoton={
                <>
                  <Plus {...iconoGrande} />
                  Agregar producto
                </>
              } titulo="Agregar producto" variante="secundario">
            <FormularioAccion action={crearProducto.bind(null, eventoId)} className="flex flex-col gap-4">
              <label className={ui.etiqueta}>
                Nombre
                <input name="nombre" required placeholder="Ej.: Entrada" className={ui.campo} />
              </label>
              <label className={ui.etiqueta}>
                Tipo
                <select name="tipo" required className={ui.campo}>
                  <option value="precio_unico">Precio único (una compra por estudiante)</option>
                  <option value="precio_variable">Precio variable (pueden comprar varias)</option>
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={ui.etiqueta}>
                  Precio (COP)
                  <input name="precio_unitario" type="number" inputMode="numeric" min="1" step="1" required className={ui.campo} />
                </label>
                <label className={ui.etiqueta}>
                  Máximo por estudiante (opcional)
                  <input
                    name="cantidad_maxima_por_estudiante"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    className={ui.campo}
                  />
                </label>
              </div>
              <button type="submit" className={`${ui.botonPrimario} self-start`}>
                Agregar producto
              </button>
            </FormularioAccion>
          </Ventana>
        </div>
      </div>

      {productos.length ? (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {productos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{p.nombre}</p>
                <p className="text-sm text-gray-700">
                  {pesos(Number(p.precio_unitario))}
                  {p.tipo === 'precio_variable' ? ' por unidad' : ''}
                  {p.cantidad_maxima_por_estudiante
                    ? ` · máximo ${p.cantidad_maxima_por_estudiante} por estudiante`
                    : ''}
                </p>
              </div>
              <FormularioAccion action={eliminarProducto.bind(null, eventoId, p.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`¿Eliminar el producto "${p.nombre}"?`}
                  className={ui.botonQuitar}
                >
                  Eliminar
                </ConfirmSubmitButton>
              </FormularioAccion>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.avisoAmbar}>Todavía no tiene productos, así que no se pueden registrar pagos.</p>
      )}
    </section>
  )
}
