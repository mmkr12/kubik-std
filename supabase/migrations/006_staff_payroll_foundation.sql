-- ============================================================
-- KUBIK.std ERP — Модуль «Регламент, Сотрудники, Техкарты»
-- Выполнить в Supabase SQL Editor ПОСЛЕ 002-005
-- ============================================================

-- ============================================================
-- ЧАСТЬ A. Роли и сотрудники
-- ============================================================

-- Роли — справочник, редактируется администратором без кода.
-- payroll_method: 'fixed' (фикс. сумма за операцию), 'percent' (% от
-- стоимости заказа), 'hourly' (ставка × нормо-часы).
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  responsibilities text,
  payroll_method text not null default 'fixed' check (payroll_method in ('fixed', 'percent', 'hourly')),
  payroll_rate numeric not null default 0, -- сумма/процент/ставка в зависимости от метода — пока заглушка
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into roles (key, name, payroll_method, payroll_rate) values
  ('installer', 'Монтажник', 'fixed', 0),
  ('designer', 'Дизайнер', 'fixed', 0),
  ('manager', 'Менеджер', 'percent', 0),
  ('fabricator', 'Изготовление', 'fixed', 0),
  ('printer_operator', 'Печать букв', 'fixed', 0),
  ('cnc_operator', 'Фрезеровщик', 'fixed', 0)
on conflict (key) do nothing;

-- Сотрудники. auth_user_id — привязка к личному логину (создаётся
-- через Supabase Auth так же, как менеджер, потом привязывается сюда).
-- is_admin — управляет доступом к чувствительным разделам админки
-- (цены, зарплатный фонд других сотрудников, настройки).
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  photo_url text,
  phone text,
  hire_date date,
  status text not null default 'working' check (status in ('working', 'vacation', 'fired')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists employees_auth_user_idx on employees (auth_user_id);

-- Роли сотрудника — многие-ко-многим, с историей (unassigned_at).
create table if not exists employee_roles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  role_id uuid not null references roles(id),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz
);

create index if not exists employee_roles_employee_idx on employee_roles (employee_id);

-- Сиды по текущим семи сотрудникам и их ролям.
do $$
declare
  e_rinat uuid; e_sasha uuid; e_adiyar uuid; e_zhalgas uuid; e_anuar uuid; e_mark uuid; e_mazlov uuid;
  r_installer uuid; r_designer uuid; r_manager uuid; r_fabricator uuid; r_printer uuid; r_cnc uuid;
begin
  select id into r_installer from roles where key = 'installer';
  select id into r_designer from roles where key = 'designer';
  select id into r_manager from roles where key = 'manager';
  select id into r_fabricator from roles where key = 'fabricator';
  select id into r_printer from roles where key = 'printer_operator';
  select id into r_cnc from roles where key = 'cnc_operator';

  insert into employees (full_name, status) values ('Ринат', 'working') returning id into e_rinat;
  insert into employees (full_name, status) values ('Саша', 'working') returning id into e_sasha;
  insert into employees (full_name, status) values ('Адияр', 'working') returning id into e_adiyar;
  insert into employees (full_name, status) values ('Жалгас', 'working') returning id into e_zhalgas;
  insert into employees (full_name, status) values ('Ануар', 'working') returning id into e_anuar;
  insert into employees (full_name, status) values ('Марк', 'working') returning id into e_mark;
  insert into employees (full_name, status) values ('Мазлов', 'working') returning id into e_mazlov;

  insert into employee_roles (employee_id, role_id) values
    (e_rinat, r_installer), (e_rinat, r_manager), (e_rinat, r_fabricator),
    (e_sasha, r_installer), (e_sasha, r_fabricator),
    (e_adiyar, r_installer), (e_adiyar, r_fabricator),
    (e_zhalgas, r_designer), (e_zhalgas, r_manager),
    (e_anuar, r_designer), (e_anuar, r_manager),
    (e_mark, r_designer), (e_mark, r_manager), (e_mark, r_printer),
    (e_mazlov, r_printer), (e_mazlov, r_cnc);
end $$;

-- ============================================================
-- ЧАСТЬ B. Технологические шаблоны и операции по заказу
-- ============================================================

