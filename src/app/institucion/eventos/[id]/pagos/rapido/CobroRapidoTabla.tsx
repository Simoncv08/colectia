'use client'

import { useMemo, useState, useTransition } from 'react'
import { ordenarGrados } from '@/lib/ordenarGrados'
import { ui } from '@/lib/ui'
import { SIN_CURSO, pesos } from '@/lib/formato'
import type { Resultado } from '@/lib/resultado'
import { useAvisos } from '@/components/Avisos'
import { marcarDevueltaEntregada } from '../actions'

type Producto = {
  id: string
  nombre: string
  precio_unitario: number
  cantidad_maxima_por_estudiante: number | null
}

type Estudiante = {
  id: string
  nombres: string
  apellidos: string
  curso_grado: string | null
}

type PagoPrevio = {
  estudianteId: string
  productoId: string
  cantidad: number
}

type DevueltaPendiente = { grupoPagoId: string; estudianteId: string; valor: number }

type Seleccion = Record<string, { cantidad: number; devuelta: boolean; monto: string }>

const TODOS = '__todos__'

export default function CobroRapidoTabla({
  action,
  eventoId,
  estudiantes,
  productos,
  pagosPrevios,
  devueltasPendientes,
  miNombre,
}: {
  action: (formData: FormData) => Promise<Resultado>
  eventoId: string
  estudiantes: Estudiante[]
  productos: Producto[]
  pagosPrevios: PagoPrevio[]
  devueltasPendientes: DevueltaPendiente[]
  miNombre: string
}) {
  const mostrarAviso = useAvisos()
  const [entregando, startEntrega] = useTransition()
  const devueltasPorEstudiante = useMemo(() => {
    const mapa = new Map<string, DevueltaPendiente[]>()
    for (const d of devueltasPendientes) mapa.set(d.estudianteId, [...(mapa.get(d.estudianteId) ?? []), d])
    return mapa
  }, [devueltasPendientes])

  function entregarDevuelta(d: DevueltaPendiente) {
    startEntrega(async () => {
      mostrarAviso(await marcarDevueltaEntregada(eventoId, d.grupoPagoId))
    })
  }

  const cursos = useMemo(
    () =>
      ordenarGrados(
        Array.from(
          new Set(estudiantes.map((e) => e.curso_grado).filter((c): c is string => Boolean(c)))
        ).map((nombre) => ({ nombre }))
      ).map((c) => c.nombre),
    [estudiantes]
  )
  const haySinCurso = estudiantes.some((e) => !e.curso_grado)

  const [curso, setCurso] = useState<string>(cursos[0] ?? (haySinCurso ? SIN_CURSO : TODOS))
  const [productoId, setProductoId] = useState(productos[0]?.id ?? '')
  const [ocultarPagados, setOcultarPagados] = useState(false)
  const [seleccion, setSeleccion] = useState<Seleccion>({})
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const producto = productos.find((p) => p.id === productoId) ?? null
  const precio = producto ? Number(producto.precio_unitario) : 0
  const maximo = producto?.cantidad_maxima_por_estudiante ?? null
  // Máximo 1: cantidad fija. Sin máximo: campo numérico. Si no, una lista de 1 al máximo.
  const opcionesCantidad =
    maximo && maximo > 1 ? Array.from({ length: maximo }, (_, i) => i + 1) : null

  const pagadoPorClave = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const p of pagosPrevios) {
      const clave = `${p.estudianteId}|${p.productoId}`
      mapa.set(clave, (mapa.get(clave) ?? 0) + p.cantidad)
    }
    return mapa
  }, [pagosPrevios])

  function pagadoDe(estudianteId: string) {
    return pagadoPorClave.get(`${estudianteId}|${productoId}`) ?? 0
  }

  const delSalon = estudiantes.filter((e) =>
    curso === TODOS ? true : curso === SIN_CURSO ? !e.curso_grado : e.curso_grado === curso
  )
  const pagadosEnSalon = delSalon.filter((e) => pagadoDe(e.id) > 0).length
  const visibles = ocultarPagados ? delSalon.filter((e) => pagadoDe(e.id) === 0) : delSalon
  const pendientesVisibles = visibles.filter((e) => pagadoDe(e.id) === 0)

  const seleccionados = Object.keys(seleccion)
  const todosPendientesMarcados =
    pendientesVisibles.length > 0 && pendientesVisibles.every((e) => seleccion[e.id])
  const totalCobrado = seleccionados.reduce(
    (sum, id) => sum + precio * seleccion[id].cantidad,
    0
  )
  const totalDevueltas = seleccionados.reduce(
    (sum, id) => sum + (seleccion[id].devuelta ? Number(seleccion[id].monto) || 0 : 0),
    0
  )
  const devueltaSinValor = seleccionados.some(
    (id) => seleccion[id].devuelta && !(Number(seleccion[id].monto) > 0)
  )

  function limpiar() {
    setSeleccion({})
    setMensaje(null)
  }

  function alternarCobro(id: string) {
    setSeleccion((s) => {
      const copia = { ...s }
      if (copia[id]) delete copia[id]
      else copia[id] = { cantidad: 1, devuelta: false, monto: '' }
      return copia
    })
  }

  function alternarTodos() {
    setSeleccion((s) => {
      const copia = { ...s }
      if (todosPendientesMarcados) {
        for (const e of pendientesVisibles) delete copia[e.id]
      } else {
        for (const e of pendientesVisibles) {
          if (!copia[e.id]) copia[e.id] = { cantidad: 1, devuelta: false, monto: '' }
        }
      }
      return copia
    })
  }

  function alternarDevuelta(id: string) {
    setSeleccion((s) => ({
      ...s,
      [id]: { ...s[id], devuelta: !s[id].devuelta, monto: '' },
    }))
  }

  function cambiarCantidad(id: string, cantidad: number) {
    const valida = Math.max(1, maximo ? Math.min(cantidad, maximo) : cantidad)
    setSeleccion((s) => ({ ...s, [id]: { ...s[id], cantidad: valida } }))
  }

  function cambiarMontoDevuelta(id: string, monto: string) {
    setSeleccion((s) => ({ ...s, [id]: { ...s[id], monto } }))
  }

  const filas = seleccionados.map((id) => ({
    estudianteId: id,
    cantidad: seleccion[id].cantidad,
    devueltaPendiente: seleccion[id].devuelta ? Number(seleccion[id].monto) : null,
  }))

  async function enviar(formData: FormData) {
    if (!seleccionados.length || devueltaSinValor || enviando) return
    setEnviando(true)
    setMensaje(null)
    try {
      const r = await action(formData)
      if (r.tipo === 'ok') setSeleccion({})
      setMensaje(r)
    } catch (e) {
      setMensaje({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudieron registrar los pagos.',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="filas" value={JSON.stringify(filas)} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-800">
          Salón
          <select
            value={curso}
            onChange={(ev) => {
              setCurso(ev.target.value)
              limpiar()
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primario"
          >
            {cursos.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {haySinCurso && <option value={SIN_CURSO}>Sin curso asignado</option>}
            <option value={TODOS}>Todos los salones</option>
          </select>
        </label>

        {productos.length > 1 ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-800">
            Producto que se está cobrando
            <select
              value={productoId}
              onChange={(ev) => {
                setProductoId(ev.target.value)
                limpiar()
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primario"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {pesos(Number(p.precio_unitario))}
                </option>
              ))}
            </select>
          </label>
        ) : (
          producto && (
            <div className="flex flex-col gap-1 text-sm font-medium text-gray-800">
              Producto
              <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-normal text-gray-900">
                {producto.nombre} · {pesos(precio)}
              </span>
            </div>
          )
        )}

        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={ocultarPagados}
            onChange={(ev) => setOcultarPagados(ev.target.checked)}
          />
          Ocultar los que ya pagaron
        </label>
      </div>

      <p className="text-sm text-gray-700">
        Pagados en este salón:{' '}
        <span className="font-medium text-gray-900">
          {pagadosEnSalon} de {delSalon.length}
        </span>
      </p>

      {mensaje && (
        <p
          role={mensaje.tipo === 'error' ? 'alert' : 'status'}
          className={
            mensaje.tipo === 'ok'
              ? ui.avisoVerde
              : ui.avisoRojo
          }
        >
          {mensaje.texto}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-700">
            <tr>
              <th className="w-24 px-3 py-2">
                <label className="-my-2 flex min-h-11 items-center gap-2 font-normal normal-case">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={todosPendientesMarcados}
                    disabled={pendientesVisibles.length === 0}
                    onChange={alternarTodos}
                  />
                  Todos
                </label>
              </th>
              <th className="px-3 py-2">Estudiante</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Devuelta pendiente</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => {
              const pagado = pagadoDe(e.id)
              const sel = seleccion[e.id]
              return (
                <tr key={e.id} className="border-t border-gray-100 text-gray-900">
                  <td className="px-3 py-2">
                    {pagado === 0 && (
                      <label className="-m-3 inline-flex p-3">
                        <input
                          type="checkbox"
                          aria-label={`Cobrar a ${e.nombres} ${e.apellidos}`}
                          checked={Boolean(sel)}
                          onChange={() => alternarCobro(e.id)}
                          className="h-5 w-5"
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {e.apellidos} {e.nombres}
                    {curso === TODOS && e.curso_grado && (
                      <span className="ml-1 text-gray-600">({e.curso_grado})</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {pagado > 0 ? (
                      <span className={`${ui.pildora} ${ui.estadoPagado}`}>
                        Pagado{pagado > 1 ? ` (${pagado})` : ''}
                      </span>
                    ) : sel ? (
                      <span className={`${ui.pildora} border-primario-borde bg-primario-suave text-primario`}>
                        Por registrar
                      </span>
                    ) : (
                      <span className={`${ui.pildora} ${ui.estadoPendiente}`}>
                        Pendiente
                      </span>
                    )}
                    {devueltasPorEstudiante.get(e.id)?.map((d) => (
                      <div key={d.grupoPagoId} className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`${ui.pildora} ${ui.estadoPendiente}`}>
                          Se le debe {pesos(d.valor)} de devuelta
                        </span>
                        <button
                          type="button"
                          disabled={entregando}
                          onClick={() => entregarDevuelta(d)}
                          className={`${ui.enlace} inline-flex min-h-11 items-center text-xs sm:min-h-0`}
                        >
                          Ya se entregó
                        </button>
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2">
                    {sel &&
                      (opcionesCantidad ? (
                        <select
                          aria-label={`Cantidad para ${e.nombres} ${e.apellidos}`}
                          value={sel.cantidad}
                          onChange={(ev) => cambiarCantidad(e.id, Number(ev.target.value))}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-900"
                        >
                          {opcionesCantidad.map((n) => (
                            <option key={n} value={n}>
                              {n} · {pesos(precio * n)}
                            </option>
                          ))}
                        </select>
                      ) : maximo === 1 ? (
                        <span className="text-gray-700">1</span>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          aria-label={`Cantidad para ${e.nombres} ${e.apellidos}`}
                          value={sel.cantidad}
                          onChange={(ev) => cambiarCantidad(e.id, Number(ev.target.value) || 1)}
                          className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-gray-900"
                        />
                      ))}
                  </td>
                  <td className="px-3 py-2">
                    {sel && (
                      <div className="flex items-center gap-2">
                        <label className="-m-3 inline-flex p-3">
                          <input
                            type="checkbox"
                            aria-label={`Devuelta pendiente para ${e.nombres} ${e.apellidos}`}
                            checked={sel.devuelta}
                            onChange={() => alternarDevuelta(e.id)}
                            className="h-5 w-5"
                          />
                        </label>
                        {sel.devuelta && (
                          <input
                            type="number"
                            min={1}
                            step="1"
                            value={sel.monto}
                            onChange={(ev) => cambiarMontoDevuelta(e.id, ev.target.value)}
                            aria-label={`Valor que se le debe a ${e.nombres} ${e.apellidos}`}
                            placeholder="$ que se le debe"
                            className="w-32 rounded border border-gray-300 bg-white px-2 py-1 text-gray-900"
                          />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-600">
                  {delSalon.length === 0
                    ? 'No hay estudiantes de este salón en el evento.'
                    : 'Todos los estudiantes de este salón ya pagaron.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="text-sm text-gray-700">
          <p>
            {seleccionados.length} marcado(s) · Total:{' '}
            <span className="font-semibold">{pesos(totalCobrado)}</span>
            {totalDevueltas > 0 && (
              <> · Devueltas pendientes: {pesos(totalDevueltas)}</>
            )}
          </p>
          <p className="text-xs text-gray-600">Quién recibe el dinero: {miNombre}</p>
          {devueltaSinValor && (
            <p className="text-xs text-red-700">
              Escribe cuánto se le debe a cada estudiante con devuelta pendiente.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!seleccionados.length || devueltaSinValor || enviando}
          className="rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Registrando…' : `Registrar ${seleccionados.length} pago(s)`}
        </button>
      </div>
    </form>
  )
}
