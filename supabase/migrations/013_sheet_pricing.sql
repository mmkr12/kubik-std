-- ============================================================
-- KUBIK.std — раскладка по листам для листовых материалов
-- (алюкобонд, акрил) вместо чистой цены за м²
-- ============================================================

alter table product_types add column if not exists sheet_width_m numeric;
alter table product_types add column if not exists sheet_height_m numeric;
-- sheet_tiers: [{ "label": "Целый лист", "fraction": 1, "price": 15000 }, ...]
-- fraction — доля площади листа. Раскладка считается по площади (упрощённо,
-- без учёта ориентации реза) — этого достаточно для оценки стоимости на
-- этапе расчёта, финальный раскрой готовит дизайнер отдельно.
alter table product_types add column if not exists sheet_tiers jsonb not null default '[]';

update product_types
set
  sheet_width_m = 1.22,
  sheet_height_m = 2.44,
  sheet_tiers = '[
    {"label": "Целый лист", "fraction": 1, "price": 15000},
    {"label": "Пол-листа", "fraction": 0.5, "price": 8000},
    {"label": "Треть листа", "fraction": 0.3333, "price": 6000}
  ]'
where key in ('alucobond_inlay', 'alucobond_letters', 'lightbox', 'light_letters', 'light_sign_backing');
