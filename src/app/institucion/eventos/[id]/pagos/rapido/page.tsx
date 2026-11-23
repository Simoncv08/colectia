import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { registrarPagosRapidos } from '../actions'
import { obtenerEstudiantesDirigidos } from '@/lib/estudiantesDirigidos'
import { traerTodasLasFilas } from '@/lib/consultas'
import { estadoEvento, formatearFecha } from '@/lib/estadoEvento'
import { nombrePersona } from '@/lib/formato'
import { agruparPagos } from '@/lib/pagos'
import { ui } from '@/lib/ui'
import CobroRapidoTabla from './CobroRapidoTabla'

type Params = { params: Promise<{ id: string }> }

type Producto = {
  id: string
  nombre: string
  precio_unitario: number
  cantidad_maxima_por_estudiante: number | null
}

export const metadata = { title: 'Cobro por salón' }

export default async function CobroRapidoPage({ params }: Params) {
  const { id } = await params
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, userId } = sesion

  const { data: evento } = await supabase
    .from('eventos')
    .select('id, institucion_id, nombre, fecha_limite_pago, fecha_evento, finalizado_en')
    .eq('id', id)
    .eq('institucion_id', sesion.institucionId)
    .maybeSingle()

  if (!evento) {
    notFound()
  }

  type PagoCrudo = {
    estudiante_id: string
    producto_id: string | null
    cantidad: number
    monto: number
    dinero_recibido: number | null
    devuelta_pendiente: boolean
    grupo_pago_id: string
  }

  // Los pagos se filtran por estudiante en código: una lista larga de ids en la consulta la hace fallar.
  const [{ data: persona }, { data: productosCrudos }, estudiantes, { data: pagosCrudos, error: errorPagos }] =
    await Promise.all([
      supabase.from('personas').select('nombres, apellidos, correo').eq('id', userId).maybeSingle(),
      supabase
        .from('productos')
        .select('id, nombre, precio_unitario, cantidad_maxima_por_estudiante')
        .eq('evento_id', evento.id)
        .order('created_at', { ascending: true }),
      obtenerEstudiantesDirigidos(supabase, evento.id, evento.institucion_id),
      traerTodasLasFilas<PagoCrudo>((desde, hasta) =>
        supabase
          .from('registros_pago')
          .select('estudiante_id, producto_id, cantidad, monto, dinero_recibido, devuelta_pendiente, grupo_pago_id')
          .eq('evento_id', evento.id)
          .order('id', { ascending: true })
          .range(desde, hasta)
      ),
    ])

  const miNombre = nombrePersona(persona, sesion.correo || 'Tú')
  const productos = (productosCrudos ?? []) as Producto[]
  const estudianteIds = new Set(estudiantes.map((e) => e.id))

  const pagosPrevios = pagosCrudos
    .filter(
      (p): p is PagoCrudo & { producto_id: string } =>
        Boolean(p.producto_id) && estudianteIds.has(p.estudiante_id)
    )
    .map((p) => ({
      estudianteId: p.estudiante_id,
      productoId: p.producto_id,
      cantidad: p.cantidad,
    }))

  const devueltasPendientes = agruparPagos(pagosCrudos)
    .filter((g) => g.devueltaPendiente)
    .map((g) => ({ grupoPagoId: g.grupoPagoId, estudianteId: g.estudianteId, valor: g.devuelta }))

  const estado = estadoEvento(evento)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/institucion/eventos/${evento.id}/pagos`} className={`${ui.enlace} text-sm`}>
          ← Pagos de {evento.nombre}
        </Link>
        <h1 className={`${ui.titulo} mt-1`}>Cobro por salón</h1>
        <p className={`${ui.textoSecundario} mt-1`}>
          Elige el salón, marca a los estudiantes que pagaron (y la cantidad, si el producto
          permite más de 1) y registra todos los pagos de una vez.
        </p>
      </div>

      {estado !== 'abierto' && (
        <p className={ui.avisoAmbar}>
          {estado === 'finalizado'
            ? 'Este evento ya está finalizado'
            : `El plazo de pago de este evento terminó el ${formatearFecha(evento.fecha_limite_pago)}`}
          : los acudientes ya no pueden pagarlo. Aun así, puedes registrar aquí pagos en efectivo
          que se recibieron y no se habían anotado.
        </p>
      )}

      {errorPagos && (
        <p className={ui.avisoRojo}>No se pudieron cargar los pagos: {errorPagos.message}</p>
      )}

      {!productos.length ? (
        <p className={ui.avisoAmbar}>
          Este evento todavía no tiene productos. Agrégalos en{' '}
          <strong>Eventos → Configurar</strong>.
        </p>
      ) : !estudiantes.length ? (
        <p className={ui.avisoAmbar}>
          Este evento todavía no está dirigido a ningún curso ni estudiante. Configúralo en{' '}
          <strong>Eventos → Configurar</strong>.
        </p>
      ) : (
        <CobroRapidoTabla
          action={registrarPagosRapidos.bind(null, evento.id)}
          eventoId={evento.id}
          devueltasPendientes={devueltasPendientes}
          estudiantes={estudiantes}
          productos={productos}
          pagosPrevios={pagosPrevios}
          miNombre={miNombre}
        />
      )}
    </div>
  )
}
