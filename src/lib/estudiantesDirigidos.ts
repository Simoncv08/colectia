import type { createClient } from '@/lib/supabase/server'
import { enTrozos, traerTodasLasFilas } from '@/lib/consultas'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type EstudianteDirigido = {
  id: string
  nombres: string
  apellidos: string
  curso_grado: string | null
}

// Estudiantes de los cursos del evento más los agregados uno por uno (evento_grupos).
export async function obtenerEstudiantesDirigidos(
  supabase: Supabase,
  eventoId: string,
  institucionId: string
): Promise<EstudianteDirigido[]> {
  const { data: grupos } = await supabase
    .from('evento_grupos')
    .select('curso_grado, estudiante_id')
    .eq('evento_id', eventoId)

  const cursos = Array.from(
    new Set(
      (grupos ?? []).map((g) => g.curso_grado).filter((c): c is string => Boolean(c))
    )
  )
  const idsDirectos = (grupos ?? [])
    .map((g) => g.estudiante_id)
    .filter((e): e is string => Boolean(e))

  const { data: porCurso } =
    cursos.length > 0
      ? await traerTodasLasFilas<EstudianteDirigido>((desde, hasta) =>
          supabase
            .from('estudiantes')
            .select('id, nombres, apellidos, curso_grado')
            .eq('institucion_id', institucionId)
            .in('curso_grado', cursos)
            .order('id', { ascending: true })
            .range(desde, hasta)
        )
      : { data: [] as EstudianteDirigido[] }

  const directos: EstudianteDirigido[] = []
  for (const trozo of enTrozos(idsDirectos)) {
    const { data } = await supabase
      .from('estudiantes')
      .select('id, nombres, apellidos, curso_grado')
      .in('id', trozo)
    directos.push(...((data ?? []) as EstudianteDirigido[]))
  }

  const mapa = new Map<string, EstudianteDirigido>()
  for (const e of [...porCurso, ...directos]) {
    mapa.set(e.id, e)
  }

  return Array.from(mapa.values()).sort((a, b) =>
    `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es', {
      sensitivity: 'base',
    })
  )
}
