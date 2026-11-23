# DESIGN.md — Colectia

Guía de diseño de la interfaz de Colectia. Léela antes de crear o cambiar cualquier pantalla o componente. Si algo de este documento choca con lo que pide una tarea, gana la tarea, pero anota el cambio aquí para que el sistema no se fragmente.

---

## 1. Qué tiene que transmitir la interfaz

Colectia mueve dinero de familias hacia colegios. La interfaz debe sentirse como una **plataforma de pagos profesional**: sobria, clara y predecible. Nadie debería dudar de cuánto vale una actividad, a quién le paga ni si el pago quedó registrado.

Principios, en orden de prioridad:

1. **Claridad antes que decoración.** Cada pantalla responde una pregunta principal ("¿qué actividades hay?", "¿quién ya pagó?"). Lo que no ayuda a responderla sobra.
2. **El dinero siempre se lee igual.** Mismo formato, misma tipografía, misma alineación en todas partes.
3. **Estados fijos y reconocibles.** Un estado de pago tiene un solo color, un solo nombre y un solo ícono en toda la plataforma.
4. **Confianza por consistencia.** Pocos componentes, usados siempre de la misma forma. Nada de estilos únicos por pantalla.
5. **Accesible por defecto.** Contraste AA, foco visible, objetivos táctiles grandes, nada que dependa solo del color.

### Dial de estilo

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

| Dial | Valor | Qué significa en la práctica |
|---|---|---|
| ENERGY | 2 | Fondos claros y neutros, un solo color de marca (el del colegio), sin gradientes llamativos ni ilustraciones grandes. |
| RHYTHM | 2 | Espaciado generoso y regular; una columna principal; pocas variaciones de tamaño. |
| MOTION | 1 | Solo transiciones funcionales (hover, abrir/cerrar, aviso que entra). Nada de animaciones decorativas. |

### Dos públicos, dos densidades

| | Acudiente | Personal (admin, recaudador) |
|---|---|---|
| Dispositivo típico | Celular | Computador |
| Frecuencia | Pocas veces al mes | A diario en temporada de recaudo |
| Necesita | Saber qué hay, cuánto vale, ver si ya pagó | Ver muchos estudiantes, filtrar, registrar efectivo, exportar |
| Densidad | Baja: tarjetas, una columna | Media: tablas, filtros, columnas |
| Lenguaje | Cotidiano, sin jerga | Operativo, preciso |

El super admin usa el mismo estilo que el personal.

---

## 2. Tokens

Todo valor visual sale de un token definido en `src/app/globals.css`. No escribas colores en hexadecimal ni tamaños sueltos dentro de los componentes.

### 2.1 Color

**Neutros.** Se definen sobre la escala `gray` de Tailwind, así que las clases `gray-*` ya usan estos valores.

| Token (clase) | Hex | Uso | Contraste |
|---|---|---|---|
| `fondo` | `#F7F8FA` | Fondo de la página (el colegio puede cambiarlo a blanco o a un tono de su paleta) | — |
| `white` | `#FFFFFF` | Tarjetas, tablas, ventanas | — |
| `gray-100` (superficie sutil) | `#F2F4F7` | Encabezados de tabla, zonas secundarias | — |
| `gray-200` (borde) | `#E4E7EC` | Divisores y bordes de tarjeta | — |
| `borde-campo` | `#858E9E` | Borde de campos y botones secundarios | 3,3:1 sobre blanco |
| `gray-900` (texto) | `#0F172A` | Texto principal, montos | 17,9:1 |
| `gray-600` (texto secundario) | `#475467` | Etiquetas, descripciones | 7,7:1 |
| `gray-500` (texto terciario) | `#667085` | Solo marcadores de posición | 5,0:1 |

**Marca: el color de cada colegio.** Cada institución elige su paleta en Personalización (`src/lib/paletas.ts`) y esa paleta es el color de marca (`primario`, `primario-hover`, `primario-suave`, `primario-borde`): botón primario, enlaces, foco, selección y pestaña activa. Todas las paletas pasan 4,5:1 con texto blanco. La paleta por defecto es la azul. **No hay paleta verde**: el verde está reservado para "Pagado".

**Semánticos, iguales en todos los colegios:**

