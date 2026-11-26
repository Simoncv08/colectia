'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DosPasosCodigo from '@/components/DosPasosCodigo'
import { mensajeDosPasos } from '@/lib/dosPasos'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

type AppNueva = { factorId: string; qr: string; clave: string }

// Un intento anterior sin terminar deja un factor sin verificar, y su QR ya no se puede volver a
// mostrar: se borra y se crea uno nuevo. Sin nombre, para no chocar con el índice único de Supabase.
async function registrarApp(): Promise<AppNueva | { error: string }> {
  const { mfa } = createClient().auth
  const { data: factores, error: errorLista } = await mfa.listFactors()
  if (errorLista) return { error: mensajeDosPasos(errorLista) }

  const sinVerificar = factores.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')
  await Promise.all(sinVerificar.map((f) => mfa.unenroll({ factorId: f.id })))

  const { data, error } = await mfa.enroll({ factorType: 'totp', issuer: 'Colectia' })
  if (error) return { error: mensajeDosPasos(error) }
  return { factorId: data.id, qr: data.totp.qr_code, clave: data.totp.secret }
}

export default function DosPasosConfigurar() {
  const [app, setApp] = useState<AppNueva | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function mostrarQr() {
    setCargando(true)
    setError('')
    const resultado = await registrarApp()
    setCargando(false)
    if ('error' in resultado) setError(resultado.error)
    else setApp(resultado)
  }

  return (
    <>
      <h1 className={ui.subtitulo}>Activa la verificación en dos pasos</h1>
      <p className={ui.textoSecundario}>
        Como administras toda la plataforma, además de tu contraseña te pediremos un código de tu celular cada vez
        que entres.
      </p>
      <p className={ui.textoSecundario}>
        Usa una app de códigos, como Google Authenticator o Microsoft Authenticator.
      </p>

      {app ? (
        <>
          <p className="text-[15px] font-medium text-gray-900">Escanea este código QR con la app:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={app.qr}
            alt="Código QR para agregar Colectia a tu app de verificación"
            width={192}
            height={192}
            className="self-center rounded-lg border border-gray-200 bg-white p-2"
          />
          <ClaveManual clave={app.clave} />
          <p className="text-[15px] font-medium text-gray-900">Luego escribe el código que te muestra la app:</p>
          <DosPasosCodigo factorId={app.factorId} textoBoton="Activar y entrar" />
        </>
      ) : (
        <>
          {error && (
            <p role="alert" className={ui.avisoRojo}>
              {error}
            </p>
          )}
          <button type="button" onClick={mostrarQr} disabled={cargando} className={`${ui.botonPrimario} w-full`}>
            {cargando ? 'Preparando…' : 'Mostrar código QR'}
          </button>
        </>
      )}
    </>
  )
}

// Para cuando no se puede escanear, por ejemplo si se configura desde el mismo celular.
function ClaveManual({ clave }: { clave: string }) {
  const [copiada, setCopiada] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(clave)
      setCopiada(true)
    } catch {
      // Sin permiso para el portapapeles la clave se sigue pudiendo seleccionar a mano.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-gray-100 p-3">
      <p className={ui.ayuda}>¿No puedes escanearlo? Escribe esta clave en la app:</p>
      <p className="select-all break-all text-[15px] font-semibold tracking-wider text-gray-900">
        {clave.match(/.{1,4}/g)?.join(' ')}
      </p>
      <button type="button" onClick={copiar} className={`${ui.botonSecundario} self-start`}>
        {copiada ? <Check {...icono} /> : <Copy {...icono} />}
        {copiada ? 'Clave copiada' : 'Copiar clave'}
      </button>
    </div>
  )
}
