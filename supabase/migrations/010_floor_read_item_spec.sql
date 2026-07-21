-- Сотрудник уровня "floor" должен видеть техническую карточку изделия
-- (order_items.tech_spec и т.д.), но только для позиций, где у него
-- есть назначенная операция — иначе "Производство" в личном кабинете
-- не сможет показать нужные детали.
create policy "floor read own item specs" on order_items for select to authenticated
  using (
    employee_access_level() = 'floor'
    and exists (
      select 1 from order_operations oo
      where oo.order_item_id = order_items.id
        and oo.assigned_employee_id = current_employee_id()
    )
  );
