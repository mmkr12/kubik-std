-- ============================================================
-- KUBIK.std — публичная форма «Сделать замеры» на лендинге
-- Разрешаем анонимным посетителям создавать заявку-замер,
-- без права читать/менять что-либо ещё.
-- ============================================================

create policy "public insert lead client" on clients
  for insert to anon
  with check (true);

create policy "public insert measurement request" on requests
  for insert to anon
  with check (status = 'measurement' and needs_measurement = true);
