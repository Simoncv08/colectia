import LogoAbeja from '@/components/LogoAbeja'

// La abeja de Colectia en el color de marca (el de la paleta de la institución) y el nombre en
// texto (DESIGN.md, Marca).
export default function Marca({ tamano = 'normal' }: { tamano?: 'normal' | 'grande' }) {
  const grande = tamano === 'grande'
  return (
    <span className={`inline-flex items-center font-bold tracking-tight text-gray-900 ${grande ? 'gap-2.5 text-3xl' : 'gap-1.5 text-lg'}`}>
      <LogoAbeja className={`shrink-0 text-primario ${grande ? 'h-12 w-12' : 'h-8 w-8'}`} />
      Colectia
    </span>
  )
}
