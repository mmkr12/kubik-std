'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Ruler, Factory, History, Settings, LogOut, Users } from 'lucide-react';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/zamery', label: 'Замеры', icon: Ruler },
  { href: '/admin/production', label: 'Производство', icon: Factory },
  { href: '/admin/clients', label: 'Клиенты', icon: Users },
  { href: '/admin/history', label: 'История', icon: History },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col justify-between border-r border-border bg-white px-4 py-6">
      <div>
        <Link href="/" className="mb-8 block px-2">
          <Logo />
        </Link>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-blue-gradient text-white' : 'text-navy-700 hover:bg-mist-100'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-mist-100"
      >
        <LogOut className="h-4 w-4" /> Выйти
      </button>
    </aside>
  );
}
