import Image from 'next/image';
import { cn } from '@/lib/utils';

// dop.svg — широкая горизонтальная версия лого, используется там, где
// достаточно места по ширине (шапка сайта, футер, сайдбар админки).
// osn.svg — компактная версия (знак + текст плотнее), для узких мест.
// Оба файла — один сплошной цвет (чёрный), поэтому светлая/тёмная версия
// делается CSS-фильтром: brightness-0 приводит к чистому чёрному,
// invert переворачивает в белый — так не нужно хранить по два файла.
export function Logo({
  dark = false,
  variant = 'wide',
  className,
}: {
  dark?: boolean;
  variant?: 'wide' | 'compact';
  className?: string;
}) {
  const src = variant === 'wide' ? '/brand/logo-dop.svg' : '/brand/logo-osn.svg';
  const ratio = variant === 'wide' ? 10559.1 / 1326.72 : 2329.45 / 1510.54;
  const height = variant === 'wide' ? 22 : 32;
  const width = Math.round(height * ratio);

  return (
    <Image
      src={src}
      alt="Kubik.std"
      width={width}
      height={height}
      className={cn(dark && 'brightness-0 invert', className)}
      priority
    />
  );
}
