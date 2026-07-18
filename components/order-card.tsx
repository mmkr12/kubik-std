import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { ERPRequest } from '@/lib/types';

export function OrderCard({ request }: { request: ERPRequest }) {
  return (
    <Link href={`/production/${request.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-navy-900 card-shadow card-shadow-hover transition-transform duration-300 group-hover:-translate-y-1">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-800">
          {request.sketch_url ? (
            <Image
              src={request.sketch_url}
              alt={request.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/30">Эскиз</div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">{request.name}</h3>
            <Badge>В работе</Badge>
          </div>
          {request.install_date && (
            <p className="text-sm text-white/50">Монтаж {formatDate(request.install_date)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