-- Шаблон операции для типа изделия. depends_on_keys — ключи других
-- операций ЭТОГО ЖЕ типа изделия, которые должны быть выполнены раньше
-- (пусто = можно начинать сразу; используется для параллельных веток).
create table if not exists operation_templates (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references product_types(id) on delete cascade,
  key text not null, -- уникален в рамках product_type, напр. 'design', 'milling'
  name text not null,
  role_id uuid references roles(id),
  default_employee_id uuid references employees(id),
  cost numeric not null default 0, -- заглушка до утверждения структуры зарплат
  norm_hours numeric not null default 0,
  required boolean not null default true,
  allows_parallel boolean not null default false,
  depends_on_keys text[] not null default '{}',
  sort_order int not null default 0,
  unique (product_type_id, key)
);

-- Фактические операции внутри конкретной позиции заказа — создаются
-- автоматически при добавлении работы в заявку, на основе шаблона.
create table if not exists order_operations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  operation_template_id uuid references operation_templates(id),
  key text not null, -- копия ключа шаблона, для сопоставления depends_on
  name text not null,
  role_id uuid references roles(id),
  assigned_employee_id uuid references employees(id),
  cost numeric not null default 0,
  norm_hours numeric not null default 0,
  required boolean not null default true,
  allows_parallel boolean not null default false,
  depends_on_keys text[] not null default '{}',
  status text not null default 'locked' check (status in ('locked', 'available', 'in_progress', 'done')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists order_operations_item_idx on order_operations (order_item_id);
create index if not exists order_operations_employee_idx on order_operations (assigned_employee_id);

-- Сиды технологических шаблонов по трём примерам из ТЗ.
-- Операции без depends_on_keys — стартуют сразу (параллельно).
do $$
declare
  pt_light uuid; pt_banner uuid; pt_table uuid;
  r_design uuid; r_cnc uuid; r_printer uuid; r_fab uuid; r_install uuid;
begin
  select id into pt_light from product_types where key = 'light_sign_backing';
  select id into pt_banner from product_types where key = 'banner';
  select id into pt_table from product_types where key = 'table_sign';
  select id into r_design from roles where key = 'designer';
  select id into r_cnc from roles where key = 'cnc_operator';
  select id into r_printer from roles where key = 'printer_operator';
  select id into r_fab from roles where key = 'fabricator';
  select id into r_install from roles where key = 'installer';

  if pt_light is not null then
    insert into operation_templates (product_type_id, key, name, role_id, allows_parallel, depends_on_keys, sort_order) values
      (pt_light, 'design', 'Дизайн', r_design, false, '{}', 1),
      (pt_light, 'file_prep', 'Подготовка файлов', r_design, false, '{design}', 2),
      (pt_light, 'milling', 'Фрезеровка', r_cnc, true, '{file_prep}', 3),
      (pt_light, 'letter_print', 'Печать букв', r_printer, true, '{file_prep}', 3),
      (pt_light, 'welding', 'Сварка каркаса', r_fab, false, '{file_prep}', 3),
      (pt_light, 'painting', 'Покраска', r_fab, false, '{welding}', 4),
      (pt_light, 'assembly', 'Сборка', r_fab, false, '{milling,letter_print,painting}', 5),
      (pt_light, 'installation', 'Монтаж', r_install, false, '{assembly}', 6)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_banner is not null then
    insert into operation_templates (product_type_id, key, name, role_id, allows_parallel, depends_on_keys, required, sort_order) values
      (pt_banner, 'design', 'Дизайн', r_design, false, '{}', true, 1),
      (pt_banner, 'print_prep', 'Подготовка печати', r_printer, false, '{design}', true, 2),
      (pt_banner, 'printing', 'Печать', r_printer, false, '{print_prep}', true, 3),
      (pt_banner, 'grommets', 'Люверсы', r_fab, false, '{printing}', true, 4),
      (pt_banner, 'installation', 'Монтаж (при необходимости)', r_install, false, '{grommets}', false, 5)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_table is not null then
    insert into operation_templates (product_type_id, key, name, role_id, allows_parallel, depends_on_keys, sort_order) values
      (pt_table, 'design', 'Дизайн', r_design, false, '{}', 1),
      (pt_table, 'milling', 'Фрезеровка', r_cnc, false, '{design}', 2),
      (pt_table, 'film', 'Поклейка плёнки', r_fab, false, '{milling}', 3),
      (pt_table, 'assembly', 'Сборка', r_fab, false, '{film}', 4),
      (pt_table, 'installation', 'Монтаж', r_install, false, '{assembly}', 5)
    on conflict (product_type_id, key) do nothing;
  end if;
end $$;

-- ============================================================
-- ЧАСТЬ C. Зарплатный фонд
-- ============================================================

create table if not exists payroll_accruals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  role_id uuid references roles(id),
  order_operation_id uuid references order_operations(id),
  request_id uuid references requests(id),
  amount numeric not null default 0,
  accrued_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  payout_id uuid
);

