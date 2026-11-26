import { ui } from '@/lib/ui'

// Sin el celular no hay otra forma de pasar el segundo paso: el factor se borra a mano en Supabase.
export default function DosPasosRecuperacion({ className = '' }: { className?: string }) {
  return (
    <p className={`${ui.ayuda} ${className}`}>
      ¿Perdiste el celular? Borra la verificación en Supabase: Authentication → Users → tu usuario → MFA. Al volver a
      entrar, configuras la app de nuevo.
    </p>
  )
}
