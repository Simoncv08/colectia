import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { ui } from '@/lib/ui'
import BotonDescargarExcel from './BotonDescargarExcel'
import { SIN_CURSO, nombreCurso } from '@/lib/formato'
import FiltrosActivos from '@/components/FiltrosActivos'
import {
  etiquetasFiltros,
  filtrosAParametros,
  filtrosEfectivos,
  leerFiltros,
  vistaUsaFiltrosDeDinero,
  type Vista,
} from '@/lib/reportes'
import { cargarDatosReporte } from '@/lib/reportesDatos'
import { cursosDisponibles } from '@/lib/reportesDetalle'
import { VistaEventos, VistaPendientes, VistaRecaudo } from './Vistas'

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const VISTAS: { valor: Vista; etiqueta: string; descripcion: string }[] = [
  {
    valor: 'eventos',
    etiqueta: 'Resumen por evento',
    descripcion: 'Cuánto se ha recaudado en cada evento, cuántos pagaron y cuántos faltan.',
  },
  {
    valor: 'recaudo',
    etiqueta: 'Recaudo por persona',
    descripcion:
      'Cuánto dinero en efectivo recibió cada persona del personal, y en qué días (para cuadrar caja).',
  },
  {
    valor: 'pendientes',
    etiqueta: 'Quién no ha pagado',
    descripcion: 'Estudiantes que todavía no tienen ningún pago en el evento, por curso.',
  },
]

export const metadata = { title: 'Reportes' }

export default async function ReportesPage({ searchParams }: Params) {
  // Los enlaces conservan los filtros de la URL; los cálculos usan solo los que aplican a la vista.
  const deLaUrl = leerFiltros(await searchParams)
  const f = filtrosEfectivos(deLaUrl)
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null
  const { supabase, institucionId } = sesion

  if (!sesion.esAdmin) {
    return (
      <p className={ui.textoSecundario}>
        Solo el administrador de la institución puede ver los reportes.
      </p>
    )
  }

  const datos = await cargarDatosReporte(supabase, institucionId)
  const cursos = cursosDisponibles(datos)
  const personal = Array.from(datos.personalPorId.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], 'es')
  )
  const usaDineroFiltros = vistaUsaFiltrosDeDinero(f.vista)
  const vistaActual = VISTAS.find((v) => v.valor === f.vista)!
  const filtrosActivos = etiquetasFiltros(datos, f).map((x) => ({
    etiqueta: x.etiqueta,
    hrefQuitar: `/admin/reportes?${filtrosAParametros(deLaUrl, { [x.campo]: '' })}`,
  }))

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className={ui.titulo}>Reportes</h1>
        <BotonDescargarExcel parametros={filtrosAParametros(deLaUrl, { vista: f.vista })} />
      </div>

      <nav aria-label="Tipo de reporte" className={`${ui.pestanas} mb-4`}>
        {VISTAS.map((v) => (
          <Link
            key={v.valor}
            href={`/admin/reportes?${filtrosAParametros(deLaUrl, { vista: v.valor })}`}
            aria-current={f.vista === v.valor ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-4 text-sm ${
              f.vista === v.valor
                ? 'border-primario font-semibold text-primario'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            {v.etiqueta}
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-sm text-gray-700">{vistaActual.descripcion}</p>

      <form method="get" className={`${ui.tarjeta} ${ui.filtros} mb-6 md:p-4`}>
        {f.vista !== 'eventos' && <input type="hidden" name="vista" value={f.vista} />}
        <label className={`${ui.etiqueta} col-span-2`}>
          Evento
          <select name="evento" defaultValue={f.evento} className={ui.campoCompacto}>
            <option value="">
              {f.vista === 'pendientes' ? 'Todos los eventos vigentes' : 'Todos los eventos'}
            </option>
            {datos.eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.estado === 'finalizado' ? ' (finalizado)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.etiqueta}>
          Curso
          <select name="curso" defaultValue={f.curso} className={ui.campoCompacto}>
            <option value="">Todos</option>
            {cursos.map((c) => (
              <option key={c || SIN_CURSO} value={c || SIN_CURSO}>
                {nombreCurso(c)}
              </option>
            ))}
          </select>
        </label>
        {usaDineroFiltros && (
          <>
            <label className={ui.etiqueta}>
              Pagos desde
              <input type="date" name="desde" defaultValue={f.desde} className={ui.campoCompacto} />
            </label>
            <label className={ui.etiqueta}>
              Pagos hasta
              <input type="date" name="hasta" defaultValue={f.hasta} className={ui.campoCompacto} />
            </label>
            <label className={ui.etiqueta}>
              Recibió
              <select name="persona" defaultValue={f.persona} className={ui.campoCompacto}>
                <option value="">Todo el personal</option>
                {personal.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button type="submit" className={`${ui.botonPrimario} col-span-2 sm:min-h-9`}>
          Aplicar filtros
        </button>
      </form>

      {filtrosActivos.length > 0 && (
        <div className="-mt-3 mb-6">
          <FiltrosActivos
            filtros={filtrosActivos}
            hrefLimpiar={`/admin/reportes${f.vista !== 'eventos' ? `?vista=${f.vista}` : ''}`}
          />
        </div>
      )}

      {datos.errores.length > 0 && (
        <p className={`${ui.avisoRojo} mb-4`}>
          No se pudo cargar toda la información. Recarga la página para intentar de nuevo.
        </p>
      )}

      {f.vista === 'eventos' && <VistaEventos datos={datos} f={f} />}
      {f.vista === 'recaudo' && <VistaRecaudo datos={datos} f={f} />}
      {f.vista === 'pendientes' && <VistaPendientes datos={datos} f={f} />}
    </div>
  )
}
