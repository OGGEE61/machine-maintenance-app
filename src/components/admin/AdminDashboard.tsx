'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell from './AdminShell';
import { adminRequest, errorMessage } from './api';
import MachinesTab from './MachinesTab';
import OrdersTab from './OrdersTab';
import PartsTab from './PartsTab';
import type { MachineTypeOption, Order, RegisteredMachine } from './types';
import type { OrderStatus } from '@/lib/orders';

type Tab = 'orders' | 'machines' | 'parts';

function fetchOrders() {
  return adminRequest<{ orders: Order[] }>('/api/orders').then((data) => data.orders);
}

function fetchMachines() {
  return adminRequest<{ machines: RegisteredMachine[] }>('/api/machines-db').then((data) => data.machines);
}

export default function AdminDashboard({ machineTypes }: { machineTypes: MachineTypeOption[] }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab = tabParam === 'machines' || tabParam === 'parts' ? tabParam : 'orders';
  // Links between orders and machines arrive with a search already filled in
  const query = searchParams.get('q') ?? '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [machines, setMachines] = useState<RegisteredMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [loadedOrders, loadedMachines] = await Promise.all([fetchOrders(), fetchMachines()]);
        if (!active) return;
        setOrders(loadedOrders);
        setMachines(loadedMachines);
        setLoadError('');
      } catch (err) {
        if (active) setLoadError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [loadAttempt]);

  const handleOrderChange = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  };

  // Machine edits can change what the orders list shows, such as who a machine is registered to
  const refreshMachines = async () => {
    const [loadedOrders, loadedMachines] = await Promise.all([fetchOrders(), fetchMachines()]);
    setOrders(loadedOrders);
    setMachines(loadedMachines);
  };

  return (
    <AdminShell
      active={tab}
      openOrders={orders.filter((o) => o.status === 'new' || o.status === 'processing').length}
    >
      {loadError && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-3 flex-wrap text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span>Could not load the dashboard: {loadError}</span>
          <button onClick={() => setLoadAttempt((n) => n + 1)} className="font-semibold underline cursor-pointer">Try again</button>
        </div>
      )}

      {tab === 'orders' && (
        <OrdersTab key={query} orders={orders} machineTypes={machineTypes} loading={loading} initialQuery={query} onOrderChange={handleOrderChange} />
      )}
      {tab === 'machines' && (
        <MachinesTab key={query} machines={machines} machineTypes={machineTypes} initialQuery={query} onChanged={refreshMachines} />
      )}
      {tab === 'parts' && <PartsTab machineTypes={machineTypes} />}
    </AdminShell>
  );
}
