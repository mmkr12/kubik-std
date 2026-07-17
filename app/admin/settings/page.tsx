import { SettingsForm } from '@/components/admin/settings-form';

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Настройки</h1>
      <SettingsForm />
    </div>
  );
}
