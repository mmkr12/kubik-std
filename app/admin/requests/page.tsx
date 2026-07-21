import { RequestsBoard } from '@/components/admin/requests-board';

export default function AdminRequestsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Заявки</h1>
      <RequestsBoard />
    </div>
  );
}
