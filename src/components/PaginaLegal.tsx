import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Marca from '@/components/Marca'
import TextoLegal from '@/components/TextoLegal'
import { DOCUMENTOS_LEGALES, fechaLegal, type TipoLegal } from '@/lib/legal'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'
import { CORREO_CONTACTO } from '@/lib/contacto'

// /terminos y /privacidad: públicas, se pueden leer sin iniciar sesión. Con ?version=N se ve una
// versión anterior (el super administrador las enlaza desde su historial).
export default async function PaginaLegal({ tipo, version }: { tipo: TipoLegal; version?: string }) {
  const supabase = await createClient()
  const { titulo } = DOCUMENTOS_LEGALES[tipo]
  const pedida = Number(version)

  let consulta = supabase
    .from('documentos_legales')
    .select('version, contenido, publicado_en')
    .eq('tipo', tipo)
  consulta = Number.isInteger(pedida) && pedida > 0 ? consulta.eq('version', pedida) : consulta
  const [{ data: documento }, { data: ultima }] = await Promise.all([
    consulta.order('version', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('documentos_legales').select('version').eq('tipo', tipo).order('version', { ascending: false }).limit(1).maybeSingle(),
  ])
  const esAnterior = Boolean(documento && ultima && documento.version < ultima.version)
  const otro = DOCUMENTOS_LEGALES[tipo === 'terminos' ? 'privacidad' : 'terminos']

  return (
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="py-2">
            <Marca />
          </Link>
          <Link href="/" className={`${ui.botonFantasma} text-gray-700`}>
            <ArrowLeft {...icono} />
            Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-6 sm:py-8">
        <div>
          <h1 className={ui.titulo}>{titulo}</h1>
          {documento && (
            <p className={ui.textoSecundario}>
              Versión {documento.version} · {esAnterior ? 'publicada' : 'vigente desde'} el {fechaLegal(documento.publicado_en)}
            </p>
          )}
        </div>
        {esAnterior && (
          <p className={ui.avisoAmbar}>
            Esta es una versión anterior.{' '}
            <Link href={DOCUMENTOS_LEGALES[tipo].ruta} className="font-semibold underline underline-offset-2">
              Ver la versión vigente
            </Link>
          </p>
        )}
        <article className={ui.tarjeta}>
          {documento ? (
            <TextoLegal texto={documento.contenido} />
          ) : (
            <p className={ui.textoSecundario}>
              {version ? 'No existe esa versión.' : 'Este documento todavía no se ha publicado.'}
            </p>
          )}
        </article>
        <p className="text-sm text-gray-600">
          Lee también la{' '}
          <Link href={otro.ruta} className={ui.enlace}>
            {otro.titulo.toLowerCase()}
          </Link>
          . ¿Preguntas sobre este documento o sobre tus datos? Escríbenos a{' '}
          <a href={`mailto:${CORREO_CONTACTO}`} className={ui.enlace}>
            {CORREO_CONTACTO}
          </a>
          .
        </p>
      </main>
    </div>
  )
}
