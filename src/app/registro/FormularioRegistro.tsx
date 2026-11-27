'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CampoSubdominio from '@/components/CampoSubdominio'
import Turnstile from '@/components/Turnstile'
import { createClient } from '@/lib/supabase/client'
import { LARGO_MINIMO, traducirError } from '@/lib/erroresAuth'
import type { RegistroColegio } from '@/lib/registro'
import { ui } from '@/lib/ui'
import { revisarRegistro } from './actions'

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

// Crea la cuenta de quien registra el colegio con los datos del colegio guardados en ella; el
// colegio se crea cuando la cuenta queda confirmada (página /solicitud).
export default function FormularioRegistro({
  tramos,
  modulos,
}: {
  tramos: { id: number; etiqueta: string }[]
  modulos: { clave: string; nombre: string; estado: string }[]
}) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setMensaje(null)
    const datos = new FormData(ev.currentTarget)
    const texto = (campo: string) => String(datos.get(campo) ?? '').trim()

    const contrasena = String(datos.get('contrasena') ?? '')
    if (contrasena.length < LARGO_MINIMO) {
      setMensaje({ tipo: 'error', texto: `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.` })
      return
    }
    if (contrasena !== String(datos.get('confirmar') ?? '')) {
      setMensaje({ tipo: 'error', texto: 'Las dos contraseñas no coinciden.' })
      return
    }
    if (!captcha) {
      setMensaje({ tipo: 'error', texto: 'Espera un momento a que termine la verificación de seguridad.' })
      return
    }

    const registro: RegistroColegio = {
      nombre: texto('colegio'),
      nit: texto('nit'),
      ciudad: texto('ciudad'),
      tramo: Number(datos.get('tramo')),
      subdominio: texto('subdominio').toLowerCase(),
      cargo: texto('cargo'),
      telefono: texto('telefono'),
      modulos: datos.getAll('modulos').map(String),
    }
    const nombres = texto('nombres')
    const apellidos = texto('apellidos')
    const correo = texto('correo').toLowerCase()

    setEnviando(true)
    try {
      const problema = await revisarRegistro(registro.nit, registro.subdominio)
      if (problema) {
        setMensaje({ tipo: 'error', texto: problema })
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: contrasena,
        options: {
          captchaToken: captcha,
          emailRedirectTo: `${window.location.origin}/auth/confirmar`,
          data: { nombres, apellidos, full_name: `${nombres} ${apellidos}`.trim(), registro_colegio: registro },
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
          texto: 'Ya existe una cuenta con ese correo. Cada cuenta es de un solo colegio: usa otro correo.',
        })
        return
      }
      if (data.session) {
        router.replace('/solicitud')
        return
      }
      setMensaje({
        tipo: 'ok',
        texto: `Te enviamos un correo a ${correo}. Toca el enlace para confirmarlo y tu solicitud quedará enviada (revisa también la carpeta de spam).`,
      })
    } finally {
      setEnviando(false)
      setCaptcha(null)
      setReiniciarCaptcha((n) => n + 1)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      <fieldset className={`${ui.tarjeta} flex flex-col gap-4`}>
        <legend className="px-1 text-sm font-semibold text-gray-900">El colegio</legend>
        <label className={ui.etiqueta}>
          Nombre del colegio
          <input name="colegio" required maxLength={150} autoComplete="organization" className={ui.campo} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={ui.etiqueta}>
            NIT con dígito de verificación
            <input name="nit" required inputMode="numeric" placeholder="900123456-8" className={ui.campo} />
          </label>
          <label className={ui.etiqueta}>
            Ciudad
            <input name="ciudad" required autoComplete="address-level2" className={ui.campo} />
          </label>
        </div>
        <label className={ui.etiqueta}>
          Número de estudiantes
          <select name="tramo" required defaultValue="" className={ui.campo}>
            <option value="" disabled>
              Elige uno
            </option>
            {tramos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <CampoSubdominio etiqueta="Dirección del colegio en Colectia" />
          <p className={ui.ayuda}>
            Usa las siglas o el nombre corto del colegio. Por ella entrarán tu personal y las familias.
          </p>
        </div>
      </fieldset>

      <fieldset className={`${ui.tarjeta} flex flex-col gap-3`}>
        <legend className="px-1 text-sm font-semibold text-gray-900">Módulos</legend>
        <p className={ui.textoSecundario}>Incluye Eventos y pagos: actividades, cobro por salón y reportes.</p>
        {modulos.map((m) => (
          <label key={m.clave} className="flex min-h-11 items-center gap-3 text-sm text-gray-800">
            <input type="checkbox" name="modulos" value={m.clave} className="h-5 w-5" />
            <span>
              {m.nombre}
              {m.estado === 'proximamente' && (
                <span className="text-gray-600"> · disponible pronto, avísame cuando esté listo</span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className={`${ui.tarjeta} flex flex-col gap-4`}>
        <legend className="px-1 text-sm font-semibold text-gray-900">Quien lo registra (será el administrador)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={ui.etiqueta}>
            Nombres
            <input name="nombres" required autoComplete="given-name" className={ui.campo} />
          </label>
          <label className={ui.etiqueta}>
            Apellidos
            <input name="apellidos" required autoComplete="family-name" className={ui.campo} />
          </label>
          <label className={ui.etiqueta}>
            Cargo
            <input name="cargo" required placeholder="Rector, tesorera…" className={ui.campo} />
          </label>
          <label className={ui.etiqueta}>
            Teléfono
            <input name="telefono" required type="tel" inputMode="tel" autoComplete="tel" className={ui.campo} />
          </label>
        </div>
        <label className={ui.etiqueta}>
          Correo electrónico
          <input name="correo" required type="email" autoComplete="email" className={ui.campo} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={ui.etiqueta}>
            Contraseña
            <input
              name="contrasena"
              required
              type="password"
              minLength={LARGO_MINIMO}
              autoComplete="new-password"
              className={ui.campo}
            />
          </label>
          <label className={ui.etiqueta}>
            Repite la contraseña
            <input
              name="confirmar"
              required
              type="password"
              minLength={LARGO_MINIMO}
              autoComplete="new-password"
              className={ui.campo}
            />
          </label>
        </div>
        <p className={ui.ayuda}>Cada cuenta es de un solo colegio: usa un correo que no tenga otra cuenta en Colectia.</p>
        <label className="flex items-start gap-3 text-sm text-gray-800">
          <input type="checkbox" name="terminos" required className="mt-0.5 h-5 w-5" />
          <span>
            Acepto los{' '}
            <Link href="/terminos" className={ui.enlace} target="_blank">
              términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link href="/privacidad" className={ui.enlace} target="_blank">
              política de privacidad
            </Link>
            .
          </span>
        </label>
      </fieldset>

      <Turnstile onToken={setCaptcha} reiniciar={reiniciarCaptcha} />

      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={mensaje.tipo === 'error' ? ui.avisoRojo : ui.avisoVerde}>
          {mensaje.texto}
        </p>
      )}

      <button type="submit" disabled={enviando} className={`${ui.botonPrimario} w-full`}>
        {enviando ? 'Un momento…' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
