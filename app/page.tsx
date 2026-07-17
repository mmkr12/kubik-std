import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Logo } from '@/components/logo';
import { Calculator } from '@/components/calculator';
import { Button } from '@/components/ui/button';
import { Instagram, Globe, Factory, Printer, Wrench, HardHat } from 'lucide-react';

const ABOUT_ITEMS = [
  { icon: Factory, title: 'Собственное производство', text: 'Полный цикл изготовления вывесок — от эскиза до монтажа' },
  { icon: Printer, title: 'Собственная ферма 3D-печати', text: 'Более 30 принтеров для быстрого изготовления объёмных конструкций' },
  { icon: HardHat, title: 'Изготовление собственных 3D-принтеров', text: 'Разрабатываем и собираем оборудование для производства' },
  { icon: Wrench, title: 'Монтаж по всему городу', text: 'Профессиональная установка с гарантией и страховкой' },
];

const WORKS = [
  { name: 'COSMOS CAKE', tag: 'Фасадная вывеска', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop' },
  { name: 'SAPPHIRE', tag: 'Интерьерная вывеска', img: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=800&auto=format&fit=crop' },
  { name: 'CANDY', tag: 'Вывеска с подсветкой', img: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=800&auto=format&fit=crop' },
  { name: 'COFFEE BOOM', tag: 'Объёмные световые буквы', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop' },
];

export default function HomePage() {
  return (
    <main className="bg-mist-gradient">
      <SiteHeader />

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
            <Button size="lg" variant="outline" asChild>
              <Link href="/production">Производство онлайн</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy-900 card-shadow">
          <Image
            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop"
            alt="Производство наружной рекламы KUBIK"
            fill
            className="object-cover opacity-90"
            priority
          />
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="container-kubik py-16">
        <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">О компании</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Мы создаём вывески, которые работают на ваш бизнес. Собственное производство, современное
          оборудование и команда, которая понимает, как реализовать любой проект в срок и с гарантией качества.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ABOUT_ITEMS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-white p-5 card-shadow">
              <item.icon className="h-6 w-6 text-blue-600" />
              <h3 className="mt-4 text-sm font-semibold text-navy-900">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WORKS */}
      <section id="works" className="container-kubik py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">Наши работы</h2>
          <Link href="/production" className="text-sm font-medium text-blue-600 hover:underline">
            Смотреть все работы →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {WORKS.map((w) => (
            <div key={w.name} className="group overflow-hidden rounded-2xl bg-navy-900 card-shadow">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={w.img}
                  alt={w.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white">{w.name}</h3>
                <p className="text-xs text-white/50">{w.tag}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="container-kubik py-16">
        <Calculator />
      </section>

      {/* CONTACTS */}
      <footer id="contacts" className="bg-navy-gradient py-14">
        <div className="container-kubik flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo dark />
            <div className="mt-4 space-y-1 text-sm text-white/70">
              <a href="https://instagram.com/kubik.std" className="flex items-center gap-2 hover:text-white">
                <Instagram className="h-4 w-4" /> kubik.std
              </a>
              <a href="https://kubikstd.kz" className="flex items-center gap-2 hover:text-white">
                <Globe className="h-4 w-4" /> kubikstd.kz
              </a>
            </div>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} KUBIK.std</p>
        </div>
      </footer>
    </main>
  );
}
