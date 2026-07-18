-- ============================================================
-- KUBIK.std ERP — Этап 2-6: публичный доступ к requests
-- и перенос старых тестовых заказов из orders (если есть)
-- ============================================================

-- 1. Публичный доступ к активным/готовым заявкам (для /production) -----
create policy "public read active requests" on requests
  for select to anon
  using (status in ('in_production', 'done'));

-- 2. Перенос старых заказов из orders в новую структуру -----------------
-- Каждый старый заказ становится заявкой + одной позицией работ
-- с типом "Индивидуальный проект" (custom), чтобы не потерять данные,
-- накопленные через прежнюю форму "Замеры".
do $$
declare
  custom_type_id uuid;
  o record;
  new_client_id uuid;
  new_request_id uuid;
  new_status text;
begin
  select id into custom_type_id from product_types where key = 'custom';

  for o in select * from orders loop
    -- клиент по телефону
    select id into new_client_id from clients where phone = o.phone;
    if new_client_id is null then
      insert into clients (phone, name) values (o.phone, o.company_name)
      returning id into new_client_id;
    end if;

    new_status := case o.status
      when 'measurement' then 'measurement'
      when 'lost' then 'lost'
      when 'production' then 'in_production'
      when 'done' then 'done'
      else 'measurement'
    end;

    insert into requests (
      client_id, status, needs_measurement, name, phone, address, comment,
      sketch_url, finished_photo_url, install_date, total_cost,
      created_at, started_production_at, finished_at
    ) values (
      new_client_id, new_status, (o.status = 'measurement'), o.company_name, o.phone, o.address, o.comment,
      o.sketch_url, o.finished_photo_url, o.install_date, coalesce(o.cost, 0),
      o.created_at, o.started_production_at, o.finished_at
    ) returning id into new_request_id;

    if o.cost is not null and o.cost > 0 and custom_type_id is not null then
      insert into order_items (request_id, product_type_id, params, item_cost, install_cost)
      values (new_request_id, custom_type_id, '{}', o.cost, 0);
    end if;
  end loop;
end $$;
