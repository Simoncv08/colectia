import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { obtenerSesionSuperAdmin } from '@/lib/sesionSuperAdmin'
import { DOCUMENTOS_LEGALES, TIPOS_LEGALES, esTipoLegal, fechaLegal } from '@/lib/legal'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'
import { publicarDocumentoLegal } from './actions'
import EditorLegal from './EditorLegal'

export const metadata = { title: 'Términos y privacidad' }

type Params = { searchParams: Promise<{ doc?: string }> }

export default async function LegalAdminPage({ searchParams }: Params) {
  const { doc } = await searchParams
  const sesion = await obtenerSesionSuperAdmin()
  if (!sesion) return null
  const { supabase } = sesion
  const tipo = esTipoLegal(doc) ? doc : 'terminos'
  const { titulo, ruta } = DOCUMENTOS_LEGALES[tipo]

  const { data: versiones, error } = await supabase
    .from('documentos_legales')
    .select('id, version, contenido, resumen_cambios, requiere_aceptacion, publicado_en')
    .eq('tipo', tipo)
    .order('version', { ascending: false })
  const vigente = versiones?.[0]

  const { count: aceptaron } = vigente
    ? await supabase
        .from('aceptaciones_legales')
        .select('persona_id', { count: 'exact', head: true })
        .eq('documento_id', vigente.id)
    : { count: 0 }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={ui.titulo}>Términos y privacidad</h1>
        <p className={ui.textoSecundario}>
          Publica versiones nuevas. Cada versión queda guardada, con quién la aceptó y cuándo.
        </p>
      </div>

      <nav aria-label="Documento" className={ui.pestanas}>
        {TIPOS_LEGALES.map((t) => (
          <Link
            key={t}
            href={`/admin/legal?doc=${t}`}
            aria-current={t === tipo ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-4 text-sm ${
              t === tipo ? 'border-primario font-semibold text-primario' : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            {DOCUMENTOS_LEGALES[t].titulo}
          </Link>
        ))}
      </nav>

      {error && <p className={ui.avisoRojo}>No se pudo cargar el documento. Si todavía no corriste la migración 23, córrela en Supabase.</p>}

      <section className={`${ui.tarjeta} flex flex-col gap-3`}>
        <h2 className={ui.subtitulo}>Versión vigente</h2>
        {vigente ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[15px] text-gray-900">
                <span className="font-semibold">Versión {vigente.version}</span> · publicada el {fechaLegal(vigente.publicado_en)}
              </p>
              <p className="text-sm text-gray-600">
                {vigente.requiere_aceptacion ? 'Se debe aceptar' : 'Cambio menor: solo se avisa'} ·{' '}
                {aceptaron ?? 0} persona(s) ya la {vigente.requiere_aceptacion ? 'aceptaron' : 'vieron'}
              </p>
            </div>
            <Link href={ruta} target="_blank" className={`${ui.botonSecundario} w-full sm:w-auto`}>
              Ver como la ven los usuarios
              <ExternalLink {...icono} />
            </Link>
          </div>
        ) : (
          <p className={ui.textoSecundario}>
            Todavía no has publicado {titulo.toLowerCase()}. Mientras no exista, nadie tiene que aceptar nada.
          </p>
        )}
      </section>

      <section className={`${ui.tarjeta} flex flex-col gap-4`}>
        <div>
          <h2 className={ui.subtitulo}>Publicar una versión nueva</h2>
          <p className={ui.textoSecundario}>
            {vigente ? 'El texto empieza con la versión vigente; cambia lo que necesites.' : 'Pega o escribe el texto completo.'}
          </p>
        </div>
        <EditorLegal
          key={vigente?.id ?? 'nuevo'}
          action={publicarDocumentoLegal.bind(null, tipo)}
          contenidoInicial={vigente?.contenido ?? ''}
          siguienteVersion={(vigente?.version ?? 0) + 1}
        />
      </section>

      {versiones && versiones.length > 0 && (
        <section className={`${ui.tarjeta} flex flex-col gap-3`}>
          <h2 className={ui.subtitulo}>Historial</h2>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {versiones.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="font-medium text-gray-900">
                    Versión {v.version}
                    <span className="font-normal text-gray-600"> · {fechaLegal(v.publicado_en)}</span>
                  </p>
                  <p className="text-[13px] text-gray-600">
                    {v.requiere_aceptacion ? 'Se debe aceptar' : 'Cambio menor'}
                    {v.resumen_cambios ? ` · ${v.resumen_cambios}` : ''}
                  </p>
                </div>
                <Link href={`${ruta}?version=${v.version}`} target="_blank" className={ui.enlaceFila}>
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
