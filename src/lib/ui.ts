// Clases compartidas para que todas las pantallas se vean igual. "primario" sale de
// la paleta de la institución (src/lib/paletas.ts). Los botones miden 44px de alto
// en celular para que se puedan tocar con el dedo.
export const ui = {
  botonPrimario:
    'inline-flex min-h-11 items-center justify-center rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-hover active:brightness-90 disabled:opacity-50 sm:min-h-9',
  botonSecundario:
    'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 sm:min-h-9',
  botonPeligro:
    'inline-flex min-h-11 items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-50 sm:min-h-9',
  botonQuitar:
    'inline-flex min-h-11 items-center text-xs font-medium text-red-700 hover:underline sm:min-h-0',
  enlace: 'font-medium text-primario underline-offset-2 hover:underline',

  campo:
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primario',
  etiqueta: 'flex flex-col gap-1 text-sm font-medium text-gray-800',
  ayuda: 'text-xs text-gray-600',

  tarjeta: 'rounded-xl border border-gray-200 bg-white p-5',
  titulo: 'text-2xl font-semibold text-gray-900',
  subtitulo: 'text-base font-semibold text-gray-900',
  textoSecundario: 'text-sm text-gray-700',

  chip: 'inline-flex items-center gap-2 rounded-full border border-primario-borde bg-primario-suave px-3 py-1 text-sm text-primario',
  // La "×" de un chip: 44px de área táctil sin agrandar el chip.
  botonChip:
    '-my-3 -mr-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-lg leading-none text-primario hover:text-red-700 active:bg-white/60',

  avisoAmbar: 'rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900',
  avisoRojo: 'rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800',
  avisoVerde: 'rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800',
}
