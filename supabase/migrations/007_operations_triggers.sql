-- ============================================================
-- KUBIK.std — авторазблокировка операций по цепочке зависимостей
-- и пересчёт order_items.manufacture_hours для планировщика
-- ============================================================

-- Когда операция переходит в 'done', проверяем все операции того же
-- order_item, которые её ждали (у которых её key есть в depends_on_keys),
-- и если все их зависимости теперь выполнены — переводим их в 'available'.
create or replace function unlock_dependent_operations() returns trigger as $$
declare
  op record;
  all_done boolean;
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    for op in
      select * from order_operations
      where order_item_id = new.order_item_id
        and status = 'locked'
        and new.key = any(depends_on_keys)
    loop
      select bool_and(dep_op.status = 'done') into all_done
      from unnest(op.depends_on_keys) as dep_key
      join order_operations dep_op
        on dep_op.order_item_id = op.order_item_id and dep_op.key = dep_key;

      if coalesce(all_done, true) then
        update order_operations set status = 'available' where id = op.id;
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists order_operations_unlock on order_operations;
create trigger order_operations_unlock
after update on order_operations
for each row execute function unlock_dependent_operations();

-- Часы изготовления для планировщика = сумма нормо-часов всех операций
-- позиции, КРОМЕ монтажа (монтаж — отдельный день, не время в цеху).
create or replace function recalc_item_manufacture_hours() returns trigger as $$
begin
  update order_items
  set manufacture_hours = (
    select coalesce(sum(norm_hours), 0)
    from order_operations
    where order_item_id = coalesce(new.order_item_id, old.order_item_id)
      and key <> 'installation'
  )
  where id = coalesce(new.order_item_id, old.order_item_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists order_operations_recalc_hours on order_operations;
create trigger order_operations_recalc_hours
after insert or update or delete on order_operations
for each row execute function recalc_item_manufacture_hours();
