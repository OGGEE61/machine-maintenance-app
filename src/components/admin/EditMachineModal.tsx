'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Loader2, Save, Trash2, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { adminRequest, errorMessage } from './api';
import type { RegisteredMachine } from './types';

const inputClass = 'w-full border border-[#dadada] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0063ff] transition-colors bg-white';
const labelClass = 'text-xs font-medium text-[#929292] block mb-1';

interface EditMachineModalProps {
  machine: RegisteredMachine;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

export default function EditMachineModal({ machine, onClose, onChanged }: EditMachineModalProps) {
  const [form, setForm] = useState({
    clientName: machine.client_name ?? '',
    clientEmail: machine.client_email ?? '',
    clientAddress: machine.client_address ?? '',
    clientPhone: machine.client_phone ?? '',
    installedAt: machine.installed_at ? machine.installed_at.split('T')[0] : '',
    notes: machine.notes ?? '',
  });
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState('');
  useEscapeKey(true, onClose);
  const path = `/api/machines-db/${encodeURIComponent(machine.serial_number)}`;
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('save');
    setError('');
    try {
      await adminRequest(path, 'PATCH', form);
      await onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete machine ${machine.serial_number}? Any sticker already printed for it will stop working.`)) return;
    setBusy('delete');
    setError('');
    try {
      await adminRequest(path, 'DELETE');
      await onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div role="dialog" aria-modal="true" aria-label="Client details" className="w-full max-w-lg max-h-full overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#dadada]/70 pointer-events-auto">
          <div className="flex items-center justify-between p-5 border-b border-[#dadada]/50">
            <div>
              <h3 className="font-bold text-[#282828]">{machine.client_name ? 'Edit Client Details' : 'Add Client'}</h3>
              <p className="text-xs text-[#929292] mt-0.5 font-mono">{machine.serial_number} · {machine.machine_type_name}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-[#f3f2f2] rounded-lg transition-colors cursor-pointer">
              <X size={18} className="text-[#929292]" />
            </button>
          </div>

          <div className="mx-5 mt-4 flex items-start gap-2.5 bg-[#f0f6ff] border border-[#0063ff]/20 rounded-xl px-4 py-3">
            <Info size={15} className="text-[#0063ff] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#1e3a8a]">
              Fill this in when a machine is <strong>sold or relocated</strong>. The sticker stays the same, and these details are only visible to staff.
            </p>
          </div>

          <form onSubmit={save} className="p-5 flex flex-col gap-4">
            <div>
              <label htmlFor="edit-name" className={labelClass}>Client / Company Name</label>
              <input id="edit-name" value={form.clientName} onChange={set('clientName')} placeholder="Company or client name" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-email" className={labelClass}>Email</label>
                <input id="edit-email" type="email" value={form.clientEmail} onChange={set('clientEmail')} placeholder="email@client.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-phone" className={labelClass}>Phone</label>
                <input id="edit-phone" value={form.clientPhone} onChange={set('clientPhone')} placeholder="+48 ..." className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="edit-address" className={labelClass}>Install Address</label>
              <input id="edit-address" value={form.clientAddress} onChange={set('clientAddress')} placeholder="Street, City, Country" className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-date" className={labelClass}>Installation Date</label>
              <input id="edit-date" type="date" value={form.installedAt} onChange={set('installedAt')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-notes" className={labelClass}>Internal Notes</label>
              <textarea id="edit-notes" value={form.notes} onChange={set('notes')} rows={2} className={`${inputClass} resize-none`} />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-[#929292] hover:text-[#282828] hover:bg-[#f3f2f2] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#282828] text-white text-sm font-bold rounded-xl hover:bg-[#444] transition-colors cursor-pointer disabled:opacity-60"
              >
                {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {busy === 'save' ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            {/* Only for fixing registration mistakes: machines with orders are part of the order history */}
            <div className="pt-3 border-t border-[#dadada]/40">
              {machine.order_count > 0 ? (
                <p className="text-xs text-[#929292]">This machine has orders, so it can&apos;t be deleted.</p>
              ) : (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline cursor-pointer disabled:opacity-60"
                >
                  <Trash2 size={13} /> Delete machine (registered by mistake)
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
