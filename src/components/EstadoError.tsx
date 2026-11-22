'use client'

import { useEffect } from 'react'
import { ui } from '@/lib/ui'

// Pantalla cuando una página falla. En producción Next oculta el mensaje de los errores
// del servidor (solo deja error.digest), así que en ese caso se muestra un texto general.
export default function EstadoError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const detalle = error.digest ? null : error.message

  return (
    <div role="alert" className={`${ui.tarjeta} flex flex-col items-start gap-3`}>
      <h1 className={ui.subtitulo}>No se pudo completar lo que pediste</h1>
      <p className={ui.textoSecundario}>
        {detalle ||
          'Puede ser un problema de conexión o un dato que no pasó una validación. Intenta de nuevo; si sigue pasando, recarga la página.'}
      </p>
      {error.digest && <p className={ui.ayuda}>Código del error: {error.digest}</p>}
      <button type="button" onClick={() => retry()} className={ui.botonPrimario}>
        Intentar de nuevo
      </button>
    </div>
  )
}
