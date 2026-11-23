'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

type Modo = 'entrar' | 'registro' | 'enlace' | 'olvido'

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

const LARGO_MINIMO = 8

function traducirError(error: AuthError): string {
  const codigo = error.code ?? ''
  const texto = error.message.toLowerCase()
  if (codigo === 'invalid_credentials' || texto.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (codigo === 'email_not_confirmed' || texto.includes('email not confirmed')) {
    return 'Todavía no has confirmado tu correo. Abre el enlace que te enviamos al crear la cuenta.'
  }
  if (codigo === 'user_already_exists' || texto.includes('already registered')) {
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.'
  }
  if (codigo === 'weak_password' || texto.includes('password should')) {
    return `La contraseña es muy débil. Usa al menos ${LARGO_MINIMO} caracteres, mezclando letras y números.`
  }
  if (codigo.startsWith('over_') || texto.includes('rate limit') || texto.includes('security purposes')) {
    return 'Se hicieron demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.'
  }
  if (
    codigo === 'email_provider_disabled' ||
    codigo === 'signup_disabled' ||
    codigo === 'otp_disabled' ||
    texto.includes('signups not allowed') ||
    texto.includes('provider is not enabled')
  ) {
    return 'Esta forma de entrar todavía no está activada. Avísale al administrador de Colectia.'
  }
  if (texto.includes('invalid') && texto.includes('email')) {
    return 'Ese correo no parece válido. Revísalo.'
  }
  return 'No se pudo completar. Intenta de nuevo en un momento.'
}

export default function FormularioLogin() {
  const router = useRouter()
  // refresh() para que el servidor vuelva a leer las cookies de la sesión nueva.
  function irAlInicio() {
    router.replace('/')
    router.refresh()
  }
  const [modo, setModo] = useState<Modo>('entrar')
  const [correo, setCorreo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [verContrasena, setVerContrasena] = useState(false)

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    setMensaje(null)
  }

  function urlRegreso(siguiente?: string) {
    const base = `${window.location.origin}/auth/callback`
    return siguiente ? `${base}?next=${encodeURIComponent(siguiente)}` : base
  }

  async function entrarConGoogle() {
    setMensaje(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlRegreso() },
    })
    if (error) setMensaje({ tipo: 'error', texto: traducirError(error) })
  }

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const datos = new FormData(ev.currentTarget)
    const email = String(datos.get('correo') ?? '').trim().toLowerCase()
    const contrasena = String(datos.get('contrasena') ?? '')
    const supabase = createClient()

    setMensaje(null)
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena })
        if (error) {
          setMensaje({ tipo: 'error', texto: traducirError(error) })
          return
        }
        irAlInicio()
        return
      }

      if (modo === 'registro') {
        const nombres = String(datos.get('nombres') ?? '').trim()
        const apellidos = String(datos.get('apellidos') ?? '').trim()
        const confirmar = String(datos.get('confirmar') ?? '')
        if (contrasena.length < LARGO_MINIMO) {
          setMensaje({
            tipo: 'error',
            texto: `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`,
          })
          return
        }
        if (contrasena !== confirmar) {
          setMensaje({ tipo: 'error', texto: 'Las dos contraseñas no coinciden.' })
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password: contrasena,
          options: {
            emailRedirectTo: urlRegreso(),
            data: { nombres, apellidos, full_name: `${nombres} ${apellidos}`.trim() },
          },
        })
        if (error) {
          setMensaje({ tipo: 'error', texto: traducirError(error) })
          return
        }
        // Con un correo ya registrado, Supabase no da error: devuelve un usuario sin identidades.
        if (data.user && data.user.identities?.length === 0) {
          setMensaje({
            tipo: 'error',
            texto: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
          })
          return
        }
        if (data.session) {
          irAlInicio()
          return
        }
        setMensaje({
          tipo: 'ok',
          texto: `Te enviamos un correo a ${email}. Ábrelo y toca el enlace para confirmar tu cuenta (revisa también la carpeta de spam).`,
        })
        return
      }

      if (modo === 'enlace') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: urlRegreso(), shouldCreateUser: true },
        })
        if (error) {
          setMensaje({ tipo: 'error', texto: traducirError(error) })
          return
        }
        setMensaje({
          tipo: 'ok',
          texto: `Te enviamos un enlace a ${email}. Ábrelo en este mismo navegador para entrar.`,
        })
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: urlRegreso('/restablecer'),
      })
      if (error) {
        setMensaje({ tipo: 'error', texto: traducirError(error) })
        return
      }
      setMensaje({
        tipo: 'ok',
        texto: `Si existe una cuenta con ${email}, te llegará un correo con un enlace para crear una contraseña nueva. Ábrelo en este mismo navegador.`,
      })
    } finally {
      setEnviando(false)
    }
  }

  const titulos: Record<Modo, string> = {
    entrar: 'Entrar con tu correo',
    registro: 'Crear cuenta',
    enlace: 'Entrar sin contraseña',
    olvido: 'Recuperar contraseña',
  }
  const textoBoton: Record<Modo, string> = {
    entrar: 'Entrar',
    registro: 'Crear cuenta',
    enlace: 'Enviarme el enlace',
    olvido: 'Enviarme el enlace',
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={entrarConGoogle}
        className={`${ui.botonSecundario} w-full gap-3`}
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="h-px flex-1 bg-gray-200" />o con tu correo
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {(modo === 'entrar' || modo === 'enlace') && (
        <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
          {(['entrar', 'enlace'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => cambiarModo(m)}
              className={`rounded-md px-3 py-1.5 font-medium ${
                modo === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {m === 'entrar' ? 'Con contraseña' : 'Enlace al correo'}
            </button>
          ))}
        </div>
      )}

      {(modo === 'registro' || modo === 'olvido') && (
        <p className={ui.subtitulo}>{titulos[modo]}</p>
      )}

      <form onSubmit={enviar} className="flex flex-col gap-3 text-left" key={modo}>
        {modo === 'registro' && (
          <div className="grid grid-cols-2 gap-3">
            <label className={ui.etiqueta}>
              Nombres
              <input name="nombres" required autoComplete="given-name" className={ui.campo} />
            </label>
            <label className={ui.etiqueta}>
              Apellidos
              <input name="apellidos" required autoComplete="family-name" className={ui.campo} />
            </label>
          </div>
        )}

        <label className={ui.etiqueta}>
          Correo electrónico
          <input
            name="correo"
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={(ev) => setCorreo(ev.target.value)}
            className={ui.campo}
          />
        </label>

        {(modo === 'entrar' || modo === 'registro') && (
          <label className={ui.etiqueta}>
            Contraseña
            <input
              name="contrasena"
              type={verContrasena ? 'text' : 'password'}
              required
              minLength={modo === 'registro' ? LARGO_MINIMO : undefined}
              autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              className={ui.campo}
            />
          </label>
        )}

        {modo === 'registro' && (
          <label className={ui.etiqueta}>
            Repite la contraseña
            <input
              name="confirmar"
              type={verContrasena ? 'text' : 'password'}
              required
              autoComplete="new-password"
              className={ui.campo}
            />
          </label>
        )}

        {(modo === 'entrar' || modo === 'registro') && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={verContrasena}
                onChange={(ev) => setVerContrasena(ev.target.checked)}
              />
              Mostrar contraseña
            </label>
            {modo === 'entrar' && (
              <button type="button" onClick={() => cambiarModo('olvido')} className={ui.enlace}>
                ¿La olvidaste?
              </button>
            )}
          </div>
        )}

        {modo === 'registro' && (
          <p className={ui.ayuda}>Mínimo {LARGO_MINIMO} caracteres.</p>
        )}
        {modo === 'enlace' && (
          <p className={ui.ayuda}>
            Te llegará un correo con un enlace para entrar, sin necesidad de contraseña. Si no
            tienes cuenta, se crea automáticamente.
          </p>
        )}
        {modo === 'olvido' && (
          <p className={ui.ayuda}>Te enviaremos un enlace para crear una contraseña nueva.</p>
        )}

        {mensaje && (
          <p
            role={mensaje.tipo === 'error' ? 'alert' : 'status'}
            className={
              mensaje.tipo === 'ok'
                ? ui.avisoVerde
                : ui.avisoRojo
            }
          >
            {mensaje.texto}
          </p>
        )}

        <button type="submit" disabled={enviando} className={`${ui.botonPrimario} w-full`}>
          {enviando ? 'Un momento…' : textoBoton[modo]}
        </button>
      </form>

      <p className="text-center text-sm text-gray-700">
        {modo === 'registro' ? (
          <>
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={() => cambiarModo('entrar')} className={ui.enlace}>
              Inicia sesión
            </button>
          </>
        ) : modo === 'olvido' ? (
          <button type="button" onClick={() => cambiarModo('entrar')} className={ui.enlace}>
            ← Volver a iniciar sesión
          </button>
        ) : (
          <>
            ¿No tienes cuenta?{' '}
            <button type="button" onClick={() => cambiarModo('registro')} className={ui.enlace}>
              Crea una con tu correo
            </button>
          </>
        )}
      </p>
    </div>
  )
}
