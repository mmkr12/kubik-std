-- ============================================================
-- KUBIK.std — публичный доступ к order_items для готовых/активных
-- заявок (нужно для бейджей типа изделия в галерее "Наши работы")
-- ============================================================

create policy "public read items of visible requests" on order_items
  for select to anon
  using (
    exists (
      select 1 from requests r
      where r.id = order_items.request_id
        and r.status in ('done', 'in_production')
    )
  );
