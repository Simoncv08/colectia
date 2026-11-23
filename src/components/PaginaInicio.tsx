import Link from 'next/link'
import {
  Banknote,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Lock,
  Mail,
  Palette,
  ShieldCheck,
  UserRoundPlus,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import Marca from '@/components/Marca'
import LogoAbeja from '@/components/LogoAbeja'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { icono, iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

// Página de inicio pública (www.colectia.org sin sesión). Explica qué es Colectia a familias y
// colegios, y enlaza a crear cuenta, entrar, términos y privacidad (Google la pide para
// verificar la marca del inicio de sesión).

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
    texto: 'Vincúlalos con el código o el documento que te da el colegio, aunque estudien en colegios distintos.',
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
    titulo: 'El colegio crea la actividad',
    texto: 'Con sus productos, precios y fecha límite, y elige a qué cursos va dirigida.',
  },
  {
    titulo: 'La familia la ve en su cuenta',
    texto: 'Después de vincular a su estudiante, ve la actividad, el precio y los detalles.',
  },
  {
    titulo: 'El pago queda registrado',
    texto: 'Hoy en efectivo con el recaudador del colegio; muy pronto, también en línea.',
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
    Icono: Palette,
    titulo: 'Con los colores de tu colegio',
    texto: 'Cada colegio elige su paleta, y las familias la ven al entrar.',
  },
]

function Tarjetas({ items }: { items: typeof PARA_FAMILIAS }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ Icono, titulo, texto }) => (
        <li key={titulo} className={`${ui.tarjeta} flex gap-4 lg:flex-col lg:gap-3`}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primario-suave text-primario">
            <Icono {...iconoGrande} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-semibold text-gray-900">{titulo}</h3>
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
      <div className={`${ui.tarjeta} flex flex-col gap-4 overflow-hidden shadow-lg`}>
        <div className="-mx-4 -mt-4 h-1.5 bg-primario sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-snug text-gray-900">Salida al Parque del Café</p>
            <p className="text-[13px] text-gray-600">Colegio San Gabriel</p>
          </div>
          <div className="shrink-0 rounded-lg bg-primario-suave px-3 py-1.5 text-right text-primario">
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
      <div className="relative -mt-3 ml-auto mr-2 w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:absolute sm:bottom-0 sm:-right-8 sm:mr-0 sm:mt-0 lg:-right-12">
        <p className="text-[13px] font-medium text-gray-600">Recaudado · 10B</p>
        <p className="text-2xl font-bold text-gray-900">$ 1.260.000</p>
        <div className="mt-2 h-2 overflow-hidden rounded bg-gray-100">
          <div className="h-full w-[90%] rounded bg-primario" />
        </div>
        <p className="mt-1.5 text-[13px] text-gray-600">28 de 31 con pago</p>
      </div>
    </div>
  )
}

