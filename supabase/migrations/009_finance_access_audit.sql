-- ============================================================
-- KUBIK.std ERP — Модуль «Заявки 2.0, Финансы, Права, Журнал событий»
-- Выполнить в Supabase SQL Editor ПОСЛЕ 002-008
-- ============================================================

-- ============================================================
-- ЧАСТЬ A. Упрощение потока заявок — убираем промежуточный "черновик"
-- ============================================================

-- Существующие черновики считаем сразу производственными заказами.
update requests set status = 'in_production' where status = 'draft';

alter table requests drop constraint if exists requests_status_check;
alter table requests add constraint requests_status_check
  check (status in ('measurement', 'in_production', 'done', 'lost'));

-- Желаемая дата замера (для заявок "Требуется замер").
alter table requests add column if not exists desired_measurement_date date;

-- ============================================================
-- ЧАСТЬ B. История корректировки цены на позиции
-- ============================================================

alter table order_items add column if not exists final_cost numeric;
alter table order_items add column if not exists adjustment_type text check (adjustment_type in ('discount', 'markup'));
alter table order_items add column if not exists adjustment_amount numeric not null default 0;
alter table order_items add column if not exists adjustment_comment text;

update order_items set final_cost = item_cost where final_cost is null;

-- ============================================================
-- ЧАСТЬ C. Технологические поля по типу изделия (для карточки производства)
-- ============================================================

