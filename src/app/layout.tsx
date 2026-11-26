import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import ProveedorAvisos from '@/components/Avisos'
import { DESCRIPCION_SITIO, OPEN_GRAPH_BASE, URL_SITIO } from '@/lib/sitio'

// Por qué Manrope: ver DESIGN.md.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: { template: '%s · Colectia', default: 'Colectia' },
  description: DESCRIPCION_SITIO,
  applicationName: 'Colectia',
  openGraph: OPEN_GRAPH_BASE,
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  )
}
