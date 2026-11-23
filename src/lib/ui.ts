// Clases compartidas de DESIGN.md, para que todas las pantallas se vean igual. "primario" es el
// color de marca y sale de la paleta de la institución (src/lib/paletas.ts).
const transicion = 'transition-colors duration-[120ms] ease-colectia'

export const ui = {
  // Botones de 44 px; el compacto (36 px) es solo para tablas y filtros del personal.
  botonPrimario: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primario px-5 py-2 text-sm font-semibold text-white hover:bg-primario-hover disabled:opacity-50 ${transicion}`,
  botonSecundario: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-borde-campo bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50 ${transicion}`,
  botonFantasma: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primario hover:bg-primario-suave disabled:opacity-50 ${transicion}`,
  // Abre la confirmación de algo destructivo; el botón rojo sólido solo va dentro de esa ventana.
  botonPeligro: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-borde-campo bg-white px-4 py-2 text-sm font-semibold text-peligro hover:bg-peligro-suave disabled:opacity-50 ${transicion}`,
  botonPeligroSolido: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-peligro px-5 py-2 text-sm font-semibold text-white hover:brightness-90 disabled:opacity-50 ${transicion}`,
  botonCompacto: `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde-campo bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50 sm:min-h-9 ${transicion}`,
  botonQuitar: `inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-peligro hover:bg-peligro-suave sm:min-h-9 ${transicion}`,
  enlace: 'font-semibold text-primario underline-offset-2 hover:underline',

  campo:
    // 16 px en celular: con menos, el iPhone hace zoom al tocar el campo y la pantalla se mueve.
    'min-h-11 w-full min-w-0 rounded-md border border-borde-campo bg-white px-3 py-2 text-base text-gray-900 sm:text-[15px] placeholder:text-gray-500 focus:border-primario focus:outline-none focus:ring-[3px] focus:ring-primario/25',
  campoCompacto:
    'min-h-11 min-w-0 rounded-md border border-borde-campo bg-white px-3 text-base text-gray-900 sm:text-sm placeholder:text-gray-500 focus:border-primario focus:outline-none focus:ring-[3px] focus:ring-primario/25 sm:min-h-9',
  etiqueta: 'flex flex-col gap-1 text-[13px] font-medium text-gray-600',
  ayuda: 'text-xs text-gray-600',

  tarjeta: 'rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5 md:p-6',
  titulo: 'text-[22px] font-bold leading-8 text-gray-900 sm:text-2xl',
  subtitulo: 'text-lg font-semibold text-gray-900',
  textoSecundario: 'text-[15px] text-gray-600',
  monto: 'font-semibold tabular-nums',

  // Botones de la cabecera de una página: en celular ocupan todo el ancho, uno debajo del otro.
  accionesPagina: 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto',
  // Pestañas que en celular se desplazan de lado en vez de apilarse.
  pestanas: '-mx-4 flex gap-1 overflow-x-auto border-b border-gray-200 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0',
  // Filtros: dos columnas en celular, en fila desde sm.
  filtros: 'grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap [&_select]:w-full [&_input]:w-full sm:[&_select]:w-auto sm:[&_input]:w-auto',

  // Tablas del personal: dentro de una tarjeta, montos a la derecha.
  contenedorTabla: 'overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs',
  tabla: 'w-full text-left text-sm',
  encabezadoTabla: 'bg-gray-100 text-[13px] font-medium text-gray-600 [&_th]:px-4 [&_th]:py-3',
  filaTabla: 'border-t border-gray-200 hover:bg-gray-50 [&_td]:px-4 [&_td]:py-3',

  // Tabla que en celular se vuelve una tarjeta por fila: cada celda muestra su título con data-titulo.
  tablaResponsiva: 'block w-full text-left text-sm sm:table',
  encabezadoResponsivo:
    'hidden bg-gray-100 text-[13px] font-medium text-gray-600 sm:table-header-group [&_th]:px-4 [&_th]:py-3',
  cuerpoResponsivo: 'block sm:table-row-group',
  filaResponsiva:
    'relative block border-t border-gray-200 px-4 py-3 first:border-t-0 sm:table-row sm:p-0 sm:first:border-t sm:hover:bg-gray-50',
  // En celular: el título de la fila (nombre) arriba, sin etiqueta.
  celdaTitulo:
    'block pb-1 pr-24 text-[15px] font-semibold text-gray-900 sm:table-cell sm:px-4 sm:py-3 sm:pr-4 sm:text-sm',
  // En celular: un dato con su etiqueta al lado, en una línea.
  celdaResponsiva:
    'flex min-h-8 items-center gap-3 py-0.5 text-sm before:w-28 before:shrink-0 before:text-[13px] before:font-medium before:text-gray-600 before:content-[attr(data-titulo)] empty:hidden sm:table-cell sm:px-4 sm:py-3 sm:before:content-none sm:empty:table-cell',
  // En celular: un dato con su etiqueta encima (formularios dentro de la fila).
  celdaBloque:
    'flex flex-col items-start gap-1 py-1.5 text-sm before:text-[13px] before:font-medium before:text-gray-600 before:content-[attr(data-titulo)] empty:hidden sm:table-cell sm:px-4 sm:py-3 sm:before:content-none sm:empty:table-cell',
  // En celular: la acción de la fila (Editar) arriba a la derecha.
  celdaAccion: 'absolute right-2 top-1.5 sm:static sm:table-cell sm:px-4 sm:py-3 sm:text-right',
  // En celular: la casilla de marcar, a la izquierda del nombre (la fila lleva pl-14).
  celdaCasilla: 'absolute left-3 top-1.5 sm:static sm:table-cell sm:px-4 sm:py-3',

  chip: 'inline-flex items-center gap-2 rounded-full border border-primario-borde bg-primario-suave px-3 py-1 text-sm font-medium text-primario',
  // La "×" de un chip: 44 px de área táctil sin agrandar el chip.
  botonChip:
    '-my-3 -mr-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-primario hover:text-peligro active:bg-white/60',

  // Solo las etiquetas de estado y los chips son completamente redondos.
  pildora: 'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold',
  estadoPagado: 'bg-exito-suave text-exito',
  estadoPendiente: 'bg-alerta-suave text-alerta',
  estadoPeligro: 'bg-peligro-suave text-peligro',
  estadoNeutro: 'bg-neutro-suave text-neutro',

  avisoAmbar: 'rounded-lg border border-alerta/30 bg-alerta-suave p-3 text-sm text-alerta',
  avisoRojo: 'rounded-lg border border-peligro/30 bg-peligro-suave p-3 text-sm text-peligro',
  avisoVerde: 'rounded-lg border border-exito/30 bg-exito-suave p-3 text-sm text-exito',
  avisoInfo: 'rounded-lg border border-primario-borde bg-primario-suave p-3 text-sm text-gray-900',
}
