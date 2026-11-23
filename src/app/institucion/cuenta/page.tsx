import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { TarjetaContrasena, TarjetaDocumentosLegales, TarjetaMisDatos } from '@/components/Cuenta'
import { ui } from '@/lib/ui'

export const metadata = { title: 'Mi cuenta' }

export default async function CuentaPersonalPage() {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className={ui.titulo}>Mi cuenta</h1>
        <p className={ui.textoSecundario}>Tus datos personales, tu contraseña y los documentos que aceptaste.</p>
      </div>
      <TarjetaMisDatos persona={sesion.persona} correo={sesion.correo} />
      <TarjetaContrasena />
      <TarjetaDocumentosLegales personaId={sesion.userId} />
    </div>
  )
}
