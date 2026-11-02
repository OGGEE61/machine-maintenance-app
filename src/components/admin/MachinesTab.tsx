'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Pencil, QrCode, Search, UserPlus } from 'lucide-react';
import { adminRequest, errorMessage } from './api';
import EditMachineModal from './EditMachineModal';
import FilterPills from './FilterPills';
import MachineQrModal from './MachineQrModal';
import type { MachineTypeOption, RegisteredMachine } from './types';

type MachineFilter = 'all' | 'unassigned' | 'assigned';

const inputClass = 'w-full border border-[#dadada] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0063ff] transition-colors bg-white';

interface MachinesTabProps {
  machines: RegisteredMachine[];
  machineTypes: MachineTypeOption[];
  initialQuery: string;
  onChanged: () => Promise<void>;
}

export default function MachinesTab({ machines, machineTypes, initialQuery, onChanged }: MachinesTabProps) {
  const [serialNumber, setSerialNumber] = useState('');
  const [machineTypeId, setMachineTypeId] = useState(machineTypes[0].id);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const [filter, setFilter] = useState<MachineFilter>('all');
  const [query, setQuery] = useState(initialQuery);
  const [qrMachine, setQrMachine] = useState<{ machine: RegisteredMachine; justRegistered: boolean } | null>(null);
  const [editingMachine, setEditingMachine] = useState<RegisteredMachine | null>(null);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterError('');
    try {
      const { machine } = await adminRequest<{ machine: RegisteredMachine }>('/api/machines-db', 'POST', { serialNumber, machineTypeId });
      setSerialNumber('');
      setQrMachine({ machine, justRegistered: true });
      await onChanged();
    } catch (err) {
      setRegisterError(errorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const q = query.trim().toLowerCase();
  const unassignedCount = machines.filter((m) => !m.client_name).length;
  const visibleMachines = machines
    .filter((m) => filter === 'all' || (filter === 'unassigned' ? !m.client_name : !!m.client_name))
    .filter((m) => !q || [m.serial_number, m.machine_type_name, m.client_name, m.client_email]
      .some((field) => field?.toLowerCase().includes(q)));

  return (
    <div className="grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6 items-start">
      {/* Machines are registered at the factory; the client is added once it is sold */}
      <div className="bg-white rounded-2xl border border-[#dadada]/70 p-6">
        <h2 className="font-bold text-[#282828] mb-1">Register New Machine</h2>
        <p className="text-sm text-[#929292] mb-5">When a machine is built. You&apos;ll get its QR sticker next, and can add the client once it&apos;s sold.</p>
        <form onSubmit={register} className="flex flex-col gap-4">
          <div>
            <label htmlFor="register-serial" className="text-xs font-medium text-[#929292] block mb-1">Serial Number *</label>
            <input
              id="register-serial"
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="GP80-2024-001"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="register-type" className="text-xs font-medium text-[#929292] block mb-1">Machine Type *</label>
            <select id="register-type" required value={machineTypeId} onChange={(e) => setMachineTypeId(e.target.value)} className={inputClass}>
              {machineTypes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {registerError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{registerError}</p>
          )}
          <button
            type="submit"
            disabled={registering}
            className="flex items-center justify-center gap-2 py-3 bg-[#282828] text-white font-bold rounded-xl hover:bg-[#444] transition-colors cursor-pointer disabled:opacity-60"
          >
            {registering && <Loader2 size={16} className="animate-spin" />}
            Register &amp; Get QR Sticker
          </button>
        </form>
      </div>

      {/* Registered machines */}
      <div className="bg-white rounded-2xl border border-[#dadada]/70 overflow-hidden">
        <div className="p-5 border-b border-[#dadada]/50 space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#929292]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search serial number, model, client…"
              aria-label="Search machines"
              className="w-full border border-[#dadada] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#0063ff] transition-colors"
            />
          </div>
          <FilterPills
            label="Filter machines by client"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'All', count: machines.length },
              { id: 'unassigned', label: 'No client yet', count: unassignedCount },
              { id: 'assigned', label: 'With client', count: machines.length - unassignedCount },
            ]}
          />
        </div>

        {visibleMachines.length === 0 ? (
          <div className="p-12 text-center text-[#929292]">
            {machines.length === 0 ? 'No machines registered yet.' : 'No machines match your search.'}
          </div>
        ) : (
          <div className="divide-y divide-[#dadada]/40">
            {visibleMachines.map((m) => (
              <div key={m.serial_number} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-[#282828] text-sm">{m.machine_type_name}</p>
                  <p className="font-mono text-xs text-[#0063ff] font-medium mt-0.5">{m.serial_number}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
                    {m.client_name ? (
                      <span className="text-[#6b6969]">{m.client_name}</span>
                    ) : (
                      <span className="bg-[#f3f2f2] text-[#929292] px-2 py-0.5 rounded-full">No client yet</span>
                    )}
                    {m.order_count > 0 && (
                      <Link href={`/admin?tab=orders&q=${encodeURIComponent(m.serial_number)}`} className="text-[#0063ff] hover:underline">
                        {m.order_count} order{m.order_count !== 1 ? 's' : ''}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setQrMachine({ machine: m, justRegistered: false })}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#282828] bg-[#f3f2f2] hover:bg-[#e8e8e8] rounded-lg transition-colors cursor-pointer"
                  >
                    <QrCode size={14} /> Sticker
                  </button>
                  <button
                    onClick={() => setEditingMachine(m)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#282828] bg-[#f3f2f2] hover:bg-[#e8e8e8] rounded-lg transition-colors cursor-pointer"
                  >
                    {m.client_name ? <Pencil size={14} /> : <UserPlus size={14} />}
                    {m.client_name ? 'Edit client' : 'Add client'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {qrMachine && (
          <MachineQrModal
            key={`qr-${qrMachine.machine.serial_number}`}
            machine={qrMachine.machine}
            justRegistered={qrMachine.justRegistered}
            onClose={() => setQrMachine(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingMachine && (
          <EditMachineModal
            key={`edit-${editingMachine.serial_number}`}
            machine={editingMachine}
            onClose={() => setEditingMachine(null)}
            onChanged={onChanged}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
