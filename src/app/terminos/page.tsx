import PaginaLegal from '@/components/PaginaLegal'

export const metadata = { title: 'Términos y condiciones' }

export default async function Pagina({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  return <PaginaLegal tipo="terminos" version={version} />
}
