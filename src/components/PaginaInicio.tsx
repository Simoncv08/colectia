import Link from 'next/link'
import {
  Banknote,
  KeyRound,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Lock,
  Mail,
  Palette,
  Trash2,
  ShieldCheck,
  UserRoundPlus,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import Marca from '@/components/Marca'
import type { CSSProperties } from 'react'
import LogoAbeja from '@/components/LogoAbeja'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { DESCRIPCION_SITIO, URL_SITIO } from '@/lib/sitio'
import { icono, iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

// Página de inicio pública (www.colectia.co sin sesión), pensada para rectores y administradores:
// qué es Colectia, cómo empieza un colegio, precios y prueba gratis. Las familias entran por la
// dirección de su colegio; aquí solo se les dice eso. Enlaza a términos y privacidad (Google la
// pide para verificar la marca del inicio de sesión).
//
// Usa los colores de la marca Colectia (DESIGN.md): miel (#f5c400, el de la abeja) para
// fondos y botones con texto tinta, y tinta (#14213d, azul noche) para el texto, los botones
// oscuros y las franjas oscuras. El amarillo nunca va como color de texto sobre blanco.

const PARA_FAMILIAS: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    Icono: CalendarDays,
    titulo: 'Todas las actividades en un lugar',
    texto: 'Salidas, eventos y celebraciones de tus estudiantes, con su precio y sus fechas.',
  },
  {
    Icono: CircleCheck,
    titulo: 'Sabes qué ya está pagado',
    texto: 'Cuando el colegio registra un pago, lo ves de inmediato. Sin preguntar ni guardar recibos.',
  },
  {
    Icono: UserRoundPlus,
    titulo: 'Todos tus estudiantes',
    texto: 'Se vinculan con el código o el documento que da el colegio, y la familia los ve a todos en su cuenta.',
  },
  {
    Icono: WalletCards,
    titulo: 'Pronto, pagos en línea',
    texto: 'Con PSE o Botón Bancolombia, para que tus estudiantes no tengan que llevar efectivo.',
  },
]

const PARA_COLEGIOS: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    Icono: CalendarDays,
    titulo: 'Actividades con varios productos',
    texto: 'Precio fijo o por unidad, con fecha límite, dirigidas a cursos o grupos de cursos.',
  },
  {
    Icono: Banknote,
    titulo: 'Cobro por salón',
    texto: 'Marca a quién le cobraste y registra todos los pagos en efectivo de una vez, con devueltas.',
  },
  {
    Icono: ChartColumn,
    titulo: 'Reportes claros',
    texto: 'Cuánto se recaudó por evento, curso y persona, y quién no ha pagado. En pantalla o en Excel.',
  },
  {
    Icono: Users,
    titulo: 'Tu equipo, con roles',
    texto: 'Administradores y recaudadores, cada uno con lo que necesita, y un registro de cada acción.',
  },
]

const PASOS = [
  {
    titulo: 'Registras tu colegio',
    texto: 'Con su NIT y la dirección que quieres, por ejemplo lcp.colectia.co. La revisamos y empieza tu prueba gratis.',
  },
  {
    titulo: 'Cargas cursos y estudiantes',
    texto: 'Desde un archivo de Excel, y creas tu primera actividad con sus productos, precios y fecha límite.',
  },
  {
    titulo: 'Compartes el enlace',
    texto: 'Las familias crean su cuenta en la dirección de tu colegio, ven la actividad y el recaudador registra los pagos.',
  },
]

