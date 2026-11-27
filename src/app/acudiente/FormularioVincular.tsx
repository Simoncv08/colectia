'use client'

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react'
import { vincularEstudiante } from './actions'
import type { Resultado } from '@/lib/resultado'
import { ui } from '@/lib/ui'
import { useAvisos } from '@/components/Avisos'

// Se vincula siempre en el colegio de la dirección; solo se muestra su nombre.
export default function FormularioVincular({ colegio }: { colegio: string }) {
  const [metodo, setMetodo] = useState<'codigo' | 'documento'>('codigo')
  const [resultado, accion, enviando] = useActionState<Resultado | null, FormData>(
    vincularEstudiante,
    null
  )
  const formulario = useRef<HTMLFormElement>(null)
  const mostrarAviso = useAvisos()

  // Al vincular bien: aviso abajo, formulario vacío y la ventana cerrada.
  useEffect(() => {
    if (resultado?.tipo !== 'ok') return
    mostrarAviso(resultado)
    formulario.current?.reset()
    formulario.current?.closest('dialog')?.close()
  }, [resultado, mostrarAviso])

  // Con onSubmit y no con action={...}: React vacía el formulario al usar action.
  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const datos = new FormData(ev.currentTarget)
    startTransition(() => accion(datos))
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="metodo" value={metodo} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-medium text-gray-600">¿Cómo quieres vincularlo?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['codigo', 'documento'] as const).map((m) => (
            <label
              key={m}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-borde-campo bg-white px-3 py-2 text-sm font-medium text-gray-900 has-[:checked]:border-primario has-[:checked]:bg-primario-suave"
            >
              <input
                type="radio"
                name="metodo_eleccion"
                checked={metodo === m}
                onChange={() => setMetodo(m)}
                className="h-4 w-4"
              />
              {m === 'codigo' ? 'Con el código del estudiante' : 'Con el documento del estudiante'}
            </label>
          ))}
        </div>
      </fieldset>

      <p className={ui.textoSecundario}>
        Colegio: <span className="font-semibold text-gray-900">{colegio}</span>
      </p>

      {metodo === 'codigo' ? (
        <label className={ui.etiqueta}>
          Código del estudiante
          <input name="codigo" required className={ui.campo} key="codigo" />
        </label>
      ) : (
        <label className={ui.etiqueta}>
          Número de documento del estudiante
          <input name="numero_documento" required inputMode="numeric" autoComplete="off" className={ui.campo} key="documento" />
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

      {resultado?.tipo === 'error' && (
        <p role="alert" className={ui.avisoRojo}>
          {resultado.texto}
        </p>
      )}

      <button type="submit" disabled={enviando} className={`${ui.botonPrimario} w-full sm:w-auto sm:self-start`}>
        {enviando ? 'Verificando…' : 'Vincular estudiante'}
      </button>
    </form>
  )
}
