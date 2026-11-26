'use client'

import { useState } from 'react'
import { descargarExcelReporte } from './actions'
import { Download } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

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
    } catch {
      setError(
        'No se pudo descargar el Excel. Intenta de nuevo.'
      )
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-1 sm:ml-auto sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={descargar}
        disabled={descargando}
        className={`${ui.botonSecundario} w-full disabled:cursor-wait sm:w-auto`}
      >
        <Download {...iconoGrande} />
        {descargando ? 'Preparando Excel…' : 'Descargar Excel'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-xs text-peligro sm:text-right">
          {error}
        </p>
      )}
    </div>
  )
}
