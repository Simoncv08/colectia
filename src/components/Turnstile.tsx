'use client'

import { useEffect, useRef } from 'react'

// Llave pública del widget de Cloudflare Turnstile (la secreta solo está en Supabase).
const LLAVE_SITIO = '0x4AAAAAAGVPHP1fNnojWbD2'
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type OpcionesTurnstile = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
  language?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'flexible' | 'compact'
}

type ApiTurnstile = {
  render: (elemento: HTMLElement, opciones: OpcionesTurnstile) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile
  }
}

let cargando: Promise<ApiTurnstile> | null = null

function cargarTurnstile(): Promise<ApiTurnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!cargando) {
    cargando = new Promise((resolver, rechazar) => {
      const script = document.createElement('script')
      script.src = SCRIPT
      script.async = true
      script.onload = () => (window.turnstile ? resolver(window.turnstile) : rechazar(new Error('turnstile')))
      script.onerror = () => {
        cargando = null
        rechazar(new Error('turnstile'))
      }
      document.head.appendChild(script)
    })
  }
  return cargando
}

// Verificación "no soy un robot" de Cloudflare. Entrega un token de un solo uso con onToken
// (null si venció o falló). Cambiar reiniciar pide un token nuevo, por ejemplo después de
// cada envío del formulario.
export default function Turnstile({
  onToken,
  reiniciar = 0,
}: {
  onToken: (token: string | null) => void
  reiniciar?: number
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const avisar = useRef(onToken)

  useEffect(() => {
    avisar.current = onToken
  }, [onToken])

  useEffect(() => {
    let cancelado = false
    cargarTurnstile()
      .then((api) => {
        if (cancelado || !contenedor.current) return
        widget.current = api.render(contenedor.current, {
          sitekey: LLAVE_SITIO,
          callback: (token) => avisar.current(token),
          'expired-callback': () => avisar.current(null),
          'error-callback': () => avisar.current(null),
          language: 'es',
          theme: 'light',
          size: 'flexible',
        })
      })
      .catch(() => avisar.current(null))
    return () => {
      cancelado = true
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [])

  useEffect(() => {
    if (reiniciar && widget.current && window.turnstile) {
      avisar.current(null)
      window.turnstile.reset(widget.current)
    }
  }, [reiniciar])

  return <div ref={contenedor} className="min-h-[65px] w-full" />
}
