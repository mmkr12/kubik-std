'use client';

import { useState } from 'react';
import { SettingsForm } from '@/components/admin/settings-form';
import { SettingsERP } from '@/components/admin/settings-erp';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'erp', label: 'Изделия и монтаж' },
  { key: 'legacy', label: 'Калькулятор на сайте' },
] as const;

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('erp');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy-900">Настройки</h1>
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-blue-gradient text-white' : 'bg-mist-100 text-navy-700 hover:bg-mist-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'erp' ? <SettingsERP /> : <SettingsForm />}
    </div>
  );
}
