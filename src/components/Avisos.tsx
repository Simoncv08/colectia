'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, CircleX, X } from 'lucide-react'
import { icono, iconoGrande } from '@/lib/iconos'
import type { Resultado } from '@/lib/resultado'

type Aviso = Resultado & { id: number }

const ContextoAvisos = createContext<(r: Resultado) => void>(() => {})

export function useAvisos() {
  return useContext(ContextoAvisos)
}

// Avisos abajo de la pantalla con el resultado de cada acción. Los de éxito se van solos a
// los 5 segundos; los de error se quedan hasta que la persona los cierra.
export default function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguienteId = useRef(0)

  const cerrar = useCallback((id: number) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id))
  }, [])

  const mostrar = useCallback((r: Resultado) => {
    siguienteId.current += 1
    const id = siguienteId.current
    setAvisos((lista) => [...lista.slice(-2), { ...r, id }])
  }, [])

  return (
    <ContextoAvisos.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:px-6 sm:pb-6"
      >
        {avisos.map((a) => (
          <TarjetaAviso key={a.id} aviso={a} alCerrar={() => cerrar(a.id)} />
        ))}
      </div>
    </ContextoAvisos.Provider>
  )
}

function TarjetaAviso({ aviso, alCerrar }: { aviso: Aviso; alCerrar: () => void }) {
  useEffect(() => {
    if (aviso.tipo !== 'ok') return
    const temporizador = setTimeout(alCerrar, 5000)
    return () => clearTimeout(temporizador)
  }, [aviso.tipo, alCerrar])

  const esError = aviso.tipo === 'error'
  return (
    <div
      role={esError ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-lg"
    >
      {esError ? (
        <CircleX {...iconoGrande} className="shrink-0 text-peligro" />
      ) : (
        <CircleCheck {...iconoGrande} className="shrink-0 text-exito" />
      )}
      <p className="flex-1">{aviso.texto}</p>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar aviso"
        className="-my-2 -mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <X {...icono} />
      </button>
    </div>
  )
}
