-- ============================================================
-- KUBIK.std — специализированные калькуляторы для световых
-- вывесок: буквы на подложке, световые буквы, лайтбокс
-- ============================================================

-- 1. Сетка себестоимости листового материала (композит/ПВХ) --------------
-- base_cost — уходит в фонд закупа материала (себестоимость).
-- markup_multiplier — наценка для клиентской цены, редактируется админом.
create table if not exists sheet_material_prices (
  id uuid primary key default gen_random_uuid(),
  material_key text not null check (material_key in ('composite', 'pvc')),
  fraction numeric not null, -- доля площади листа 120х240см (28800 см²)
  label text not null,
  width_cm numeric not null,
  height_cm numeric not null,
  base_cost numeric not null,
  markup_multiplier numeric not null default 1.4,
  sort_order int not null default 0
);

insert into sheet_material_prices (material_key, fraction, label, width_cm, height_cm, base_cost, sort_order) values
  ('composite', 0.25,   '1/4 листа',     120, 60,  6000,  1),
  ('composite', 0.3333, '1/3 листа',     120, 80,  8000,  2),
  ('composite', 0.5,    '1/2 листа',     120, 120, 10000, 3),
  ('composite', 1,      'Целый лист',    120, 240, 18000, 4),
  ('composite', 1.5,    'Полтора листа', 120, 360, 30000, 5),
  ('composite', 2,      '2 листа',       120, 480, 36000, 6),
  ('composite', 4,      '4 листа',       240, 480, 90000, 7),
  ('composite', 6,      '6 листов',      240, 720, 126000, 8),
  ('pvc', 0.25,   '1/4 листа',     120, 60,  3000,  1),
  ('pvc', 0.3333, '1/3 листа',     120, 80,  4000,  2),
  ('pvc', 0.5,    '1/2 листа',     120, 120, 5000,  3),
  ('pvc', 1,      'Целый лист',    120, 240, 8000,  4),
  ('pvc', 1.5,    'Полтора листа', 120, 360, 15000, 5),
  ('pvc', 2,      '2 листа',       120, 480, 16000, 6),
  ('pvc', 4,      '4 листа',       240, 480, 40000, 7),
  ('pvc', 6,      '6 листов',      240, 720, 56000, 8);

alter table sheet_material_prices enable row level security;
create policy "public read sheet material prices" on sheet_material_prices for select to anon, authenticated using (true);
create policy "admin manage sheet material prices" on sheet_material_prices for all to authenticated using (is_admin_user()) with check (is_admin_user());

-- 2. Каталог шрифтов -------------------------------------------------------
create table if not exists fonts (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  category text not null check (category in ('thin', 'bold', 'script')),
  css_family text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

insert into fonts (key, name, category, css_family, sort_order) values
  ('roboto_light', 'Roboto Light', 'thin', '''Roboto'', sans-serif', 1),
  ('pt_sans', 'PT Sans', 'thin', '''PT Sans'', sans-serif', 2),
  ('montserrat_black', 'Montserrat Black', 'bold', '''Montserrat'', sans-serif', 3),
  ('oswald', 'Oswald', 'bold', '''Oswald'', sans-serif', 4),
  ('comfortaa', 'Comfortaa', 'script', '''Comfortaa'', cursive', 5),
  ('caveat', 'Caveat', 'script', '''Caveat'', cursive', 6)
on conflict (key) do nothing;

alter table fonts enable row level security;
create policy "public read fonts" on fonts for select to anon, authenticated using (true);
create policy "admin manage fonts" on fonts for all to authenticated using (is_admin_user()) with check (is_admin_user());

-- 3. Общие настройки цен для световых вывесок ------------------------------
alter table production_settings add column if not exists light_signage_pricing jsonb not null default '{
  "backing": { "figured_shape_multiplier": 1.3 },
  "led": {
    "modules_price_per_m2": 5000, "modules_fund_pct": 50,
    "tape_price_per_m2": 10000, "tape_fund_pct": 50
  },
  "psu": { "ip54_price": 8000, "ip67_price": 16000 },
  "delivery": { "taraz": 5000, "shymkent": 15000, "almaty": 20000, "other_individual_estimate": 60000 },
  "letters": {
    "price_per_cm_base": 100,
    "fund_per_cm": 70,
    "type_multipliers": {
      "full": 1, "front": 1.2, "side": 1.25, "front_and_side": 1.5, "back": 1.65, "nonstandard": 2.5
    },
    "gold_silver_multiplier": 1.8,
    "frame": {
      "size_20x20_price_per_m": 3000,
      "size_40x20_price_per_m": 3500,
      "frame_fund_per_m": 800
    }
  },
  "lightbox": {
    "assembly_simple": 35000, "assembly_complex": 65000,
    "min_price_simple": 15000, "min_price_complex": 25000,
    "application": { "uv_print": 5000, "oracal_cut": 6500, "acrylic_cut": 16000 }
  }
}';

-- Переименование по уточнённой структуре: "буквы на каркасе" → просто
-- "Световые буквы" (каркас теперь параметр внутри калькулятора).
update product_types set name = 'Световые буквы' where key = 'light_letters';
update product_types set name = 'Буквы на подложке' where key = 'light_sign_backing';

-- 4. Материалы для авто-учёта себестоимости в заказе (для request_materials)
insert into materials (name, unit, sort_order)
select v.name, v.unit, v.sort_order from (values
  ('Композит (расход по сетке)', 'компл', 21),
  ('ПВХ (расход по сетке)', 'компл', 22),
  ('Светодиодные модули', 'компл', 23),
  ('Светодиодная лента', 'компл', 24),
  ('Блок питания IP54', 'шт', 25),
  ('Блок питания IP67', 'шт', 26),
  ('Металлопрофиль 20х20', 'компл', 27),
  ('Металлопрофиль 40х20', 'компл', 28)
) as v(name, unit, sort_order)
where not exists (select 1 from materials m where m.name = v.name);
