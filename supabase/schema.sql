-- KUBIK.std — схема базы данных Supabase (PostgreSQL)
-- Выполните этот файл в Supabase Dashboard → SQL Editor

-- 1. Таблица заказов -------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  phone text not null,
  address text,
  comment text,
  cost numeric,
  sketch_url text,
  install_date date,
  status text not null default 'measurement'
    check (status in ('measurement', 'lost', 'production', 'done')),
  finished_photo_url text,
  created_at timestamptz not null default now(),
  started_production_at timestamptz,
  finished_at timestamptz
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_install_date_idx on orders (install_date);

-- 2. Настройки калькулятора (одна строка) ----------------------------------
create table if not exists calculator_settings (
  id int primary key default 1,
  sign_type_prices jsonb not null default '{
    "Объемные буквы": 15000,
    "Световой короб": 16000,
    "Буквы с контражуром": 20000,
    "Неоновые вывески": 25000
  }',
  coefficients jsonb not null default '{"backlight": 1.15, "urgent": 1.2}',
  gifts jsonb not null default '["Световой блок питания в подарок при оплате в течение 12 часов"]',
  kp_text text not null default 'Спасибо за обращение в KUBIK.std!',
  offer_valid_hours int not null default 12,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into calculator_settings (id) values (1) on conflict (id) do nothing;

-- 3. Row Level Security ------------------------------------------------------
alter table orders enable row level security;
alter table calculator_settings enable row level security;

-- Публичный (анонимный) доступ на чтение к заказам в производстве —
-- нужен для страницы "Производство онлайн", которую видят все.
create policy "public read production orders"
  on orders for select
  to anon
  using (status = 'production' or status = 'done');

-- Авторизованные пользователи (менеджеры) видят и меняют все заказы.
create policy "authenticated full access orders"
  on orders for all
  to authenticated
  using (true)
  with check (true);

-- Настройки калькулятора: читать могут все (нужно для публичного калькулятора),
-- изменять — только авторизованные пользователи.
create policy "public read settings"
  on calculator_settings for select
  to anon, authenticated
  using (true);

create policy "authenticated update settings"
  on calculator_settings for all
  to authenticated
  using (true)
  with check (true);

-- 4. Storage buckets ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('sketches', 'sketches', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('finished-photos', 'finished-photos', true)
on conflict (id) do nothing;

create policy "public read sketches"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sketches');

create policy "authenticated upload sketches"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sketches');

create policy "public read finished photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'finished-photos');

create policy "authenticated upload finished photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'finished-photos');
