import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import {
  agregarGrupoPorCurso,
  agregarGrupoPorEstudiante,
  agregarGrupoPorGrupoDeCursos,
  quitarGrupo,
  crearProducto,
  eliminarProducto,
  actualizarEvento,
  eliminarEvento,
  finalizarEvento,
  reabrirEvento,
} from '../actions'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import SelectorImagen from '@/components/SelectorImagen'
import Ventana from '@/components/Ventana'
import { ESTADOS, estadoEvento, formatearFecha, hoyColombia } from '@/lib/estadoEvento'
import { ordenarGrados } from '@/lib/ordenarGrados'
import { traerTodasLasFilas } from '@/lib/consultas'
import { pesos } from '@/lib/reportes'
import { ui } from '@/lib/ui'

type Params = { params: Promise<{ id: string }> }

type GrupoConEstudiante = {
  id: string
  curso_grado: string | null
  estudiante_id: string | null
  estudiantes: { nombres: string; apellidos: string; curso_grado: string | null } | null
}

type Producto = {
  id: string
  nombre: string
  tipo: string
  precio_unitario: number
  cantidad_maxima_por_estudiante: number | null
}

type EstudianteOpcion = { id: string; nombres: string; apellidos: string; curso_grado: string | null }

export const metadata = { title: 'Configurar evento' }

