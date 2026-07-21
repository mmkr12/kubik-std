-- ============================================================
-- KUBIK.std — база материалов: цена по умолчанию + нормативы
-- расхода по типу изделия, чтобы калькулятор сам считал себестоимость
-- ============================================================

alter table materials add column if not exists default_price numeric not null default 0;

-- Сколько единиц материала уходит на 1 м² (для изделий по площади)
-- или на 1 шт (для штучных изделий) конкретного типа изделия.
create table if not exists product_type_materials (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references product_types(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  quantity_per_unit numeric not null default 0,
  unique (product_type_id, material_id)
);

alter table product_type_materials enable row level security;

create policy "public read product type materials" on product_type_materials
  for select to anon, authenticated using (true);
create policy "admin manage product type materials" on product_type_materials
  for all to authenticated using (is_admin_user()) with check (is_admin_user());
