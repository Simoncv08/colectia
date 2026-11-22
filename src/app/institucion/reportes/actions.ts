'use server'

import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { leerFiltros } from '@/lib/reportes'
import { construirExcelReporte } from '@/lib/reportesExcel'

// Devuelve el Excel en base64; una ruta de descarga daba 404 en este proyecto.
export async function descargarExcelReporte(
  parametros: string
): Promise<{ ok: true; nombreArchivo: string; base64: string } | { ok: false; error: string }> {
  try {
    const f = leerFiltros(Object.fromEntries(new URLSearchParams(parametros).entries()))
    const sesion = await obtenerSesionInstitucion()
    if (!sesion?.esAdmin) {
      return { ok: false, error: 'Solo el administrador de la institución puede descargar reportes.' }
    }
    const resultado = await construirExcelReporte(
      sesion.supabase,
      { id: sesion.institucionId, nombre: sesion.institucion.nombre },
      f
    )
    if (!resultado.ok) return resultado
    return {
      ok: true,
      nombreArchivo: resultado.nombreArchivo,
      base64: Buffer.from(resultado.contenido).toString('base64'),
    }
  } catch (e) {
    return {
      ok: false,
      error: `No se pudo generar el Excel${e instanceof Error ? `: ${e.message}` : '.'}`,
    }
  }
}
