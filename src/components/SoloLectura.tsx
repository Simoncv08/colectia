'use client'

import { createContext, useContext, type ReactNode } from 'react'

// Con la institución suspendida o cancelada, el panel del personal queda de solo consulta:
// FormularioAccion, Ventana y el cobro por salón leen esto y deshabilitan sus botones.
export const MOTIVO_SOLO_LECTURA =
  'La institución no está activa: puedes consultar la información, pero no crear ni modificar registros.'

const Contexto = createContext(false)

export function ProveedorSoloLectura({ activo, children }: { activo: boolean; children: ReactNode }) {
  return <Contexto.Provider value={activo}>{children}</Contexto.Provider>
}

export function useSoloLectura() {
  return useContext(Contexto)
}
