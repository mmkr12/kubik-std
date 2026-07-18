import { ProductionCalendar } from '@/components/admin/production-calendar';

export default function AdminProductionPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Производство</h1>
      <ProductionCalendar />
    </div>
  );
}
