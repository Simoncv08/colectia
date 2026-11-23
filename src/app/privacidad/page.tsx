import PaginaLegal from '@/components/PaginaLegal'

export const metadata = { title: 'Política de privacidad' }

export default async function Pagina({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  return <PaginaLegal tipo="privacidad" version={version} />
}
