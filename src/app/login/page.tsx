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
      </div>
    </main>
  )
}
