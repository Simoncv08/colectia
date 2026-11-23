import { cache } from 'react'
import { nombrePersona } from '@/lib/formato'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/tipos'

export type EstudianteVinculado = Pick<
  Tables<'estudiantes'>,
  'id' | 'nombres' | 'apellidos' | 'curso_grado' | 'institucion_id'
> & { instituciones: Pick<Tables<'instituciones'>, 'nombre' | 'estado' | 'paleta' | 'fondo'> }

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
        'id, estudiantes(id, nombres, apellidos, curso_grado, institucion_id, instituciones(nombre, estado, paleta, fondo))'
      )
      .eq('persona_id', user.id),
  ])

  const vinculos = (vinculosCrudos ?? [])
    .filter((v): v is Vinculo => Boolean(v.estudiantes))
    .sort((a, b) =>
      `${a.estudiantes.nombres} ${a.estudiantes.apellidos}`.localeCompare(
        `${b.estudiantes.nombres} ${b.estudiantes.apellidos}`,
        'es'
      )
    )

  // Colores de cada institución, en orden alfabético para que el marco use siempre la misma.
  const apariencias = new Map<string, Apariencia>()
  for (const { estudiantes: e } of [...vinculos].sort((a, b) =>
    (a.estudiantes.instituciones?.nombre ?? '').localeCompare(b.estudiantes.instituciones?.nombre ?? '', 'es')
  )) {
    if (!apariencias.has(e.institucion_id)) {
      apariencias.set(e.institucion_id, {
        paleta: e.instituciones?.paleta ?? null,
        fondo: e.instituciones?.fondo ?? null,
      })
    }
  }

  const nombre = nombrePersona(persona, user.email ?? '')

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
