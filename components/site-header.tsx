import Link from 'next/link';
import { Logo } from '@/components/logo';

const links = [
  { href: '#about', label: 'О нас' },
  { href: '#works', label: 'Работы' },
  { href: '#calculator', label: 'Калькулятор' },
  { href: '/production', label: 'Производство онлайн' },
  { href: '#contacts', label: 'Контакты' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur">
      <div className="container-kubik flex h-16 items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-navy-700 transition-colors hover:text-blue-600"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <span className="hidden text-sm text-muted-foreground md:block">kubikstd.kz</span>
      </div>
    </header>
  );
}
