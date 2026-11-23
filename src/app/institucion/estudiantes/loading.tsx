import {
  BotonEsqueleto,
  CabeceraEsqueleto,
  Cargando,
  CampoEsqueleto,
  ListaEsqueleto,
} from '@/components/Esqueleto'
import { ui } from '@/lib/ui'

// Lista de estudiantes: búsqueda y una fila por estudiante.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando los estudiantes…">
      <CabeceraEsqueleto botones={2} />
      <div className={ui.filtros}>
        <CampoEsqueleto className="col-span-2 sm:w-72" etiqueta="w-12" />
        <CampoEsqueleto className="sm:w-44" etiqueta="w-10" />
        <BotonEsqueleto className="w-full sm:w-28" />
      </div>
      <ListaEsqueleto filas={8} accion />
    </Cargando>
  )
}
