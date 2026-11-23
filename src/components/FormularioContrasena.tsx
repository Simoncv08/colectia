'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

const LARGO_MINIMO = 8

// Se usa en "Mi cuenta" y en /restablecer (enlace del correo de recuperación).
export default function FormularioContrasena({ alTerminar }: { alTerminar?: 'ir_al_inicio' }) {
  const router = useRouter()
  // refresh() para que el servidor vuelva a leer las cookies de la sesión nueva.
  function irAlInicio() {
    router.replace('/')
    router.refresh()
  }
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const formulario = ev.currentTarget
    const datos = new FormData(formulario)
    const contrasena = String(datos.get('contrasena') ?? '')
    const confirmar = String(datos.get('confirmar') ?? '')

    setError('')
    setListo(false)
    if (contrasena.length < LARGO_MINIMO) {
      setError(`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`)
      return
    }
    if (contrasena !== confirmar) {
      setError('Las dos contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    const supabase = createClient()
    const { error: errorSupabase } = await supabase.auth.updateUser({ password: contrasena })
    setEnviando(false)

    if (errorSupabase) {
      const texto = errorSupabase.message.toLowerCase()
      if (texto.includes('session') || texto.includes('jwt')) {
        setError('Tu sesión o el enlace ya venció. Vuelve a iniciar sesión e intenta de nuevo.')
      } else if (errorSupabase.code === 'same_password') {
        setError('La contraseña nueva debe ser distinta a la anterior.')
      } else if (errorSupabase.code === 'weak_password') {
        setError('La contraseña es muy débil. Mezcla letras y números.')
      } else if (errorSupabase.code === 'reauthentication_needed') {
        setError('Por seguridad, cierra sesión, vuelve a entrar e intenta de nuevo.')
      } else {
        setError(`No se pudo cambiar la contraseña: ${errorSupabase.message}`)
      }
      return
    }
    formulario.reset()
    setListo(true)
  }

  if (listo && alTerminar === 'ir_al_inicio') {
    return (
      <div className="flex flex-col gap-4">
        <p className={ui.avisoVerde}>
          Listo, tu contraseña quedó guardada.
        </p>
        <button
          type="button"
          onClick={() => irAlInicio()}
          className={`${ui.botonPrimario} w-full py-2.5`}
        >
          Continuar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label className={ui.etiqueta}>
        Contraseña nueva
        <input
          name="contrasena"
          type="password"
          required
          minLength={LARGO_MINIMO}
          autoComplete="new-password"
          className={ui.campo}
        />
      </label>
      <label className={ui.etiqueta}>
        Repite la contraseña
        <input
          name="confirmar"
          type="password"
          required
          autoComplete="new-password"
          className={ui.campo}
        />
      </label>
      <p className={ui.ayuda}>Mínimo {LARGO_MINIMO} caracteres.</p>
      {error && (
        <p role="alert" className={ui.avisoRojo}>
          {error}
        </p>
      )}
      {listo && (
        <p
          role="status"
          className={ui.avisoVerde}
        >
          Listo, tu contraseña quedó guardada.
        </p>
      )}
      <button type="submit" disabled={enviando} className={`${ui.botonPrimario} self-start`}>
        {enviando ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