const CONFIANZA: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    Icono: Banknote,
    titulo: 'Colectia no maneja el dinero',
    texto: 'El dinero de las actividades es del colegio. Colectia no lo recibe ni cobra comisiones a las familias.',
  },
  {
    Icono: Building2,
    titulo: 'Cada colegio en su espacio',
    texto: 'La información de un colegio nunca se mezcla con la de otro.',
  },
  {
    Icono: Lock,
    titulo: 'Datos de estudiantes protegidos',
    texto: 'Los estudiantes no tienen cuenta y su documento solo lo ve el administrador de su colegio.',
  },
  {
    Icono: KeyRound,
    titulo: 'Si entras con Google',
    texto:
      'Colectia solo recibe tu nombre y tu correo para crear tu cuenta e identificarte. No lee tu Gmail, tus contactos ni tus archivos, y nunca usa tus datos para publicidad.',
  },
  {
    Icono: Trash2,
    titulo: 'Tus datos son tuyos',
    texto: `Puedes actualizarlos en "Mi cuenta" o pedir que los borremos escribiendo a ${CORREO_CONTACTO}.`,
  },
  {
    Icono: Palette,
    titulo: 'Con los colores de tu colegio',
    texto: 'Cada colegio elige su paleta, y las familias la ven al entrar.',
  },
]

// Cada respuesta se entiende sola: así la pueden citar Google y los asistentes de IA. El mismo
// texto va en los datos estructurados (FAQPage), que deben coincidir con lo visible.
function preguntas(diasPrueba: number): { pregunta: string; respuesta: string }[] {
  return [
    {
      pregunta: '¿Cuánto cuesta Colectia para un colegio?',
      respuesta: `Un pago al año según el número de estudiantes del colegio, con IVA incluido y sin comisiones por pago. Puedes probarlo gratis ${diasPrueba} días antes de pagar. Para las familias es gratis.`,
    },
    {
      pregunta: '¿Cuánto toma empezar?',
      respuesta:
        'Un día. Registras el colegio, aprobamos su dirección (por ejemplo, lcp.colectia.co), cargas los cursos y los estudiantes desde un archivo de Excel y compartes el enlace con las familias.',
    },
    {
      pregunta: '¿Cómo pagan las familias?',
      respuesta:
        'Hoy en efectivo con el recaudador del colegio, que registra cada pago en Colectia, incluso por salón y con devueltas. Estamos preparando los pagos en línea con PSE y Botón Bancolombia para que los estudiantes no lleven efectivo.',
    },
    {
      pregunta: '¿Quién recibe el dinero de las actividades?',
      respuesta:
        'El colegio. Colectia no recibe ni guarda el dinero de las actividades. Con los pagos en línea, el dinero llegará directo a la cuenta del colegio.',
    },
    {
      pregunta: '¿Cómo se protegen los datos de los estudiantes?',
      respuesta:
        'Cada colegio tiene su propio espacio y su propia dirección, y no ve la información de otros. El número de documento de los estudiantes solo lo ve el administrador del colegio, los estudiantes no tienen cuenta y Colectia no usa los datos para publicidad.',
    },
    {
      pregunta: '¿Cómo entran las familias?',
      respuesta:
        'Con el enlace de su colegio (por ejemplo, lcp.colectia.co). Crean su cuenta gratis, vinculan a sus estudiantes con el código o el documento que les da el colegio y ven sus actividades y los pagos registrados.',
    },
    {
      pregunta: '¿Qué pasa cuando termina la prueba?',
      respuesta:
        'Si decides seguir, pagas la suscripción anual y todo sigue igual. Si no, el colegio queda en solo lectura 3 días para descargar su información en Excel y después la borramos, como dice nuestra política de privacidad.',
    },
  ]
}

