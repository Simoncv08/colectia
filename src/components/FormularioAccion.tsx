'use client'

import { useRef, useTransition, type FormEvent, type ReactNode } from 'react'
import type { Resultado } from '@/lib/resultado'
import { useAvisos } from '@/components/Avisos'
import { MOTIVO_SOLO_LECTURA, useSoloLectura } from '@/components/SoloLectura'

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
  const soloLectura = useSoloLectura()

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
    <form
      ref={formulario}
      onSubmit={enviar}
      aria-busy={enviando}
      title={soloLectura ? MOTIVO_SOLO_LECTURA : undefined}
      className={className}
    >
      <fieldset disabled={enviando || soloLectura} className="contents">
        {children}
      </fieldset>
    </form>
  )
}
