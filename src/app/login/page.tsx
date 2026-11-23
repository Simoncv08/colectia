import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormularioLogin from './FormularioLogin'
import Marca from '@/components/Marca'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1>
            <Marca className="text-3xl" />
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Los pagos de las actividades del colegio, claros para las familias y para el colegio.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <FormularioLogin />
        </div>
      </div>
    </main>
  )
}
