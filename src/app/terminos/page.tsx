import type { Metadata } from 'next'
import PaginaLegal from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    'Las condiciones para usar Colectia, la plataforma de pagos de actividades escolares para colegios, familias y acudientes en Colombia.',
  // ?version=N muestra versiones anteriores; la que cuenta para buscadores es la vigente.
  alternates: { canonical: '/terminos' },
}

export default async function Pagina({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  return <PaginaLegal tipo="terminos" version={version} />
}
