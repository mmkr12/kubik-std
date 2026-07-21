import { FinancesBoard } from '@/components/admin/finances-board';

export default function AdminFinancesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Финансы</h1>
      <FinancesBoard />
    </div>
  );
}
