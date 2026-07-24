import Image from 'next/image';

const BADGES = [
  { src: '/calc/shapka/prozrachnie_ceni.png', title: 'Прозрачные цены', text: 'Понятная смета' },
  { src: '/calc/shapka/ponyatnie_sroki.png', title: 'Понятные сроки', text: 'Онлайн мониторинг' },
  { src: '/calc/shapka/monitoring.png', title: 'Мониторинг 1 год', text: 'Полная гарантия' },
];

export function TrustBadges({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 gap-2 sm:grid-cols-3'}>
      {BADGES.map((b) => (
        <div key={b.title} className={`flex items-center gap-2 rounded-xl border border-border bg-white ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'}`}>
          <Image src={b.src} alt="" width={compact ? 18 : 22} height={compact ? 18 : 22} className="shrink-0" />
          {!compact && (
            <div>
              <p className="text-xs font-semibold text-navy-900">{b.title}</p>
              <p className="text-[11px] text-muted-foreground">{b.text}</p>
            </div>
          )}
          {compact && <span className="text-xs font-medium text-navy-900">{b.title}</span>}
        </div>
      ))}
    </div>
  );
}
