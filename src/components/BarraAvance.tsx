import type { ReactNode } from 'react'

// Un avance en porcentaje (0 a 100). La barra es decorativa: el número va escrito al lado, nunca
// solo el color. Por defecto habla de estudiantes con pago.
export default function BarraAvance({
  porcentaje,
  texto = `${porcentaje}% con pago`,
}: {
  porcentaje: number
  texto?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-primario" style={{ width: `${Math.min(100, porcentaje)}%` }} />
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-700">{texto}</span>
    </div>
  )
}
