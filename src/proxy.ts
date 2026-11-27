import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Va en src/, junto a app/: si queda en la raíz del proyecto, Next no lo ejecuta.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Los archivos estáticos y de metadatos (robots, sitemap, llms.txt, imágenes) y las rutas propias
  // de Vercel (/_vercel, como Speed Insights) no necesitan sesión.
  matcher: ['/((?!_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|llms.txt|.*\\.(?:png|svg|jpg|jpeg|webp|gif|ico|csv|xlsx|txt)$).*)'],
}
