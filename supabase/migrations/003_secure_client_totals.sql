-- Закрываем client_totals от анонимного доступа — там финансовые данные.
alter view client_totals set (security_invoker = true);

revoke all on client_totals from anon;
grant select on client_totals to authenticated;
