// Porcentaje de estudiantes que ya pagaron. La barra es decorativa: el número va escrito al lado.
export default function BarraAvance({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="flex items-center gap-2">
      <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-primario" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-700">{porcentaje}% pagó</span>
    </div>
  )
}
