import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import ProveedorAvisos from '@/components/Avisos'
import MedicionVelocidad from '@/components/MedicionVelocidad'
import { DESCRIPCION_SITIO, OPEN_GRAPH_BASE, SIN_INDEXAR, URL_SITIO } from '@/lib/sitio'
import { zonaActual } from '@/lib/zonaServidor'

// Por qué Manrope: ver DESIGN.md.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
})

// Solo www.colectia.co va a buscadores; las direcciones de los colegios y admin no.
export async function generateMetadata(): Promise<Metadata> {
  const { tipo } = await zonaActual()
  return {
    metadataBase: new URL(URL_SITIO),
    title: { template: '%s · Colectia', default: 'Colectia' },
    description: DESCRIPCION_SITIO,
    applicationName: 'Colectia',
    openGraph: OPEN_GRAPH_BASE,
    twitter: { card: 'summary_large_image' },
    ...(tipo === 'sitio' ? {} : { robots: SIN_INDEXAR }),
  }
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ProveedorAvisos>{children}</ProveedorAvisos>
        <MedicionVelocidad />
      </body>
    </html>
  )
}
