'use client';

import Image from 'next/image';

const PHOTOS = [
  '/gallery/shop-01.jpg',
  '/gallery/shop-02.jpg',
  '/gallery/shop-03.jpg',
  '/gallery/shop-04.jpg',
  '/gallery/shop-05.jpg',
];

export function HeroCarousel() {
  const loop = [...PHOTOS, ...PHOTOS];

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy-900 card-shadow">
      <div className="hero-scroll flex h-full w-max">
        {loop.map((src, i) => (
          <div key={i} className="relative h-full w-[420px] shrink-0">
            <Image src={src} alt="Производство Kubik.std" fill className="object-cover" priority={i < 2} sizes="420px" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/40 via-transparent to-transparent" />
      <style>{`
        .hero-scroll {
          animation: hero-scroll-x 28s linear infinite;
        }
        @keyframes hero-scroll-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