| Token | Texto | Fondo | Uso |
|---|---|---|---|
| `exito` | `#15703D` | `#EAF7EF` | Pagado, institución activa, acción completada |
| `alerta` | `#9A5B00` | `#FFF6E5` | Devuelta por entregar, en prueba, algo requiere atención |
| `peligro` | `#B42318` | `#FEF0EE` | Suspendida, errores, acciones destructivas |
| `neutro` | `#475467` | `#F2F4F7` | Sin pago, plazo terminado, cancelada |

Cada par texto/fondo pasa 5:1 o más.

### 2.2 Tipografía

- **Fuente única: Manrope**, cargada con `next/font/google` (`display: swap`). Sus formas abiertas se sienten cercanas para las familias y sus números son firmes y legibles.
- **Números tabulares en toda la app** (`font-variant-numeric: tabular-nums` en el `body`), para que las cifras queden alineadas en tablas.

| Token | Tamaño | Peso | Uso |
|---|---|---|---|
| display | 28 px en celular, 32 px en computador | 700 | Cifra de una `TarjetaDato` |
| titulo-1 (`ui.titulo`) | 22 px en celular, 24 px en computador | 700 | Título de página (uno por pantalla) |
| titulo-2 (`ui.subtitulo`) | 18 px | 600 | Título de sección o de tarjeta |
| cuerpo | 15 px | 400 | Texto general |
| pequeño | 13 px | 500 | Etiquetas de campo, encabezados de tabla, metadatos |
| micro | 12 px | 600 | Etiquetas de estado |

Nunca menos de 12 px. Nada de mayúsculas sostenidas.

### 2.3 Espaciado

Base de 4 px. Entre campos de un formulario, 16–20 px; relleno de tarjeta, 20 px en celular y 24 px en computador; entre secciones de una página, 24–32 px.

### 2.4 Radios (con jerarquía)

| Clase | Valor | Uso |
|---|---|---|
| `rounded-md` | 6 px | Campos, selects |
| `rounded-lg` | 10 px | Botones, avisos, imagen dentro de tarjeta |
| `rounded-xl` | 16 px | Tarjetas, tablas, ventanas |
| `rounded-full` | — | Etiquetas de estado y chips |

### 2.5 Elevación

Preferimos bordes a sombras. Solo dos niveles: `shadow-xs` (tarjetas, junto con su borde) y `shadow-lg` (ventanas, menús desplegables y avisos flotantes).

### 2.6 Movimiento

120 ms en hover y foco, 200 ms al abrir o cerrar, curva `ease-colectia`. Solo se animan color, opacidad y giro de flechas. Con `prefers-reduced-motion` no hay transiciones. La carga se muestra con esqueletos (`EstadoCarga`), no con giradores.

---

## 3. Layout

- **Acudiente:** una columna de máximo 640 px. Encabezado fijo arriba con la marca a la izquierda y el menú de cuenta (nombre, Inicio, Mi cuenta, Cerrar sesión) a la derecha.
- **Personal:** barra lateral de 240 px desde `lg` (Inicio, Eventos, Estudiantes, Cursos, Reportes, Personal, Actividad, Personalización). En pantallas menores se abre desde el botón de menú del encabezado. Contenido de máximo 1200 px. Encima del contenido van el nombre de la institución, su estado y el rol de quien está conectado.
- Las tablas se desplazan en horizontal dentro de su tarjeta; la página nunca.

Estructura de una página: título y descripción corta, con la acción principal a la derecha; luego las tarjetas de resumen, los filtros y el contenido.

---

## 4. Componentes

Están en `src/components` y las clases repetidas en `ui` (`src/lib/ui.ts`). Si creas uno nuevo, agrégalo aquí.

