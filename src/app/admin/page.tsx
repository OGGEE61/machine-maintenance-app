import { Suspense } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { machines } from '@/data/machines';

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-[#929292]">Loading…</div>}>
      <AdminDashboard machineTypes={machines.map(({ id, name }) => ({ id, name }))} />
    </Suspense>
  );
}
