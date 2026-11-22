import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type EstudianteVinculado = {
  id: string
  nombres: string
  apellidos: string
  curso_grado: string | null
  institucion_id: string
  instituciones: { nombre: string; estado: string } | null
}

export type Vinculo = { id: string; estudiantes: EstudianteVinculado }

export type Apariencia = { paleta: string | null; fondo: string | null }

// Compartido por el layout y las páginas de /acudiente; cache() evita repetir las consultas.
export const obtenerSesionAcudiente = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: persona }, { data: vinculosCrudos }] = await Promise.all([
    supabase
      .from('personas')
      .select('nombres, apellidos, correo, telefono')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('acudiente_estudiante')
      .select(
        'id, estudiantes(id, nombres, apellidos, curso_grado, institucion_id, instituciones(nombre, estado))'
      )
      .eq('persona_id', user.id),
  ])

  const vinculos = ((vinculosCrudos ?? []) as unknown as {
    id: string
    estudiantes: EstudianteVinculado | null
  }[])
    .filter((v): v is Vinculo => Boolean(v.estudiantes))
    .sort((a, b) =>
      `${a.estudiantes.nombres} ${a.estudiantes.apellidos}`.localeCompare(
        `${b.estudiantes.nombres} ${b.estudiantes.apellidos}`,
        'es'
      )
    )

  // Si falla (sin personalizacion_setup.sql), se usan los colores por defecto.
  const idsInstituciones = Array.from(new Set(vinculos.map((v) => v.estudiantes.institucion_id)))
  const apariencias = new Map<string, Apariencia>()
  if (idsInstituciones.length) {
    const { data: aparienciasCrudas } = await supabase
      .from('instituciones')
      .select('id, nombre, paleta, fondo')
      .in('id', idsInstituciones)
      .order('nombre', { ascending: true })
    for (const a of (aparienciasCrudas ?? []) as ({ id: string } & Apariencia)[]) {
      apariencias.set(a.id, { paleta: a.paleta, fondo: a.fondo })
    }
  }

  const nombre =
    [persona?.nombres, persona?.apellidos].filter(Boolean).join(' ').trim() || user.email || ''

  return {
    supabase,
    userId: user.id,
    correo: user.email ?? persona?.correo ?? '',
    nombre,
    persona: {
      nombres: persona?.nombres ?? '',
      apellidos: persona?.apellidos ?? '',
      telefono: persona?.telefono ?? '',
    },
    vinculos,
    apariencias,
    // El marco usa los colores de la primera institución; casi siempre hay una sola.
    aparienciaPrincipal: apariencias.values().next().value as Apariencia | undefined,
  }
})