// Quién es Colectia y qué hace, en schema.org, para buscadores y asistentes de IA.
function datosEstructurados(lista: ReturnType<typeof preguntas>) {
  return {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${URL_SITIO}/#organizacion`,
      name: 'Colectia',
      url: URL_SITIO,
      logo: `${URL_SITIO}/colectia-logo.png`,
      email: CORREO_CONTACTO,
      areaServed: { '@type': 'Country', name: 'Colombia' },
    },
    {
      '@type': 'WebSite',
      '@id': `${URL_SITIO}/#sitio`,
      url: URL_SITIO,
      name: 'Colectia',
      inLanguage: 'es-CO',
      publisher: { '@id': `${URL_SITIO}/#organizacion` },
    },
    {
      '@type': 'WebApplication',
      name: 'Colectia',
      url: URL_SITIO,
      description: DESCRIPCION_SITIO,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      inLanguage: 'es-CO',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'COP', description: 'Gratis para las familias.' },
      publisher: { '@id': `${URL_SITIO}/#organizacion` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: lista.map(({ pregunta, respuesta }) => ({
        '@type': 'Question',
        name: pregunta,
        acceptedAnswer: { '@type': 'Answer', text: respuesta },
      })),
    },
  ],
  }
}

// En esta página "primario" es la tinta de Colectia, así los componentes compartidos (botones,
// enlaces, foco) quedan en azul noche, y los tonos suaves son miel.
const COLORES_MARCA = {
  '--primario': '#14213d',
  '--primario-hover': '#0b1426',
  '--primario-suave': '#fff3c4',
  '--primario-borde': '#f5c400',
  '--fondo': '#fffdf5',
} as CSSProperties

const botonClaro =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-tinta/20 bg-white px-5 py-2 text-sm font-semibold text-tinta transition-colors duration-[120ms] ease-colectia hover:bg-miel-claro'

function Tarjetas({ items }: { items: typeof PARA_FAMILIAS }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ Icono, titulo, texto }) => (
        <li key={titulo} className={`${ui.tarjeta} flex gap-4 lg:flex-col lg:gap-3`}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-miel text-tinta">
            <Icono {...iconoGrande} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-semibold text-tinta">{titulo}</h3>
            <p className="text-[15px] leading-6 text-gray-600">{texto}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// Ilustración del producto: una actividad como la ve la familia y el avance como lo ve el colegio.
function Vistazo() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm select-none sm:pb-24">
      <div className={`${ui.tarjeta} flex flex-col gap-4 overflow-hidden border-tinta/10 shadow-lg`}>
        <div className="-mx-4 -mt-4 h-1.5 bg-tinta sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-snug text-tinta">Salida al Parque del Café</p>
            <p className="text-[13px] text-gray-600">Colegio San Gabriel</p>
          </div>
          <div className="shrink-0 rounded-lg bg-miel-suave px-3 py-1.5 text-right text-tinta">
            <p className="text-xs font-medium">Desde</p>
            <p className={`${ui.monto} text-[17px] leading-6`}>$ 35.000</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-gray-700">Paga hasta el 28 nov. · Se realiza el 1 dic.</p>
          <span className={`${ui.pildora} ${ui.estadoPagado}`}>
            <CircleCheck {...icono} size={14} />
            Pagado · 1 de 2 estudiantes
          </span>
        </div>
        <span className={`${ui.botonSecundario} w-full`}>Ver detalles</span>
      </div>
      <div className="relative -mt-3 ml-auto mr-2 w-56 rounded-xl bg-tinta p-4 text-white shadow-lg sm:absolute sm:bottom-0 sm:-right-8 sm:mr-0 sm:mt-0 lg:-right-12">
        <p className="text-[13px] font-medium text-tinta-suave">Recaudado · 10B</p>
        <p className="text-2xl font-bold">$ 1.260.000</p>
        <div className="mt-2 h-2 overflow-hidden rounded bg-white/15">
          <div className="h-full w-[90%] rounded bg-miel" />
        </div>
        <p className="mt-1.5 text-[13px] text-tinta-suave">28 de 31 con pago</p>
      </div>
    </div>
  )
}

