import { PayrollBoard } from '@/components/admin/payroll-board';

export default function AdminPayrollPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Зарплатный фонд</h1>
      <PayrollBoard />
    </div>
  );
}
