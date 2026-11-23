// Símbolo simple en el color de marca y el nombre en texto (DESIGN.md, Marca).
export default function Marca({ tamano = 'normal' }: { tamano?: 'normal' | 'grande' }) {
  const grande = tamano === 'grande'
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight text-gray-900 ${grande ? 'text-3xl' : 'text-lg'}`}>
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center rounded-lg bg-primario font-bold text-white ${grande ? 'h-10 w-10 text-2xl' : 'h-6 w-6 text-sm'}`}
      >
        C
      </span>
      Colectia
    </span>
  )
}
