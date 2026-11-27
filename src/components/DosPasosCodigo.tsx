'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { mensajeDosPasos } from '@/lib/dosPasos'
import { ui } from '@/lib/ui'

const SEIS_DIGITOS = /^\d{6}$/

// Al acertar, Supabase deja la sesión en aal2 (en las cookies) y se entra al panel.
export default function DosPasosCodigo({
  factorId,
  textoBoton,
  autoFocus = false,
}: {
  factorId: string
  textoBoton: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const campo = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function fallar(texto: string) {
    setError(texto)
    campo.current?.select()
  }

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const codigo = String(new FormData(ev.currentTarget).get('codigo') ?? '').replace(/\s/g, '')
    if (!SEIS_DIGITOS.test(codigo)) {
      fallar('Escribe los 6 números que muestra tu app.')
      return
    }

    setError('')
    setEnviando(true)
    const { error: errorSupabase } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: codigo })
    if (errorSupabase) {
      setEnviando(false)
      fallar(mensajeDosPasos(errorSupabase))
      return
    }
    // refresh() para que el servidor lea la sesión nueva; el botón sigue deshabilitado mientras tanto.
    router.replace('/inicio')
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label className={ui.etiqueta}>
        Código de 6 dígitos
        <input
          ref={campo}
          name="codigo"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          className={`${ui.campo} tracking-[0.3em]`}
        />
      </label>
      {error && (
        <p role="alert" className={ui.avisoRojo}>
          {error}
        </p>
      )}
      <button type="submit" disabled={enviando} className={`${ui.botonPrimario} w-full`}>
        {enviando ? 'Verificando…' : textoBoton}
      </button>
    </form>
  )
}
