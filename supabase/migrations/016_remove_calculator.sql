-- ============================================================
-- KUBIK.std — полное удаление калькулятора (данные и структура)
-- Все данные тестовые, реальных заказов нет — можно удалять.
-- ============================================================

-- 1. Сначала чистим зависимые строки (порядок важен из-за внешних ключей)
delete from payroll_accruals where order_operation_id is not null;
delete from order_operations;
delete from order_items;
delete from request_materials;

-- Возвращаем суммы заявок в 0 (позиции удалены) — на случай, если
-- триггер почему-то не сработает синхронно.
update requests set total_cost = 0, paid_amount = 0, fully_paid = false;

-- 2. Убираем "мусорные" каталожные материалы, заведённые под калькулятор
delete from materials where name in (
  'Композит (расход по сетке)', 'ПВХ (расход по сетке)',
  'Светодиодные модули', 'Светодиодная лента',
  'Блок питания IP54', 'Блок питания IP67',
  'Металлопрофиль 20х20', 'Металлопрофиль 40х20'
);

-- 3. Удаляем таблицы, специфичные для калькулятора (CASCADE снимает
-- внешние ключи с order_items.product_type_id и т.д.)
drop table if exists product_type_materials cascade;
drop table if exists product_type_fields cascade;
drop table if exists operation_templates cascade;
drop table if exists sheet_material_prices cascade;
drop table if exists fonts cascade;
drop table if exists product_types cascade;
drop table if exists product_categories cascade;

-- 4. Убираем настройки калькулятора из production_settings
alter table production_settings drop column if exists light_signage_pricing;

-- Готово: order_items.product_type_id остался как обычная колонка uuid
-- без внешнего ключа — при новой структуре калькулятора его можно будет
-- снова связать нужной таблицей, либо переопределить с нуля.
