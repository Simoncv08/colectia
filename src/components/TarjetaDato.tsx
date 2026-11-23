import { ui } from '@/lib/ui'

// Resumen numérico (DESIGN.md 4.3): etiqueta, cifra grande y una línea de contexto opcional.
export default function TarjetaDato({
  titulo,
  valor,
  nota,
  alerta = false,
}: {
  titulo: string
  valor: React.ReactNode
  nota?: React.ReactNode
  alerta?: boolean
}) {
  return (
    <div className={`${ui.tarjeta} flex flex-col gap-1`}>
      <p className="text-[13px] font-medium text-gray-600">{titulo}</p>
      <p className={`text-[28px] font-bold leading-9 sm:text-[32px] sm:leading-10 ${alerta ? 'text-alerta' : 'text-gray-900'}`}>
        {valor}
      </p>
      {nota && <p className="text-[13px] text-gray-600">{nota}</p>}
    </div>
  )
}
