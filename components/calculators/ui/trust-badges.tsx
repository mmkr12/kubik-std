import { ShieldCheck, Factory, BadgeCheck } from 'lucide-react';

const BADGES = [
  { icon: BadgeCheck, title: 'Прозрачные цены', text: 'Без скрытых платежей' },
  { icon: Factory, title: 'Собственное производство', text: 'Контроль качества' },
  { icon: ShieldCheck, title: 'Гарантия 24 месяца', text: 'На все виды работ' },
];

export function TrustBadges() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {BADGES.map((b) => (
        <div key={b.title} className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-2.5">
          <b.icon className="h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-navy-900">{b.title}</p>
            <p className="text-[11px] text-muted-foreground">{b.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
