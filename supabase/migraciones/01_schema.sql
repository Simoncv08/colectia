-- Colectia: Esquema inicial (Fase 0, paso 3 del plan de acción)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- RLS queda ACTIVADO en todas las tablas pero SIN políticas todavía.
-- Esto es intencional: por ahora nadie puede leer ni escribir nada
-- desde la app hasta que configuremos el Custom Access Token Hook
-- y escribamos las políticas de RLS (siguiente paso del plan).

-- Instituciones (tenants)
create table public.instituciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  prefijo_codigo text not null unique,
  estado text not null default 'en_prueba'
    check (estado in ('activa', 'suspendida', 'en_prueba', 'cancelada')),
  plan text,
  created_at timestamptz not null default now()
);

-- Identidad única de cada persona (1:1 con auth.users de Supabase)
create table public.personas (
  id uuid primary key references auth.users (id) on delete cascade,
  nombres text,
  apellidos text,
  correo text,
  telefono text,
  created_at timestamptz not null default now()
);

-- Se crea automáticamente una fila en "personas" cada vez que alguien
-- inicia sesión por primera vez (incluye login con Google).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.personas (id, nombres, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membresías: solo para roles asignados institución por institución
-- (super_admin, admin_institucion, recaudador). El acudiente NO tiene
-- fila aquí, su acceso se deriva de acudiente_estudiante.
create table public.membresias (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  institucion_id uuid references public.instituciones (id) on delete cascade,
  rol text not null check (rol in ('super_admin', 'admin_institucion', 'recaudador')),
  codigo text,
  created_at timestamptz not null default now(),
  unique (persona_id, institucion_id, rol)
);

create index membresias_institucion_id_idx on public.membresias (institucion_id);
create index membresias_persona_id_idx on public.membresias (persona_id);

-- Estudiantes
create table public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  codigo_institucional text not null,
  numero_documento text,
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date,
  curso_grado text,
  created_at timestamptz not null default now(),
  unique (institucion_id, codigo_institucional)
);

create index estudiantes_institucion_id_idx on public.estudiantes (institucion_id);

-- Relación acudiente <-> estudiante (muchos a muchos)
create table public.acudiente_estudiante (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (persona_id, estudiante_id)
);

create index acudiente_estudiante_persona_id_idx on public.acudiente_estudiante (persona_id);
create index acudiente_estudiante_estudiante_id_idx on public.acudiente_estudiante (estudiante_id);

-- Eventos
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  nombre text not null,
  descripcion text,
  imagen_url text,
  creado_por uuid references public.membresias (id),
  created_at timestamptz not null default now(),
  -- Último día para pagar, día en que se realiza el evento, y cuándo se
  -- marcó como finalizado (ver eventos_fechas_setup.sql).
  fecha_limite_pago date,
  fecha_evento date,
  finalizado_en timestamptz,
  constraint eventos_fecha_limite_antes_del_evento
    check (fecha_limite_pago is null or fecha_evento is null or fecha_limite_pago <= fecha_evento)
);

create index eventos_institucion_id_idx on public.eventos (institucion_id);

-- A qué cursos/grados o estudiantes puntuales aplica cada evento
create table public.evento_grupos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  curso_grado text,
  estudiante_id uuid references public.estudiantes (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (curso_grado is not null or estudiante_id is not null)
);

create index evento_grupos_evento_id_idx on public.evento_grupos (evento_id);

-- Productos dentro de cada evento
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('precio_unico', 'precio_variable')),
  precio_unitario numeric(12, 2) not null,
  cantidad_maxima_por_estudiante int,
  created_at timestamptz not null default now()
);

create index productos_evento_id_idx on public.productos (evento_id);

-- Registro de pagos (en línea o efectivo)
create table public.registros_pago (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  producto_id uuid references public.productos (id),
  cantidad int not null default 1,
  monto numeric(12, 2) not null,
  metodo text not null check (metodo in ('en_linea', 'efectivo')),
  comprobante text,
  registrado_por uuid references public.membresias (id),
  pagado_en timestamptz not null default now(),
  -- Solo aplica a pagos en efectivo: si el estudiante entregó más dinero
  -- del valor exacto (ej. pagó con un billete grande), "dinero_recibido"
  -- guarda ese efectivo físico recibido y "devuelta_pendiente" indica si
  -- la devuelta (dinero_recibido - monto) ya se le entregó o todavía se
  -- le debe. Si dinero_recibido es null, se asume pago exacto (sin
  -- devuelta).
  dinero_recibido numeric(12, 2),
  devuelta_pendiente boolean not null default false,
  -- Comparten el mismo grupo_pago_id todas las filas (productos) que se
  -- registraron juntas como un solo pago (ej.: el estudiante pagó junto
  -- la entrada y la camiseta), así la pantalla las puede mostrar
  -- agrupadas como un solo pago aunque cada producto quede en su propia
  -- fila.
  grupo_pago_id uuid not null default gen_random_uuid()
);

create index registros_pago_evento_id_idx on public.registros_pago (evento_id);
create index registros_pago_estudiante_id_idx on public.registros_pago (estudiante_id);
create index registros_pago_grupo_pago_id_idx on public.registros_pago (grupo_pago_id);

-- Activar RLS en todas las tablas (sin políticas todavía: por defecto,
-- con RLS activado y cero políticas, nadie puede leer ni escribir nada).
alter table public.instituciones enable row level security;
alter table public.personas enable row level security;
alter table public.membresias enable row level security;
alter table public.estudiantes enable row level security;
alter table public.acudiente_estudiante enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_grupos enable row level security;
alter table public.productos enable row level security;
alter table public.registros_pago enable row level security;
