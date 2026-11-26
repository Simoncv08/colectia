import { compararCursos } from '@/lib/formato'

export function ordenarGrados<T extends { nombre: string }>(grados: T[]): T[] {
  return [...grados].sort((a, b) => compararCursos(a.nombre, b.nombre))
}
