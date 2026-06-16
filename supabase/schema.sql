-- ============================================================
-- ICIE Checador — Schema SQL para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── EXTENSIONES ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PERFILES DE USUARIO ─────────────────────────────────────
-- Vincula el usuario de Supabase Auth con su email y nombre.
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Trigger para crear el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ENTRADAS DE TIEMPO ──────────────────────────────────────
create table if not exists public.time_entries (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  date            date        not null,
  clock_in        timestamptz not null,
  clock_out       timestamptz,
  total_hours     numeric(5,2),
  status          text        not null default 'active'
                              check (status in ('active', 'paused', 'completed')),
  edited_manually boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists time_entries_user_date on public.time_entries(user_id, date desc);

-- ─── PAUSAS ───────────────────────────────────────────────────
create table if not exists public.pauses (
  id              uuid        primary key default uuid_generate_v4(),
  time_entry_id   uuid        not null references public.time_entries(id) on delete cascade,
  start_time      timestamptz not null,
  end_time        timestamptz,
  type            text        not null default 'break'
                              check (type in ('meal', 'break', 'other')),
  duration        integer,    -- minutos
  created_at      timestamptz not null default now()
);

create index if not exists pauses_entry on public.pauses(time_entry_id);

-- ─── EMPLEADOS ────────────────────────────────────────────────
create table if not exists public.employees (
  id                  text        primary key,  -- DEPT-NNNN
  full_name           text        not null,
  preferred_name      text,
  last_name           text,
  position            text,
  department          text,
  schedule_label      text,
  entry_time          text,       -- HH:MM
  tolerance_minutes   integer     not null default 10,
  hired_at            date,
  vacation_manager    text,
  status              text        not null default 'active'
                                  check (status in ('active', 'inactive')),
  user_email          text        references public.profiles(email),
  vacation_balance    integer     not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists employees_email on public.employees(user_email);
create index if not exists employees_status on public.employees(status);

-- ─── PERMISOS Y VACACIONES ───────────────────────────────────
create table if not exists public.permisos_vacaciones (
  id              uuid        primary key default uuid_generate_v4(),
  employee_id     text        not null references public.employees(id),
  type            text        not null
                              check (type in ('vacaciones','permiso_pgss','permiso_sin_goce','incapacidad','permiso_horas')),
  start_date      date        not null,
  end_date        date        not null,
  days            integer     not null default 0,
  hours           numeric(4,1),
  reason          text,
  status          text        not null default 'pending'
                              check (status in ('pending','approved','rejected')),
  requested_at    timestamptz not null default now(),
  reviewed_by     text,
  reviewed_at     timestamptz,
  admin_notes     text,
  document_url    text
);

create index if not exists permisos_employee on public.permisos_vacaciones(employee_id);
create index if not exists permisos_status   on public.permisos_vacaciones(status);

-- ─── INCIDENCIAS ─────────────────────────────────────────────
create table if not exists public.incidencias (
  id              uuid        primary key default uuid_generate_v4(),
  employee_id     text        not null references public.employees(id),
  date            date        not null,
  type            text        not null
                              check (type in ('retardo','ausencia_sj','no_checada','incapacidad','bono_puntualidad')),
  minutes         integer,
  discount_days   numeric(4,2),
  notes           text,
  source          text        not null default 'auto'
                              check (source in ('auto','manual')),
  permiso_ref     uuid        references public.permisos_vacaciones(id),
  period          text        not null,  -- YYYY-MM
  created_at      timestamptz not null default now(),
  created_by      text
);

create index if not exists incidencias_employee_period on public.incidencias(employee_id, period);
create index if not exists incidencias_period on public.incidencias(period);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.time_entries      enable row level security;
alter table public.pauses            enable row level security;
alter table public.employees         enable row level security;
alter table public.permisos_vacaciones enable row level security;
alter table public.incidencias       enable row level security;

-- ─── PROFILES ────────────────────────────────────────────────
create policy "Cada usuario ve su perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "Cada usuario actualiza su perfil"
  on public.profiles for update
  using (id = auth.uid());

-- ─── TIME ENTRIES ────────────────────────────────────────────
create policy "Usuarios ven sus propias entradas"
  on public.time_entries for select
  using (user_id = auth.uid());

create policy "Usuarios crean sus propias entradas"
  on public.time_entries for insert
  with check (user_id = auth.uid());

create policy "Usuarios actualizan sus propias entradas"
  on public.time_entries for update
  using (user_id = auth.uid());

-- Admins ven todas las entradas (para el cálculo de incidencias)
create policy "Admins ven todas las entradas"
  on public.time_entries for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and email in ('e.martinez@icie.mx', 'a.olvera@icie.mx')
    )
  );

-- ─── PAUSES ──────────────────────────────────────────────────
create policy "Usuarios ven sus propias pausas"
  on public.pauses for select
  using (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_id and te.user_id = auth.uid()
    )
  );

create policy "Usuarios crean pausas en sus entradas"
  on public.pauses for insert
  with check (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_id and te.user_id = auth.uid()
    )
  );

create policy "Usuarios actualizan pausas en sus entradas"
  on public.pauses for update
  using (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_id and te.user_id = auth.uid()
    )
  );

-- ─── EMPLOYEES (solo admins pueden escribir) ─────────────────
create policy "Todos los autenticados ven empleados"
  on public.employees for select
  using (auth.uid() is not null);

create policy "Solo admins crean empleados"
  on public.employees for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and email in ('e.martinez@icie.mx', 'a.olvera@icie.mx')
    )
  );

create policy "Solo admins actualizan empleados"
  on public.employees for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and email in ('e.martinez@icie.mx', 'a.olvera@icie.mx')
    )
  );

-- ─── PERMISOS VACACIONES ─────────────────────────────────────
-- Empleado ve sus propias solicitudes; admin ve todas
create policy "Empleado ve sus propias solicitudes"
  on public.permisos_vacaciones for select
  using (
    exists (
      select 1 from public.employees e
      join public.profiles p on p.email = e.user_email
      where e.id = employee_id and p.id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and email in ('e.martinez@icie.mx', 'a.olvera@icie.mx')
    )
  );

create policy "Empleado crea sus propias solicitudes"
  on public.permisos_vacaciones for insert
  with check (
    exists (
      select 1 from public.employees e
      join public.profiles p on p.email = e.user_email
      where e.id = employee_id and p.id = auth.uid()
    )
  );

create policy "Solo admins aprueban/rechazan"
  on public.permisos_vacaciones for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and email in ('e.martinez@icie.mx', 'a.olvera@icie.mx')
    )
  );

-- ─── INCIDENCIAS (solo admins) ───────────────────────────────
create policy "Solo admins acceden a incidencias"
  on public.incidencias for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and email in ('e.martinez@icie.mx', 'a.olvera@icie.mx')
    )
  );