create table if not exists product_type_fields (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references product_types(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null default 'text' check (field_type in ('text', 'select', 'number', 'boolean')),
  options jsonb not null default '[]', -- варианты для select, напр. ["Тёплый белый","Холодный белый"]
  sort_order int not null default 0,
  unique (product_type_id, key)
);

-- Значения, заполненные менеджером/дизайнером для конкретной позиции.
alter table order_items add column if not exists tech_spec jsonb not null default '{}';

-- Сиды тех.полей — по каждому типу свой набор.
do $$
declare
  pt_light uuid; pt_alu_inlay uuid; pt_alu_letters uuid; pt_banner uuid;
  pt_lightbox uuid; pt_letters uuid; pt_table uuid; pt_stand uuid; pt_custom uuid;
begin
  select id into pt_light from product_types where key = 'light_sign_backing';
  select id into pt_alu_inlay from product_types where key = 'alucobond_inlay';
  select id into pt_alu_letters from product_types where key = 'alucobond_letters';
  select id into pt_banner from product_types where key = 'banner';
  select id into pt_lightbox from product_types where key = 'lightbox';
  select id into pt_letters from product_types where key = 'light_letters';
  select id into pt_table from product_types where key = 'table_sign';
  select id into pt_stand from product_types where key = 'stand';
  select id into pt_custom from product_types where key = 'custom';

  if pt_letters is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_letters, 'letter_type', 'Тип букв', 'select', '["Плоские","Объёмные","Контражур"]', 1),
      (pt_letters, 'material', 'Материал', 'text', '[]', 2),
      (pt_letters, 'color', 'Цвет', 'text', '[]', 3),
      (pt_letters, 'backlight_type', 'Тип подсветки', 'select', '["Без подсветки","Фронтальная","Контражур","Комбинированная"]', 4),
      (pt_letters, 'led_type', 'Тип светодиодов', 'text', '[]', 5),
      (pt_letters, 'power_supplies_count', 'Количество блоков питания', 'number', '[]', 6),
      (pt_letters, 'assembly_method', 'Способ сборки', 'text', '[]', 7),
      (pt_letters, 'needs_painting', 'Требуется покраска', 'boolean', '[]', 8),
      (pt_letters, 'needs_welding', 'Требуется сварка', 'boolean', '[]', 9),
      (pt_letters, 'needs_packaging', 'Требуется упаковка', 'boolean', '[]', 10),
      (pt_letters, 'install_notes', 'Особенности монтажа', 'text', '[]', 11)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_light is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_light, 'material', 'Материал подложки', 'text', '[]', 1),
      (pt_light, 'color', 'Цвет', 'text', '[]', 2),
      (pt_light, 'backlight_type', 'Тип подсветки', 'select', '["Фронтальная","Контражур","Комбинированная"]', 3),
      (pt_light, 'led_type', 'Тип светодиодов', 'text', '[]', 4),
      (pt_light, 'power_supplies_count', 'Количество блоков питания', 'number', '[]', 5),
      (pt_light, 'needs_painting', 'Требуется покраска', 'boolean', '[]', 6),
      (pt_light, 'needs_packaging', 'Требуется упаковка', 'boolean', '[]', 7),
      (pt_light, 'install_notes', 'Особенности монтажа', 'text', '[]', 8)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_lightbox is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_lightbox, 'material', 'Материал короба', 'text', '[]', 1),
      (pt_lightbox, 'backlight_type', 'Тип подсветки', 'text', '[]', 2),
      (pt_lightbox, 'led_type', 'Тип светодиодов', 'text', '[]', 3),
      (pt_lightbox, 'power_supplies_count', 'Количество блоков питания', 'number', '[]', 4),
      (pt_lightbox, 'needs_packaging', 'Требуется упаковка', 'boolean', '[]', 5),
      (pt_lightbox, 'install_notes', 'Особенности монтажа', 'text', '[]', 6)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_alu_inlay is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_alu_inlay, 'alucobond_type', 'Тип алюкобонда', 'text', '[]', 1),
      (pt_alu_inlay, 'needs_milling', 'Требуется фрезеровка', 'boolean', '[]', 2),
      (pt_alu_inlay, 'color', 'Цвет', 'text', '[]', 3),
      (pt_alu_inlay, 'needs_packaging', 'Требуется упаковка', 'boolean', '[]', 4),
      (pt_alu_inlay, 'install_notes', 'Особенности монтажа', 'text', '[]', 5)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_alu_letters is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_alu_letters, 'alucobond_type', 'Тип алюкобонда', 'text', '[]', 1),
      (pt_alu_letters, 'letter_type', 'Тип букв', 'text', '[]', 2),
      (pt_alu_letters, 'color', 'Цвет', 'text', '[]', 3),
      (pt_alu_letters, 'needs_welding', 'Требуется сварка', 'boolean', '[]', 4),
      (pt_alu_letters, 'needs_packaging', 'Требуется упаковка', 'boolean', '[]', 5),
      (pt_alu_letters, 'install_notes', 'Особенности монтажа', 'text', '[]', 6)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_banner is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_banner, 'material', 'Материал баннера', 'text', '[]', 1),
      (pt_banner, 'grommets', 'Люверсы', 'boolean', '[]', 2),
      (pt_banner, 'install_notes', 'Особенности монтажа', 'text', '[]', 3)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_table is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_table, 'material', 'Материал', 'text', '[]', 1),
      (pt_table, 'color', 'Цвет', 'text', '[]', 2),
      (pt_table, 'assembly_method', 'Способ сборки', 'text', '[]', 3),
      (pt_table, 'install_notes', 'Особенности монтажа', 'text', '[]', 4)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_stand is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_stand, 'material', 'Материал', 'text', '[]', 1),
      (pt_stand, 'color', 'Цвет', 'text', '[]', 2),
      (pt_stand, 'install_notes', 'Особенности монтажа', 'text', '[]', 3)
    on conflict (product_type_id, key) do nothing;
  end if;

  if pt_custom is not null then
    insert into product_type_fields (product_type_id, key, label, field_type, options, sort_order) values
      (pt_custom, 'description', 'Описание проекта', 'text', '[]', 1),
      (pt_custom, 'visualization_status', 'Статус 3D-визуализации', 'select', '["Не начата","В работе","Согласована"]', 2),
      (pt_custom, 'install_notes', 'Особенности монтажа', 'text', '[]', 3)
    on conflict (product_type_id, key) do nothing;
  end if;
end $$;

