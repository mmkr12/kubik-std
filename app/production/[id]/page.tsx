import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 0;

async function getOrder(id: string): Promise<Order | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from('orders').select('*').eq('id', id).single();
    return (data as Order) ?? null;
  } catch {
    return null;
  }
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);
  if (!order) notFound();

  return (
    <main className="min-h-screen bg-navy-gradient">
      <header className="container-kubik flex items-center justify-between py-8">
        <Link href="/"><Logo dark /></Link>
      </header>

      <section className="container-kubik max-w-2xl pb-24">
        <Link href="/production" className="mb-6 flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Все заказы
        </Link>

        <div className="overflow-hidden rounded-2xl bg-white/5 card-shadow">
          <div className="relative aspect-[4/3] w-full bg-navy-800">
            {order.sketch_url ? (
              <Image src={order.sketch_url} alt={order.company_name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/30">Эскиз</div>
            )}
          </div>
          <div className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">{order.company_name}</h1>
              <Badge>В работе</Badge>
            </div>
            {order.install_date && (
              <p className="text-white/60">Плановая дата монтажа: {formatDate(order.install_date)}</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
