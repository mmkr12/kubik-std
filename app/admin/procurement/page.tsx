import { ProcurementBoard } from '@/components/admin/procurement-board';

export default function AdminProcurementPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Закупки</h1>
      <ProcurementBoard />
    </div>
  );
}
