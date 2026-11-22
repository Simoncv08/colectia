import type { CSSProperties } from 'react'

// Todas pasan 4.5:1: blanco sobre primario, y primario sobre blanco, tono suave y fondo tintado.

export type Paleta = {
  id: string
  nombre: string
  primario: string
  primarioHover: string
  suave: string
  borde: string
  tinte: string
}

export const PALETAS: Paleta[] = [
  { id: 'azul', nombre: 'Azul', primario: '#1d4ed8', primarioHover: '#1e40af', suave: '#dbeafe', borde: '#93c5fd', tinte: '#eff6ff' },
  { id: 'verde', nombre: 'Verde', primario: '#15803d', primarioHover: '#166534', suave: '#dcfce7', borde: '#86efac', tinte: '#f0fdf4' },
  { id: 'turquesa', nombre: 'Turquesa', primario: '#0f766e', primarioHover: '#115e59', suave: '#ccfbf1', borde: '#5eead4', tinte: '#f0fdfa' },
  { id: 'morado', nombre: 'Morado', primario: '#6d28d9', primarioHover: '#5b21b6', suave: '#ede9fe', borde: '#c4b5fd', tinte: '#f5f3ff' },
  { id: 'fucsia', nombre: 'Fucsia', primario: '#a21caf', primarioHover: '#86198f', suave: '#fae8ff', borde: '#f0abfc', tinte: '#fdf4ff' },
  { id: 'vino', nombre: 'Vino tinto', primario: '#9f1239', primarioHover: '#881337', suave: '#ffe4e6', borde: '#fda4af', tinte: '#fff1f2' },
  { id: 'naranja', nombre: 'Naranja', primario: '#c2410c', primarioHover: '#9a3412', suave: '#ffedd5', borde: '#fdba74', tinte: '#fff7ed' },
  { id: 'pizarra', nombre: 'Gris pizarra', primario: '#334155', primarioHover: '#1e293b', suave: '#e2e8f0', borde: '#94a3b8', tinte: '#f8fafc' },
]

export type Fondo = { id: string; nombre: string }

export const FONDOS: Fondo[] = [
  { id: 'gris', nombre: 'Gris muy claro' },
  { id: 'blanco', nombre: 'Blanco' },
  { id: 'tinte', nombre: 'Tono suave de la paleta' },
]

export const PALETA_POR_DEFECTO = 'azul'
export const FONDO_POR_DEFECTO = 'gris'

export function buscarPaleta(id: string | null | undefined): Paleta {
  return PALETAS.find((p) => p.id === id) ?? PALETAS[0]
}

function colorFondo(paleta: Paleta, fondo: string | null | undefined) {
  if (fondo === 'blanco') return '#ffffff'
  if (fondo === 'tinte') return paleta.tinte
  return '#f9fafb'
}

// Se aplica con style={estiloPaleta(...)} en el contenedor (variables de src/app/globals.css).
export function estiloPaleta(
  paletaId: string | null | undefined,
  fondo?: string | null
): CSSProperties {
  const p = buscarPaleta(paletaId)
  return {
    '--primario': p.primario,
    '--primario-hover': p.primarioHover,
    '--primario-suave': p.suave,
    '--primario-borde': p.borde,
    '--fondo': colorFondo(p, fondo),
  } as CSSProperties
}
