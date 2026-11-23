import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import FormularioDatos from '@/components/FormularioDatos'
import FormularioContrasena from '@/components/FormularioContrasena'
import Ventana from '@/components/Ventana'
import { DOCUMENTOS_LEGALES, TIPOS_LEGALES, esTipoLegal, fechaLegal, type TipoLegal } from '@/lib/legal'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

// Secciones de "Mi cuenta", iguales para acudientes, personal y super administrador.

export function TarjetaMisDatos({
  persona,
  correo,
}: {
  persona: { nombres: string | null; apellidos: string | null; telefono: string | null } | null
  correo: string
}) {
  return (
    <section className={ui.tarjeta}>
      <h2 className={`${ui.subtitulo} mb-4`}>Mis datos</h2>
      <FormularioDatos
        nombres={persona?.nombres ?? ''}
        apellidos={persona?.apellidos ?? ''}
        telefono={persona?.telefono ?? ''}
        correo={correo}
      />
    </section>
  )
}

export function TarjetaContrasena() {
  return (
    <section className={ui.tarjeta}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={ui.subtitulo}>Contraseña</h2>
          <p className={ui.textoSecundario}>
            Si entras con Google o con enlace al correo, también puedes crear una contraseña.
          </p>
        </div>
        <div className={ui.accionesPagina}>
          <Ventana textoBoton="Cambiar contraseña" titulo="Cambiar contraseña" variante="secundario">
            <FormularioContrasena />
          </Ventana>
        </div>
      </div>
    </section>
  )
}

// Los dos documentos, con la versión que la persona aceptó y cuándo.
export async function TarjetaDocumentosLegales({ personaId }: { personaId: string }) {
  const supabase = await createClient()
  const [{ data: aceptaciones }, { data: estado }] = await Promise.all([
    supabase
      .from('aceptaciones_legales')
      .select('aceptado_en, documentos_legales(tipo, version)')
      .eq('persona_id', personaId),
    supabase.rpc('estado_legal'),
  ])

  const ultimaAceptada = new Map<TipoLegal, { version: number; fecha: string }>()
  for (const a of aceptaciones ?? []) {
    const d = a.documentos_legales
    if (!d || !esTipoLegal(d.tipo)) continue
    const previa = ultimaAceptada.get(d.tipo)
    if (!previa || d.version > previa.version) ultimaAceptada.set(d.tipo, { version: d.version, fecha: a.aceptado_en })
  }
  const vigentes = new Map((estado ?? []).filter((e) => esTipoLegal(e.tipo)).map((e) => [e.tipo as TipoLegal, e.version]))

  return (
    <section className={ui.tarjeta}>
      <h2 className={ui.subtitulo}>Términos y privacidad</h2>
      <p className={`${ui.textoSecundario} mb-3`}>Las reglas de uso de Colectia y cómo cuidamos tus datos.</p>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
        {TIPOS_LEGALES.map((tipo) => {
          const aceptada = ultimaAceptada.get(tipo)
          const vigente = vigentes.get(tipo)
          return (
            <li key={tipo}>
              <Link
                href={DOCUMENTOS_LEGALES[tipo].ruta}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium text-gray-900">{DOCUMENTOS_LEGALES[tipo].titulo}</span>
                  <span className="text-[13px] text-gray-600">
                    {aceptada
                      ? `Aceptaste la versión ${aceptada.version} el ${fechaLegal(aceptada.fecha)}`
                      : vigente
                        ? `Versión ${vigente}`
                        : 'Todavía no se ha publicado'}
                  </span>
                </span>
                <ChevronRight {...icono} className="shrink-0 text-gray-500" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
