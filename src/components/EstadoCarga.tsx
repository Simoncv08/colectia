// Aviso mientras carga una página. role="status" para que los lectores de pantalla lo anuncien.
export default function EstadoCarga({ texto }: { texto: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-sm text-gray-700">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primario motion-reduce:animate-none"
      />
      {texto}
    </div>
  )
}
