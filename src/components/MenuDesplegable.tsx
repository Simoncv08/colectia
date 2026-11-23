'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

// Botón que abre un panel (menú de cuenta, navegación en celular). Se cierra con Escape,
// con un clic afuera o al elegir un enlace del panel.
export default function MenuDesplegable({
  boton,
  etiqueta,
  children,
  className = '',
}: {
  boton: ReactNode
  etiqueta: string
  children: ReactNode
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const idPanel = useId()

  useEffect(() => {
    if (!abierto) return
    function alClic(ev: MouseEvent) {
      if (!contenedor.current?.contains(ev.target as Node)) setAbierto(false)
    }
    function alTecla(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={etiqueta}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
      >
        {boton}
      </button>
      <div
        id={idPanel}
        hidden={!abierto}
        onClick={(ev) => {
          if ((ev.target as HTMLElement).closest('a')) setAbierto(false)
        }}
        className={`absolute right-0 z-40 mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
