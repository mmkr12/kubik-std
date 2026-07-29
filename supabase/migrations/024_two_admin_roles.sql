-- ============================================================
-- KUBIK.std — ровно 2 роли в админке: Менеджер и Монтажник
-- Выполнить в Supabase SQL Editor ПОСЛЕ 023
-- ============================================================
-- Менеджер (access_level='full'): Заявки, Замеры, Производство, Диспетчер,
--   Клиенты, История.
-- Монтажник (access_level='floor'): только Производство — подробности
--   заказа, загрузка фото, кнопка «Готово».
-- Владелец (is_admin=true, либо логин без строки в employees — старый
--   менеджерский аккаунт) по-прежнему видит и может всё, без ограничений.
--
-- Старые 6 ролей (Монтажник/Дизайнер/Менеджер/Изготовление/Печать
-- букв/Фрезеровщик) использовались для зарплаты по схеме, которую мы уже
-- заменили ставками по этапам (023) — заменяем их этими двумя.

-- ============================================================
-- ЧАСТЬ A. Консолидация ролей
-- ============================================================

delete from employee_roles;
update payroll_accruals set role_id = null where role_id is not null;
update order_operations set role_id = null where role_id is not null;
delete from roles;

insert into roles (key, name, payroll_method, payroll_rate, access_level) values
  ('manager', 'Менеджер', 'fixed', 0, 'full'),
  ('installer', 'Монтажник', 'fixed', 0, 'floor');

-- ============================================================
-- ЧАСТЬ B. Монтажнику нужно уметь закрыть заказ (кнопка «Готово» на
-- /admin/production) — раньше UPDATE requests для floor не был разрешён
-- вообще, кнопка бы тихо ничего не сохраняла.
-- ============================================================

create policy "floor mark request done" on requests for update to authenticated
  using (employee_access_level() = 'floor' and status = 'in_production')
  with check (employee_access_level() = 'floor' and status = 'done');

-- ============================================================
-- ЧАСТЬ C. Менеджеру нужно уметь пользоваться Диспетчером — создание
-- цепочки операций и назначение сотрудников. Раньше insert/delete на
-- order_operations был только для admin, а update — только для admin
-- или самого исполнителя (не годится для назначения ДРУГОГО сотрудника).
-- ============================================================

drop policy if exists "admin insert/delete operations" on order_operations;
create policy "full insert operations" on order_operations for insert to authenticated
  with check (is_admin_user() or employee_access_level() = 'full');

drop policy if exists "admin delete operations" on order_operations;
create policy "full delete operations" on order_operations for delete to authenticated
  using (is_admin_user() or employee_access_level() = 'full');

drop policy if exists "employee update own operation status" on order_operations;
create policy "employee or full update operations" on order_operations for update to authenticated
  using (is_admin_user() or employee_access_level() = 'full' or assigned_employee_id = current_employee_id())
  with check (is_admin_user() or employee_access_level() = 'full' or assigned_employee_id = current_employee_id());

-- ============================================================
-- ЧАСТЬ D. Финансы — раньше "full" (по старой схеме это designer/manager)
-- тоже мог читать fund_transactions. Теперь это должно быть видно только
-- владельцу (is_admin), менеджер этот раздел не видит вообще.
-- ============================================================

drop policy if exists "full read fund transactions" on fund_transactions;
create policy "admin read fund transactions" on fund_transactions for select to authenticated
  using (is_admin_user());
