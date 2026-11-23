'use client'

import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { pesos } from '@/lib/formato'

// Campo de dinero: mientras se escribe muestra "$ 45.000", y al formulario le llegan solo los
// dígitos ("45000") en un campo oculto con el mismo `name`, así las acciones no cambian.
// Sirve sin estado (con `name` y `defaultValue`) o controlado (con `value` y `onValueChange`).
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> & {
  value?: string
  defaultValue?: string | number
  onValueChange?: (digitos: string) => void
}

function soloDigitos(texto: string) {
  return texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12)
}

function mostrar(digitos: string) {
  return digitos ? pesos(Number(digitos)) : ''
}

export default function CampoPesos({ name, value, defaultValue, onValueChange, ...resto }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [propio, setPropio] = useState(() => soloDigitos(String(defaultValue ?? '')))
  const digitos = value !== undefined ? soloDigitos(value) : propio
  // Cuántos dígitos quedan a la izquierda del cursor, para devolverlo a su sitio al reformatear.
  const cursor = useRef<number | null>(null)

  useLayoutEffect(() => {
    const campo = ref.current
    if (!campo || cursor.current === null || document.activeElement !== campo) return
    const texto = campo.value
    let faltan = cursor.current
    let posicion = 0
    while (posicion < texto.length && faltan > 0) {
      if (/\d/.test(texto[posicion])) faltan--
      posicion++
    }
    if (cursor.current === 0) posicion = Math.max(0, texto.search(/\d/))
    campo.setSelectionRange(posicion, posicion)
    cursor.current = null
  })

  // FormularioAccion vacía el formulario con reset(); el campo visible también debe vaciarse.
  useEffect(() => {
    const formulario = ref.current?.form
    if (!formulario || value !== undefined) return
    const alVaciar = () => setPropio(soloDigitos(String(defaultValue ?? '')))
    formulario.addEventListener('reset', alVaciar)
    return () => formulario.removeEventListener('reset', alVaciar)
  }, [defaultValue, value])

  function cambiar(campo: HTMLInputElement) {
    const antesDelCursor = campo.value.slice(0, campo.selectionStart ?? campo.value.length)
    let posicion = antesDelCursor.replace(/\D/g, '').length
    let nuevo = soloDigitos(campo.value)
    // Si se borró un punto o el "$", se borra el dígito de la izquierda.
    if (nuevo === digitos && campo.value.length < mostrar(digitos).length && posicion > 0) {
      nuevo = digitos.slice(0, posicion - 1) + digitos.slice(posicion)
      posicion--
    }
    cursor.current = posicion
    if (value === undefined) setPropio(nuevo)
    onValueChange?.(nuevo)
  }

  return (
    <>
      <input
        {...resto}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={mostrar(digitos)}
        onChange={(ev) => cambiar(ev.target)}
      />
      {name && <input type="hidden" name={name} value={digitos} />}
    </>
  )
}
