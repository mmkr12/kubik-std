-- ============================================================
-- KUBIK.std — Модуль «Производственный диспетчер»
-- Выполнить в Supabase SQL Editor ПОСЛЕ 002-017
-- ============================================================
-- Объект очереди = заявка (requests) целиком. Универсальная цепочка
-- производственных этапов (Дизайн → Печать/Фрезеровка → Сварка/Покраска →
-- Пайка/Сборка → Монтаж-или-Отправка) хранится в TS (lib/dispatcher.ts),
-- здесь только расширяем order_operations, чтобы строки этой цепочки
-- могли ссылаться на requests напрямую, а не только на order_items
-- (как раньше, под удалённые в 016 operation_templates/product_types).

-- ============================================================
-- ЧАСТЬ A. Компетенции сотрудников
-- ============================================================

create table if not exists employee_competencies (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  stage_key text not null,
  rank int not null default 1, -- 1 = самая сильная/основная компетенция сотрудника
  unique (employee_id, stage_key)
);

create index if not exists employee_competencies_employee_idx on employee_competencies (employee_id);
create index if not exists employee_competencies_stage_idx on employee_competencies (stage_key);

-- Сиды строго по регламенту (rank = порядковый номер в списке компетенций
-- сотрудника). Мазлов сюда сознательно не включён — не участвует в
-- автораспределении диспетчера.
do $$
declare
  e_mark uuid; e_rinat uuid; e_adiyar uuid; e_anuar uuid; e_sasha uuid; e_zhalgas uuid;
begin
  select id into e_mark from employees where full_name = 'Марк';
  select id into e_rinat from employees where full_name = 'Ринат';
  select id into e_adiyar from employees where full_name = 'Адияр';
  select id into e_anuar from employees where full_name = 'Ануар';
  select id into e_sasha from employees where full_name = 'Саша';
  select id into e_zhalgas from employees where full_name = 'Жалгас';

  if e_mark is not null then
    insert into employee_competencies (employee_id, stage_key, rank) values
      (e_mark, 'manager', 1), (e_mark, 'design', 2), (e_mark, 'letter_print', 3),
      (e_mark, 'painting', 4), (e_mark, 'welding', 5), (e_mark, 'soldering', 6),
      (e_mark, 'assembly', 7), (e_mark, 'installation', 8)
    on conflict (employee_id, stage_key) do nothing;
  end if;

  if e_rinat is not null then
    insert into employee_competencies (employee_id, stage_key, rank) values
      (e_rinat, 'welding', 1), (e_rinat, 'soldering', 2), (e_rinat, 'painting', 3),
      (e_rinat, 'assembly', 4), (e_rinat, 'installation', 5)
    on conflict (employee_id, stage_key) do nothing;
  end if;

  if e_adiyar is not null then
    insert into employee_competencies (employee_id, stage_key, rank) values
      (e_adiyar, 'assembly', 1), (e_adiyar, 'installation', 2), (e_adiyar, 'painting', 3)
    on conflict (employee_id, stage_key) do nothing;
  end if;

  if e_anuar is not null then
    insert into employee_competencies (employee_id, stage_key, rank) values
      (e_anuar, 'manager', 1), (e_anuar, 'design', 2), (e_anuar, 'soldering', 3),
      (e_anuar, 'installation', 4)
    on conflict (employee_id, stage_key) do nothing;
  end if;

  if e_sasha is not null then
    insert into employee_competencies (employee_id, stage_key, rank) values
      (e_sasha, 'milling', 1), (e_sasha, 'letter_print', 2)
    on conflict (employee_id, stage_key) do nothing;
  end if;

  if e_zhalgas is not null then
    insert into employee_competencies (employee_id, stage_key, rank) values
      (e_zhalgas, 'design', 1), (e_zhalgas, 'helper', 2), (e_zhalgas, 'manager', 3)
    on conflict (employee_id, stage_key) do nothing;
  end if;
end $$;

alter table employee_competencies enable row level security;
create policy "employees read competencies" on employee_competencies for select to authenticated using (true);
create policy "admin manage competencies" on employee_competencies for all to authenticated
  using (is_admin_user()) with check (is_admin_user());

