import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Phone, Instagram } from 'lucide-react';

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
        <div className="hidden items-center gap-4 md:flex">
          <a
            href="https://wa.me/77077750011"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-blue-600"
          >
            <Phone className="h-3.5 w-3.5" /> +7 707 775 00 11
          </a>
          <a
            href="https://www.instagram.com/kubik.std"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-blue-600"
          >
            <Instagram className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
