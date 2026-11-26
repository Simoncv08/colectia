import { isAuthSessionMissingError, type AuthError, type Factor } from '@supabase/supabase-js'

// Qué le falta al super administrador para usar el panel: registrar su app de códigos
// ("configurar") o escribir el código en esta sesión ("verificar"). La base exige aal2.
export type DosPasos =
  | { paso: 'listo'; factor: Factor }
  | { paso: 'verificar'; factor: Factor }
  | { paso: 'configurar' }

export function estadoDosPasos(factores: Factor[] | undefined, nivel: string | null): DosPasos {
  const factor = factores?.find((f) => f.factor_type === 'totp' && f.status === 'verified')
  if (!factor) return { paso: 'configurar' }
  return { paso: nivel === 'aal2' ? 'listo' : 'verificar', factor }
}

// Los errores de Supabase Auth en la verificación en dos pasos, en palabras simples.
export function mensajeDosPasos(error: AuthError) {
  if (isAuthSessionMissingError(error)) return 'Tu sesión venció. Cierra sesión y vuelve a entrar.'
  switch (error.code) {
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
      return 'Ese código no sirvió. Cambia cada 30 segundos: escribe el que muestra ahora tu app.'
    case 'mfa_factor_not_found':
      return 'Esta configuración ya no existe. Recarga la página para empezar de nuevo.'
    case 'session_not_found':
    case 'session_expired':
      return 'Tu sesión venció. Cierra sesión y vuelve a entrar.'
    case 'over_request_rate_limit':
      return 'Hiciste muchos intentos seguidos. Espera un minuto e intenta de nuevo.'
    case 'mfa_totp_enroll_not_enabled':
    case 'mfa_totp_verify_not_enabled':
      return 'La verificación con app no está activada en Supabase (Authentication, Multi-Factor, TOTP). Actívala e intenta de nuevo.'
    default:
      return 'No se pudo completar. Intenta de nuevo en un momento.'
  }
}
