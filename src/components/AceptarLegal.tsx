'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, FileText, X } from 'lucide-react'
import { aceptarDocumentosLegales } from '@/app/actions'
import { DOCUMENTOS_LEGALES, fechaLegal, type TipoLegal } from '@/lib/legal'
import { icono, iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

export type DocumentoPendiente = {
  tipo: TipoLegal
  version: number
  resumen: string | null
  publicadoEn: string
}

const FRASE: Record<TipoLegal, string> = {
  terminos: 'los términos y condiciones',
  privacidad: 'la política de privacidad',
}

function nombres(documentos: DocumentoPendiente[]) {
  return documentos.map((d) => FRASE[d.tipo]).join(' y ')
}

// Pantalla que reemplaza la página hasta que la persona acepte la versión vigente.
export function AceptarLegal({ documentos }: { documentos: DocumentoPendiente[] }) {
  const router = useRouter()
  const [acepto, setAcepto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, startTransition] = useTransition()
  const primeraVez = documentos.every((d) => d.version === 1)

  function aceptar() {
    setError('')
    startTransition(async () => {
      const r = await aceptarDocumentosLegales(documentos.map((d) => d.tipo))
      if (r.tipo === 'error') setError(r.texto)
      else router.refresh()
    })
  }

  return (
    <section
      aria-labelledby="titulo-legal"
      className={`${ui.tarjeta} mx-auto flex w-full max-w-xl flex-col gap-5`}
    >
      <div className="flex flex-col gap-1">
        <h1 id="titulo-legal" className={ui.titulo}>
          {primeraVez ? 'Antes de continuar' : 'Actualizamos nuestros documentos'}
        </h1>
        <p className={ui.textoSecundario}>
          {primeraVez
            ? 'Para usar Colectia, lee y acepta estos documentos. Explican las reglas de uso y cómo cuidamos tus datos y los de tus estudiantes.'
            : 'Hicimos cambios importantes. Para seguir usando Colectia, léelos y acéptalos.'}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {documentos.map((d) => (
          <li key={d.tipo} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primario-suave text-primario">
              <FileText {...iconoGrande} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-semibold text-gray-900">{DOCUMENTOS_LEGALES[d.tipo].titulo}</p>
              <p className="text-[13px] text-gray-600">
                Versión {d.version} · {fechaLegal(d.publicadoEn)}
              </p>
              {d.resumen && <p className="text-sm text-gray-700">{d.resumen}</p>}
              <Link
                href={DOCUMENTOS_LEGALES[d.tipo].ruta}
                target="_blank"
                className={`${ui.enlace} inline-flex min-h-11 items-center gap-1.5 self-start text-sm sm:min-h-0 sm:py-1`}
              >
                Leer el documento
                <ExternalLink {...icono} />
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-[15px] text-gray-900">
        <input
          type="checkbox"
          checked={acepto}
          onChange={(ev) => setAcepto(ev.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span>Leí y acepto {nombres(documentos)}.</span>
      </label>

      {error && (
        <p role="alert" className={ui.avisoRojo}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={aceptar}
        disabled={!acepto || enviando}
        className={`${ui.botonPrimario} w-full sm:w-auto sm:self-start`}
      >
        {enviando ? 'Guardando…' : 'Aceptar y continuar'}
      </button>
    </section>
  )
}

// Aviso de un cambio menor: no bloquea, se quita con "Entendido".
export function AvisoLegal({ documentos }: { documentos: DocumentoPendiente[] }) {
  const router = useRouter()
  const [enviando, startTransition] = useTransition()
  const [oculto, setOculto] = useState(false)
  if (oculto) return null

  function entendido() {
    setOculto(true)
    startTransition(async () => {
      await aceptarDocumentosLegales(documentos.map((d) => d.tipo))
      router.refresh()
    })
  }

  return (
    <div role="status" className={`${ui.avisoInfo} flex items-start gap-3`}>
      <FileText {...iconoGrande} className="mt-0.5 shrink-0 text-primario" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">Actualizamos {nombres(documentos)}.</p>
        {documentos.map(
          (d) => d.resumen && (
            <p key={d.tipo} className="text-gray-700">
              {documentos.length > 1 && `${DOCUMENTOS_LEGALES[d.tipo].titulo}: `}
              {d.resumen}
            </p>
          )
        )}
        <div className="flex flex-wrap gap-x-4">
          {documentos.map((d) => (
            <Link key={d.tipo} href={DOCUMENTOS_LEGALES[d.tipo].ruta} className={`${ui.enlace} inline-flex min-h-11 items-center sm:min-h-0`}>
              Ver {DOCUMENTOS_LEGALES[d.tipo].titulo.toLowerCase()}
            </Link>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={entendido}
        disabled={enviando}
        aria-label="Entendido, cerrar el aviso"
        className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-white/60"
      >
        <X {...iconoGrande} />
      </button>
    </div>
  )
}
