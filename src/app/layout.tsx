import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import ProveedorAvisos from '@/components/Avisos'

// Por qué Manrope: ver DESIGN.md.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { template: '%s · Colectia', default: 'Colectia' },
  description: 'Pagos de actividades escolares, sin efectivo en manos de los estudiantes.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  )
}
