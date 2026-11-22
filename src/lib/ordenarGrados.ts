// Orden natural: 2A antes que 10A (como texto puro, 10A quedaría primero).
export function ordenarGrados<T extends { nombre: string }>(grados: T[]): T[] {
  return [...grados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' })
  )
}
