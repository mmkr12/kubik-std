import { StaffBoard } from '@/components/admin/staff-board';

export default function AdminStaffPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Сотрудники</h1>
      <StaffBoard />
    </div>
  );
}
