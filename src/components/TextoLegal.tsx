import type { ReactNode } from 'react'

// Muestra el texto de un documento legal escrito con un formato sencillo:
//   # Título          ## Subtítulo          ### Sub-subtítulo
//   - elemento de lista            1. elemento numerado
//   **negrita**        y los enlaces (https://…) y correos se vuelven clicables.
// Una línea en blanco separa los párrafos. Arma elementos de React (nunca HTML del texto), así
// que lo que se escriba no puede inyectar código en la página.

type Bloque =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; texto: string }
  | { tipo: 'parrafo'; lineas: string[] }
  | { tipo: 'lista'; ordenada: boolean; elementos: string[] }

function leerBloques(texto: string): Bloque[] {
  const bloques: Bloque[] = []
  let actual: Bloque | null = null
  const cerrar = () => {
    if (actual) bloques.push(actual)
    actual = null
  }

  for (const linea of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const limpia = linea.trim()
    const titulo = /^(#{1,3})\s+(.+)$/.exec(limpia)
    const vineta = /^[-*•]\s+(.+)$/.exec(limpia)
    const numero = /^\d+[.)]\s+(.+)$/.exec(limpia)

    if (!limpia) {
      cerrar()
    } else if (titulo) {
      cerrar()
      bloques.push({ tipo: 'titulo', nivel: titulo[1].length as 1 | 2 | 3, texto: titulo[2] })
    } else if (vineta || numero) {
      const ordenada = Boolean(numero)
      const elemento = (vineta ?? numero)![1]
      if (actual?.tipo === 'lista' && actual.ordenada === ordenada) actual.elementos.push(elemento)
      else {
        cerrar()
        actual = { tipo: 'lista', ordenada, elementos: [elemento] }
      }
    } else if (actual?.tipo === 'parrafo') {
      actual.lineas.push(limpia)
    } else if (actual?.tipo === 'lista') {
      // Una línea pegada a la lista continúa el último elemento.
      actual.elementos[actual.elementos.length - 1] += ` ${limpia}`
    } else {
      cerrar()
      actual = { tipo: 'parrafo', lineas: [limpia] }
    }
  }
  cerrar()
  return bloques
}

const PATRON_EN_LINEA = /(\*\*[^*]+\*\*|https?:\/\/[^\s<>()]+[^\s<>().,;:]|[\w.+-]+@[\w-]+\.[\w.-]*\w)/g

function enLinea(texto: string): ReactNode[] {
  return texto.split(PATRON_EN_LINEA).map((parte, i) => {
    if (i % 2 === 0) return parte
    if (parte.startsWith('**')) return <strong key={i} className="font-semibold text-gray-900">{parte.slice(2, -2)}</strong>
    const href = parte.includes('@') && !parte.startsWith('http') ? `mailto:${parte}` : parte
    return (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primario underline underline-offset-2 [overflow-wrap:anywhere]">
        {parte}
      </a>
    )
  })
}

export default function TextoLegal({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-7 text-gray-800">
      {leerBloques(texto).map((b, i) => {
        if (b.tipo === 'titulo') {
          const clase = {
            1: 'mt-4 text-xl font-bold text-gray-900 first:mt-0',
            2: 'mt-4 text-lg font-semibold text-gray-900 first:mt-0',
            3: 'mt-2 text-base font-semibold text-gray-900 first:mt-0',
          }[b.nivel]
          const Etiqueta = (['h2', 'h3', 'h4'] as const)[b.nivel - 1]
          return <Etiqueta key={i} className={clase}>{enLinea(b.texto)}</Etiqueta>
        }
        if (b.tipo === 'lista') {
          const Lista = b.ordenada ? 'ol' : 'ul'
          return (
            <Lista key={i} className={`flex flex-col gap-1.5 pl-6 ${b.ordenada ? 'list-decimal' : 'list-disc'}`}>
              {b.elementos.map((e, j) => (
                <li key={j}>{enLinea(e)}</li>
              ))}
            </Lista>
          )
        }
        return (
          <p key={i}>
            {b.lineas.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {enLinea(l)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
