-- ============================================================
-- KUBIK.std — категории продукции (Световые вывески / Наружная
-- реклама / Полиграфия) над существующими типами изделий
-- ============================================================

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true
);

insert into product_categories (key, name, description, sort_order) values
  ('light_signage', 'Световые вывески', 'Основное направление компании', 1),
  ('outdoor_ads', 'Наружная реклама', 'Продукция вне категории световых вывесок', 2),
  ('printing', 'Полиграфия', 'Полиграфическая продукция', 3)
on conflict (key) do nothing;

alter table product_types add column if not exists category_id uuid references product_categories(id);

-- Распределяем уже существующие типы по категориям и уточняем названия
-- согласно новой структуре (сами нормативы/цены не трогаем).
do $$
declare
  cat_light uuid; cat_outdoor uuid;
begin
  select id into cat_light from product_categories where key = 'light_signage';
  select id into cat_outdoor from product_categories where key = 'outdoor_ads';

  update product_types set category_id = cat_light, name = 'Световой короб из алюкобонда с инкрустацией' where key = 'alucobond_inlay';
  update product_types set category_id = cat_light, name = 'Световой короб из акрила' where key = 'lightbox';
  update product_types set category_id = cat_light, name = 'Световые буквы на каркасе' where key = 'light_letters';
  update product_types set category_id = cat_light, name = 'Световые буквы на подложке' where key = 'light_sign_backing';
  update product_types set category_id = cat_light where key = 'custom';
  -- "Алюкобонд с объёмными буквами" явно не входит в новый список для
  -- этапа 1, но и не относится к "Наружной рекламе" — временно оставляем
  -- в "Световых вывесках", чтобы не терять уже накопленные данные.
  update product_types set category_id = cat_light where key = 'alucobond_letters';

  update product_types set category_id = cat_outdoor where key in ('banner', 'table_sign', 'stand');
end $$;

-- Новые изделия категории "Наружная реклама" — пока без своего
-- калькулятора (нормативы/цены заполнит администратор позже).
insert into product_types (key, name, unit, install_mode, schedule_days, norms, needs_review, category_id, sort_order)
select v.key, v.name, 'pcs', 'manual', '{mon,tue,wed,thu,fri,sat}', '[]', true,
       (select id from product_categories where key = 'outdoor_ads'), v.sort_order
from (values
  ('paintings', 'Картины', 10),
  ('window_tinting', 'Закатка окон', 11),
  ('car_branding', 'Брендирование автомобиля', 12)
) as v(key, name, sort_order)
where not exists (select 1 from product_types where key = v.key);

-- RLS: категории читают все (нужно калькулятору на сайте), правит админ.
alter table product_categories enable row level security;
create policy "public read product categories" on product_categories
  for select to anon, authenticated using (true);
create policy "admin manage product categories" on product_categories
  for all to authenticated using (is_admin_user()) with check (is_admin_user());
