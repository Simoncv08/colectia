'use client'

import { startTransition, useActionState, type FormEvent } from 'react'
import { actualizarDatos } from '@/app/actions'
import type { Resultado } from '@/lib/resultado'
import { ui } from '@/lib/ui'

// Con onSubmit y no con action={...}: React vacía el formulario al usar action.
export default function FormularioDatos({
  nombres,
  apellidos,
  telefono,
  correo,
}: {
  nombres: string
  apellidos: string
  telefono: string
  correo: string
}) {
  const [resultado, accion, enviando] = useActionState<Resultado | null, FormData>(
    actualizarDatos,
    null
  )

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const datos = new FormData(ev.currentTarget)
    startTransition(() => accion(datos))
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className={ui.etiqueta}>
        Nombres
        <input
          name="nombres"
          required
          maxLength={80}
          defaultValue={nombres}
          autoComplete="given-name"
          className={ui.campo}
        />
      </label>
      <label className={ui.etiqueta}>
        Apellidos
        <input
          name="apellidos"
          required
          maxLength={80}
          defaultValue={apellidos}
          autoComplete="family-name"
          className={ui.campo}
        />
      </label>
      <label className={ui.etiqueta}>
        Teléfono (opcional)
        <input
          name="telefono"
          type="tel"
          maxLength={20}
          defaultValue={telefono}
          autoComplete="tel"
          placeholder="Ej.: 300 123 4567"
          className={ui.campo}
        />
      </label>
      <div className={ui.etiqueta}>
        Correo
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-normal text-gray-900">
          {correo}
        </p>
        <span className={`${ui.ayuda} font-normal`}>Es el correo con el que inicias sesión.</span>
      </div>

      {resultado && (
        <p
          role={resultado.tipo === 'error' ? 'alert' : 'status'}
          className={`sm:col-span-2 ${
            resultado.tipo === 'ok'
              ? ui.avisoVerde
              : ui.avisoRojo
          }`}
        >
          {resultado.texto}
        </p>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={enviando} className={ui.botonPrimario}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
