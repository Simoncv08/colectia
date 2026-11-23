'use client'

import { useState } from 'react'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import FormularioAccion from '@/components/FormularioAccion'
import TextoLegal from '@/components/TextoLegal'
import type { Resultado } from '@/lib/resultado'
import { ui } from '@/lib/ui'

// Formulario para publicar una versión nueva, con vista previa de cómo se verá.
export default function EditorLegal({
  action,
  contenidoInicial,
  siguienteVersion,
}: {
  action: (formData: FormData) => Promise<Resultado>
  contenidoInicial: string
  siguienteVersion: number
}) {
  const [contenido, setContenido] = useState(contenidoInicial)
  const [vista, setVista] = useState<'escribir' | 'previa'>('escribir')
  const [requiere, setRequiere] = useState(true)
  const primera = siguienteVersion === 1

  const pestana = (activa: boolean) =>
    `-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm ${
      activa ? 'border-primario font-semibold text-primario' : 'border-transparent text-gray-700 hover:text-gray-900'
    }`

  return (
    <FormularioAccion action={action} vaciarAlTerminar={false} className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-gray-200" role="tablist" aria-label="Editor">
        <button type="button" role="tab" aria-selected={vista === 'escribir'} onClick={() => setVista('escribir')} className={pestana(vista === 'escribir')}>
          Escribir
        </button>
        <button type="button" role="tab" aria-selected={vista === 'previa'} onClick={() => setVista('previa')} className={pestana(vista === 'previa')}>
          Vista previa
        </button>
      </div>

      {/* El texto siempre va en el formulario, aunque se esté viendo la vista previa. */}
      <textarea
        name="contenido"
        required
        rows={18}
        value={contenido}
        onChange={(ev) => setContenido(ev.target.value)}
        aria-label="Texto del documento"
        placeholder={'# Términos y condiciones\n\n## 1. Quiénes somos\n\nColectia es…'}
        className={`${ui.campo} min-h-80 font-mono leading-6 sm:text-sm ${vista === 'previa' ? 'hidden' : ''}`}
      />
      {vista === 'previa' && (
        <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-gray-200 p-4 sm:p-5">
          {contenido.trim() ? <TextoLegal texto={contenido} /> : <p className={ui.textoSecundario}>Todavía no hay texto.</p>}
        </div>
      )}
      <p className={ui.ayuda}>
        Formato: <code># Título</code>, <code>## Subtítulo</code>, <code>- lista</code>, <code>1. lista numerada</code> y{' '}
        <code>**negrita**</code>. Deja una línea en blanco entre párrafos. Los enlaces y correos se vuelven clicables.
      </p>

      <label className={ui.etiqueta}>
        Qué cambió (opcional)
        <input
          name="resumen"
          maxLength={500}
          placeholder="Ej.: Agregamos cómo pedir que borren tus datos."
          className={ui.campo}
        />
        <span className={`${ui.ayuda} font-normal`}>Lo verán los usuarios en el aviso de la actualización.</span>
      </label>

      {primera ? (
        <>
          <input type="hidden" name="requiere_aceptacion" value="on" />
          <p className={ui.avisoInfo}>Es la primera versión: todos los usuarios deberán aceptarla para seguir usando Colectia.</p>
        </>
      ) : (
        <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-[15px] text-gray-900">
          <input
            type="checkbox"
            name="requiere_aceptacion"
            checked={requiere}
            onChange={(ev) => setRequiere(ev.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Los usuarios deben aceptarla para seguir usando Colectia</span>
            <span className="text-sm text-gray-600">
              Desmárcalo solo para correcciones menores (una tilde, un dato de contacto): en ese caso solo se les avisa.
            </span>
          </span>
        </label>
      )}

      <div>
        <ConfirmSubmitButton
          confirmMessage={
            requiere || primera
              ? `¿Publicar la versión ${siguienteVersion}? Todos los usuarios, sin importar su rol, tendrán que aceptarla para seguir usando Colectia. Las versiones publicadas no se pueden editar ni borrar.`
              : `¿Publicar la versión ${siguienteVersion}? Se les avisará a todos los usuarios, pero no tendrán que aceptarla. Las versiones publicadas no se pueden editar ni borrar.`
          }
          textoConfirmar="Publicar"
          peligro={false}
          className={`${ui.botonPrimario} w-full sm:w-auto`}
        >
          Publicar versión {siguienteVersion}
        </ConfirmSubmitButton>
      </div>
    </FormularioAccion>
  )
}
