import type { AuthError } from '@supabase/supabase-js'

// Errores de Supabase Auth en palabras simples (inicio de sesión y registro de colegios).
export const LARGO_MINIMO = 8

export function traducirError(error: AuthError): string {
  const codigo = error.code ?? ''
  const texto = error.message.toLowerCase()
  if (codigo === 'captcha_failed' || texto.includes('captcha')) {
    return 'No se pudo completar la verificación de seguridad. Espera a que aparezca la marca de verificación y vuelve a intentar.'
  }
  if (codigo === 'invalid_credentials' || texto.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (codigo === 'email_not_confirmed' || texto.includes('email not confirmed')) {
    return 'Todavía no has confirmado tu correo. Abre el enlace que te enviamos al crear la cuenta.'
  }
  if (codigo === 'user_already_exists' || texto.includes('already registered')) {
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.'
  }
  if (codigo === 'weak_password' || texto.includes('password should')) {
    return `La contraseña es muy débil. Usa al menos ${LARGO_MINIMO} caracteres, mezclando letras y números.`
  }
  if (codigo.startsWith('over_') || texto.includes('rate limit') || texto.includes('security purposes')) {
    return 'Se hicieron demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.'
  }
  if (
    codigo === 'email_provider_disabled' ||
    codigo === 'signup_disabled' ||
    codigo === 'otp_disabled' ||
    texto.includes('signups not allowed') ||
    texto.includes('provider is not enabled')
  ) {
    return 'Esta forma de entrar todavía no está activada. Avísale al administrador de Colectia.'
  }
  if (texto.includes('invalid') && texto.includes('email')) {
    return 'Ese correo no parece válido. Revísalo.'
  }
  return 'No se pudo completar. Intenta de nuevo en un momento.'
}
