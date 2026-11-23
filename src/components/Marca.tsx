import LogoAbeja from '@/components/LogoAbeja'

// La abeja de Colectia en su amarillo miel (#f5c400) y el nombre en texto (DESIGN.md, Marca).
// "claro" pone el nombre en blanco, para fondos oscuros.
export default function Marca({ tamano = 'normal', claro = false }: { tamano?: 'normal' | 'grande'; claro?: boolean }) {
  const grande = tamano === 'grande'
  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight ${claro ? 'text-white' : 'text-gray-900'} ${
        grande ? 'gap-2.5 text-3xl' : 'gap-1.5 text-lg'
      }`}
    >
      <LogoAbeja className={`shrink-0 text-miel ${grande ? 'h-12 w-12' : 'h-8 w-8'}`} />
      Colectia
    </span>
  )
}
