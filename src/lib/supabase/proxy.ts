import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './tipos'
import {
  ENCABEZADO_COLEGIO,
  ENCABEZADO_ZONA,
  codificarColegio,
  hostDeLaSolicitud,
  leerZona,
  rutaInterna,
  urlDeZona,
} from '@/lib/zona'

type CookieNueva = { name: string; value: string; options: CookieOptions }

// Corre en cada solicitud (src/proxy.ts): refresca la sesión de Supabase y resuelve qué
// zona y qué colegio pide la dirección. La app lo lee de los encabezados x-colectia-*, que se
// reemplazan siempre: los que mande el navegador no cuentan.
export async function updateSession(request: NextRequest) {
  const url = request.nextUrl
  // La dirección real que pidió el navegador: en Vercel, nextUrl puede traer el host interno.
  const host = hostDeLaSolicitud(request.headers) ?? url.host
  const zona = leerZona(host.split(':')[0])

  if (zona.tipo === 'raiz') {
    return NextResponse.redirect(urlDeZona(host, 'www', url.pathname + url.search), 308)
  }

  // Si un correo llega sin dirección de regreso, Supabase usa el Site URL: "/?token_hash=…".
  if (url.pathname === '/' && url.searchParams.has('token_hash')) {
    const destino = url.clone()
    destino.pathname = '/auth/confirmar'
    return NextResponse.redirect(destino)
  }

  const cookiesNuevas: CookieNueva[] = []
  const supabase: SupabaseClient<Database> = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesNuevas.push(...cookiesToSet)
        },
      },
    }
  )

  // No poner código entre createServerClient() y getClaims(): un error aquí
  // puede hacer que se pierda la sesión de los usuarios de forma aleatoria.
  await supabase.auth.getClaims()

  const responder = (respuesta: NextResponse) => {
    cookiesNuevas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options))
    return respuesta
  }

  const interna = rutaInterna(zona, url.pathname)
  if (!interna) {
    return responder(NextResponse.rewrite(new URL('/__no-encontrado', url), { status: 404 }))
  }

  // request.headers ya trae las cookies renovadas (request.cookies.set las escribe ahí).
  const encabezados = new Headers(request.headers)
  encabezados.delete(ENCABEZADO_COLEGIO)
  encabezados.set(ENCABEZADO_ZONA, zona.tipo)

  if (zona.tipo === 'colegio') {
    const { data } = await supabase.rpc('colegio_publico', { p_subdominio: zona.subdominio })
    const colegio = data?.[0]
    if (!colegio) {
      return responder(NextResponse.rewrite(new URL('/colegio-no-encontrado', url), { status: 404 }))
    }
    if (colegio.redirigir_a) {
      return responder(NextResponse.redirect(urlDeZona(host, colegio.redirigir_a, url.pathname + url.search), 301))
    }
    encabezados.set(
      ENCABEZADO_COLEGIO,
      codificarColegio({
        id: colegio.id,
        nombre: colegio.nombre,
        subdominio: colegio.subdominio,
        estado: colegio.estado,
        paleta: colegio.paleta,
        fondo: colegio.fondo,
      })
    )
  }

  if (interna === url.pathname) {
    return responder(NextResponse.next({ request: { headers: encabezados } }))
  }
  const destino = url.clone()
  destino.pathname = interna
  return responder(NextResponse.rewrite(destino, { request: { headers: encabezados } }))
}
