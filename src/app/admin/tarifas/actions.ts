'use server'

import { revalidatePath } from 'next/cache'
import { accion, mensajeBD } from '@/lib/resultado'
import { requerirSuperAdmin } from '@/lib/sesionSuperAdmin'

// Valores anuales con IVA incluido por tramo, días de prueba por defecto y si se publican.
export async function guardarTarifas(formData: FormData) {
  return accion(async () => {
    const { supabase } = await requerirSuperAdmin()

    const filas = [...formData.keys()]
      .filter((k) => k.startsWith('base_'))
      .map((k) => ({
        tramo_id: Number(k.slice('base_'.length)),
        concepto: 'base',
        valor_anual: Number(String(formData.get(k) ?? '') || 0),
      }))
    if (filas.some((f) => !Number.isInteger(f.tramo_id) || !Number.isFinite(f.valor_anual) || f.valor_anual < 0)) {
      throw new Error('Revisa los valores: deben ser números en pesos.')
    }
    const diasPrueba = Number(formData.get('dias_prueba'))
    if (!Number.isInteger(diasPrueba) || diasPrueba < 3 || diasPrueba > 7) {
      throw new Error('La prueba debe ser de 3 a 7 días.')
    }
    const publicar = formData.get('publicar') === 'on'
    if (publicar && filas.some((f) => f.valor_anual === 0)) {
      throw new Error('Para publicar los precios, todos los tramos deben tener un valor.')
    }

    const { error: errorTarifas } = await supabase.from('tarifas').upsert(filas)
    if (errorTarifas) throw new Error(mensajeBD(errorTarifas))
    const { error: errorConfig } = await supabase
      .from('configuracion_plataforma')
      .update({ dias_prueba: diasPrueba, precios_publicados: publicar })
      .eq('id', true)
    if (errorConfig) throw new Error(mensajeBD(errorConfig))

    revalidatePath('/admin/tarifas')
    revalidatePath('/precios')
    return publicar ? 'Tarifas guardadas y publicadas en www.colectia.co/precios.' : 'Tarifas guardadas (sin publicar).'
  })
}
