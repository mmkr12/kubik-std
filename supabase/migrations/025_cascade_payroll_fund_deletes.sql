-- ============================================================
-- KUBIK.std — удаление заявки не должно падать из-за начислений/фондов
-- Выполнить в Supabase SQL Editor ПОСЛЕ 024
-- ============================================================
-- payroll_accruals.request_id и fund_transactions.request_id/payment_id
-- были без on delete cascade, в отличие от всех остальных таблиц,
-- привязанных к заявке (order_items, payments, request_materials).
-- Миграция 019 (очистка тестовых данных) уже обходила это вручную —
-- удаляла payroll_accruals/fund_transactions ДО requests, иначе падала
-- с ошибкой внешнего ключа. Теперь это работает само.

alter table payroll_accruals drop constraint if exists payroll_accruals_request_id_fkey;
alter table payroll_accruals add constraint payroll_accruals_request_id_fkey
  foreign key (request_id) references requests(id) on delete cascade;

alter table fund_transactions drop constraint if exists fund_transactions_request_id_fkey;
alter table fund_transactions add constraint fund_transactions_request_id_fkey
  foreign key (request_id) references requests(id) on delete cascade;

alter table fund_transactions drop constraint if exists fund_transactions_payment_id_fkey;
alter table fund_transactions add constraint fund_transactions_payment_id_fkey
  foreign key (payment_id) references payments(id) on delete cascade;
