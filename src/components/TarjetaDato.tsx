// Cifra destacada de un resumen (recaudado, pagaron, faltan...).
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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-700">{titulo}</p>
      <p className={`text-xl font-semibold ${alerta ? 'text-amber-800' : 'text-gray-900'}`}>{valor}</p>
      {nota && <p className="text-xs text-gray-600">{nota}</p>}
    </div>
  )
}
