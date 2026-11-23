import type { createClient } from '@/lib/supabase/server'
import { nombrePersona } from '@/lib/formato'

type Supabase = Awaited<ReturnType<typeof createClient>>

// Cada fila de registros_pago es un producto; las filas con el mismo grupo_pago_id son un solo pago.
export type LineaPago = {
  estudiante_id: string
  monto: number
  dinero_recibido: number | null
  devuelta_pendiente: boolean
  grupo_pago_id: string
}

export type GrupoPago<L extends LineaPago = LineaPago> = {
  grupoPagoId: string
  estudianteId: string
  lineas: L[]
  monto: number
  recibido: number | null
  devuelta: number
  devueltaPendiente: boolean
}

// Devuelta = dinero recibido menos la suma de las líneas. Solo queda pendiente si es mayor que 0.
export function agruparPagos<L extends LineaPago>(lineas: L[]): GrupoPago<L>[] {
  const grupos = new Map<string, GrupoPago<L>>()
  for (const l of lineas) {
    let g = grupos.get(l.grupo_pago_id)
    if (!g) {
      g = {
        grupoPagoId: l.grupo_pago_id,
        estudianteId: l.estudiante_id,
        lineas: [],
        monto: 0,
        recibido: l.dinero_recibido == null ? null : Number(l.dinero_recibido),
        devuelta: 0,
        devueltaPendiente: l.devuelta_pendiente,
      }
      grupos.set(l.grupo_pago_id, g)
    }
    g.lineas.push(l)
    g.monto += Number(l.monto)
  }
  for (const g of grupos.values()) {
    g.devuelta = g.recibido == null ? 0 : Math.max(0, g.recibido - g.monto)
    g.devueltaPendiente = g.devueltaPendiente && g.devuelta > 0
  }
  return Array.from(grupos.values())
}

// Membresía → nombre. Un recaudador solo puede leer su propia fila, así que los demás no aparecen.
export async function cargarPersonal(supabase: Supabase, institucionId: string) {
  const { data } = await supabase
    .from('membresias')
    .select('id, personas(nombres, apellidos, correo)')
    .eq('institucion_id', institucionId)
    .in('rol', ['admin_institucion', 'recaudador'])
  return new Map((data ?? []).map((s) => [s.id, nombrePersona(s.personas)]))
}
