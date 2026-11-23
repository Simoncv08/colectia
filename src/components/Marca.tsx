// El nombre del producto como texto; Colectia no tiene logo.
export default function Marca({ className = '' }: { className?: string }) {
  return <span className={`font-bold tracking-tight text-gray-900 ${className}`}>Colectia</span>
}
