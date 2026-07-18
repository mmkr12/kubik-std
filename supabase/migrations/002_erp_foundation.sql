-- ============================================================
-- KUBIK.std ERP — Этап 1: фундамент базы данных
-- Выполнить в Supabase SQL Editor ПОСЛЕ основного schema.sql
-- ============================================================

-- 1. Клиенты -----------------------------------------------------------
-- Идентификатор клиента — номер телефона. total_revenue — сумма стоимости
-- всех его заявок ("сколько занёс в кассу"), считается автоматически.
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  created_at timestamptz not null default now()
);

-- 2. Типы изделий (справочник, редактируется админом без кода) --------
-- norms: [{ "max_area_m2": 10, "manufacture_hours_min": 3, "manufacture_hours_max": 5,
--            "install_hours_min": 1, "install_hours_max": 1 }, { "max_area_m2": null, ... }]
-- install_mode: 'included'   — монтаж уже в цене за м² (мелкие изделия)
--               'complexity' — монтаж считается по сложности вручную (Тараз/города)
--               'manual'     — индивидуальный проект, всё вручную
create table if not exists product_types (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  unit text not null default 'm2' check (unit in ('m2', 'pcs')),
  price_per_unit numeric not null default 0,
  norms jsonb not null default '[]',
  install_mode text not null default 'complexity'
    check (install_mode in ('included', 'complexity', 'manual')),
  schedule_days text[] not null default '{mon,tue,wed,thu}',
  needs_review boolean not null default false, -- норматив-заглушка, требует уточнения
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Сиды по значениям, которые ты дал. Часы — вилками min/max.
insert into product_types (key, name, unit, install_mode, schedule_days, norms, sort_order)
values
  ('banner', 'Баннер', 'm2', 'included', '{fri,sat}',
    '[{"max_area_m2":10,"manufacture_hours_min":3,"manufacture_hours_max":5,"install_hours_min":1,"install_hours_max":1},
      {"max_area_m2":null,"manufacture_hours_min":8,"manufacture_hours_max":8,"install_hours_min":3,"install_hours_max":3}]', 1),
  ('table_sign', 'Табличка', 'pcs', 'included', '{fri,sat}',
    '[{"max_area_m2":null,"manufacture_hours_min":1.5,"manufacture_hours_max":1.5,"install_hours_min":0.17,"install_hours_max":0.17}]', 2),
  ('stand', 'Стенд', 'pcs', 'included', '{fri,sat}',
    '[{"max_area_m2":null,"manufacture_hours_min":2,"manufacture_hours_max":2,"install_hours_min":0.5,"install_hours_max":0.5}]', 3),
  ('light_letters', 'Световая вывеска (объёмные буквы на каркасе)', 'm2', 'complexity', '{mon,tue,wed,thu}',
    '[{"max_area_m2":null,"manufacture_hours_min":5,"manufacture_hours_max":8,"install_hours_min":null,"install_hours_max":null}]', 4),
  ('alucobond_inlay', 'Алюкобонд с фрезеровкой и инкрустацией', 'm2', 'complexity', '{mon,tue,wed,thu}',
    '[{"max_area_m2":null,"manufacture_hours_min":3,"manufacture_hours_max":3,"install_hours_min":null,"install_hours_max":null}]', 5),
  ('alucobond_letters', 'Алюкобонд с объёмными буквами', 'm2', 'complexity', '{mon,tue,wed,thu}',
    '[{"max_area_m2":null,"manufacture_hours_min":3,"manufacture_hours_max":3,"install_hours_min":null,"install_hours_max":null}]', 6),
  ('light_sign_backing', 'Световая вывеска с подложкой', 'm2', 'complexity', '{mon,tue,wed,thu}',
    '[{"max_area_m2":null,"manufacture_hours_min":8,"manufacture_hours_max":11,"install_hours_min":null,"install_hours_max":null}]', 7),
  ('lightbox', 'Световой короб (лайтбокс)', 'm2', 'complexity', '{mon,tue,wed,thu}',
    '[{"max_area_m2":null,"manufacture_hours_min":1.5,"manufacture_hours_max":2,"install_hours_min":null,"install_hours_max":null}]', 8),
  ('custom', 'Индивидуальный проект', 'm2', 'manual', '{mon,tue,wed,thu,fri,sat}', '[]', 9)
on conflict (key) do nothing;

update product_types set needs_review = true where key = 'alucobond_letters';

-- 3. Настройки монтажа и планировщика (singleton) ----------------------
create table if not exists production_settings (
  id int primary key default 1,
  daily_capacity_hours numeric not null default 12,
  sunday_multiplier numeric not null default 2,
  weekday_surcharge_small numeric not null default 10000, -- доплата за мелкий заказ пн–чт
  install_pricing jsonb not null default '{
    "taraz": {
      "light":  {"min": 10000, "max": 15000},
      "medium": {"min": 25000, "max": 30000},
      "medium_large": 40000,
      "hard": 60000
    },
    "shymkent": 80000,
    "almaty": 120000
  }',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into production_settings (id) values (1) on conflict (id) do nothing;

-- 4. Заявки (requests) — заменяет прежнюю плоскую orders для новых заявок
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  status text not null default 'measurement'
    check (status in ('measurement', 'draft', 'in_production', 'done', 'lost')),
  needs_measurement boolean not null default false,
  name text not null,
  phone text not null,
  address text,
  comment text,
  sketch_url text,
  finished_photo_url text,
  recommended_install_date date,
  install_date date,
  manual_override boolean not null default false,
  total_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  started_production_at timestamptz,
  finished_at timestamptz
);

