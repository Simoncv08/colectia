'use client'

import { useState } from 'react'
import { descargarExcelReporte } from './actions'

export default function BotonDescargarExcel({ parametros }: { parametros: string }) {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function descargar() {
    setDescargando(true)
    setError(null)
    try {
      const r = await descargarExcelReporte(parametros)
      if (!r.ok) {
        setError(r.error)
        return
      }
      const binario = atob(r.base64)
      const bytes = new Uint8Array(binario.length)
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
      const archivo = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = r.nombreArchivo
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(
        `No se pudo descargar el Excel${e instanceof Error ? `: ${e.message}` : '.'}`
      )
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="ml-auto flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={descargar}
        disabled={descargando}
        className="inline-flex min-h-11 items-center rounded-lg border border-green-700 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-50 active:bg-green-100 disabled:cursor-wait disabled:opacity-60 sm:min-h-9"
      >
        {descargando ? 'Preparando Excel…' : 'Descargar Excel'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
