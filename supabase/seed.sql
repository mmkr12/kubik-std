-- Демонстрационные данные (необязательно)
insert into orders (company_name, phone, address, comment, cost, install_date, status, sketch_url)
values
  ('COSMOS CAKE', '+7 777 123 45 67', 'ул. Абая 123', 'Фасадная вывеска', 350000, current_date + interval '8 days', 'production', null),
  ('KASPI', '+7 777 234 56 78', 'ул. Толе би 45', 'Объёмные буквы над входом', 420000, current_date + interval '9 days', 'production', null),
  ('HALIF', '+7 777 345 67 89', 'пр. Абылай хана 12', 'Интерьерная вывеска', 260000, current_date + interval '10 days', 'production', null);
