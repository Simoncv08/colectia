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
  return error.message
}

// Corre una acción: lo que lance se convierte en un mensaje de error para la pantalla.
// redirect() y notFound() se dejan pasar (unstable_rethrow) para que Next los atienda.
export async function accion(fn: () => Promise<string>): Promise<Resultado> {
  try {
    return { tipo: 'ok', texto: await fn() }
  } catch (e) {
    unstable_rethrow(e)
    return {
      tipo: 'error',
      texto: e instanceof Error && e.message ? e.message : 'No se pudo completar. Intenta de nuevo.',
    }
  }
}
