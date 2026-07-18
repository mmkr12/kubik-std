import { ClientsBoard } from '@/components/admin/clients-board';

export default function AdminClientsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Клиенты</h1>
      <ClientsBoard />
    </div>
  );
}
