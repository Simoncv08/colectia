'use server'

import { revalidatePath } from 'next/cache'
import { requerirPersonal } from '@/lib/sesionInstitucion'
import { accion, mensajeBD } from '@/lib/resultado'

type FilaRapida = { estudianteId: string; cantidad: number; devueltaPendiente: number | null }

function revalidarPagos(eventoId: string) {
  revalidatePath(`/institucion/eventos/${eventoId}/pagos`)
  revalidatePath(`/institucion/eventos/${eventoId}/pagos/rapido`)
  revalidatePath('/institucion')
}

// El valor, el receptor y el tope por estudiante los calcula registrar_pagos_efectivo
// (supabase/migraciones/19_seguridad_fase1.sql); aquí solo se revisa que la lista tenga forma.
export async function registrarPagosRapidos(eventoId: string, formData: FormData) {
  return accion(async () => {
    const productoId = String(formData.get('producto_id') ?? '').trim()
    if (!productoId) throw new Error('Elige el producto que se está cobrando.')

    let filas: FilaRapida[] = []
    try {
      filas = JSON.parse(String(formData.get('filas') ?? '') || '[]')
    } catch {
      throw new Error('No se pudo leer la lista de estudiantes marcados.')
    }
    if (!Array.isArray(filas) || filas.length === 0) throw new Error('Marca al menos un estudiante.')
    if (new Set(filas.map((f) => f?.estudianteId)).size !== filas.length) {
      throw new Error('Un estudiante aparece marcado dos veces.')
    }

    const sesion = await requerirPersonal()
    const { data, error } = await sesion.supabase.rpc('registrar_pagos_efectivo', {
      p_evento_id: eventoId,
      p_producto_id: productoId,
      p_filas: filas,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidarPagos(eventoId)
    const { registrados, omitidos } = data as { registrados: number; omitidos: number }
    return (
      `Se registraron ${registrados} pago(s).` +
      (omitidos ? ` ${omitidos} se omitieron porque ya tenían ese producto pagado.` : '')
    )
  })
}

export async function marcarDevueltaEntregada(eventoId: string, grupoPagoId: string, _formData?: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal()
    const { error } = await sesion.supabase.rpc('marcar_devuelta_entregada', {
      p_grupo_pago_id: grupoPagoId,
    })
    if (error) throw new Error(mensajeBD(error))

    revalidarPagos(eventoId)
    return 'La devuelta quedó como entregada.'
  })
}

// Solo el administrador puede borrar pagos (lo exige la RLS); borra todas las líneas del grupo.
export async function eliminarPago(eventoId: string, grupoPagoId: string, _formData: FormData) {
  return accion(async () => {
    const sesion = await requerirPersonal({ soloAdmin: true })
    const { data, error } = await sesion.supabase
      .from('registros_pago')
      .delete()
      .eq('grupo_pago_id', grupoPagoId)
      .select('id')
    if (error) throw new Error(mensajeBD(error))
    if (!data?.length) throw new Error('Ese pago ya no existe.')

    revalidarPagos(eventoId)
    return 'El pago quedó eliminado.'
  })
}