alter table order_operations add column if not exists completion_photos text[] not null default '{}';
alter table order_operations add column if not exists completion_comment text;

-- ============================================================
-- ЧАСТЬ D. Оплаты (авансы, доплаты)
-- ============================================================

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  amount numeric not null,
  paid_at timestamptz not null default now(),
  note text,
  created_by uuid references employees(id),
  created_at timestamptz not null default now()
);

create index if not exists payments_request_idx on payments (request_id);

alter table requests add column if not exists paid_amount numeric not null default 0;
alter table requests add column if not exists fully_paid boolean not null default false;

create or replace function recalc_request_paid_amount() returns trigger as $$
begin
  update requests
  set
    paid_amount = (select coalesce(sum(amount), 0) from payments where request_id = coalesce(new.request_id, old.request_id)),
    fully_paid = (select coalesce(sum(amount), 0) from payments where request_id = coalesce(new.request_id, old.request_id)) >= total_cost
      and total_cost > 0
  where id = coalesce(new.request_id, old.request_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists payments_recalc on payments;
create trigger payments_recalc
after insert or update or delete on payments
for each row execute function recalc_request_paid_amount();

-- ============================================================
-- ЧАСТЬ E. Материалы, использованные на конкретный заказ (для себестоимости)
-- ============================================================

create table if not exists request_materials (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  material_id uuid references materials(id),
  quantity numeric not null default 0,
  unit_cost numeric not null default 0,
  total_cost numeric generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now()
);

create index if not exists request_materials_request_idx on request_materials (request_id);

-- ============================================================
-- ЧАСТЬ F. Финансовые фонды
-- ============================================================

create table if not exists company_funds (
  id int primary key default 1,
  payroll_fund_pct numeric not null default 20,
  mandatory_expenses_fund_pct numeric not null default 15,
  development_fund_pct numeric not null default 10,
  constraint single_row check (id = 1)
);
insert into company_funds (id) values (1) on conflict (id) do nothing;

create table if not exists fund_transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id),
  payment_id uuid references payments(id),
  fund_key text not null check (fund_key in ('payroll', 'mandatory', 'development')),
  amount numeric not null,
  created_at timestamptz not null default now()
);

-- При каждой оплате пропорционально распределяем в три фонда.
create or replace function distribute_funds_on_payment() returns trigger as $$
declare
  cfg record;
begin
  select * into cfg from company_funds where id = 1;
  insert into fund_transactions (request_id, payment_id, fund_key, amount) values
    (new.request_id, new.id, 'payroll', round(new.amount * cfg.payroll_fund_pct / 100, 2)),
    (new.request_id, new.id, 'mandatory', round(new.amount * cfg.mandatory_expenses_fund_pct / 100, 2)),
    (new.request_id, new.id, 'development', round(new.amount * cfg.development_fund_pct / 100, 2));
  return new;
end;
$$ language plpgsql;

drop trigger if exists payments_distribute_funds on payments;
create trigger payments_distribute_funds
after insert on payments
for each row execute function distribute_funds_on_payment();

-- ============================================================
-- ЧАСТЬ G. Права доступа по уровню роли (floor / full)
-- ============================================================

alter table roles add column if not exists access_level text not null default 'floor' check (access_level in ('floor', 'full'));
update roles set access_level = 'full' where key in ('manager', 'designer');
update roles set access_level = 'floor' where key in ('installer', 'fabricator', 'printer_operator', 'cnc_operator');

-- Уровень доступа текущего пользователя: 'full', если хотя бы одна из его
-- активных ролей — 'full', иначе 'floor', если есть хоть одна роль.
-- Если для пользователя вообще нет записи employees (старый логин
-- менеджера, созданный до этого модуля) — считаем его 'full', чтобы
-- не потерять доступ уже работающему аккаунту.
create or replace function employee_access_level() returns text as $$
  select coalesce(
    (
      select case when bool_or(r.access_level = 'full') then 'full' else 'floor' end
      from employee_roles er
      join roles r on r.id = er.role_id
      join employees e on e.id = er.employee_id
      where e.auth_user_id = auth.uid() and er.unassigned_at is null
    ),
    case when exists (select 1 from employees where auth_user_id = auth.uid()) then 'floor' else 'full' end
  );