// diasPrueba y preciosPublicados salen de configuracion_plataforma (los pasa la página).
export default function PaginaInicio({
  diasPrueba,
  preciosPublicados,
}: {
  diasPrueba: number
  preciosPublicados: boolean
}) {
  const anio = new Date().getFullYear()
  const lista = preguntas(diasPrueba)
  return (
    <div className="flex min-h-screen flex-col bg-fondo text-tinta" style={COLORES_MARCA}>
      <script
        type="application/ld+json"
        // Datos propios y fijos; igual se escapa "<" como recomienda la guía de Next.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados(lista)).replace(/</g, '\\u003c') }}
      />
      <header className="sticky top-0 z-30 border-b border-tinta/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="py-2" aria-label="Colectia, inicio">
            <Marca />
          </Link>
          <nav aria-label="Cuenta" className="flex items-center gap-1 sm:gap-2">
            {/* Las familias y el personal entran por la dirección de su colegio. */}
            <Link href="/login" className={`${ui.botonFantasma} px-3 text-tinta hover:bg-miel-claro`}>
              Ya registré mi colegio
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Portada en el amarillo de la abeja, con texto tinta */}
        <section className="bg-miel">
          <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div className="flex flex-col gap-5">
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/70 px-3 py-1 text-[13px] font-semibold text-tinta">
                <LogoAbeja className="h-4 w-4" />
                Para colegios en Colombia
              </span>
              <h1 className="text-[32px] font-bold leading-[1.2] tracking-tight text-tinta sm:text-[44px]">
                Los pagos de las actividades del colegio,{' '}
                <span className="rounded-lg bg-tinta px-2 text-miel [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  claros para todos
                </span>
              </h1>
              <p className="max-w-xl text-[17px] leading-7 text-tinta/85">
                Colectia organiza el recaudo de salidas, eventos y celebraciones de tu colegio: sabes quién
                ya pagó, cobras por salón en minutos y cada familia ve lo suyo, sin listas en papel.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/registro" className={`${ui.botonPrimario} w-full sm:w-auto`}>
                  Probar gratis {diasPrueba} días
                </Link>
                {preciosPublicados && (
                  <Link href="/precios" className={`${botonClaro} w-full sm:w-auto`}>
                    Ver precios
                  </Link>
                )}
              </div>
              <p className="text-[13px] font-medium text-tinta/85">
                ¿Eres familia? Entra con el enlace que te envió tu colegio. Para las familias, Colectia es gratis.
              </p>
            </div>
            <Vistazo />
          </div>
        </section>

        {/* Qué es Colectia, dicho sin rodeos (Google lo revisa para verificar la marca) */}
        <section aria-labelledby="titulo-que-es" className="border-b border-tinta/10 bg-white">
          <div className="mx-auto grid max-w-[1120px] gap-4 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_2fr] lg:gap-10">
            <h2 id="titulo-que-es" className="text-2xl font-bold text-tinta">
              ¿Qué es Colectia?
            </h2>
            <div className="flex flex-col gap-3 text-[17px] leading-7 text-gray-700">
              <p>
                Colectia es una aplicación web para instituciones educativas de Colombia. Los colegios la usan
                para publicar las actividades que requieren un pago (salidas pedagógicas, eventos, celebraciones
                y actividades de grado), registrar quién ya pagó y ver reportes del recaudo.
              </p>
              <p>
                Los padres, madres y acudientes crean una cuenta, vinculan a sus estudiantes con los datos que
                les da el colegio y consultan sus actividades y los pagos registrados. Para entrar pueden usar
                su correo y una contraseña, un enlace que llega al correo o su cuenta de Google.
              </p>
            </div>
          </div>
        </section>

        {/* Familias y colegios */}
        <section aria-labelledby="titulo-colegios" className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-semibold text-miel-oscuro">Para el colegio</p>
                <h2 id="titulo-colegios" className="mt-1 text-2xl font-bold text-tinta">
                  El recaudo, sin cuadernos ni cuentas a mano
                </h2>
              </div>
              <Tarjetas items={PARA_COLEGIOS} />
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-semibold text-miel-oscuro">Para las familias</p>
                <h2 className="mt-1 text-2xl font-bold text-tinta">Todo lo de sus estudiantes, a la mano</h2>
              </div>
              <Tarjetas items={PARA_FAMILIAS} />
            </div>
          </div>
        </section>

        {/* Cómo funciona, en una franja oscura */}
        <section aria-labelledby="titulo-pasos" className="bg-tinta text-white">
          <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
            <h2 id="titulo-pasos" className="text-2xl font-bold">
              Cómo funciona
            </h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {PASOS.map((paso, i) => (
                <li key={paso.titulo} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-miel text-lg font-bold text-tinta">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold">{paso.titulo}</h3>
                    <p className="text-[15px] leading-6 text-tinta-suave">{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Confianza */}
        <section aria-labelledby="titulo-confianza" className="bg-miel-claro">
          <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
            <div className="flex flex-col gap-2">
              <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-miel-oscuro">
                <ShieldCheck {...icono} />
                Confianza
              </p>
              <h2 id="titulo-confianza" className="text-2xl font-bold text-tinta">
                Hecho para cuidar el dinero y los datos de la comunidad
              </h2>
            </div>
            <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {CONFIANZA.map(({ Icono, titulo, texto }) => (
                <li key={titulo} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta text-miel">
                    <Icono {...iconoGrande} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-tinta">{titulo}</h3>
                    <p className="text-[15px] leading-6 text-gray-700">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[15px] text-gray-700">
              Lee cómo tratamos los datos en nuestra{' '}
              <Link href="/privacidad" className="font-semibold text-tinta underline underline-offset-2 hover:text-miel-oscuro">
                política de privacidad
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section aria-labelledby="titulo-preguntas" className="border-b border-tinta/10 bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
            <h2 id="titulo-preguntas" className="text-2xl font-bold text-tinta">
              Preguntas frecuentes
            </h2>
            <ul className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
              {lista.map(({ pregunta, respuesta }) => (
                <li key={pregunta} className="flex flex-col gap-1">
                  <h3 className="font-semibold text-tinta">{pregunta}</h3>
                  <p className="text-[15px] leading-6 text-gray-700">{respuesta}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cierre */}
        <section className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 rounded-xl bg-miel p-6 text-tinta sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">Pruébalo con tu próxima actividad</h2>
              <p className="text-[15px] text-tinta/85">
                {diasPrueba} días gratis desde que aprobemos la dirección de tu colegio. Si eres familia, entra
                con el enlace que te envió el colegio.
              </p>
            </div>
            <Link href="/registro" className={ui.botonPrimario}>
              Probar gratis {diasPrueba} días
            </Link>
          </div>
          {CORREO_CONTACTO && (
            <div className={`${ui.tarjeta} mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-miel-suave text-tinta">
                  <Building2 {...iconoGrande} />
                </span>
                <div>
                  <h2 className="font-semibold text-tinta">¿Quieres Colectia en tu colegio?</h2>
                  <p className="text-[15px] text-gray-600">Escríbenos y te mostramos cómo funciona.</p>
                </div>
              </div>
              <a href={`mailto:${CORREO_CONTACTO}`} className={`${botonClaro} w-full md:w-auto`}>
                <Mail {...iconoGrande} />
                Escribir a {CORREO_CONTACTO}
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-tinta text-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-1">
            <Marca claro />
            <p className="text-[13px] text-tinta-suave">Pagos escolares claros para familias y colegios.</p>
          </div>
          <nav aria-label="Enlaces legales" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/terminos" className="inline-flex min-h-11 items-center text-tinta-suave hover:text-white sm:min-h-0">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="inline-flex min-h-11 items-center text-tinta-suave hover:text-white sm:min-h-0">
              Política de privacidad
            </Link>
            <a href={`mailto:${CORREO_CONTACTO}`} className="inline-flex min-h-11 items-center text-tinta-suave hover:text-white sm:min-h-0">
              Soporte: {CORREO_CONTACTO}
            </a>
            <span className="inline-flex min-h-11 items-center text-tinta-suave sm:min-h-0">© {anio} Colectia</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
