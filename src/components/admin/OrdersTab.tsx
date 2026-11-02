'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, Download, Mail, Package, Phone, Search, Truck, XCircle } from 'lucide-react';
import { ORDER_TRANSITIONS, OrderStatus, orderReference } from '@/lib/orders';
import { orderTotal, ordersToCsv } from '@/lib/orders-csv';
import { formatPrice } from '@/lib/price';
import { adminRequest, errorMessage } from './api';
import FilterPills from './FilterPills';
import type { MachineTypeOption, Order } from './types';

type OrderFilter = 'open' | OrderStatus | 'all';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: '#0063ff', icon: Clock },
  processing: { label: 'Processing', color: '#d97706', icon: Package },
  shipped: { label: 'Shipped', color: '#16a34a', icon: Truck },
  cancelled: { label: 'Cancelled', color: '#9ca3af', icon: XCircle },
};

function transitionLabel(from: OrderStatus, to: OrderStatus): string {
  if (to === 'cancelled') return 'Cancel order';
  if (to === 'shipped') return 'Mark as shipped';
  if (from === 'new') return 'Start processing';
  if (from === 'cancelled') return 'Reopen order';
  return from === 'shipped' ? 'Undo shipping' : 'Back to new';
}

function exportCSV(orders: Order[], machineName: (order: Order) => string) {
  const csv = ordersToCsv(orders, (o) => machineName(o as Order));
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gross-orders.csv';
  a.click();
  // Revoking straight away can cancel the download before the browser has started it
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

interface OrdersTabProps {
  orders: Order[];
  machineTypes: MachineTypeOption[];
  loading: boolean;
  initialQuery: string;
  onOrderChange: (orderId: string, status: OrderStatus) => void;
}

export default function OrdersTab({ orders, machineTypes, loading, initialQuery, onOrderChange }: OrdersTabProps) {
  // Arriving from a machine's order link shows all of its orders, not just the open ones
  const [filter, setFilter] = useState<OrderFilter>(initialQuery ? 'all' : 'open');
  const [query, setQuery] = useState(initialQuery);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const machineName = (order: Pick<Order, 'machine_type_id'>) => {
    if (!order.machine_type_id) return 'Machine not recorded';
    return machineTypes.find((m) => m.id === order.machine_type_id)?.name ?? order.machine_type_id;
  };

  const countOf = (status: OrderStatus) => orders.filter((o) => o.status === status).length;
  const isOpen = (o: Order) => o.status === 'new' || o.status === 'processing';

  const q = query.trim().toLowerCase();
  const visibleOrders = orders
    .filter((o) => filter === 'all' || (filter === 'open' ? isOpen(o) : o.status === filter))
    .filter((o) => !q || [
      orderReference(o.id), o.customer_name, o.customer_email, o.customer_phone, o.serial_number, machineName(o),
      ...o.items.flatMap((i) => [i.partName, i.partNumber]),
    ].some((field) => field?.toLowerCase().includes(q)));

  // The open queue is worked oldest first; everything else reads newest first
  if (filter === 'open') visibleOrders.reverse();

  const changeStatus = async (order: Order, status: OrderStatus) => {
    if (status === 'cancelled' && !window.confirm(`Cancel order ${orderReference(order.id)}?`)) return;
    setPendingId(order.id);
    setError('');
    try {
      await adminRequest(`/api/orders/${order.id}`, 'PATCH', { status });
      onOrderChange(order.id, status);
    } catch (err) {
      setError(`Order ${orderReference(order.id)} was not updated: ${errorMessage(err)}`);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#dadada]/70 overflow-hidden">
      <div className="p-5 border-b border-[#dadada]/50 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#929292]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, customer, serial, part…"
              aria-label="Search orders"
              className="w-full border border-[#dadada] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#0063ff] transition-colors"
            />
          </div>
          <button
            onClick={() => exportCSV(visibleOrders, machineName)}
            disabled={visibleOrders.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0063ff] hover:bg-[#f3f2f2] rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} /> Export {visibleOrders.length} to CSV
          </button>
        </div>
        <FilterPills
          label="Filter orders by status"
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'open', label: 'To do', count: orders.filter(isOpen).length },
            { id: 'new', label: 'New', count: countOf('new') },
            { id: 'processing', label: 'Processing', count: countOf('processing') },
            { id: 'shipped', label: 'Shipped', count: countOf('shipped') },
            { id: 'cancelled', label: 'Cancelled', count: countOf('cancelled') },
            { id: 'all', label: 'All', count: orders.length },
          ]}
        />
      </div>

      {error && (
        <p role="alert" className="m-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {loading ? (
        <div className="p-12 text-center text-[#929292]">Loading orders…</div>
      ) : visibleOrders.length === 0 ? (
        <div className="p-12 text-center text-[#929292]">
          {q ? 'No orders match your search.' : filter === 'open' ? 'Nothing to do: all orders are handled.' : 'No orders here.'}
        </div>
      ) : (
        <div className="divide-y divide-[#dadada]/40">
          {visibleOrders.map((order) => {
            const sc = statusConfig[order.status];
            const StatusIcon = sc.icon;
            const transitions = ORDER_TRANSITIONS[order.status];
            const forwardStep = transitions.find((to) => to === 'processing' && order.status === 'new' || to === 'shipped');
            const pending = pendingId === order.id;

            return (
              <article key={order.id} className="p-5">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <span className="font-mono text-xs font-semibold text-[#282828]">{orderReference(order.id)}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.color + '15', color: sc.color }}>
                    <StatusIcon size={11} /> {sc.label}
                  </span>
                  <span className="text-xs text-[#929292]">{new Date(order.created_at).toLocaleString()}</span>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-[#929292] mb-1">Customer</p>
                    {order.customer_email ? (
                      <>
                        <p className="font-semibold text-[#282828]">{order.customer_name}</p>
                        <a href={`mailto:${order.customer_email}?subject=${encodeURIComponent(`Your order ${orderReference(order.id)}`)}`} className="flex items-center gap-1.5 text-sm text-[#0063ff] hover:underline">
                          <Mail size={13} /> {order.customer_email}
                        </a>
                        {order.customer_phone && (
                          <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1.5 text-sm text-[#0063ff] hover:underline">
                            <Phone size={13} /> {order.customer_phone}
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="flex items-start gap-1.5 text-sm text-[#92400e]">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        No contact details were captured for this order.
                      </p>
                    )}

                    <p className="text-[11px] uppercase tracking-wide text-[#929292] mt-4 mb-1">Machine</p>
                    <p className="text-sm text-[#282828]">{machineName(order)}</p>
                    {order.serial_number && (
                      <Link href={`/admin?tab=machines&q=${encodeURIComponent(order.serial_number)}`} className="font-mono text-xs text-[#0063ff] hover:underline">
                        S/N {order.serial_number}
                      </Link>
                    )}
                    {order.registered_client && order.registered_client !== order.customer_name && (
                      <p className="text-xs text-[#929292] mt-0.5">Registered to {order.registered_client}</p>
                    )}

                    {order.notes && (
                      <>
                        <p className="text-[11px] uppercase tracking-wide text-[#929292] mt-4 mb-1">Customer notes</p>
                        <p className="text-sm text-[#282828] whitespace-pre-wrap break-words">{order.notes}</p>
                      </>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-[#929292] mb-1">Parts</p>
                    <div className="divide-y divide-[#dadada]/40">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 py-1.5">
                          <div className="min-w-0">
                            <p className="text-sm text-[#282828]">{item.partName} <span className="text-[#929292]">×{item.quantity}</span></p>
                            {item.partNumber && <p className="font-mono text-[11px] text-[#929292]">{item.partNumber}</p>}
                          </div>
                          <span className="text-sm text-[#282828] whitespace-nowrap">{formatPrice(item.unitPrice, item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#282828]">
                      <span className="text-sm font-semibold text-[#282828]">Total (excl. VAT)</span>
                      <span className="font-bold text-[#282828]">
                        {order.items.some((item) => item.unitPrice !== null) ? `€${orderTotal(order).toFixed(2)}` : 'To be quoted'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-4">
                  {forwardStep && (
                    <button
                      onClick={() => changeStatus(order, forwardStep)}
                      disabled={pending}
                      className="px-4 py-2 bg-[#282828] text-white text-sm font-semibold rounded-xl hover:bg-[#444] transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {transitionLabel(order.status, forwardStep)}
                    </button>
                  )}
                  {transitions.filter((to) => to !== forwardStep).map((to) => (
                    <button
                      key={to}
                      onClick={() => changeStatus(order, to)}
                      disabled={pending}
                      className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-60 ${to === 'cancelled' ? 'text-red-600 hover:bg-red-50' : 'text-[#6b6969] hover:bg-[#f3f2f2]'}`}
                    >
                      {transitionLabel(order.status, to)}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
