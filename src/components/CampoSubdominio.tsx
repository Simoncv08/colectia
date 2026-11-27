import { DOMINIO_RAIZ } from '@/lib/sitio'
import { PATRON_SUBDOMINIO } from '@/lib/subdominios'
import { ui } from '@/lib/ui'

// Campo "lcp" + ".colectia.co" pegado a la derecha, para que se vea la dirección completa.
export default function CampoSubdominio({
  etiqueta,
  valorInicial,
  compacto = false,
}: {
  etiqueta: string
  valorInicial?: string | null
  compacto?: boolean
}) {
  return (
    <label className={compacto ? 'flex flex-col gap-1' : ui.etiqueta}>
      <span className={compacto ? 'sr-only' : undefined}>{etiqueta}</span>
      <span className="flex items-stretch">
        <input
          name="subdominio"
          required
          defaultValue={valorInicial ?? ''}
          minLength={3}
          maxLength={30}
          pattern={PATRON_SUBDOMINIO}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="lcp"
          title="De 3 a 30 caracteres: letras sin tildes, números y guiones."
          className={`${compacto ? ui.campoCompacto : ui.campo} w-full min-w-0 rounded-r-none lowercase`}
        />
        <span className="inline-flex items-center rounded-r-md border border-l-0 border-borde-campo bg-gray-50 px-3 text-sm text-gray-700">
          .{DOMINIO_RAIZ}
        </span>
      </span>
    </label>
  )
}
