-- ============================================================
-- KUBIK.std — фикс: fund_transactions не давал себя писать
-- Выполнить в Supabase SQL Editor ПОСЛЕ 019
-- ============================================================
-- Миграция 009 включила RLS на fund_transactions и завела только
-- политику на чтение ("full read fund transactions"). Функция
-- distribute_funds_on_payment() (тоже из 009), которая пишет в эту
-- таблицу триггером при каждой оплате, не security definer — то есть
-- выполняется от имени текущего пользователя и упирается в RLS.
-- Результат: любой платёж падает с "new row violates row-level security
-- policy for table fund_transactions", хотя сам платёж (payments) уже
-- успел вставиться.

create policy "full insert fund transactions" on fund_transactions for insert to authenticated
  with check (is_admin_user() or employee_access_level() = 'full');
