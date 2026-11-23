'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
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
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
        esError ? 'border-red-300 bg-red-50 text-red-900' : 'border-green-300 bg-green-50 text-green-900'
      }`}
    >
      <span aria-hidden="true" className="mt-0.5 font-bold">
        {esError ? '!' : '✓'}
      </span>
      <p className="flex-1">{aviso.texto}</p>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar aviso"
        className="-my-2 -mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none hover:bg-black/5"
      >
        ×
      </button>
    </div>
  )
}