export default function PaginaInicio() {
  const anio = new Date().getFullYear()
  return (
    <div className="flex min-h-screen flex-col bg-fondo">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="py-2" aria-label="Colectia, inicio">
            <Marca />
          </Link>
          <nav aria-label="Cuenta" className="flex items-center gap-1 sm:gap-2">
            <Link href="/login" className={`${ui.botonFantasma} px-3 text-gray-900`}>
              Entrar
            </Link>
            <Link href="/login?modo=registro" className={`${ui.botonPrimario} px-4`}>
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Portada */}
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div className="flex flex-col gap-5">
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-primario-suave px-3 py-1 text-[13px] font-semibold text-primario">
                <LogoAbeja className="h-4 w-4" />
                Para colegios y familias en Colombia
              </span>
              <h1 className="text-[32px] font-bold leading-[1.15] tracking-tight text-gray-900 sm:text-[44px]">
                Los pagos de las actividades del colegio, <span className="text-primario">claros para todos</span>
              </h1>
              <p className="max-w-xl text-[17px] leading-7 text-gray-600">
                Colectia organiza el recaudo de salidas, eventos y celebraciones. El colegio sabe quién ya
                pagó y las familias ven sus actividades y lo que pagaron, sin listas en papel.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/login?modo=registro" className={`${ui.botonPrimario} w-full sm:w-auto`}>
                  Crear mi cuenta
                </Link>
                <Link href="/login" className={`${ui.botonSecundario} w-full sm:w-auto`}>
                  Ya tengo cuenta
                </Link>
              </div>
              <p className="text-[13px] text-gray-600">Para las familias, Colectia es gratis.</p>
            </div>
            <Vistazo />
          </div>
        </section>

        {/* Familias y colegios */}
        <section aria-labelledby="titulo-familias" className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-semibold text-primario">Familias</p>
                <h2 id="titulo-familias" className="mt-1 text-2xl font-bold text-gray-900">
                  Todo lo de tus estudiantes, a la mano
                </h2>
              </div>
              <Tarjetas items={PARA_FAMILIAS} />
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-semibold text-primario">Colegios</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">El recaudo, sin cuadernos ni cuentas a mano</h2>
              </div>
              <Tarjetas items={PARA_COLEGIOS} />
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section aria-labelledby="titulo-pasos" className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
            <h2 id="titulo-pasos" className="text-2xl font-bold text-gray-900">
              Cómo funciona
            </h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {PASOS.map((paso, i) => (
                <li key={paso.titulo} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primario text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-gray-900">{paso.titulo}</h3>
                    <p className="text-[15px] leading-6 text-gray-600">{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Confianza */}
        <section aria-labelledby="titulo-confianza" className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-primario">
              <ShieldCheck {...icono} />
              Confianza
            </p>
            <h2 id="titulo-confianza" className="text-2xl font-bold text-gray-900">
              Hecho para cuidar el dinero y los datos de la comunidad
            </h2>
          </div>
          <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {CONFIANZA.map(({ Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <Icono {...iconoGrande} className="mt-0.5 shrink-0 text-primario" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-gray-900">{titulo}</h3>
                  <p className="text-[15px] leading-6 text-gray-600">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] text-gray-600">
            Lee cómo tratamos los datos en nuestra{' '}
            <Link href="/privacidad" className={ui.enlace}>
              política de privacidad
            </Link>
            .
          </p>
        </section>

        {/* Cierre */}
        <section className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6">
          <div className="grid gap-4 rounded-xl bg-primario p-6 text-white sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">¿Tu colegio ya usa Colectia?</h2>
              <p className="text-[15px] text-white/85">
                Crea tu cuenta y vincula a tus estudiantes con el código o el documento que te dio el colegio.
              </p>
            </div>
            <Link
              href="/login?modo=registro"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primario hover:bg-primario-suave"
            >
              Crear mi cuenta
            </Link>
          </div>
          {CORREO_CONTACTO && (
            <div className={`${ui.tarjeta} mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
              <div className="flex items-start gap-4">
                <Building2 {...iconoGrande} className="mt-0.5 shrink-0 text-primario" />
                <div>
                  <h2 className="font-semibold text-gray-900">¿Quieres Colectia en tu colegio?</h2>
                  <p className="text-[15px] text-gray-600">Escríbenos y te mostramos cómo funciona.</p>
                </div>
              </div>
              <a href={`mailto:${CORREO_CONTACTO}`} className={`${ui.botonSecundario} w-full md:w-auto`}>
                <Mail {...iconoGrande} />
                Escribir a {CORREO_CONTACTO}
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-1">
            <Marca />
            <p className="text-[13px] text-gray-600">Pagos escolares claros para familias y colegios.</p>
          </div>
          <nav aria-label="Enlaces legales" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/terminos" className="inline-flex min-h-11 items-center text-gray-700 hover:text-gray-900 sm:min-h-0">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="inline-flex min-h-11 items-center text-gray-700 hover:text-gray-900 sm:min-h-0">
              Política de privacidad
            </Link>
            <span className="inline-flex min-h-11 items-center text-gray-600 sm:min-h-0">© {anio} Colectia</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
