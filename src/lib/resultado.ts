import { unstable_rethrow } from 'next/navigation'

// Lo que devuelve toda acción de formulario. En producción Next oculta los mensajes de los
// errores lanzados en el servidor, por eso las acciones devuelven el mensaje en vez de lanzarlo.
export type Resultado = { tipo: 'ok' | 'error'; texto: string }

type ErrorBD = { code?: string; message: string }

// Mensajes de Postgres que la persona puede entender; si no se reconoce, el original.
export function mensajeBD(error: ErrorBD, mensajes: { duplicado?: string; enUso?: string } = {}) {
  if (error.code === '23505') return mensajes.duplicado ?? 'Ese registro ya existe.'
  if (error.code === '23503') return mensajes.enUso ?? 'No se puede: hay otros registros que dependen de este.'
  if (error.code === '42501') return 'No tienes permiso para hacer esto.'
  // RAISE EXCEPTION de nuestras funciones y triggers: los mensajes ya están escritos para la persona.
  if (error.code === 'P0001' && error.message) return error.message
  // Cualquier otro error de la base se registra en el servidor y se muestra en palabras simples.
  console.error(error)
  return 'No se pudo completar. Intenta de nuevo en un momento.'
}

// Corre una acción: lo que lance se convierte en un mensaje de error para la pantalla.
// redirect() y notFound() se dejan pasar (unstable_rethrow) para que Next los atienda.
export async function accion(fn: () => Promise<string>): Promise<Resultado> {
  const r = await accionConValor(fn)
  return r.tipo === 'ok' ? { tipo: 'ok', texto: r.valor } : r
}

// Igual que accion, para acciones que devuelven un dato en vez de un mensaje.
export type ResultadoConValor<T> = { tipo: 'ok'; valor: T } | { tipo: 'error'; texto: string }

export async function accionConValor<T>(fn: () => Promise<T>): Promise<ResultadoConValor<T>> {
  try {
    return { tipo: 'ok', valor: await fn() }
  } catch (e) {
    unstable_rethrow(e)
    return {
      tipo: 'error',
      texto: e instanceof Error && e.message ? e.message : 'No se pudo completar. Intenta de nuevo.',
    }
  }
}
