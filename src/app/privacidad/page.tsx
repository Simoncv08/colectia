import type { Metadata } from 'next'
import PaginaLegal from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Qué datos de familias, estudiantes y colegios recoge Colectia, para qué los usa, cómo los protege y cómo pedir que los actualicemos o los borremos.',
  // ?version=N muestra versiones anteriores; la que cuenta para buscadores es la vigente.
  alternates: { canonical: '/privacidad' },
}

export default async function Pagina({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  return <PaginaLegal tipo="privacidad" version={version} />
}
