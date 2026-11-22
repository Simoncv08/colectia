'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enTrozos, traerTodasLasFilas } from '@/lib/consultas'

type FilaRapida = { estudianteId: string; cantidad: number; devueltaPendiente: number | null }

// Una devuelta pendiente se guarda como dinero_recibido = monto + devuelta.
// Se omite a quien ya pagó ese producto (dos personas cobrando el mismo salón a la vez).
export async function registrarPagosRapidos(
  eventoId: string,
  formData: FormData
): Promise<{ registrados: number; omitidos: number }> {
  const producto_id = String(formData.get('producto_id') ?? '').trim()
  const filasTexto = String(formData.get('filas') ?? '').trim()

  if (!producto_id) {
    throw new Error('Selecciona el producto que se está cobrando.')
  }

  let filas: FilaRapida[] = []
  try {
    filas = JSON.parse(filasTexto || '[]')
  } catch {
    throw new Error('No se pudo leer la lista de estudiantes marcados.')
  }

  if (!Array.isArray(filas) || filas.length === 0) {
    throw new Error('Marca al menos un estudiante.')
  }

  for (const f of filas) {
    if (!f || typeof f.estudianteId !== 'string' || !f.estudianteId) {
      throw new Error('Uno de los estudiantes marcados no es válido.')
    }
    if (!Number.isInteger(f.cantidad) || f.cantidad <= 0) {
      throw new Error('La cantidad de cada estudiante debe ser un número entero mayor a cero.')
    }
    if (
      f.devueltaPendiente != null &&
      (typeof f.devueltaPendiente !== 'number' ||
        Number.isNaN(f.devueltaPendiente) ||
        f.devueltaPendiente <= 0)
    ) {
      throw new Error('La devuelta pendiente debe ser un valor mayor a cero.')
    }
  }

  const estudianteIds = Array.from(new Set(filas.map((f) => f.estudianteId)))
  if (estudianteIds.length !== filas.length) {
    throw new Error('Un estudiante aparece marcado dos veces.')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Debes iniciar sesión.')
  }

  const { data: evento } = await supabase
    .from('eventos')
    .select('institucion_id')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) {
    throw new Error('El evento ya no existe.')
  }

  // Quién recibe el dinero: siempre la cuenta de quien está registrando.
  const { data: receptor } = await supabase
    .from('membresias')
    .select('id')
    .eq('persona_id', user.id)
    .eq('institucion_id', evento.institucion_id)
    .in('rol', ['admin_institucion', 'recaudador'])
    .maybeSingle()

  if (!receptor) {
    throw new Error('No tienes una cuenta de personal válida en esta institución.')
  }

  const { data: producto } = await supabase
    .from('productos')
    .select('id, precio_unitario, cantidad_maxima_por_estudiante')
    .eq('id', producto_id)
    .eq('evento_id', eventoId)
    .maybeSingle()

  if (!producto) {
    throw new Error('Ese producto ya no existe en este evento.')
  }

  const maximo = producto.cantidad_maxima_por_estudiante
  if (maximo && filas.some((f) => f.cantidad > maximo)) {
    throw new Error(`La cantidad máxima de este producto por estudiante es ${maximo}.`)
  }

  let validos = 0
  for (const trozo of enTrozos(estudianteIds)) {
    const { data, error: errorValidos } = await supabase
      .from('estudiantes')
      .select('id')
      .in('id', trozo)
      .eq('institucion_id', evento.institucion_id)
    if (errorValidos) {
      throw new Error(errorValidos.message)
    }
    validos += (data ?? []).length
  }

  if (validos !== estudianteIds.length) {
    throw new Error('Alguno de los estudiantes marcados no pertenece a esta institución.')
  }

  const { data: pagosPrevios, error: errorPrevios } = await traerTodasLasFilas<{
    estudiante_id: string
  }>((desde, hasta) =>
    supabase
      .from('registros_pago')
      .select('estudiante_id')
      .eq('producto_id', producto_id)
      .order('id', { ascending: true })
      .range(desde, hasta)
  )

  if (errorPrevios) {
    throw new Error(errorPrevios.message)
  }

  const yaPagaron = new Set(pagosPrevios.map((p) => p.estudiante_id))
  const aRegistrar = filas.filter((f) => !yaPagaron.has(f.estudianteId))
  const omitidos = filas.length - aRegistrar.length

  if (aRegistrar.length > 0) {
    const precio = Number(producto.precio_unitario)
    const { error } = await supabase.from('registros_pago').insert(
      aRegistrar.map((f) => ({
        evento_id: eventoId,
        estudiante_id: f.estudianteId,
        producto_id,
        cantidad: f.cantidad,
        monto: precio * f.cantidad,
        metodo: 'efectivo',
        comprobante: null,
        registrado_por: receptor.id,
        dinero_recibido: f.devueltaPendiente
          ? precio * f.cantidad + f.devueltaPendiente
          : null,
        devuelta_pendiente: Boolean(f.devueltaPendiente),
        grupo_pago_id: crypto.randomUUID(),
      }))
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath(`/institucion/eventos/${eventoId}/pagos`)
  revalidatePath(`/institucion/eventos/${eventoId}/pagos/rapido`)

  return { registrados: aRegistrar.length, omitidos }
}

// Aplica a todas las líneas del pago (grupo_pago_id).
export async function marcarDevueltaEntregada(
  eventoId: string,
  grupoPagoId: string,
  _formData: FormData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('registros_pago')
    .update({ devuelta_pendiente: false })
    .eq('grupo_pago_id', grupoPagoId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}/pagos`)
  revalidatePath(`/institucion/eventos/${eventoId}/pagos/rapido`)
}

// Borra todas las líneas del pago (grupo_pago_id).
export async function eliminarPago(
  eventoId: string,
  grupoPagoId: string,
  _formData: FormData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('registros_pago')
    .delete()
    .eq('grupo_pago_id', grupoPagoId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/institucion/eventos/${eventoId}/pagos`)
  revalidatePath(`/institucion/eventos/${eventoId}/pagos/rapido`)
}
