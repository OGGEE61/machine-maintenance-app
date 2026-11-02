'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cpu, Eye, LogOut, Package, QrCode } from 'lucide-react';
import { adminRequest } from './api';

export type AdminSection = 'orders' | 'machines' | 'parts' | 'stickers';

const sections = [
  { id: 'orders', label: 'Orders', href: '/admin?tab=orders', icon: Package },
  { id: 'machines', label: 'Machines', href: '/admin?tab=machines', icon: Cpu },
  { id: 'stickers', label: 'QR Stickers', href: '/admin/qr-codes', icon: QrCode },
  { id: 'parts', label: 'Parts', href: '/admin?tab=parts', icon: Eye },
] as const;

interface AdminShellProps {
  active: AdminSection;
  openOrders?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function AdminShell({ active, openOrders, actions, children }: AdminShellProps) {
  const router = useRouter();

  const logout = async () => {
    await adminRequest('/api/auth', 'DELETE').catch(() => undefined);
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="no-print fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/90 border-b border-[#dadada]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#282828] font-bold text-xl">GROSS</span>
            <span className="text-[#0063ff] font-mono text-[10px] uppercase tracking-widest border border-[#0063ff]/30 rounded px-1.5 py-0.5">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-[#929292] hover:bg-[#f3f2f2] rounded-lg transition-colors cursor-pointer">
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <nav aria-label="Admin sections" className="no-print flex gap-1 bg-[#f3f2f2] rounded-xl p-1 mb-6 w-fit max-w-full overflow-x-auto">
          {sections.map(({ id, label, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              aria-current={active === id ? 'page' : undefined}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${active === id ? 'bg-white text-[#282828] shadow-sm' : 'text-[#929292] hover:text-[#282828]'}`}
            >
              <Icon size={15} /> {label}
              {id === 'orders' && !!openOrders && (
                <span className="bg-[#0063ff] text-white text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {openOrders}
                </span>
              )}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}