create index if not exists requests_status_idx on requests (status);
create index if not exists requests_install_date_idx on requests (install_date);
create index if not exists requests_client_idx on requests (client_id);

-- 5. Позиции работ внутри заявки ("Добавить работу") --------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  product_type_id uuid not null references product_types(id),
  params jsonb not null default '{}', -- ширина/высота/площадь/подсветка и т.д.
  manufacture_hours numeric,          -- взято из norms на момент создания, редактируемо
  install_complexity text check (install_complexity in ('light','medium','medium_large','hard')),
  install_city text not null default 'taraz' check (install_city in ('taraz','shymkent','almaty')),
  sunday_client_requested boolean not null default false,
  weekday_surcharge_applied boolean not null default false,
  item_cost numeric not null default 0,
  install_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_items_request_idx on order_items (request_id);

-- 6. Автоматический пересчёт total_cost заявки при изменении позиций ----
create or replace function recalc_request_total() returns trigger as $$
begin
  update requests
  set total_cost = (
    select coalesce(sum(item_cost + install_cost), 0)
    from order_items where request_id = coalesce(new.request_id, old.request_id)
  )
  where id = coalesce(new.request_id, old.request_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists order_items_recalc on order_items;
create trigger order_items_recalc
after insert or update or delete on order_items
for each row execute function recalc_request_total();

-- 7. Представление "клиенты + сумма за всё время" -----------------------
create or replace view client_totals as
select
  c.id,
  c.phone,
  c.name,
  count(r.id) as requests_count,
  coalesce(sum(r.total_cost) filter (where r.status <> 'lost'), 0) as total_revenue,
  max(r.created_at) as last_request_at
from clients c
left join requests r on r.client_id = c.id
group by c.id, c.phone, c.name;

-- 8. RLS ------------------------------------------------------------------
alter table clients enable row level security;
alter table product_types enable row level security;
alter table production_settings enable row level security;
alter table requests enable row level security;
alter table order_items enable row level security;

-- Справочник типов изделий читают все (нужен публичному калькулятору)
create policy "public read product types" on product_types
  for select to anon, authenticated using (true);
create policy "authenticated manage product types" on product_types
  for all to authenticated using (true) with check (true);

create policy "public read production settings" on production_settings
  for select to anon, authenticated using (true);
create policy "authenticated manage production settings" on production_settings
  for all to authenticated using (true) with check (true);

-- Заявки и клиенты — только менеджеры (это внутренние данные, не публичные)
create policy "authenticated full access clients" on clients
  for all to authenticated using (true) with check (true);
create policy "authenticated full access requests" on requests
  for all to authenticated using (true) with check (true);
create policy "authenticated full access order items" on order_items
  for all to authenticated using (true) with check (true);

-- Публичная страница "Производство онлайн" по-прежнему берёт данные
-- из старой таблицы orders (Этап 2 перенесёт её на requests + добавит
-- отдельную публичную политику чтения по status = 'in_production').
