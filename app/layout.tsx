import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KUBIK.std — Производство наружной рекламы',
  description:
    'Изготовление наружной рекламы нового поколения. Следите за производством своего заказа онлайн.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">{children}</body>
    </html>
  );
}
