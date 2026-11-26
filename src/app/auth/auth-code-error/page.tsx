import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo p-4">
      <div className="w-full max-w-[400px] rounded-xl border border-gray-200 bg-white p-6 text-center shadow-xs sm:p-8">
        <h1 className="text-xl font-semibold text-gray-900">No se pudo iniciar sesión</h1>
        <p className="mt-2 text-sm text-gray-700">
          Si llegaste desde un enlace del correo, puede que ya haya vencido o que ya se haya usado.
          Pide uno nuevo desde la página de inicio de sesión. Si entrabas con Google, vuelve a
          intentarlo.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primario px-4 py-2.5 text-sm font-medium text-white hover:bg-primario-hover"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  )
}
