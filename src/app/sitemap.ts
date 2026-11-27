import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENTOS_LEGALES, TIPOS_LEGALES } from '@/lib/legal'
import { URL_SITIO } from '@/lib/sitio'

// Solo las páginas públicas. La fecha de términos y privacidad es la de su versión vigente; si la
// consulta falla, el sitemap sale igual, sin fechas.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: versiones } = await supabase
    .from('documentos_legales')
    .select('tipo, publicado_en')
    .order('version', { ascending: false })

  return [
    { url: URL_SITIO },
    { url: `${URL_SITIO}/registro` },
    { url: `${URL_SITIO}/precios` },
    ...TIPOS_LEGALES.map((tipo) => ({
      url: `${URL_SITIO}${DOCUMENTOS_LEGALES[tipo].ruta}`,
      lastModified: versiones?.find((v) => v.tipo === tipo)?.publicado_en,
    })),
  ]
}