$$ language sql stable security definer;

-- ---- requests: floor может только создавать заявки на замер -------------
drop policy if exists "authenticated full access requests" on requests;

create policy "full manage requests" on requests for all to authenticated
  using (is_admin_user() or employee_access_level() = 'full')
  with check (is_admin_user() or employee_access_level() = 'full');

create policy "floor read requests" on requests for select to authenticated
  using (employee_access_level() = 'floor');

create policy "floor create measurement requests" on requests for insert to authenticated
  with check (employee_access_level() = 'floor' and status = 'measurement' and needs_measurement = true);

-- ---- order_items: только full/admin (калькулятор, стоимость) ------------
drop policy if exists "authenticated full access order items" on order_items;

create policy "full manage order items" on order_items for all to authenticated
  using (is_admin_user() or employee_access_level() = 'full')
  with check (is_admin_user() or employee_access_level() = 'full');

-- ---- clients: только full/admin (см. также миграцию 006) ---------------
drop policy if exists "admin full access clients" on clients;

create policy "full manage clients" on clients for all to authenticated
  using (is_admin_user() or employee_access_level() = 'full')
  with check (is_admin_user() or employee_access_level() = 'full');
-- Публичная вставка лида (форма на сайте, из миграции 008) не трогается.

-- ---- материалы заказа, оплаты, фонды — только full/admin ----------------
alter table request_materials enable row level security;
alter table payments enable row level security;
alter table company_funds enable row level security;
alter table fund_transactions enable row level security;
alter table product_type_fields enable row level security;

create policy "full manage request materials" on request_materials for all to authenticated
  using (is_admin_user() or employee_access_level() = 'full') with check (is_admin_user() or employee_access_level() = 'full');
create policy "full manage payments" on payments for all to authenticated
  using (is_admin_user() or employee_access_level() = 'full') with check (is_admin_user() or employee_access_level() = 'full');
create policy "admin manage company funds" on company_funds for all to authenticated
  using (is_admin_user()) with check (is_admin_user());
create policy "full read fund transactions" on fund_transactions for select to authenticated
  using (is_admin_user() or employee_access_level() = 'full');
create policy "public read product type fields" on product_type_fields for select to anon, authenticated using (true);
create policy "admin manage product type fields" on product_type_fields for all to authenticated
  using (is_admin_user()) with check (is_admin_user());

-- ============================================================
-- ЧАСТЬ H. Клиенты — внутренние комментарии и напоминания
-- ============================================================

create table if not exists client_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  text text not null,
  created_by uuid references employees(id),
  created_at timestamptz not null default now()
);

alter table client_comments enable row level security;
create policy "full manage client comments" on client_comments for all to authenticated
  using (is_admin_user() or employee_access_level() = 'full') with check (is_admin_user() or employee_access_level() = 'full');

alter table clients add column if not exists reminder_dismissed_until date;
alter table requests add column if not exists warranty_notice_dismissed boolean not null default false;

-- ============================================================
-- ЧАСТЬ I. Журнал событий — неизменяемый, автоматический
-- ============================================================

create table if not exists event_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_employee_id uuid references employees(id),
  actor_role text,
  action text not null,       -- напр. 'insert', 'update', 'delete'
  entity_type text not null,  -- имя таблицы
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  comment text
);

create index if not exists event_log_entity_idx on event_log (entity_type, entity_id);
create index if not exists event_log_created_idx on event_log (created_at);

alter table event_log enable row level security;
-- Неизменяем: только INSERT (через триггер) и SELECT для full/admin. Ни
-- UPDATE, ни DELETE не разрешены никому, включая администраторов.
create policy "full read event log" on event_log for select to authenticated
  using (is_admin_user() or employee_access_level() = 'full');
