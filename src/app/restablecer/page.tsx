import Link from 'next/link'
import FormularioContrasena from '@/components/FormularioContrasena'
import { ui } from '@/lib/ui'

// Se llega desde el correo de recuperación, después de que /auth/callback abrió la sesión.
export default function RestablecerPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Crear contraseña nueva</h1>
        <FormularioContrasena alTerminar="ir_al_inicio" />
        <Link href="/login" className={`${ui.enlace} mt-4 block text-center text-sm`}>
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  )
}
