import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/logo';
import { TYPE_THUMBS } from '@/components/calculators/light-letters-preview';
import { PrepaySection } from '@/components/kp/prepay-section';
import { calculate, LETTER_TYPE_LABELS, type CalculatorInput } from '@/lib/light-letters-pricing';
import { formatTenge, formatDate } from '@/lib/utils';
import { ShieldCheck, BadgeCheck, Factory, Ruler, Palette, Lightbulb, Wrench, Truck } from 'lucide-react';

export const metadata = { title: 'Коммерческое предложение — Kubik.std' };

function decodeInput(raw: string | undefined): CalculatorInput | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalculatorInput;
  } catch {
    return null;
  }
}

const INSTALL_CITY_LABELS: Record<string, string> = { taraz: 'Тараз', shymkent: 'Шымкент', almaty: 'Алматы' };
const DELIVERY_LABELS: Record<string, string> = { pickup: 'Самовывоз', taraz: 'Тараз', shymkent: 'Шымкент', almaty: 'Алматы', cdek: 'СДЭК' };
const COMPLEXITY_LABELS: Record<string, string> = { light: 'Лёгкий', medium: 'Средний', medium_large: 'Средний (габарит)', hard: 'Сложный' };

export default function KPPage({ searchParams }: { searchParams: { d?: string } }) {
  const input = decodeInput(searchParams.d);
  if (!input) notFound();

  const result = calculate(input);

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 10);
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + 12);

  const priceLines = [
    { label: 'Материал', amount: result.material },
    { label: 'Изготовление', amount: result.production },
    { label: input.installMode === 'delivery' ? 'Доставка' : 'Монтаж/Доставка', amount: result.installDelivery },
    ...(result.urgentSurcharge > 0 ? [{ label: 'Доплата за срочность', amount: result.urgentSurcharge }] : []),
  ];

  const fulfilmentLabel =
    input.installMode === 'install'
      ? `Монтаж — ${INSTALL_CITY_LABELS[input.installCity]}${input.installCity === 'taraz' ? ` (${COMPLEXITY_LABELS[input.complexity]})` : ''}`
      : input.installMode === 'delivery'
      ? `Доставка — ${DELIVERY_LABELS[input.deliveryOption]}`
      : 'Самовывоз, без монтажа/доставки';

  return (
    <main className="min-h-screen bg-mist-gradient">
      {/* HERO */}
      <header className="bg-navy-gradient">
        <div className="container-kubik flex items-center justify-between py-6">
          <Link href="/"><Logo dark /></Link>
          <span className="hidden text-sm text-white/50 sm:block">kubikstd.kz</span>
        </div>
        <div className="container-kubik pb-12 pt-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Коммерческое предложение</p>
          <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
            {input.mainText || 'Ваша вывеска'}
          </h1>
          {input.additionalText && <p className="mt-1 text-lg text-white/70">{input.additionalText}</p>}
          <p className="mt-4 text-sm text-white/50">Световые буквы на каркасе · Kubik.std</p>
        </div>
      </header>

      <div className="container-kubik -mt-8 max-w-4xl space-y-8 pb-20">
        {/* ТИП СВЕЧЕНИЯ + ДОВЕРИЕ */}
        <div className="grid grid-cols-1 gap-4 overflow-hidden rounded-2xl card-shadow sm:grid-cols-2">
          <div className="relative aspect-square sm:aspect-auto sm:min-h-[280px]">
            <Image src={TYPE_THUMBS[input.letterType]} alt={LETTER_TYPE_LABELS[input.letterType]} fill className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-4">
              <p className="text-sm font-semibold text-white">{LETTER_TYPE_LABELS[input.letterType]}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 bg-white p-6">
            {[
              { icon: BadgeCheck, title: 'Прозрачные цены', text: 'Без скрытых платежей' },
              { icon: Factory, title: 'Собственное производство', text: 'Полный контроль качества' },
              { icon: ShieldCheck, title: 'Гарантия 24 месяца', text: 'На все виды работ' },
            ].map((b) => (
              <div key={b.title} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                <b.icon className="h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ПАРАМЕТРЫ */}
        <div className="rounded-2xl border border-border bg-white p-6 card-shadow md:p-8">
          <h2 className="mb-5 text-lg font-semibold text-navy-900">Параметры вывески</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Spec icon={Ruler} label="Габариты" value={`${result.gabarits.heightMm} × ${result.gabarits.widthMm} × ${result.gabarits.depthMm} мм`} />
            <Spec icon={Palette} label="Тип свечения" value={LETTER_TYPE_LABELS[input.letterType] + (input.goldSilver ? ' · золото/серебро' : '')} />
            <Spec icon={Lightbulb} label="Подсветка" value={`${input.ledType === 'modules' ? 'Модули' : 'Лента'}, БП ${input.psuType === 'ip67' ? 'IP67 (закрытый)' : input.psuType === 'ip43' ? 'IP43 (открытый)' : 'без блока'}`} />
            <Spec icon={Wrench} label="Каркас" value={input.frameType === 'none' ? 'Без каркаса' : `Металл ${input.frameType}`} />
            <Spec icon={Truck} label="Монтаж / доставка" value={fulfilmentLabel} />
            <Spec icon={Ruler} label="Площадь" value={`${result.gabarits.volumeM3} м³`} />
          </div>
        </div>

        {/* СМЕТА */}
        <div className="rounded-2xl border border-border bg-white p-6 card-shadow md:p-8">
          <h2 className="mb-5 text-lg font-semibold text-navy-900">Стоимость</h2>
          <div className="space-y-2">
            {priceLines.map((l) => (
              <div key={l.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="text-navy-800">{formatTenge(l.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-lg font-semibold text-navy-900">Итого</span>
            <span className="text-3xl font-bold text-blue-600">{formatTenge(result.total)}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p>Ориентировочная дата готовности: {formatDate(estimatedDate.toISOString())}</p>
            <p>Предложение действительно до {validUntil.toLocaleString('ru-RU')}</p>
          </div>
        </div>

        {/* ПРЕДОПЛАТА */}
        <PrepaySection total={result.total} />

        {/* КОНТАКТЫ */}
        <div className="rounded-2xl border border-border bg-white p-6 text-center card-shadow">
          <p className="text-sm text-muted-foreground">Остались вопросы по предложению?</p>
          <a href="https://wa.me/77077750011" target="_blank" className="mt-2 inline-block text-lg font-semibold text-blue-600 hover:underline">
            +7 707 775 00 11 · WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-mist-50 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-navy-900">{value}</p>
      </div>
    </div>
  );
}
