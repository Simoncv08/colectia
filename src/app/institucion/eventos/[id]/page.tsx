import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import EtiquetaEstado from '@/components/EtiquetaEstado'
import { estadoEvento, hoyColombia, puedeReabrir } from '@/lib/estadoEvento'
import { ordenarGrados } from '@/lib/ordenarGrados'
import { traerTodasLasFilas } from '@/lib/consultas'
import { ui } from '@/lib/ui'
import SeccionDatos from './SeccionDatos'
import SeccionDirigidoA, { type GrupoDirigido } from './SeccionDirigidoA'
import SeccionProductos, { type Producto } from './SeccionProductos'

type Params = { params: Promise<{ id: string }> }

type EstudianteOpcion = { id: string; nombres: string; apellidos: string; curso_grado: string | null }

export const metadata = { title: 'Configurar evento' }

export default async function ConfigurarEventoPage({ params }: Params) {
  const { id } = await params
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion

  const { data: evento } = await supabase
    .from('eventos')
    .select('id, institucion_id, nombre, descripcion, imagen_url, fecha_limite_pago, fecha_evento, finalizado_en')
    .eq('id', id)
    .eq('institucion_id', institucionId)
    .maybeSingle()

  if (!evento) {
    notFound()
  }

  const [{ data: gradosCrudos }, { data: gruposCurso }, { data: gruposCrudos }, { data: productosCrudos }, { count: pagosDelEvento }, { data: estudiantes }] =
    await Promise.all([
      supabase.from('grados').select('id, nombre').eq('institucion_id', institucionId),
      supabase
        .from('grupos_curso')
        .select('id, nombre')
        .eq('institucion_id', institucionId)
        .order('nombre', { ascending: true }),
      supabase
        .from('evento_grupos')
        .select('id, curso_grado, estudiante_id, estudiantes(nombres, apellidos, curso_grado)')
        .eq('evento_id', evento.id),
      supabase
        .from('productos')
        .select('id, nombre, tipo, precio_unitario, cantidad_maxima_por_estudiante')
        .eq('evento_id', evento.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('registros_pago')
        .select('id', { count: 'exact', head: true })
        .eq('evento_id', evento.id),
      traerTodasLasFilas<EstudianteOpcion>((desde, hasta) =>
        supabase
          .from('estudiantes')
          .select('id, nombres, apellidos, curso_grado')
          .eq('institucion_id', institucionId)
          .order('apellidos', { ascending: true })
          .order('id', { ascending: true })
          .range(desde, hasta)
      ),
    ])

  const grados = ordenarGrados(gradosCrudos ?? [])
  const grupos: GrupoDirigido[] = gruposCrudos ?? []
  const cursosDirigidos = ordenarGrados(
    grupos.filter((g) => g.curso_grado).map((g) => ({ ...g, nombre: g.curso_grado! }))
  )
  const hoy = hoyColombia()
  const estado = estadoEvento(evento, hoy)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/institucion/eventos" className={`${ui.enlace} text-sm`}>
          ← Eventos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className={ui.titulo}>{evento.nombre}</h1>
          <EtiquetaEstado estado={estado} />
        </div>
        <p className={ui.textoSecundario}>Configuración del evento</p>
      </div>

      <SeccionDatos
        evento={evento}
        institucionId={institucionId}
        estado={estado}
        sePuedeReabrir={puedeReabrir(evento, hoy)}
        pagosDelEvento={pagosDelEvento ?? 0}
      />
      <SeccionDirigidoA
        eventoId={evento.id}
        grados={grados}
        gruposCurso={gruposCurso ?? []}
        estudiantes={estudiantes}
        cursosDirigidos={cursosDirigidos}
        estudiantesDirigidos={grupos.filter((g) => g.estudiante_id)}
      />
      <SeccionProductos eventoId={evento.id} productos={(productosCrudos ?? []) as Producto[]} />
    </div>
  )
}