- **Botones** (`ui.botonPrimario`, `botonSecundario`, `botonFantasma`, `botonPeligro`, `botonPeligroSolido`, `botonCompacto`): 44 px de alto (36 px el compacto, solo en tablas y filtros del personal). **Un solo primario por vista.** El rojo sólido solo va dentro de la ventana de confirmación. Texto en verbo + objeto ("Registrar pago", "Vincular estudiante"). Mientras envía, el botón se deshabilita y cambia el texto ("Guardando…").
- **Campos** (`ui.campo`, `ui.campoCompacto`): etiqueta siempre visible encima, 44 px, foco con borde y anillo del color de marca. Los cursos siempre se eligen de una lista; nunca se escriben a mano.
- **Tarjetas** (`ui.tarjeta`) y **`TarjetaDato`**: etiqueta, cifra grande y una línea de contexto opcional. Máximo 4 por fila.
- **Etiquetas de estado** (`EtiquetaEstado`, `EstadoPago`, `EstadoInstitucion`): píldora con **ícono + texto**; el color nunca va solo.
- **Tablas** (`ui.contenedorTabla`, `encabezadoTabla`, `filaTabla`): encabezado gris claro, filas con divisor, montos a la derecha. Las tablas largas o de uso en celular usan la versión responsiva (`ui.tablaResponsiva`, `encabezadoResponsivo`, `cuerpoResponsivo`, `filaResponsiva`, `celdaResponsiva` con `data-titulo`): en celular cada fila se vuelve una tarjeta con el título de cada dato.
- **Paginación** (`Paginacion`): "1–50 de 312" con Anterior y Siguiente, conservando los filtros en la URL.
- **Filtros activos** (`FiltrosActivos`): cada filtro aplicado como chip que se quita con un clic, y "Limpiar filtros" cuando hay más de uno. Los filtros viven en la URL.
- **Avisos** (`FormularioAccion` + `ProveedorAvisos`): cada acción devuelve un `Resultado` y se muestra abajo (al centro en celular, a la derecha en computador). Los de éxito se van a los 5 s; los errores se quedan.
- **Confirmación** (`ConfirmSubmitButton`): ventana con la pregunta, la consecuencia, "Cancelar" y el botón de la acción. En celular sale como hoja desde abajo.
- **Ventanas** (`Ventana`) y **menús** (`MenuDesplegable`): se cierran con Escape y con un clic afuera.
- **Estados vacío, carga y error:** ícono pequeño + frase + acción para salir de ahí; esqueletos al cargar; errores en lenguaje claro con "Intentar de nuevo". Nunca mensajes técnicos de Supabase o Postgres.
- **Marca** (`Marca`): símbolo simple (cuadro con la "C") en el color de marca y "Colectia" en Manrope 700. Dentro de una institución, el nombre del colegio la acompaña, nunca la reemplaza.
- **Íconos:** Lucide (`lucide-react`), trazo 1,75; 16 px junto a texto y 20 px en botones y navegación (`src/lib/iconos.ts`).

---

## 5. Estados fijos

### 5.1 Estado de pago por estudiante y actividad

| Estado | Texto | Color | Ícono | Quién lo ve |
|---|---|---|---|---|
| `pagado` | Pagado | `exito` | `CircleCheck` | Acudiente |
| `pagado_efectivo` | Pagado · efectivo | `exito` | `Banknote` | Personal |
| `sin_pago` | Sin pago | `neutro` | `Circle` | Personal |
| `cerrado` | Plazo terminado | `neutro` | `Clock` | Acudiente |

**Regla para el acudiente (decisión de Laura):** muchas actividades son opcionales, así que en la vista del acudiente **no existe "pendiente", "por pagar" ni "sin pago"**. Cada estudiante muestra "Pagado" o solo el valor de la actividad.

En la Fase 2 (pagos en línea) se agregan "En proceso" (`alerta`, `Clock`) y "Rechazado" (`peligro`, `CircleX`).

### 5.2 Estado de la institución

Activa (`exito`), En prueba (`alerta`), Suspendida (`peligro`), Cancelada (`neutro`). Si está suspendida o cancelada, el personal ve un aviso fijo ("Esta institución está suspendida. Puedes consultar la información, pero no crear ni modificar registros.") y el panel queda de solo consulta (`ProveedorSoloLectura`): los botones de `FormularioAccion`, `Ventana` y el cobro por salón se deshabilitan con la explicación al pasar el cursor. Los filtros y búsquedas siguen funcionando.

---

## 6. Dinero, fechas y datos sensibles

