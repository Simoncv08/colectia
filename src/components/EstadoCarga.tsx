// Esqueleto mientras carga una página, con la forma aproximada del contenido final.
export default function EstadoCarga({ texto }: { texto: string }) {
  return (
    <div role="status" className="flex flex-col gap-4 py-2">
      <span className="sr-only">{texto}</span>
      <div aria-hidden="true" className="h-8 w-56 rounded-lg bg-gray-200 motion-safe:animate-pulse" />
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 motion-safe:animate-pulse" />
        ))}
      </div>
      <div aria-hidden="true" className="h-48 rounded-xl bg-gray-100 motion-safe:animate-pulse" />
    </div>
  )
}
