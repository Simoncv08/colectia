'use client'

import { useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'
import { MOTIVO_SOLO_LECTURA, useSoloLectura } from '@/components/SoloLectura'

// Los FormularioAccion de adentro la cierran cuando su acción sale bien.
export default function Ventana({
  textoBoton,
  titulo,
  children,
  variante = 'primario',
  tamano = 'md',
}: {
  textoBoton: ReactNode
  titulo: string
  children: ReactNode
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'enlace'
  tamano?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const soloLectura = useSoloLectura()

  const estilos = {
    primario: ui.botonPrimario,
    secundario: ui.botonSecundario,
    fantasma: ui.botonFantasma,
    peligro: ui.botonPeligro,
    enlace: `${ui.enlace} text-sm`,
  }[variante]

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={soloLectura}
        title={soloLectura ? MOTIVO_SOLO_LECTURA : undefined}
        onClick={() => ref.current?.showModal()}
        className={estilos}
      >
        {textoBoton}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={idTitulo}
        className={`m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 text-gray-900 shadow-lg ${
          tamano === 'lg' ? 'max-w-2xl' : 'max-w-lg'
        }`}
        onClick={(ev) => {
          // El clic en el fondo oscuro llega con target === el propio dialog.
          if (ev.target === ref.current) ref.current?.close()
        }}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 sm:px-6">
          <h2 id={idTitulo} className="text-lg font-semibold">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Cerrar"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <X {...iconoGrande} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </dialog>
    </>
  )
}