- **Moneda:** pesos sin decimales, `$ 45.000`, siempre con `pesos()` de `src/lib/formato.ts` (`Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`).
- **Fechas:** `22 nov. 2026` con `formatearFecha()`; `22 nov. 2026, 3:45 p. m.` en registros de pago con `formatearFechaHora()`. Zona horaria `America/Bogota`. El Excel usa `22/11/2026`.
- **Número de documento del estudiante:** solo lo ve el **administrador de la institución** (ficha del estudiante y búsqueda). Nunca aparece para acudientes ni recaudadores, y la base de datos tampoco se lo deja leer (`22_seguridad_fase2.sql`): el administrador lo lee con `documento_estudiante` y `documentos_de_institucion`.

---

## 7. Flujos clave

- **Inicio de sesión:** tarjeta centrada de máximo 400 px con la marca, la frase "Pagos escolares claros para familias y colegios" y todas las formas de entrar: Google, correo y contraseña, y enlace al correo.
- **Acudiente, inicio:** saludo con el nombre; resumen (actividades abiertas y cuántas tienen pago registrado); tarjetas de actividad ordenadas por fecha de cierre, cada una con la institución, los productos y cada estudiante con su estado; "Mis estudiantes" con el botón "Vincular estudiante"; y la nota "¿Pagaste en efectivo en el colegio? El recaudador lo registrará y aparecerá aquí como Pagado".
- **Acudiente, vincular:** institución, método en dos opciones tipo tarjeta (código o documento), dato y fecha de nacimiento. El error no revela si el estudiante existe. Cuando quedan 3 intentos o menos en la hora, el mensaje dice cuántos quedan (`21_intentos_restantes.sql`).
- **Acudiente, pagar (Fase 2):** cada estudiante sin pago tendrá el botón "Pagar"; antes de salir a la pasarela se muestra el resumen y a quién va el dinero.
- **Personal, inicio:** cuatro `TarjetaDato` (total recaudado, eventos abiertos, estudiantes con pago, pagos en efectivo de hoy) y la lista de eventos abiertos con su avance.
- **Personal, cobro por salón:** filtrar por salón, marcar estudiantes y registrar; los que ya pagaron muestran "Pagado · efectivo".
- **Personal, reportes:** "Descargar Excel" arriba a la derecha; filtros con chips; en cada evento, "Ver por curso" muestra barras horizontales del porcentaje con pago, con el número escrito al lado (nunca solo el color).

---

## 8. Contenido y tono

- Español de Colombia, **tuteo** en toda la plataforma.
- Frases cortas, voz activa, sin tecnicismos.
- **Actividad** para el acudiente, **evento** para el personal (es la misma entidad).
- Errores: qué pasó + cómo resolverlo, sin culpar a nadie ni mostrar códigos.
- Mayúscula solo al inicio de frase. Sin signos de exclamación en mensajes de dinero. Sin emojis.

---

## 9. Accesibilidad (mínimos obligatorios)

Contraste AA; foco visible de 2 px en el color de marca; objetivos táctiles de 44 × 44 px; todo usable con teclado; cada campo con su `<label>`; tablas con `<th scope="col">`; estados con texto, no solo color; `lang="es-CO"` en el `<html>`.

---

## 10. Qué no hacer

- No usar colores fuera de los tokens, ni verde para algo que no sea un pago o un estado positivo.
- No mostrar "Pendiente", "Por pagar", "Sin pago" ni rojo para estudiantes sin pago en la vista del acudiente.
- No poner dos botones primarios en la misma vista.
- No usar gradientes, glassmorphism, sombras fuertes ni ilustraciones grandes.
- No mostrar el número de documento a nadie que no sea el administrador de la institución.
- No mostrar errores técnicos (SQL, RLS, códigos de Supabase).
- No usar animaciones de celebración al completar un pago.
- No escribir el curso a mano en ningún formulario.

---

## 11. Lista de revisión antes de dar una pantalla por terminada

- [ ] Responde una pregunta principal y tiene un solo botón primario.
- [ ] Usa solo tokens y componentes de este documento.
- [ ] Los montos usan `pesos()`, alineados a la derecha en tablas.
- [ ] Los estados usan `EstadoPago`, `EtiquetaEstado` o `EstadoInstitucion`, con ícono + texto.
- [ ] Tiene estado vacío, de carga y de error.
- [ ] Funciona en 360 px de ancho y con teclado.
- [ ] Los textos están en tuteo y con verbos claros en los botones.
