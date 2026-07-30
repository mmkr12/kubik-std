-- ============================================================
-- KUBIK.std — цена листа композита для «Световые буквы на подложке»
-- Выполнить в Supabase SQL Editor ПОСЛЕ 025
-- ============================================================
-- Новый калькулятор «Световые буквы на подложке» переиспользует ту же
-- настраиваемую колонку production_settings.light_letters_pricing (021),
-- добавляя туда поле compositeSheetPrice — цену одного листа композита
-- 120×240 см. У существующей строки настроек этого поля ещё нет, поэтому
-- домержим его значением по умолчанию (18000 ₸), не трогая остальные
-- уже настроенные цены.

update production_settings
set light_letters_pricing = light_letters_pricing || '{"compositeSheetPrice": 18000}'::jsonb
where not (light_letters_pricing ? 'compositeSheetPrice');
