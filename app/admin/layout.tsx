import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-mist-gradient">
      <AdminSidebar />
      <div className="min-h-screen flex-1 overflow-y-auto p-8">{children}</div>
    </div>
  );
}
