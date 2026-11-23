'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { vincularEstudiante } from './actions'
import type { Resultado } from '@/lib/resultado'
import { ui } from '@/lib/ui'

type Institucion = { id: string; nombre: string }

export default function FormularioVincular({ instituciones }: { instituciones: Institucion[] }) {
  const [metodo, setMetodo] = useState<'codigo' | 'documento'>('codigo')
  const [resultado, accion, enviando] = useActionState<Resultado | null, FormData>(
    vincularEstudiante,
    null
  )

  // Con onSubmit y no con action={...}: React vacía el formulario al usar action.
  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const datos = new FormData(ev.currentTarget)
    startTransition(() => accion(datos))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="metodo" value={metodo} />

      <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
        {(['codigo', 'documento'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetodo(m)}
            className={`rounded-md px-3 py-1.5 font-medium ${
              metodo === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {m === 'codigo' ? 'Con el código' : 'Con el documento'}
          </button>
        ))}
      </div>

      <label className={ui.etiqueta}>
        Institución
        <select name="institucion_id" required defaultValue="" className={ui.campo}>
          <option value="" disabled>
            Selecciona la institución
          </option>
          {instituciones.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.nombre}
            </option>
          ))}
        </select>
      </label>

      {metodo === 'codigo' ? (
        <label className={ui.etiqueta}>
          Código del estudiante
          <input name="codigo" required className={ui.campo} key="codigo" />
        </label>
      ) : (
        <label className={ui.etiqueta}>
          Número de documento del estudiante
          <input name="numero_documento" required className={ui.campo} key="documento" />
        </label>
      )}

      <label className={ui.etiqueta}>
        Fecha de nacimiento del estudiante
        <input name="fecha_nacimiento" type="date" required className={ui.campo} />
      </label>

      <p className={ui.ayuda}>
        Estos datos son los que te dio la institución al matricular al estudiante. Si no
        funcionan, contacta directamente al colegio.
      </p>

      {resultado && (
        <p
          role={resultado.tipo === 'error' ? 'alert' : 'status'}
          className={
            resultado.tipo === 'ok'
              ? ui.avisoVerde
              : ui.avisoRojo
          }
        >
          {resultado.texto}
        </p>
      )}

      <button type="submit" disabled={enviando} className={`${ui.botonPrimario} self-start`}>
        {enviando ? 'Verificando…' : 'Vincular'}
      </button>
    </form>
  )
}
