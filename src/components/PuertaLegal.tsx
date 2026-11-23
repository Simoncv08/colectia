import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AceptarLegal, AvisoLegal, type DocumentoPendiente } from '@/components/AceptarLegal'
import { esTipoLegal } from '@/lib/legal'

// Va en el layout de cada rol. Si hay una versión de los términos o de la política que la
// persona debe aceptar, muestra la pantalla de aceptación en vez de la página. Si solo hay un
// cambio menor, avisa arriba. Si la migración 23 todavía no se corrió, no hace nada.
export default async function PuertaLegal({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('estado_legal')

  const filas = (data ?? []).filter((f) => esTipoLegal(f.tipo))
  const aDocumento = (f: (typeof filas)[number]): DocumentoPendiente => ({
    tipo: f.tipo as DocumentoPendiente['tipo'],
    version: f.version,
    resumen: f.resumen_cambios,
    publicadoEn: f.publicado_en,
  })

  const bloquean = filas.filter((f) => f.bloquea)
  if (bloquean.length) {
    // Quien acepta, acepta la versión vigente de todo lo que tenga pendiente, incluidos los
    // cambios menores.
    return <AceptarLegal documentos={filas.filter((f) => f.bloquea || f.avisar).map(aDocumento)} />
  }

  const avisos = filas.filter((f) => f.avisar).map(aDocumento)
  return (
    <>
      {avisos.length > 0 && <AvisoLegal documentos={avisos} />}
      {children}
    </>
  )
}
