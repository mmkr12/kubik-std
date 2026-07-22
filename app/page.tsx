import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Logo } from '@/components/logo';
import { Calculator } from '@/components/calculator';
import { HeroCarousel } from '@/components/hero-carousel';
import { TypesGallery } from '@/components/types-gallery';
import { MeasurementRequestDialog } from '@/components/measurement-request-dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { Instagram, Factory, Printer, MousePointerClick, Truck, Zap, Phone, Send, Music2, Youtube } from 'lucide-react';

const ABOUT_ITEMS = [
  { icon: Factory, title: 'Собственное производство', text: 'Полный цикл изготовления вывесок — от эскиза до монтажа' },
  { icon: Printer, title: 'Более 10 принтеров для световых вывесок', text: 'Собственный парк оборудования — производство без задержек и очередей у сторонних подрядчиков' },
  { icon: MousePointerClick, title: 'Оформление заказа онлайн без менеджера', text: 'Рассчитайте стоимость и оформите заявку прямо на сайте', href: '#calculator' },
  { icon: Truck, title: 'Отправка по СНГ, монтаж в трёх областях', text: 'Работаем по всему Казахстану и СНГ, монтаж — Тараз, Шымкент, Алматы' },
  { icon: Zap, title: 'Срочное изготовление за доплату', text: 'Если нужна скорость — сделаем вне очереди и без сдвига графика остальных заказов' },
];

const COMPANIES = [
  {
    name: 'Kubik.std',
    tagline: 'система продвижения бизнеса',
    links: [
      { icon: Phone, label: '+7 707 775 00 11', href: 'https://wa.me/77077750011' },
      { icon: Send, label: 'Telegram', href: 'https://t.me/kubikstd' },
      { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/kubik.std' },
      { icon: Music2, label: 'TikTok', href: 'https://vt.tiktok.com/ZSXxhHndn/' },
      { icon: Youtube, label: 'YouTube', href: 'https://youtube.com/@kubikstd?si=NsxadCL1ovBQgTsH' },
    ],
  },
  {
    name: 'Sunday',
    tagline: 'производство 3D оборудования',
    links: [
      { icon: Phone, label: '+7 778 814 23 69', href: 'https://wa.me/77788142369' },
      { icon: Send, label: 'Telegram', href: 'https://t.me/sunday3d' },
      { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/sunday.st' },
    ],
  },
  {
    name: 'QADAM',
    tagline: 'рекламно-производственная компания',
    links: [
      { icon: Phone, label: '+7 747 445 12 03', href: 'https://wa.me/77474451203' },
      { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/qadam.reklam' },
    ],
  },
];

interface WorkPreview {
  id: string;
  name: string;
  finished_photo_url: string | null;
  type_name: string | null;
}

async function getRecentWorks(): Promise<WorkPreview[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('requests')
      .select('id, name, finished_photo_url, order_items(product_type:product_types(name))')
      .eq('status', 'done')
      .not('finished_photo_url', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(4);
    return ((data as any[]) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      finished_photo_url: r.finished_photo_url,
      type_name: r.order_items?.[0]?.product_type?.name ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const works = await getRecentWorks();

  return (
    <main className="bg-mist-gradient">
      <SiteHeader />

      {/* CALCULATOR — наш основной продукт, сразу вверху страницы */}
      <section className="container-kubik py-10 md:py-14">
        <h2 className="mb-1 text-2xl font-bold text-navy-900 md:text-3xl">Рассчитайте стоимость вывески</h2>
        <p className="mb-6 text-muted-foreground">Основное направление Kubik.std — световые вывески</p>
        <Calculator />
      </section>

      {/* HERO */}
      <section className="container-kubik grid grid-cols-1 items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="animate-fade-up">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-navy-900 md:text-5xl">
            Производство наружной рекламы{' '}
            <span className="bg-blue-gradient bg-clip-text text-transparent">нового поколения</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Следите за изготовлением своего заказа онлайн
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#calculator">Рассчитать стоимость</a>
            </Button>
            <MeasurementRequestDialog
              trigger={
                <Button size="lg" variant="outline">
                  Сделать замеры
                </Button>
              }
            />
          </div>
        </div>
        <HeroCarousel />
      </section>

      {/* ABOUT */}
      <section id="about" className="container-kubik py-16">
        <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">О компании</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Мы производим вывески по системе живой очереди — это значит, что каждый заказ проходит одинаково
          выверенный и отлаженный процесс, без спешки и компромиссов в качестве. Именно поэтому стандартные вывески
          у нас получаются заметно качественнее и доступнее по цене, чем у большинства конкурентов, а отправляем
          готовые изделия по всему Казахстану и странам СНГ. Если нестандартный заказ не укладывается в наш
          калькулятор — рассчитываем его индивидуально: такие проекты занимают больше времени, зато цепляют
          взгляд и выделяются на фоне типовых решений. Перед производством мы готовим реальную 3D-визуализацию,
          согласовываем каждую деталь и только после этого приступаем к изготовлению.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {ABOUT_ITEMS.map((item) => {
            const content = (
              <>
                <item.icon className="h-6 w-6 text-blue-600" />
                <h3 className="mt-4 text-sm font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </>
            );
            return item.href ? (
              <a key={item.title} href={item.href} className="rounded-2xl border border-border bg-white p-5 card-shadow transition-transform hover:-translate-y-0.5 hover:border-blue-300">
                {content}
              </a>
            ) : (
              <div key={item.title} className="rounded-2xl border border-border bg-white p-5 card-shadow">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* WORKS */}
      <section id="works" className="container-kubik py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">Наши работы</h2>
          <Link href="/works" className="text-sm font-medium text-blue-600 hover:underline">
            Смотреть все работы →
          </Link>
        </div>
        {works.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Скоро здесь появятся готовые работы.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {works.map((w) => (
              <Link key={w.id} href="/works" className="group overflow-hidden rounded-2xl bg-navy-900 card-shadow block">
                <div className="relative aspect-square overflow-hidden">
                  {w.finished_photo_url && (
                    <Image src={w.finished_photo_url} alt={w.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white">{w.name}</h3>
                  {w.type_name && <p className="text-xs text-white/50">{w.type_name}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* TYPES */}
      <section className="container-kubik py-16">
        <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">Типы вывесок</h2>
        <p className="mt-2 text-muted-foreground">Нажмите на карточку, чтобы увидеть примеры наших работ</p>
        <div className="mt-8">
          <TypesGallery />
        </div>
      </section>

      {/* CONTACTS */}
      <footer id="contacts" className="bg-navy-gradient py-14">
        <div className="container-kubik">
          <Logo dark className="mb-10" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {COMPANIES.map((company) => (
              <div key={company.name}>
                <h3 className="text-base font-semibold text-white">{company.name}</h3>
                <p className="mt-1 text-sm text-white/50">{company.tagline}</p>
                <div className="mt-4 space-y-2">
                  {company.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                    >
                      <link.icon className="h-4 w-4 shrink-0" /> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-12 text-xs text-white/40">© {new Date().getFullYear()} Kubik.std</p>
        </div>
      </footer>
    </main>
  );
}
