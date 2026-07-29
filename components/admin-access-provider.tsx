'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isAdminPathAllowed, defaultAdminPath, type AdminAccessLevel } from '@/lib/admin-access';

const AdminAccessContext = createContext<{ level: AdminAccessLevel; loading: boolean }>({ level: 'admin', loading: true });

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}

// Определяет уровень доступа один раз при заходе в /admin и не пускает
// на страницы, не входящие в уровень (менеджер/монтажник) — редиректит на
// первую доступную. При ошибке запроса — считаем самым строгим уровнем
// (floor), чтобы никогда не выдать лишний доступ по сбою сети.
export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevel] = useState<AdminAccessLevel>('admin');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    Promise.all([supabase.rpc('is_admin_user'), supabase.rpc('employee_access_level')])
      .then(([adminRes, accessRes]) => {
        if (adminRes.error || accessRes.error) {
          setLevel('floor');
        } else if (adminRes.data === true) {
          setLevel('admin');
        } else {
          setLevel(accessRes.data === 'full' ? 'full' : 'floor');
        }
      })
      .catch(() => setLevel('floor'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAdminPathAllowed(level, pathname)) {
      router.replace(defaultAdminPath(level));
    }
  }, [loading, level, pathname, router]);

  if (loading) return <p className="p-8 text-muted-foreground">Загрузка…</p>;
  if (!isAdminPathAllowed(level, pathname)) return null;

  return <AdminAccessContext.Provider value={{ level, loading }}>{children}</AdminAccessContext.Provider>;
}
