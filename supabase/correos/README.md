# Correos de Colectia

Supabase manda los correos de inicio de sesión (confirmar cuenta, enlace de acceso, contraseña nueva). Aquí están las plantillas en español y los pasos para enviarlos con un servicio de correo propio.

## 1. Plantillas en español

En Supabase: **Authentication → Emails → Templates** (en el proyecto `kbxswlylztqtustteyhf`). Para cada plantilla, cambia el asunto y reemplaza todo el cuerpo ("Message body", en modo código fuente) por el contenido completo del archivo.

| Plantilla en Supabase | Asunto | Archivo |
|---|---|---|
| Confirm sign up | Confirma tu correo en Colectia | `1_confirmar_registro.html` |
| Invite user | Te invitaron a Colectia | `2_invitacion.html` |
| Magic link or OTP | Tu enlace para entrar a Colectia | `3_enlace_de_acceso.html` |
| Change email address | Confirma tu nuevo correo en Colectia | `4_cambio_de_correo.html` |
| Reset password | Crea una contraseña nueva para Colectia | `5_restablecer_contrasena.html` |
| Reauthentication | Tu código de verificación de Colectia | `6_reautenticacion.html` |

Los enlaces usan `{{ .ConfirmationURL }}`, que lleva a `/auth/callback` de la app; no hay que cambiar código. No borres las partes entre `{{ }}`: Supabase las reemplaza por el enlace, el correo o el código.

Dos cosas para tener en cuenta:

- El enlace hay que abrirlo en el mismo navegador donde se pidió (por eso el correo lo dice).
- Algunos correos de empresa (por ejemplo, Outlook con "Vínculos seguros") abren los enlaces antes que la persona y los dejan vencidos. Si un acudiente reporta "el enlace ya venció", esa es la causa probable.

## 2. Servicio de correo propio con Resend

El servicio de correo que trae Supabase solo envía a los miembros del equipo del proyecto y muy pocos correos por hora, así que no sirve para las familias.

**Requisito:** un dominio propio (Colectia usa `colectia.org`). Resend solo envía a cualquier persona desde un dominio verificado. Revisa el plan gratuito en resend.com/pricing.

1. **Crea la cuenta** en resend.com. La contraseña es solo tuya; no la compartas.
2. **Agrega el dominio:** en **Domains → Add Domain**. Es mejor un subdominio solo para estos correos, por ejemplo `auth.colectia.org`. Resend te muestra unos registros DNS (SPF y DKIM): agrégalos en el sitio donde compraste el dominio y luego pulsa **Verify**. Puede tardar desde minutos hasta unas horas.
3. **Recomendado:** agrega también un registro TXT `_dmarc` con el valor `v=DMARC1; p=none;` para que los correos no lleguen a spam.
4. **Crea una API key:** en **API Keys → Create API Key**, con permiso de envío y limitada a tu dominio. Cópiala una sola vez. Es secreta: no la pegues en el chat, en el código ni en Vercel.
5. **Configúrala en Supabase:** **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: `no-responder@auth.colectia.org`
   - Sender name: `Colectia`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: la API key del paso 4

   Y pulsa **Save**.
6. **Sube el límite:** con correo propio, Supabase empieza en 30 correos por hora. Cámbialo en **Authentication → Rate Limits** según el tamaño del piloto.
7. **Prueba:** en la app, pide un enlace de acceso a un correo que no sea del equipo de Supabase y revisa que llegue en español, con el remitente "Colectia".