create index if not exists payroll_accruals_employee_idx on payroll_accruals (employee_id);

create table if not exists payroll_payouts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  period_month date not null, -- первое число месяца, за который выплата
  total_amount numeric not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table payroll_accruals
  add constraint payroll_accruals_payout_fk foreign key (payout_id) references payroll_payouts(id);

-- Начисление создаётся автоматически при завершении операции.
create or replace function accrue_payroll_on_operation_done() returns trigger as $$
declare
  emp_id uuid;
  r_id uuid;
  req_id uuid;
begin
  if new.status = 'done' and (old.status is distinct from 'done') and new.assigned_employee_id is not null then
    select request_id into req_id from order_items where id = new.order_item_id;
    insert into payroll_accruals (employee_id, role_id, order_operation_id, request_id, amount)
    values (new.assigned_employee_id, new.role_id, new.id, req_id, new.cost);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists order_operations_accrue on order_operations;
create trigger order_operations_accrue
after update on order_operations
for each row execute function accrue_payroll_on_operation_done();

-- ============================================================
-- ЧАСТЬ D. Закупки — еженедельный чек-лист с ручными количествами
-- ============================================================

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'шт',
  active boolean not null default true,
  sort_order int not null default 0
);

insert into materials (name, unit, sort_order)
values
  ('Профильная труба', 'м', 1), ('Металл', 'кг', 2), ('Краска', 'л', 3),
  ('Саморезы', 'уп', 4), ('Анкеры', 'шт', 5), ('Дюбели', 'шт', 6),
  ('Химические анкеры', 'шт', 7), ('Свёрла', 'шт', 8), ('Фрезы', 'шт', 9),
  ('Кабель', 'м', 10), ('Стяжки', 'уп', 11), ('Герметик', 'шт', 12),
  ('Силикон', 'шт', 13), ('Двусторонний скотч', 'шт', 14), ('Обезжириватель', 'шт', 15),
  ('Растворители', 'л', 16), ('Перчатки', 'уп', 17), ('Расходные диски', 'шт', 18),
  ('Крепёж', 'уп', 19), ('Прочие расходники', 'шт', 20)
on conflict do nothing;

create table if not exists procurement_checklists (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'printed')),
  created_at timestamptz not null default now()
);

create table if not exists procurement_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references procurement_checklists(id) on delete cascade,
  material_id uuid references materials(id),
  quantity_needed numeric not null default 0,
  note text
);

-- ============================================================
-- ЧАСТЬ E. Регламент понедельника (общий чек-лист компании)
-- ============================================================

create table if not exists monday_checklist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

insert into monday_checklist_items (title, sort_order) values
  ('Общая уборка производственного помещения', 1),
  ('Проверка расположения инструмента', 2),
  ('Возврат всего инструмента на закреплённые места', 3),
  ('Проверка вкладки «Замеры»', 4),
  ('Выполнение новых замеров', 5)
on conflict do nothing;

create table if not exists monday_checklist_runs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  created_at timestamptz not null default now()
);

create table if not exists monday_checklist_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references monday_checklist_runs(id) on delete cascade,
  item_id uuid not null references monday_checklist_items(id),
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references employees(id)
);

-- ============================================================
-- ЧАСТЬ F. Корпоративные события
-- ============================================================

create table if not exists corporate_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ЧАСТЬ G. RLS — разграничение прав
-- ============================================================
-- Правило: is_admin сотрудник (или менеджер без записи в employees,
-- см. helper ниже) видит и правит всё. Обычный сотрудник со своим
-- логином видит только свои операции и свои начисления.

alter table roles enable row level security;
alter table employees enable row level security;
alter table employee_roles enable row level security;
alter table operation_templates enable row level security;
alter table order_operations enable row level security;
alter table payroll_accruals enable row level security;
alter table payroll_payouts enable row level security;
alter table materials enable row level security;
alter table procurement_checklists enable row level security;
alter table procurement_checklist_items enable row level security;
alter table monday_checklist_items enable row level security;
alter table monday_checklist_runs enable row level security;
alter table monday_checklist_run_items enable row level security;
alter table corporate_events enable row level security;

