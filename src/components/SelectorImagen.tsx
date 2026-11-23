'use client'

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ui } from '@/lib/ui'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const MAX_BYTES = 5 * 1024 * 1024
const LADO_MAXIMO = 1600

// Las fotos grandes se reducen a 1600 px en JPG antes de subir; los GIF se dejan igual (pueden ser animados).
async function prepararImagen(archivo: File): Promise<Blob> {
  if (archivo.type === 'image/gif' || archivo.size <= 1024 * 1024) return archivo
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) return archivo
    // Sin fondo blanco, lo transparente de un PNG queda negro en JPG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    )
    return blob && blob.size < archivo.size ? blob : archivo
  } catch {
    return archivo
  }
}

// Sube al bucket "eventos" en la carpeta de la institución y envía el enlace en el campo oculto "imagen_url".
export default function SelectorImagen({
  institucionId,
  valorInicial = null,
  limpiarAlReiniciar = false,
}: {
  institucionId: string
  valorInicial?: string | null
  // Para "Crear evento": vaciar la imagen cuando el formulario se reinicia.
  limpiarAlReiniciar?: boolean
}) {
  const [url, setUrl] = useState(valorInicial ?? '')
  const [enlace, setEnlace] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!limpiarAlReiniciar) return
    const form = contenedorRef.current?.closest('form')
    if (!form) return
    const alReiniciar = () => {
      setUrl('')
      setEnlace('')
      setError(null)
    }
    form.addEventListener('reset', alReiniciar)
    return () => form.removeEventListener('reset', alReiniciar)
  }, [limpiarAlReiniciar])

  async function subir(archivo: File) {
    setError(null)
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError('Ese formato no se puede usar. Elige una imagen JPG, PNG, WEBP o GIF.')
      return
    }
    setSubiendo(true)
    try {
      const contenido = await prepararImagen(archivo)
      if (contenido.size > MAX_BYTES) {
        setError('La imagen pesa más de 5 MB. Elige una más liviana.')
        return
      }
      const tipo = contenido.type || archivo.type
      const ruta = `${institucionId}/${crypto.randomUUID()}.${EXTENSIONES[tipo] ?? 'jpg'}`
      const supabase = createClient()
      const { error: errorSubida } = await supabase.storage
        .from('eventos')
        .upload(ruta, contenido, { contentType: tipo, upsert: false })
      if (errorSubida) {
        setError('No se pudo subir la imagen. Revisa tu conexión e intenta de nuevo.')
        return
      }
      const { data } = supabase.storage.from('eventos').getPublicUrl(ruta)
      setUrl(data.publicUrl)
      setEnlace('')
    } catch {
      setError(
        'No se pudo subir la imagen. Revisa tu conexión e intenta de nuevo.'
      )
    } finally {
      setSubiendo(false)
    }
  }

  function usarEnlace() {
    const valor = enlace.trim()
    if (!valor) return
    if (!/^https?:\/\//i.test(valor)) {
      setError('El enlace debe empezar por http:// o https://')
      return
    }
    setError(null)
    setUrl(valor)
    setEnlace('')
  }

  function alPegar(ev: ClipboardEvent) {
    const archivo = Array.from(ev.clipboardData.files).find((f) => f.type.startsWith('image/'))
    if (archivo) {
      ev.preventDefault()
      void subir(archivo)
    }
  }

  function alSoltar(ev: DragEvent) {
    ev.preventDefault()
    setArrastrando(false)
    const archivo = Array.from(ev.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (archivo) void subir(archivo)
  }

  return (
    <div ref={contenedorRef} onPaste={alPegar} className="flex flex-col gap-2">
      {/* Un enlace escrito sin tocar "Usar enlace" también se guarda. */}
      <input
        type="hidden"
        name="imagen_url"
        value={url || (/^https?:\/\//i.test(enlace.trim()) ? enlace.trim() : '')}
      />
      <p className="text-sm font-medium text-gray-800">Imagen del evento (opcional)</p>

      {url ? (
        <div className="flex flex-wrap items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Imagen del evento"
            className="h-40 w-auto max-w-full rounded border border-gray-200 object-cover"
            onError={() => setError('No se pudo mostrar la imagen de ese enlace. Revisa que sea correcto.')}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={subiendo}
              className={ui.botonSecundario}
            >
              Cambiar imagen
            </button>
            <button
              type="button"
              onClick={() => {
                setUrl('')
                setError(null)
              }}
              className={ui.botonPeligro}
            >
              Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <div
          tabIndex={0}
          aria-label="Zona para soltar o pegar una imagen"
          onDragOver={(ev) => {
            ev.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm ${
            arrastrando ? 'border-primario bg-primario-suave' : 'border-gray-400'
          }`}
        >
          <button
            type="button"
            onClick={() => inputArchivoRef.current?.click()}
            disabled={subiendo}
            className={ui.botonPrimario}
          >
            {subiendo ? 'Subiendo imagen…' : 'Elegir imagen o tomar foto'}
          </button>
          <p className="text-gray-700">
            También puedes arrastrarla aquí, o hacer clic en el recuadro y pegarla con Ctrl+V.
          </p>
        </div>
      )}

      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(ev) => {
          const archivo = ev.target.files?.[0]
          if (archivo) void subir(archivo)
          ev.target.value = ''
        }}
      />

      {!url && (
        <div className="flex flex-wrap gap-2">
          <input
            type="url"
            value={enlace}
            onChange={(ev) => setEnlace(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault()
                usarEnlace()
              }
            }}
            aria-label="Enlace de una imagen de internet"
            placeholder="O pega el enlace de una imagen"
            className={`${ui.campo} min-w-0 flex-1 basis-56`}
          />
          <button
            type="button"
            onClick={usarEnlace}
            disabled={!enlace.trim()}
            className={ui.botonSecundario}
          >
            Usar enlace
          </button>
        </div>
      )}

      {subiendo && url && (
        <p role="status" className="text-sm text-gray-700">
          Subiendo imagen…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}
