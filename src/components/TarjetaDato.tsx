import { ui } from '@/lib/ui'

// Resumen numérico (DESIGN.md 4.3). La cifra se achica según el ancho de la tarjeta para que
// nunca se salga. "ancho" ocupa las dos columnas en celular (útil para montos en pesos).
export default function TarjetaDato({
  titulo,
  valor,
  nota,
  alerta = false,
  ancho = false,
}: {
  titulo: string
  valor: React.ReactNode
  nota?: React.ReactNode
  alerta?: boolean
  ancho?: boolean
}) {
  // Las cifras cortas (conteos) van siempre grandes; los montos se ajustan al ancho.
  const corta = (typeof valor === 'string' || typeof valor === 'number') && String(valor).length <= 6
  return (
    <div className={`${ui.tarjeta} @container flex min-w-0 flex-col gap-1 ${ancho ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="text-[13px] font-medium text-gray-600">{titulo}</p>
      <p
        className={`font-bold [overflow-wrap:anywhere] ${
          corta
            ? 'text-[28px] leading-9 sm:text-[32px] sm:leading-10'
            : 'text-xl leading-8 @[11rem]:text-2xl @[14rem]:text-[28px] @[14rem]:leading-9 @[17rem]:text-[32px] @[17rem]:leading-10'
        } ${alerta ? 'text-alerta' : 'text-gray-900'}`}
      >
        {valor}
      </p>
      {nota && <p className="text-[13px] text-gray-600">{nota}</p>}
    </div>
  )
}
