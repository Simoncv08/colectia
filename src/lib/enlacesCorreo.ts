import type { EmailOtpType } from '@supabase/supabase-js'

// Enlaces de los correos con {{ .TokenHash }} (página /auth/confirmar).
// A dónde va cada tipo de enlace después de confirmarlo. El destino no viene en el enlace,
// así nadie puede mandar a la persona a otra página.
export const DESTINOS_ENLACE: Partial<Record<EmailOtpType, string>> = {
  email: '/',
  signup: '/',
  magiclink: '/',
  email_change: '/',
  invite: '/restablecer',
  recovery: '/restablecer',
}

export function esTipoEnlace(tipo: string): tipo is EmailOtpType {
  return Object.hasOwn(DESTINOS_ENLACE, tipo)
}

export function esTokenValido(token: string) {
  return /^[A-Za-z0-9_-]{10,300}$/.test(token)
}
