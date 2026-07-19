import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/logo';
import { Instagram, Globe } from 'lucide-react';
import { WorksGallery, type WorkItem } from '@/components/works-gallery';

export const revalidate = 0;

async function getAllWorks(): Promise<WorkItem[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('requests')
      .select('id, name, finished_photo_url, finished_at, order_items(product_type:product_types(key,name))')
      .eq('status', 'done')
      .not('finished_photo_url', 'is', null)
      .order('finished_at', { ascending: false });

    return ((data as any[]) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      photoUrl: r.finished_photo_url,
      typeKey: r.order_items?.[0]?.product_type?.key ?? null,
      typeName: r.order_items?.[0]?.product_type?.name ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function WorksPage() {
  const works = await getAllWorks();

  return (
    <main className="min-h-screen bg-navy-gradient">
      <header className="container-kubik flex items-center justify-between py-8">
        <Link href="/"><Logo dark /></Link>
      </header>

      <section className="container-kubik pb-10">
        <h1 className="text-3xl font-bold text-white md:text-4xl">Наши работы</h1>
        <p className="mt-2 text-white/50">Галерея завершённых проектов Kubik.std</p>
      </section>

      <section className="container-kubik pb-24">
        <WorksGallery works={works} />
      </section>

      <footer className="container-kubik flex items-center justify-between border-t border-white/10 py-8 text-xs text-white/40">
        <span>© {new Date().getFullYear()} Kubik.std</span>
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
