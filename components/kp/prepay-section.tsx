'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTenge } from '@/lib/utils';

export function PrepaySection({ total }: { total: number }) {
  const [amount, setAmount] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const bonusActive = secondsLeft > 0;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 md:p-8">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-xl font-bold text-navy-900 md:text-2xl">Внесите предоплату и получите бонус</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Оплатите от 10 000 ₸ до полной стоимости в течение 20 минут после получения предложения — и получите бонус или скидку на этот заказ.
        </p>

        {bonusActive ? (
          <div className="mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
            Бонус действует ещё {minutes}:{String(seconds).padStart(2, '0')}
          </div>
        ) : (
          <div className="mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
            Время бонуса истекло — предоплату всё ещё можно внести
          </div>
        )}

        <div className="mt-6 grid w-full max-w-sm gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5 text-left">
            <Label>Сумма предоплаты, ₸</Label>
            <Input
              type="number"
              min={10000}
              max={total}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`от 10 000 до ${total.toLocaleString('ru-RU')}`}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <Image src="/brand/kaspi-qr.png" alt="Kaspi QR" width={180} height={180} />
          <p className="text-sm font-medium text-navy-900">Kaspi Pay</p>
          <p className="text-xs text-muted-foreground">+7 707 775 00 11</p>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          После оплаты пришлите скриншот чека в WhatsApp или Telegram — менеджер сразу подтвердит и запустит заказ в производство.
        </p>
      </div>
    </div>
  );
}
