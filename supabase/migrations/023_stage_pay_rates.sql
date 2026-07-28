-- ============================================================
-- KUBIK.std — зарплата: фиксированная сумма за завершённый этап
-- Выполнить в Supabase SQL Editor ПОСЛЕ 022
-- ============================================================
-- До этой миграции начисление зарплаты было нерабочим по двум причинам:
-- 1) order_operations.cost (источник суммы начисления) никогда не
--    заполнялся диспетчером — всегда 0.
-- 2) accrue_payroll_on_operation_done() и unlock_dependent_operations()
--    не были security definer, поэтому когда сотрудник САМ отмечал свою
--    операцию «готово» (разрешено RLS-политикой order_operations), сама
--    вставка в payroll_accruals падала с ошибкой доступа (та же причина,
--    что чинили в 020 для fund_transactions).
--
-- Модель оплаты: фиксированная сумма за каждый этап (design, letter_print,
-- milling, welding, painting, soldering, assembly, installation, shipping) —
-- не зависит от того, кто из сотрудников его выполнил. Суммы редактируются
-- в /admin/roles.

create table if not exists stage_pay_rates (
  stage_key text primary key,
  amount numeric not null default 0
);

insert into stage_pay_rates (stage_key) values
  ('design'), ('letter_print'), ('milling'), ('welding'), ('painting'),
  ('soldering'), ('assembly'), ('installation'), ('shipping')
on conflict (stage_key) do nothing;

alter table stage_pay_rates enable row level security;
create policy "employees read stage pay rates" on stage_pay_rates for select to authenticated using (true);
create policy "admin manage stage pay rates" on stage_pay_rates for all to authenticated
  using (is_admin_user()) with check (is_admin_user());

-- Начисление — теперь security definer (как is_admin_user/current_employee_id/
-- log_event в этом же проекте) и берёт сумму из stage_pay_rates по ключу
-- этапа, а не из order_operations.cost.
create or replace function accrue_payroll_on_operation_done() returns trigger as $$
declare
  req_id uuid;
  rate numeric;
begin
  if new.status = 'done' and (old.status is distinct from 'done') and new.assigned_employee_id is not null then
    if new.order_item_id is not null then
      select request_id into req_id from order_items where id = new.order_item_id;
    else
      req_id := new.request_id;
    end if;

    select amount into rate from stage_pay_rates where stage_key = new.key;

    insert into payroll_accruals (employee_id, role_id, order_operation_id, request_id, amount)
    values (new.assigned_employee_id, new.role_id, new.id, req_id, coalesce(rate, 0));
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Разблокировка зависимых операций — тоже security definer: сотрудник,
-- завершивший свою операцию, должен иметь возможность перевести в
-- 'available' ЧУЖУЮ зависимую операцию, а RLS обычно разрешает ему
-- обновлять только свои.
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
$$ language plpgsql security definer;
