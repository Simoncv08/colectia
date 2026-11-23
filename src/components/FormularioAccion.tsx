'use client'

import { useRef, useTransition, type FormEvent, type ReactNode } from 'react'
import type { Resultado } from '@/lib/resultado'
import { useAvisos } from '@/components/Avisos'

// Formulario que llama a una acción del servidor y muestra su resultado como aviso. Si sale
// bien, se vacía y cierra la ventana en la que esté; si falla, conserva lo escrito.
export default function FormularioAccion({
  action,
  children,
  className,
  vaciarAlTerminar = true,
}: {
  action: (formData: FormData) => Promise<Resultado | void>
  children: ReactNode
  className?: string
  vaciarAlTerminar?: boolean
}) {
  const formulario = useRef<HTMLFormElement>(null)
  const [enviando, startTransition] = useTransition()
  const mostrarAviso = useAvisos()

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const datos = new FormData(ev.currentTarget)
    startTransition(async () => {
      const resultado = await action(datos)
      if (!resultado) return
      mostrarAviso(resultado)
      if (resultado.tipo === 'ok') {
        if (vaciarAlTerminar) formulario.current?.reset()
        formulario.current?.closest('dialog')?.close()
      }
    })
  }

  return (
    <form ref={formulario} onSubmit={enviar} aria-busy={enviando} className={className}>
      <fieldset disabled={enviando} className="contents">
        {children}
      </fieldset>
    </form>
  )
}
