import type { Metadata } from 'next'
import Link from 'next/link'
import Marca from '@/components/Marca'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { pesos } from '@/lib/formato'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Precios',
  description:
    'Precio anual de Colectia según el número de estudiantes del colegio, con IVA incluido y prueba gratis. Para las familias es gratis.',
  alternates: { canonical: '/precios' },
}

// Los precios salen de la base (calcular_plan) y solo se muestran cuando el super administrador
// los publica.
export default async function PreciosPage() {
  const supabase = await createClient()
  const [{ data: config }, { data: tramos }] = await Promise.all([
    supabase.from('configuracion_plataforma').select('dias_prueba, precios_publicados').maybeSingle(),
    supabase.from('tarifa_tramos').select('id, etiqueta').order('id'),
  ])

  const publicados = Boolean(config?.precios_publicados)
  const filas = publicados
    ? await Promise.all(
        (tramos ?? []).map(async (t) => {
          const { data } = await supabase.rpc('calcular_plan', { p_tramo: t.id })
          return { ...t, valor: data ?? null }
        })
      )
    : []

  return (
    <main className="min-h-screen bg-fondo px-4 py-10">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" aria-label="Colectia, ir a la página de inicio">
            <Marca tamano="grande" />
          </Link>
          <h1 className={ui.titulo}>Precios</h1>
          <p className={ui.textoSecundario}>
            Un pago al año según el número de estudiantes del colegio. Para las familias, Colectia es gratis.
          </p>
        </div>

        {publicados ? (
          <section className={ui.tarjeta} aria-labelledby="titulo-tabla">
            <h2 id="titulo-tabla" className={ui.subtitulo}>
              Valor anual, IVA incluido
            </h2>
            <ul className="mt-3 divide-y divide-gray-200">
              {filas.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-gray-800">{f.etiqueta}</span>
                  <span className={`${ui.monto} text-gray-900`}>{f.valor === null ? '—' : pesos(f.valor)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-gray-600">
              Incluye Eventos y pagos: actividades, cobro por salón, pagos en efectivo y reportes. Prueba gratis{' '}
              {config?.dias_prueba ?? 7} días.
            </p>
          </section>
        ) : (
          <p className={ui.avisoInfo}>
            Estamos terminando de definir los precios. Escríbenos a{' '}
            <a href={`mailto:${CORREO_CONTACTO}`} className={ui.enlace}>
              {CORREO_CONTACTO}
            </a>{' '}
            y te contamos el valor para tu colegio.
          </p>
        )}

        <Link href="/registro" className={`${ui.botonPrimario} self-center`}>
          Probar gratis {config?.dias_prueba ?? 7} días
        </Link>
      </div>
    </main>
  )
}
