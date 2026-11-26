import { ShieldCheck } from 'lucide-react'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import DosPasosRecuperacion from '@/components/DosPasosRecuperacion'
import FormularioAccion from '@/components/FormularioAccion'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'
import { cambiarAppDosPasos } from './actions'

// Solo se ve con la sesión en aal2: el layout de /admin manda a /verificacion en cualquier otro caso.
export default function TarjetaDosPasos() {
  return (
    <section className={ui.tarjeta}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={ui.subtitulo}>Verificación en dos pasos</h2>
            <span className={`${ui.pildora} ${ui.estadoPagado}`}>
              <ShieldCheck {...icono} size={14} />
              Activa
            </span>
          </div>
          <p className={ui.textoSecundario}>Cada vez que entras te pedimos un código de tu app de verificación.</p>
        </div>
        <FormularioAccion action={cambiarAppDosPasos} className="w-full sm:w-auto">
          <ConfirmSubmitButton
            className={`${ui.botonSecundario} w-full sm:w-auto`}
            confirmMessage="¿Cambiar la app de verificación? Quitaremos la que usas ahora y te mostraremos un código QR nuevo para escanearlo con la otra app o el otro celular."
            textoConfirmar="Cambiar de app"
            peligro={false}
          >
            Cambiar de app
          </ConfirmSubmitButton>
        </FormularioAccion>
      </div>
      <DosPasosRecuperacion className="mt-4" />
    </section>
  )
}
