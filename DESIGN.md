# Colectia: dirección de diseño

Colectia es la caja del colegio, en línea. Cada pantalla tiene que responder rápido tres preguntas: cuánto se debe, qué ya se pagó y quién recibió el dinero. Se ve como una plataforma de pagos sobria y confiable, no como una hoja de registro.

## Lectura de diseño

Plataforma de pagos para colegios en Colombia. La usan dos públicos: acudientes, casi siempre en el celular, y el personal del colegio (tesorería, coordinación, recaudadores), en el computador o en el celular durante un cobro. El lenguaje visual es el de una app financiera clara: cifras grandes y ordenadas, estados de pago inconfundibles y nada de decoración que distraiga del dinero.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

- **ENERGY 2:** cada pantalla principal abre con un resumen destacado (las actividades del acudiente o el recaudo del personal) en el color del colegio. Lo demás es tranquilo.
- **RHYTHM 2:** las listas y tarjetas siguen un mismo patrón, roto a propósito solo por el resumen de arriba.
- **MOTION 1:** solo estados de hover, foco y la flecha de las secciones desplegables. Ninguna animación de entrada.

## Personalidad

Confiable, clara y cercana. Habla de tú, en español de Colombia, sin tecnicismos ("devuelta", "salón", "acudiente"). Nunca inventa cifras, logos ni testimonios: el nombre "Colectia" se escribe como texto.

## Color

- **Base neutra:** texto casi negro (gray-900), texto secundario gray-600/700, superficies blancas sobre un fondo gris muy claro. Cada colegio puede cambiar el fondo a blanco o a un tono suave de su paleta.
- **Acento del colegio:** el color primario sale de la paleta que elige cada institución (`src/lib/paletas.ts`). Se usa para las acciones principales, la pestaña activa y la tarjeta de resumen. Todas las paletas pasan 4.5:1 con texto blanco.
- **Estados de dinero, iguales en todos los colegios:**
  - Pagado: verde (texto green-800 sobre green-50).
  - Pendiente: ámbar (texto amber-900 sobre amber-50).
  - Plazo terminado o finalizado: gris.
  - Error: rojo.
  Estos colores no dependen de la paleta, para que "pagado" se vea igual en cualquier colegio.
- **Con las familias no se habla de deudas.** Muchas actividades son opcionales, así que la vista del acudiente no usa "pendiente" ni "por pagar": muestra "Pagado" cuando hay un pago y, si no, solo el valor de la actividad. El ámbar de "pendiente" queda para el personal (devueltas por entregar, estudiantes sin pago).

## Tipografía

**Manrope**, cargada con `next/font/google`. Se eligió porque sus formas abiertas y un poco redondeadas se sienten cercanas para las familias, pero sus números son firmes y legibles, que es lo que más se lee en Colectia. Reemplaza a Geist, que venía por defecto con Next.

- Todas las cifras usan números tabulares (`tabular-nums`, aplicado en el `body`), para que los montos queden alineados en columnas y no "bailen" al cambiar.
- Escala: monto del resumen 30-36 px seminegrita; título de página 24 px; subtítulo 16 px seminegrita; texto 14-16 px; ayudas 12 px.
- Sin mayúsculas sostenidas con espaciado amplio.

## Forma

- **Radio con jerarquía:** tarjetas 12 px (`rounded-xl`), botones y campos 8 px (`rounded-lg`), y solo las etiquetas de estado son completamente redondas (`rounded-full`). Así una etiqueta de estado nunca se confunde con un botón.
- **Bordes** de 1 px gray-200 para separar superficies.
- **Sombra** solo en la tarjeta de resumen y en las ventanas emergentes, porque son las dos cosas que están "encima" del resto.

## Componentes base

- **Tarjeta de resumen:** fondo del color del colegio, texto blanco, una cifra grande y dos o tres datos de apoyo. Una por pantalla principal.
- **Etiqueta de estado** (`EtiquetaEstado`, `EstadoPago`): píldora pequeña con el color del estado.
- **Fila de estudiante:** nombre a la izquierda; estado y monto a la derecha.
- **Tarjeta de dato** (`TarjetaDato`): una cifra con su título, para resúmenes secundarios.

## Accesibilidad

Contraste mínimo 4.5:1, áreas táctiles de 44 px en celular, foco visible con el color del colegio, todo usable con teclado y movimiento reducido respetado.
