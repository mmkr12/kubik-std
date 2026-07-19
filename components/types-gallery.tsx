'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Layout, Tag, PanelTop, Type, LayoutGrid, Frame, Lightbulb, Square, Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const TYPES = [
  { key: 'banner', name: 'Баннер', icon: Layout },
  { key: 'table_sign', name: 'Табличка', icon: Tag },
  { key: 'stand', name: 'Стенд', icon: PanelTop },
  { key: 'light_letters', name: 'Объёмные буквы на каркасе', icon: Type },
  { key: 'alucobond_inlay', name: 'Алюкобонд с фрезеровкой и инкрустацией', icon: LayoutGrid },
  { key: 'alucobond_letters', name: 'Алюкобонд с объёмными буквами', icon: Frame },
  { key: 'light_sign_backing', name: 'Световая вывеска с подложкой', icon: Lightbulb },
  { key: 'lightbox', name: 'Световой короб (лайтбокс)', icon: Square },
  { key: 'custom', name: 'Индивидуальный проект', icon: Sparkles },
];

// Примеры — реальные фото нашего цеха. Как появятся отдельные фото под
// каждый тип изделия, точечно заменить массив photos у нужного пункта.
const EXAMPLE_PHOTOS = ['/gallery/shop-05.jpg', '/gallery/shop-01.jpg', '/gallery/shop-04.jpg'];

export function TypesGallery() {
  const [active, setActive] = useState<(typeof TYPES)[number] | null>(null);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t)}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-5 text-center card-shadow transition-transform hover:-translate-y-0.5 hover:border-blue-300"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10">
              <t.icon className="h-6 w-6 text-blue-600" />
            </span>
            <span className="text-sm font-medium text-navy-900">{t.name}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-xl">
          {active && (
            <>
              <DialogTitle>{active.name}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Примеры наших живых работ (фото будут дополняться)</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {EXAMPLE_PHOTOS.map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-navy-800">
                    <Image src={src} alt={active.name} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
