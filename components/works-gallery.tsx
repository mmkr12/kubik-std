'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface WorkItem {
  id: string;
  name: string;
  photoUrl: string | null;
  typeKey: string | null;
  typeName: string | null;
}

export function WorksGallery({ works }: { works: WorkItem[] }) {
  const [filter, setFilter] = useState<string>('all');

  const types = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of works) {
      if (w.typeKey && w.typeName) map.set(w.typeKey, w.typeName);
    }
    return [...map.entries()];
  }, [works]);

  const filtered = filter === 'all' ? works : works.filter((w) => w.typeKey === filter);

  if (works.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/50">
        Пока нет завершённых работ для показа
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            filter === 'all' ? 'bg-blue-gradient text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
          )}
        >
          Все работы
        </button>
        {types.map(([key, name]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              filter === key ? 'bg-blue-gradient text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((w) => (
          <div key={w.id} className="overflow-hidden rounded-2xl bg-navy-900 card-shadow">
            <div className="relative aspect-square overflow-hidden">
              {w.photoUrl && <Image src={w.photoUrl} alt={w.name} fill className="object-cover" />}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white">{w.name}</h3>
              {w.typeName && <p className="text-xs text-white/50">{w.typeName}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