export default async function ConfigurarEventoPage({ params }: Params) {
  const { id } = await params
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion

  const { data: evento } = await supabase
    .from('eventos')
    .select('id, institucion_id, nombre, descripcion, imagen_url, fecha_limite_pago, fecha_evento, finalizado_en')
    .eq('id', id)
    .eq('institucion_id', institucionId)
    .maybeSingle()

  if (!evento) {
    notFound()
  }

  const [{ data: gradosCrudos }, { data: gruposCurso }, { data: gruposCrudos }, { data: productosCrudos }, { count: pagosDelEvento }, { data: estudiantes }] =
    await Promise.all([
      supabase.from('grados').select('id, nombre').eq('institucion_id', institucionId),
      supabase
        .from('grupos_curso')
        .select('id, nombre')
        .eq('institucion_id', institucionId)
        .order('nombre', { ascending: true }),
      supabase
        .from('evento_grupos')
        .select('id, curso_grado, estudiante_id, estudiantes(nombres, apellidos, curso_grado)')
        .eq('evento_id', evento.id),
      supabase
        .from('productos')
        .select('id, nombre, tipo, precio_unitario, cantidad_maxima_por_estudiante')
        .eq('evento_id', evento.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('registros_pago')
        .select('id', { count: 'exact', head: true })
        .eq('evento_id', evento.id),
      traerTodasLasFilas<EstudianteOpcion>((desde, hasta) =>
        supabase
          .from('estudiantes')
          .select('id, nombres, apellidos, curso_grado')
          .eq('institucion_id', institucionId)
          .order('apellidos', { ascending: true })
          .order('id', { ascending: true })
          .range(desde, hasta)
      ),
    ])

  const grados = ordenarGrados(gradosCrudos ?? [])
  const grupos = (gruposCrudos ?? []) as unknown as GrupoConEstudiante[]
  const cursosDirigidos = ordenarGrados(
    grupos.filter((g) => g.curso_grado).map((g) => ({ ...g, nombre: g.curso_grado! }))
  )
  const estudiantesDirigidos = grupos.filter((g) => g.estudiante_id)
  const productos = (productosCrudos ?? []) as Producto[]

  const hoy = hoyColombia()
  const estadoActual = estadoEvento(evento, hoy)
  const estado = ESTADOS[estadoActual]
  const sePuedeReabrir =
    estadoActual === 'finalizado' &&
    Boolean(evento.finalizado_en) &&
    !(evento.fecha_evento && hoy > evento.fecha_evento)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/institucion/eventos" className={`${ui.enlace} text-sm`}>
          ← Eventos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className={ui.titulo}>{evento.nombre}</h1>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${estado.clase}`}>
            {estado.etiqueta}
          </span>
        </div>
        <p className={ui.textoSecundario}>Configuración del evento</p>
      </div>

      <section className={`${ui.tarjeta} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className={ui.subtitulo}>Datos del evento</h2>
          <Ventana textoBoton="Editar datos" titulo="Editar evento" variante="secundario" tamano="lg">
            <form action={actualizarEvento.bind(null, evento.id)} className="flex flex-col gap-4">
              <label className={ui.etiqueta}>
                Nombre
                <input name="nombre" defaultValue={evento.nombre} required className={ui.campo} />
              </label>
              <label className={ui.etiqueta}>
                Descripción (opcional)
                <textarea
                  name="descripcion"
                  defaultValue={evento.descripcion ?? ''}
                  rows={3}
                  className={ui.campo}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={ui.etiqueta}>
                  Pago hasta el
                  <input
                    name="fecha_limite_pago"
                    type="date"
                    defaultValue={evento.fecha_limite_pago ?? ''}
                    className={ui.campo}
                  />
                </label>
                <label className={ui.etiqueta}>
                  Se realiza el
                  <input
                    name="fecha_evento"
                    type="date"
                    defaultValue={evento.fecha_evento ?? ''}
                    className={ui.campo}
                  />
                </label>
              </div>
              {/* La key reinicia el selector cuando cambia la imagen guardada. */}
              <SelectorImagen
                key={evento.imagen_url ?? 'sin-imagen'}
                institucionId={institucionId}
                valorInicial={evento.imagen_url}
              />
              <button type="submit" className={`${ui.botonPrimario} self-start`}>
                Guardar cambios
              </button>
            </form>
          </Ventana>
        </div>

        <div className="flex flex-wrap gap-4">
          {evento.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={evento.imagen_url}
              alt={evento.nombre}
              className="h-28 w-40 rounded-lg border border-gray-200 object-cover"
            />
          )}
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-600">Pago hasta el</dt>
              <dd className="font-medium text-gray-900">
                {evento.fecha_limite_pago ? formatearFecha(evento.fecha_limite_pago) : 'Sin fecha'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Se realiza el</dt>
              <dd className="font-medium text-gray-900">
                {evento.fecha_evento ? formatearFecha(evento.fecha_evento) : 'Sin fecha'}
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
          {estadoActual !== 'finalizado' && (
            <form action={finalizarEvento.bind(null, evento.id)}>
              <ConfirmSubmitButton
                confirmMessage={`¿Marcar "${evento.nombre}" como finalizado? Los acudientes ya no lo verán.`}
                className={ui.botonSecundario}
              >
                Marcar como finalizado
              </ConfirmSubmitButton>
            </form>
          )}
          {sePuedeReabrir && (
            <form action={reabrirEvento.bind(null, evento.id)}>
              <ConfirmSubmitButton
                confirmMessage={`¿Reabrir "${evento.nombre}"? Los acudientes lo volverán a ver.`}
                className={ui.botonSecundario}
              >
                Reabrir evento
              </ConfirmSubmitButton>
            </form>
          )}
          {pagosDelEvento ? (
            <p className="self-center text-xs text-gray-600">
              No se puede eliminar: tiene {pagosDelEvento} pago(s) registrado(s).
            </p>
          ) : (
            <form action={eliminarEvento.bind(null, evento.id)}>
              <ConfirmSubmitButton
                confirmMessage={`¿Eliminar el evento "${evento.nombre}"? Esto también elimina sus productos y a quién va dirigido. No se puede deshacer.`}
                className={ui.botonPeligro}
              >
                Eliminar evento
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      </section>

      <section className={`${ui.tarjeta} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={ui.subtitulo}>Dirigido a</h2>
            <p className={ui.ayuda}>Solo los acudientes de estos estudiantes ven el evento.</p>
          </div>
          <Ventana textoBoton="+ Agregar" titulo="¿A quién va dirigido?" variante="secundario">
            <div className="flex flex-col gap-5">
              {(gruposCurso ?? []).length > 0 && (
                <form
                  action={agregarGrupoPorGrupoDeCursos.bind(null, evento.id)}
                  className="flex flex-col gap-2"
                >
                  <label className={ui.etiqueta}>
                    Un grupo de cursos (ej.: Primaria)
                    <select name="grupo_curso_id" required defaultValue="" className={ui.campo}>
                      <option value="" disabled>
                        Selecciona un grupo
                      </option>
                      {(gruposCurso ?? []).map((gc) => (
                        <option key={gc.id} value={gc.id}>
                          {gc.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className={`${ui.botonPrimario} self-start`}>
                    Agregar grupo
                  </button>
                </form>
              )}
              <form
                action={agregarGrupoPorCurso.bind(null, evento.id)}
                className="flex flex-col gap-2 border-t border-gray-200 pt-4 first:border-0 first:pt-0"
              >
                <label className={ui.etiqueta}>
                  Un curso completo
                  <select name="curso_grado" required defaultValue="" className={ui.campo}>
                    <option value="" disabled>
                      Selecciona un curso
                    </option>
                    {grados.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Agregar curso
                </button>
              </form>
              <form
                action={agregarGrupoPorEstudiante.bind(null, evento.id)}
                className="flex flex-col gap-2 border-t border-gray-200 pt-4"
              >
                <label className={ui.etiqueta}>
                  Un estudiante puntual
                  <select name="estudiante_id" required defaultValue="" className={ui.campo}>
                    <option value="" disabled>
                      Selecciona un estudiante
                    </option>
                    {estudiantes.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.apellidos} {e.nombres}
                        {e.curso_grado ? ` (${e.curso_grado})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`${ui.botonPrimario} self-start`}>
                  Agregar estudiante
                </button>
              </form>
            </div>
          </Ventana>
        </div>

        {!grupos.length ? (
          <p className={ui.avisoAmbar}>
            Todavía no está dirigido a nadie, así que ningún acudiente puede verlo.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {cursosDirigidos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {cursosDirigidos.map((g) => (
                  <li key={g.id} className={ui.chip}>
                    {g.curso_grado}
                    <form action={quitarGrupo.bind(null, evento.id, g.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`¿Quitar el curso ${g.curso_grado} de este evento?`}
                        ariaLabel={`Quitar el curso ${g.curso_grado}`}
                        className={ui.botonChip}
                      >
                        ×
                      </ConfirmSubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {estudiantesDirigidos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-700">Estudiantes puntuales</p>
                <ul className="flex flex-wrap gap-2">
                  {estudiantesDirigidos.map((g) => (
                    <li key={g.id} className={ui.chip}>
                      {g.estudiantes?.apellidos} {g.estudiantes?.nombres}
                      {g.estudiantes?.curso_grado ? ` (${g.estudiantes.curso_grado})` : ''}
                      <form action={quitarGrupo.bind(null, evento.id, g.id)}>
                        <ConfirmSubmitButton
                          confirmMessage="¿Quitar a este estudiante del evento?"
                          ariaLabel={`Quitar a ${g.estudiantes?.nombres ?? 'este estudiante'} del evento`}
                          className={ui.botonChip}
                        >
                          ×
                        </ConfirmSubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={`${ui.tarjeta} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={ui.subtitulo}>Productos</h2>
            <p className={ui.ayuda}>Lo que se paga en este evento (entrada, camiseta, etc.).</p>
          </div>
          <Ventana textoBoton="+ Agregar producto" titulo="Agregar producto" variante="secundario">
            <form action={crearProducto.bind(null, evento.id)} className="flex flex-col gap-4">
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
                  <input name="precio_unitario" type="number" min="1" step="0.01" required className={ui.campo} />
                </label>
                <label className={ui.etiqueta}>
                  Máximo por estudiante (opcional)
                  <input
                    name="cantidad_maxima_por_estudiante"
                    type="number"
                    min="1"
                    step="1"
                    className={ui.campo}
                  />
                </label>
              </div>
              <button type="submit" className={`${ui.botonPrimario} self-start`}>
                Agregar producto
              </button>
            </form>
          </Ventana>
        </div>

        {productos.length ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {productos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{p.nombre}</p>
                  <p className="text-sm text-gray-700">
                    {pesos(Number(p.precio_unitario))}
                    {p.tipo === 'precio_variable' ? ' por unidad' : ''}
                    {p.cantidad_maxima_por_estudiante
                      ? ` · máximo ${p.cantidad_maxima_por_estudiante} por estudiante`
                      : ''}
                  </p>
                </div>
                <form action={eliminarProducto.bind(null, evento.id, p.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`¿Eliminar el producto "${p.nombre}"?`}
                    className={ui.botonQuitar}
                  >
                    Eliminar
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.avisoAmbar}>Todavía no tiene productos, así que no se pueden registrar pagos.</p>
        )}
      </section>
    </div>
  )
}
