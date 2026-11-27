import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { ui } from '@/lib/ui'

export const metadata = { title: 'Módulos' }

// Lo que el colegio puede usar en Colectia. Por ahora Eventos viene incluido y los demás se
// anuncian como "Disponible pronto"; encender y apagar llega con el segundo módulo.
export default async function ModulosPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  if (!sesion.esAdmin) {
    return <p className="text-gray-700">Solo el administrador puede ver los módulos del colegio.</p>
  }

  const { data: modulos, error } = await sesion.supabase
    .from('modulos')
    .select('clave, nombre, descripcion, estado, siempre_activo')
    .order('orden', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={ui.titulo}>Módulos</h1>
        <p className={ui.textoSecundario}>Las herramientas de Colectia para tu colegio.</p>
      </div>

      {error && <p className={ui.avisoRojo}>No se pudieron cargar los módulos. Recarga la página.</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {(modulos ?? []).map((m) => (
          <li key={m.clave} className={`${ui.tarjeta} flex flex-col gap-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={ui.subtitulo}>{m.nombre}</h2>
              {m.estado === 'proximamente' ? (
                <span className={`${ui.pildora} ${ui.estadoNeutro}`}>Disponible pronto</span>
              ) : (
                <span className={`${ui.pildora} ${ui.estadoPagado}`}>
                  {m.siempre_activo ? 'Activo · incluido' : 'Activo'}
                </span>
              )}
            </div>
            <p className={ui.textoSecundario}>{m.descripcion}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
