import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/logo';
import { OrderCard } from '@/components/order-card';
import { Instagram, Globe } from 'lucide-react';
import type { Order } from '@/lib/types';
import Link from 'next/link';

export const revalidate = 0;

async function getActiveOrders(): Promise<Order[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'production')
      .order('install_date', { ascending: true });
    return (data as Order[]) ?? [];
  } catch {
    return [];
  }
}

export default async function ProductionPage() {
  const orders = await getActiveOrders();

  return (
    <main className="min-h-screen bg-navy-gradient">
      <header className="container-kubik flex items-center justify-between py-8">
        <Link href="/"><Logo dark /></Link>
      </header>

      <section className="container-kubik pb-10">
        <h1 className="text-3xl font-bold text-white md:text-4xl">Производство онлайн</h1>
        <p className="mt-2 text-white/50">Следите за изготовлением вашего заказа в реальном времени</p>
      </section>

      <section className="container-kubik pb-24">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/50">
            Сейчас нет заказов в производстве
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <footer className="container-kubik flex items-center justify-between border-t border-white/10 py-8 text-xs text-white/40">
        <span>© {new Date().getFullYear()} KUBIK.STD</span>
        <div className="flex gap-4">
          <a href="https://instagram.com/kubik.std" className="flex items-center gap-1 hover:text-white/70">
            <Instagram className="h-3.5 w-3.5" /> kubik.std
          </a>
          <a href="https://kubikstd.kz" className="flex items-center gap-1 hover:text-white/70">
            <Globe className="h-3.5 w-3.5" /> kubikstd.kz
          </a>
        </div>
      </footer>
    </main>
  );
}
