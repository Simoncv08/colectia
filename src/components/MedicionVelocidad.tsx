'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'

// Vercel Speed Insights: mide qué tan rápido cargan las páginas en los celulares reales.
// Se envía la dirección sin lo que va después de ? o #, que puede traer datos de la persona.
export default function MedicionVelocidad() {
  return <SpeedInsights beforeSend={(evento) => ({ ...evento, url: evento.url.split(/[?#]/)[0] })} />
}
