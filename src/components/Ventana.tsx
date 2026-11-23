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
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'enlace' | 'enlaceFila'
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
    // "Editar" a la derecha de un elemento de lista.
    enlaceFila: `${ui.enlaceFila} shrink-0 text-sm`,
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
      {/* En celular sale como hoja desde abajo; el encabezado queda fijo y solo el contenido se desplaza. */}
      <dialog
        ref={ref}
        aria-labelledby={idTitulo}
        className={`mx-auto mb-0 mt-auto max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-xl bg-white p-0 text-gray-900 shadow-lg open:flex sm:m-auto sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:rounded-xl ${
          tamano === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        onClick={(ev) => {
          // El clic en el fondo oscuro llega con target === el propio dialog.
          if (ev.target === ref.current) ref.current?.close()
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2 sm:px-6 sm:py-3">
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
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          {children}
        </div>
      </dialog>
    </>
  )
}