-- ============================================================
-- ЧАСТЬ B. Поля заявки для диспетчера
-- ============================================================

alter table requests add column if not exists urgent boolean not null default false;
alter table requests add column if not exists production_day date;
alter table requests add column if not exists fulfillment_mode text not null default 'installation'
  check (fulfillment_mode in ('installation', 'shipping'));

create index if not exists requests_production_day_idx on requests (production_day);

-- recommended_install_date и manual_override уже существуют (002) —
-- диспетчер переиспользует их: recommended_install_date = дата, которую
-- предложил алгоритм, install_date = то, что видит клиент/монтажный
-- календарь (совпадает с рекомендованной, если manual_override = false).

-- ============================================================
-- ЧАСТЬ C. order_operations — поддержка заявки как единицы работы
-- ============================================================

alter table order_operations alter column order_item_id drop not null;
alter table order_operations add column if not exists request_id uuid references requests(id) on delete cascade;

create index if not exists order_operations_request_idx on order_operations (request_id);

alter table order_operations drop constraint if exists order_operations_owner_check;
alter table order_operations add constraint order_operations_owner_check
  check ((order_item_id is not null) <> (request_id is not null));

-- Разблокировка зависимых операций — теперь по владельцу (order_item ИЛИ
-- request), поведение старого пути (order_item_id) не меняется.
create or replace function unlock_dependent_operations() returns trigger as $$
declare
  op record;
  all_done boolean;
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    for op in
      select * from order_operations
      where status = 'locked'
        and new.key = any(depends_on_keys)
        and (
          (new.order_item_id is not null and order_item_id = new.order_item_id)
          or (new.request_id is not null and request_id = new.request_id)
        )
    loop
      select bool_and(dep_op.status = 'done') into all_done
      from unnest(op.depends_on_keys) as dep_key
      join order_operations dep_op
        on dep_op.key = dep_key
        and (
          (op.order_item_id is not null and dep_op.order_item_id = op.order_item_id)
          or (op.request_id is not null and dep_op.request_id = op.request_id)
        );

      if coalesce(all_done, true) then
        update order_operations set status = 'available' where id = op.id;
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

-- Пересчёт часов изготовления — актуален только для позиций (order_item_id),
-- операции на уровне заявки в этот пересчёт не входят.
create or replace function recalc_item_manufacture_hours() returns trigger as $$
declare
  item_id uuid := coalesce(new.order_item_id, old.order_item_id);
begin
  if item_id is null then
    return null;
  end if;

  update order_items
  set manufacture_hours = (
    select coalesce(sum(norm_hours), 0)
    from order_operations
    where order_item_id = item_id
      and key <> 'installation'
  )
  where id = item_id;
  return null;
end;
$$ language plpgsql;

-- Начисление зарплаты за завершённую операцию — берём request_id либо
-- напрямую (операция уровня заявки), либо через order_items (как раньше).
create or replace function accrue_payroll_on_operation_done() returns trigger as $$
declare
  req_id uuid;
begin
  if new.status = 'done' and (old.status is distinct from 'done') and new.assigned_employee_id is not null then
    if new.order_item_id is not null then
      select request_id into req_id from order_items where id = new.order_item_id;
    else
      req_id := new.request_id;
    end if;

    insert into payroll_accruals (employee_id, role_id, order_operation_id, request_id, amount)
    values (new.assigned_employee_id, new.role_id, new.id, req_id, new.cost);
  end if;
  return new;
end;
$$ language plpgsql;

-- Журнал событий (009) для order_operations искал заявку только через
-- order_items — добавляем прямую связь по request_id.
create or replace function get_request_history(req_id uuid)
returns setof event_log as $$
  select * from event_log
  where (entity_type = 'requests' and entity_id = req_id)
     or (entity_type = 'order_items' and entity_id in (select id from order_items where request_id = req_id))
     or (entity_type = 'order_operations' and entity_id in (
           select oo.id from order_operations oo
           where oo.request_id = req_id
              or oo.order_item_id in (select id from order_items where request_id = req_id)
         ))
     or (entity_type = 'payments' and entity_id in (select id from payments where request_id = req_id))
  order by created_at asc;
$$ language sql stable security definer;
