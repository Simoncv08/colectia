import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormularioLogin from './FormularioLogin'
import Marca from '@/components/Marca'
import { ui } from '@/lib/ui'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <h1>
            <Marca tamano="grande" />
          </h1>
          <p className={ui.textoSecundario}>Pagos escolares claros para familias y colegios.</p>
        </div>
        <div className={ui.tarjeta}>
          <FormularioLogin />
        </div>
        <p className="mt-4 text-center text-[13px] text-gray-600">
          Al usar Colectia aceptas los{' '}
          <Link href="/terminos" className={ui.enlace}>
            términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" className={ui.enlace}>
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
