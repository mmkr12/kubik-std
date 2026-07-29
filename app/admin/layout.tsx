import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminAccessProvider } from '@/components/admin-access-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessProvider>
      <div className="flex bg-mist-gradient">
        <AdminSidebar />
        <div className="min-h-screen flex-1 overflow-y-auto p-8">{children}</div>
      </div>
    </AdminAccessProvider>
  );
}
