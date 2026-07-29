// Доступ к разделам /admin по уровню сотрудника. Источник истины для
// уровня — те же SQL-функции, что уже используются в RLS-политиках
// (is_admin_user, employee_access_level из supabase/migrations/006, 009),
// вызываются через supabase.rpc(...) — чтобы правило "кто что видит" не
// дублировалось отдельно на фронте и в базе.

export type AdminAccessLevel = 'admin' | 'full' | 'floor';

// full = Менеджер: Заявки, Замеры, Производство, Диспетчер, Клиенты, История.
const FULL_PATHS = ['/admin/requests', '/admin/zamery', '/admin/production', '/admin/dispatcher', '/admin/clients', '/admin/history'];
// floor = Монтажник: только Производство.
const FLOOR_PATHS = ['/admin/production'];

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function isAdminPathAllowed(level: AdminAccessLevel, pathname: string): boolean {
  if (level === 'admin') return true;
  if (level === 'full') return matchesAny(pathname, FULL_PATHS);
  return matchesAny(pathname, FLOOR_PATHS);
}

export function defaultAdminPath(level: AdminAccessLevel): string {
  return level === 'floor' ? '/admin/production' : '/admin/requests';
}
