'use client'

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { subirImagenEvento } from '@/app/institucion/eventos/actions'
import { LADO_MAXIMO_IMAGEN, MAX_BYTES_IMAGEN, TIPOS_IMAGEN } from '@/lib/limitesImagen'
import { ui } from '@/lib/ui'

// Se reduce a 1600 px en JPG antes de enviarla (los GIF quedan como imagen fija), bajando la
// calidad si hace falta para caber en el envío; el servidor igual la revisa y la recodifica.
async function reducirImagen(archivo: File): Promise<Blob> {
  if (archivo.type !== 'image/gif' && archivo.size <= MAX_BYTES_IMAGEN / 2) return archivo
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, LADO_MAXIMO_IMAGEN / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) return archivo
    // Sin fondo blanco, lo transparente de un PNG queda negro en JPG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const calidad of [0.85, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad))
      if (blob && blob.size <= MAX_BYTES_IMAGEN) return blob
    }
    return archivo
  } catch {
    return archivo
  }
}

// Sube la imagen por el servidor y envía su dirección en el campo oculto "imagen_url".
export default function SelectorImagen({
  valorInicial = null,
  limpiarAlReiniciar = false,
}: {
  valorInicial?: string | null
  // Para "Crear evento": vaciar la imagen cuando el formulario se reinicia.
  limpiarAlReiniciar?: boolean
}) {
  const [url, setUrl] = useState(valorInicial ?? '')
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
      setError(null)
    }
    form.addEventListener('reset', alReiniciar)
    return () => form.removeEventListener('reset', alReiniciar)
  }, [limpiarAlReiniciar])

  async function subir(archivo: File) {
    setError(null)
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setError('Ese formato no se puede usar. Elige una imagen JPG, PNG, WEBP o GIF.')
      return
    }
    setSubiendo(true)
    try {
      const contenido = await reducirImagen(archivo)
      if (contenido.size > MAX_BYTES_IMAGEN) {
        setError('La imagen es demasiado pesada. Prueba con otra o con una captura de pantalla.')
        return
      }
      const datos = new FormData()
      datos.set('imagen', contenido, archivo.name)
      const resultado = await subirImagenEvento(datos)
      if (resultado.tipo === 'error') {
        setError(resultado.texto)
        return
      }
      setUrl(resultado.valor)
    } catch {
      setError('No se pudo subir la imagen. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setSubiendo(false)
    }
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
      <input type="hidden" name="imagen_url" value={url} />
      <p className="text-sm font-medium text-gray-800">Imagen del evento (opcional)</p>

      {url ? (
        <div className="flex flex-wrap items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            referrerPolicy="no-referrer"
            src={url}
            alt="Imagen del evento"
            className="h-40 w-auto max-w-full rounded border border-gray-200 object-cover"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={subiendo}
              className={ui.botonSecundario}
            >
              {subiendo ? 'Subiendo imagen…' : 'Cambiar imagen'}
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
            {subiendo ? 'Revisando y subiendo…' : 'Elegir imagen o tomar foto'}
          </button>
          <p className="text-gray-700">
            También puedes arrastrarla aquí, o hacer clic en el recuadro y pegarla con Ctrl+V. JPG, PNG,
            WEBP o GIF.
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

      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}
