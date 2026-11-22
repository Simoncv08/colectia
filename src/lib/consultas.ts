type Respuesta<T> = { data: T[] | null; error: { message: string } | null }

// Supabase devuelve máximo 1000 filas por consulta, así que se pide página por página.
// La consulta necesita un .order(...) fijo para que las páginas no se crucen.
export async function traerTodasLasFilas<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<Respuesta<T>>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const TAMANO = 1000
  const todas: T[] = []
  for (let desde = 0; ; desde += TAMANO) {
    const { data, error } = await consulta(desde, desde + TAMANO - 1)
    if (error) return { data: todas, error }
    todas.push(...(data ?? []))
    if (!data || data.length < TAMANO) break
  }
  return { data: todas, error: null }
}

// Con cientos de ids, .in('id', ids) arma una URL tan larga que la consulta falla ("fetch failed").
export function enTrozos<T>(lista: T[], tamano = 100): T[][] {
  const trozos: T[][] = []
  for (let i = 0; i < lista.length; i += tamano) {
    trozos.push(lista.slice(i, i + tamano))
  }
  return trozos
}
