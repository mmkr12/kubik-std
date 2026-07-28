-- ============================================================
-- KUBIK.std — очистка тестовых данных заявок/производства
-- Выполнить в Supabase SQL Editor ПОСЛЕ 018
-- ============================================================
-- Удаляет все заявки, клиентов и всё, что от них зависит, чтобы начать
-- вносить реальные заявки с чистого листа. Не трогает справочники
-- (сотрудники, роли, компетенции, материалы, настройки) и историю выплат
-- зарплаты (payroll_payouts) — только начисления, привязанные к тестовым
-- операциям.
--
-- Порядок важен: payroll_accruals и fund_transactions ссылаются на
-- requests/order_operations/payments БЕЗ on delete cascade, поэтому
-- удаляем их первыми, иначе удаление заявок упадёт с ошибкой внешнего
-- ключа. order_items, order_operations, payments, request_materials,
-- client_comments удалятся автоматически каскадом.

delete from payroll_accruals;
delete from fund_transactions;
delete from requests;
delete from clients;
