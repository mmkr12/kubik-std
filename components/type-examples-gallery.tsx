'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Example {
  id: string;
  name: string;
  photoUrl: string;
}

export function TypeExamplesGallery({ productTypeId, productTypeKey }: { productTypeId: string; productTypeKey: string }) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Используем публичный анонимный доступ напрямую — компонент
      // используется и на сайте, и в админке.
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('order_items')
        .select('request:requests!inner(id,name,finished_photo_url,status)')
        .eq('product_type_id', productTypeId)
        .eq('request.status', 'done')
        .not('request.finished_photo_url', 'is', null)
        .limit(4);
      if (!cancelled) {
        const items = ((data as any[]) ?? [])
          .map((row) => row.request)
          .filter((r) => r?.finished_photo_url)
          .map((r) => ({ id: r.id, name: r.name, photoUrl: r.finished_photo_url as string }));
        setExamples(items);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productTypeId]);

  if (loading || examples.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-white p-3">
      <p className="text-xs font-medium text-navy-700">Примеры наших работ этого типа</p>
      <div className="grid grid-cols-4 gap-2">
        {examples.map((ex) => (
          <Link key={ex.id} href={`/works?type=${productTypeKey}`} className="relative block aspect-square overflow-hidden rounded-lg bg-navy-800">
            <Image src={ex.photoUrl} alt={ex.name} fill className="object-cover transition-transform hover:scale-105" />
          </Link>
        ))}
      </div>
      <Link href={`/works?type=${productTypeKey}`} className="block text-right text-xs text-blue-600 hover:underline">
        Смотреть всю галерею →
      </Link>
    </div>
  );
}