create policy "system insert event log" on event_log for insert to authenticated with check (true);

-- Универсальная функция логирования: сравнивает OLD/NEW и пишет только
-- изменившиеся поля (чтобы записи были компактными и читаемыми).
create or replace function log_event() returns trigger as $$
declare
  old_json jsonb;
  new_json jsonb;
  diff_old jsonb := '{}';
  diff_new jsonb := '{}';
  k text;
  role_name text;
begin
  select string_agg(r.name, ', ') into role_name
  from employee_roles er join roles r on r.id = er.role_id
  where er.employee_id = current_employee_id() and er.unassigned_at is null;

  if TG_OP = 'DELETE' then
    insert into event_log (actor_employee_id, actor_role, action, entity_type, entity_id, old_value)
    values (current_employee_id(), role_name, 'delete', TG_TABLE_NAME, old.id, to_jsonb(old));
    return old;
  end if;

  if TG_OP = 'INSERT' then
    insert into event_log (actor_employee_id, actor_role, action, entity_type, entity_id, new_value)
    values (current_employee_id(), role_name, 'insert', TG_TABLE_NAME, new.id, to_jsonb(new));
    return new;
  end if;

  -- UPDATE: только реально изменившиеся ключи
  old_json := to_jsonb(old);
  new_json := to_jsonb(new);
  for k in select jsonb_object_keys(new_json) loop
    if old_json -> k is distinct from new_json -> k then
      diff_old := diff_old || jsonb_build_object(k, old_json -> k);
      diff_new := diff_new || jsonb_build_object(k, new_json -> k);
    end if;
  end loop;

  if diff_old <> '{}' then
    insert into event_log (actor_employee_id, actor_role, action, entity_type, entity_id, old_value, new_value)
    values (current_employee_id(), role_name, 'update', TG_TABLE_NAME, new.id, diff_old, diff_new);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists log_requests on requests;
create trigger log_requests after insert or update or delete on requests for each row execute function log_event();

drop trigger if exists log_order_items on order_items;
create trigger log_order_items after insert or update or delete on order_items for each row execute function log_event();

drop trigger if exists log_order_operations on order_operations;
create trigger log_order_operations after insert or update or delete on order_operations for each row execute function log_event();

drop trigger if exists log_clients on clients;
create trigger log_clients after insert or update or delete on clients for each row execute function log_event();

drop trigger if exists log_client_comments on client_comments;
create trigger log_client_comments after insert or delete on client_comments for each row execute function log_event();

drop trigger if exists log_employees on employees;
create trigger log_employees after insert or update or delete on employees for each row execute function log_event();

drop trigger if exists log_employee_roles on employee_roles;
create trigger log_employee_roles after insert or update on employee_roles for each row execute function log_event();

drop trigger if exists log_payments on payments;
create trigger log_payments after insert on payments for each row execute function log_event();

drop trigger if exists log_payroll_accruals on payroll_accruals;
create trigger log_payroll_accruals after insert or update on payroll_accruals for each row execute function log_event();

drop trigger if exists log_payroll_payouts on payroll_payouts;
create trigger log_payroll_payouts after insert on payroll_payouts for each row execute function log_event();

drop trigger if exists log_company_funds on company_funds;
create trigger log_company_funds after update on company_funds for each row execute function log_event();

-- Полная история конкретного заказа: сам заказ + все его позиции +
-- все операции внутри этих позиций, одной хронологической лентой.
create or replace function get_request_history(req_id uuid)
returns setof event_log as $$
  select * from event_log
  where (entity_type = 'requests' and entity_id = req_id)
     or (entity_type = 'order_items' and entity_id in (select id from order_items where request_id = req_id))
     or (entity_type = 'order_operations' and entity_id in (
           select oo.id from order_operations oo
           join order_items oi on oi.id = oo.order_item_id
           where oi.request_id = req_id
         ))
     or (entity_type = 'payments' and entity_id in (select id from payments where request_id = req_id))
  order by created_at asc;
$$ language sql stable security definer;