-- Helper: считается ли текущий пользователь администратором.
-- Если для auth.uid() нет записи в employees — это "старый" менеджерский
-- логин (созданный до этого модуля), он тоже считается админом,
-- чтобы не потерять доступ уже работающему аккаунту.
create or replace function is_admin_user() returns boolean as $$
  select coalesce(
    (select is_admin from employees where auth_user_id = auth.uid()),
    true
  );
$$ language sql stable security definer;

create or replace function current_employee_id() returns uuid as $$
  select id from employees where auth_user_id = auth.uid();
$$ language sql stable security definer;

-- Справочники — читать могут все авторизованные, править только админ.
create policy "employees read roles" on roles for select to authenticated using (true);
create policy "admin manage roles" on roles for all to authenticated using (is_admin_user()) with check (is_admin_user());

create policy "employees read employees" on employees for select to authenticated using (true);
create policy "admin manage employees" on employees for all to authenticated using (is_admin_user()) with check (is_admin_user());

create policy "employees read employee_roles" on employee_roles for select to authenticated using (true);
create policy "admin manage employee_roles" on employee_roles for all to authenticated using (is_admin_user()) with check (is_admin_user());

create policy "public read operation_templates" on operation_templates for select to anon, authenticated using (true);
create policy "admin manage operation_templates" on operation_templates for all to authenticated using (is_admin_user()) with check (is_admin_user());

-- Операции: сотрудник видит и обновляет статус своих операций;
-- админ видит и правит все.
create policy "employee read own operations" on order_operations for select to authenticated
  using (is_admin_user() or assigned_employee_id = current_employee_id());
create policy "employee update own operation status" on order_operations for update to authenticated
  using (is_admin_user() or assigned_employee_id = current_employee_id())
  with check (is_admin_user() or assigned_employee_id = current_employee_id());
create policy "admin insert/delete operations" on order_operations for insert to authenticated with check (is_admin_user());
create policy "admin delete operations" on order_operations for delete to authenticated using (is_admin_user());

-- Начисления: сотрудник видит только свои, админ — все.
create policy "employee read own accruals" on payroll_accruals for select to authenticated
  using (is_admin_user() or employee_id = current_employee_id());
create policy "admin manage accruals" on payroll_accruals for all to authenticated
  using (is_admin_user()) with check (is_admin_user());

create policy "employee read own payouts" on payroll_payouts for select to authenticated
  using (is_admin_user() or employee_id = current_employee_id());
create policy "admin manage payouts" on payroll_payouts for all to authenticated
  using (is_admin_user()) with check (is_admin_user());

-- Закупки, регламент, корпоративные события — читают все сотрудники,
-- правит любой авторизованный (это общие операционные списки, не деньги).
create policy "authenticated read materials" on materials for select to authenticated using (true);
create policy "admin manage materials" on materials for all to authenticated using (is_admin_user()) with check (is_admin_user());

create policy "authenticated full checklists" on procurement_checklists for all to authenticated using (true) with check (true);
create policy "authenticated full checklist items" on procurement_checklist_items for all to authenticated using (true) with check (true);
create policy "authenticated full monday items" on monday_checklist_items for select to authenticated using (true);
create policy "admin manage monday items" on monday_checklist_items for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "authenticated full monday runs" on monday_checklist_runs for all to authenticated using (true) with check (true);
create policy "authenticated full monday run items" on monday_checklist_run_items for all to authenticated using (true) with check (true);
create policy "authenticated full corporate events" on corporate_events for all to authenticated using (true) with check (true);

-- ============================================================
-- ЧАСТЬ H. Ужесточение прав на уже существующие чувствительные таблицы
-- ============================================================
-- Раньше "authenticated" = полный доступ. Теперь, когда среди
-- authenticated есть рядовые сотрудники, часть таблиц нужно закрыть
-- только для админов: цены, настройки, клиенты (финансы).

drop policy if exists "authenticated manage product types" on product_types;
create policy "admin manage product types" on product_types for all to authenticated using (is_admin_user()) with check (is_admin_user());

drop policy if exists "authenticated manage production settings" on production_settings;
create policy "admin manage production settings" on production_settings for all to authenticated using (is_admin_user()) with check (is_admin_user());

drop policy if exists "authenticated full access clients" on clients;
create policy "admin full access clients" on clients for all to authenticated using (is_admin_user()) with check (is_admin_user());
