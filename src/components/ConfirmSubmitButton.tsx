'use client'

import { useId, useRef, type ReactNode } from 'react'
import { ui } from '@/lib/ui'

// Pide confirmación en una ventana antes de enviar, para acciones que no se pueden deshacer.
// El mensaje se parte en la pregunta (título) y la consecuencia (lo que sigue al "?").
export default function ConfirmSubmitButton({
  children,
  confirmMessage,
  className,
  ariaLabel,
  textoConfirmar,
  peligro = true,
}: {
  children: ReactNode
  confirmMessage: string
  className?: string
  ariaLabel?: string
  textoConfirmar?: string
  peligro?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const corte = confirmMessage.indexOf('?') + 1
  const pregunta = corte ? confirmMessage.slice(0, corte) : confirmMessage
  const consecuencia = corte ? confirmMessage.slice(corte).trim() : ''
  const confirmar =
    textoConfirmar ??
    (typeof children === 'string' && children !== '×' ? children : ariaLabel?.split(' ')[0] ?? 'Confirmar')

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={idTitulo}
        className="mx-auto mb-0 mt-auto w-full max-w-none overscroll-contain rounded-t-xl bg-white p-0 text-gray-900 shadow-lg sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-xl"
        onClick={(ev) => {
          if (ev.target === ref.current) ref.current?.close()
        }}
      >
        <div className="flex flex-col gap-2 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <h2 id={idTitulo} className="text-lg font-semibold">
            {pregunta}
          </h2>
          {consecuencia && <p className={ui.textoSecundario}>{consecuencia}</p>}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={ui.botonSecundario} onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button
              type="submit"
              className={peligro ? ui.botonPeligroSolido : ui.botonPrimario}
              onClick={() => ref.current?.close()}
            >
              {confirmar}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
