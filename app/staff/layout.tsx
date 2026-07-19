'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-mist-gradient">
      <header className="border-b border-border bg-white">
        <div className="container-kubik flex h-16 items-center justify-between">
          <Link href="/staff"><Logo /></Link>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-navy-900">
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      </header>
      <main className="container-kubik py-8">{children}</main>
    </div>
  );
}
