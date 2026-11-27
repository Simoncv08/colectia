import CampoPesos from '@/components/CampoPesos'
import FormularioAccion from '@/components/FormularioAccion'
import { obtenerSesionSuperAdmin } from '@/lib/sesionSuperAdmin'
import { ui } from '@/lib/ui'
import { guardarTarifas } from './actions'

export const metadata = { title: 'Tarifas' }

// Por ahora solo el valor base por tramo: los módulos opcionales tendrán su precio cuando existan.
export default async function TarifasPage() {
  const sesion = await obtenerSesionSuperAdmin()
  if (!sesion) return null
  const { supabase } = sesion

  const [{ data: tramos }, { data: tarifas }, { data: config }] = await Promise.all([
    supabase.from('tarifa_tramos').select('id, etiqueta').order('id'),
    supabase.from('tarifas').select('tramo_id, valor_anual').eq('concepto', 'base'),
    supabase.from('configuracion_plataforma').select('dias_prueba, precios_publicados').maybeSingle(),
  ])
  const valor = new Map((tarifas ?? []).map((t) => [t.tramo_id, t.valor_anual]))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={ui.titulo}>Tarifas</h1>
        <p className={ui.textoSecundario}>
          Valor anual de la suscripción por tramo de estudiantes, siempre con IVA incluido.
        </p>
      </div>

      <FormularioAccion action={guardarTarifas} vaciarAlTerminar={false} className={`${ui.tarjeta} flex flex-col gap-4`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(tramos ?? []).map((t) => (
            <label key={t.id} className={ui.etiqueta}>
              {t.etiqueta}
              <CampoPesos
                name={`base_${t.id}`}
                defaultValue={valor.get(t.id) || ''}
                placeholder="$ 0"
                className={ui.campo}
              />
            </label>
          ))}
        </div>
        <label className={`${ui.etiqueta} sm:w-60`}>
          Días de prueba para colegios nuevos
          <select name="dias_prueba" defaultValue={config?.dias_prueba ?? 7} className={ui.campo}>
            {[3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-800">
          <input type="checkbox" name="publicar" defaultChecked={config?.precios_publicados} className="h-5 w-5" />
          Publicar los precios en www.colectia.co/precios
        </label>
        <div>
          <button type="submit" className={ui.botonPrimario}>
            Guardar tarifas
          </button>
        </div>
      </FormularioAccion>
    </div>
  )
}
