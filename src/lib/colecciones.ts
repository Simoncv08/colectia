// Agrupa una lista por la clave que devuelve `clave`, conservando el orden de llegada en cada grupo.
export function agrupar<T, K>(lista: readonly T[], clave: (x: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>()
  for (const x of lista) {
    const k = clave(x)
    const grupo = mapa.get(k)
    if (grupo) grupo.push(x)
    else mapa.set(k, [x])
  }
  return mapa
}
