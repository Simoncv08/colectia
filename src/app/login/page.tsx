import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormularioLogin from './FormularioLogin'

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
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Colectia</h1>
          <p className="mt-1 text-sm text-gray-700">
            Pagos de actividades escolares, sin efectivo en manos de los estudiantes.
          </p>
        </div>
        <FormularioLogin />
      </div>
    </main>
  )
}
