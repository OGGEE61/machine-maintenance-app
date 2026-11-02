'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Search } from 'lucide-react';
import { adminRequest, errorMessage } from './api';
import type { MachineTypeOption } from './types';

type Availability = 'in-stock' | 'low-stock' | 'on-order';

interface ManagedPart {
  id: string;
  name: string;
  partNumber: string;
  price: number;
  currency: string;
  availability: Availability;
  leadTimeDays: number | null;
  visible: boolean;
}

interface ManagedModule {
  id: string;
  name: string;
  parts: ManagedPart[];
}

const fieldClass = 'border border-[#dadada] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#0063ff] transition-colors bg-white';

function PartRow({ part, onSaved }: { part: ManagedPart; onSaved: (changes: Partial<ManagedPart>) => void }) {
  const [price, setPrice] = useState(part.price.toFixed(2));
  const [availability, setAvailability] = useState(part.availability);
  const [leadTime, setLeadTime] = useState(part.leadTimeDays?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const parsedLeadTime = leadTime.trim() === '' ? null : Number(leadTime);
  const dirty = Number(price) !== part.price || availability !== part.availability
    || (availability === 'on-order' && parsedLeadTime !== part.leadTimeDays);

  const save = async (changes: Partial<ManagedPart>) => {
    setBusy(true);
    setError('');
    try {
      await adminRequest(`/api/parts/${encodeURIComponent(part.id)}`, 'PATCH', changes);
      onSaved(changes);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`p-3 rounded-xl border border-[#dadada]/50 ${part.visible ? '' : 'bg-[#f9f9f9]'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className={`font-medium text-sm ${part.visible ? 'text-[#282828]' : 'text-[#929292]'}`}>{part.name}</p>
          <p className="font-mono text-[11px] text-[#929292]">{part.partNumber}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1 text-xs text-[#929292]">
            €
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label={`Price of ${part.name}`}
              className={`${fieldClass} w-24`}
            />
          </label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as Availability)}
            aria-label={`Availability of ${part.name}`}
            className={fieldClass}
          >
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
            <option value="on-order">On order</option>
          </select>
          {availability === 'on-order' && (
            <label className="flex items-center gap-1 text-xs text-[#929292]">
              <input
                type="number"
                min="0"
                step="1"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                aria-label={`Lead time of ${part.name} in days`}
                className={`${fieldClass} w-16`}
              />
              days
            </label>
          )}
          {dirty && (
            <button
              onClick={() => save({
                price: Number(price),
                availability,
                leadTimeDays: availability === 'on-order' ? parsedLeadTime : part.leadTimeDays,
              })}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#282828] text-white rounded-lg text-xs font-semibold hover:bg-[#444] transition-colors cursor-pointer disabled:opacity-60"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              Save
            </button>
          )}
          <button
            onClick={() => save({ visible: !part.visible })}
            disabled={busy}
            aria-label={`${part.visible ? 'Hide' : 'Show'} ${part.name}`}
            className={`flex items-center gap-1.5 w-24 justify-center py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 ${part.visible ? 'bg-[#dcfce7] text-[#16a34a] hover:bg-[#bbf7d0]' : 'bg-[#f3f2f2] text-[#929292] hover:bg-[#e8e8e8]'}`}
          >
            {part.visible ? <><Eye size={13} /> Visible</> : <><EyeOff size={13} /> Hidden</>}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export default function PartsTab({ machineTypes }: { machineTypes: MachineTypeOption[] }) {
  const [machineTypeId, setMachineTypeId] = useState(machineTypes[0].id);
  // Keyed by machine type, so a missing entry means that machine is still loading
  const [modulesByType, setModulesByType] = useState<Record<string, ManagedModule[]>>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { modules } = await adminRequest<{ modules: ManagedModule[] }>(
          `/api/parts-by-machine?machineTypeId=${encodeURIComponent(machineTypeId)}`
        );
        if (active) setModulesByType((prev) => ({ ...prev, [machineTypeId]: modules }));
      } catch (err) {
        if (active) setError(errorMessage(err));
      }
    }
    load();
    return () => { active = false; };
  }, [machineTypeId]);

  const updatePart = (partId: string, changes: Partial<ManagedPart>) => {
    setModulesByType((prev) => ({
      ...prev,
      [machineTypeId]: (prev[machineTypeId] ?? []).map((mod) => ({
        ...mod,
        parts: mod.parts.map((part) => (part.id === partId ? { ...part, ...changes } : part)),
      })),
    }));
  };

  const modules = modulesByType[machineTypeId];
  const hiddenCount = modules?.flatMap((mod) => mod.parts).filter((part) => !part.visible).length ?? 0;
  const q = query.trim().toLowerCase();
  const visibleModules = modules
    ?.map((mod) => ({
      ...mod,
      parts: mod.parts.filter((part) => !q || [part.name, part.partNumber, mod.name].some((f) => f.toLowerCase().includes(q))),
    }))
    .filter((mod) => mod.parts.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-[#dadada]/70 overflow-hidden">
      <div className="p-5 border-b border-[#dadada]/50 space-y-3">
        <div>
          <h2 className="font-bold text-[#282828]">Parts, Prices &amp; Stock</h2>
          <p className="text-sm text-[#929292] mt-0.5">Changes apply to the machine&apos;s parts page immediately. Hidden parts can&apos;t be ordered, and existing orders keep their original prices.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={machineTypeId}
            onChange={(e) => setMachineTypeId(e.target.value)}
            aria-label="Machine type"
            className="border border-[#dadada] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0063ff] cursor-pointer"
          >
            {machineTypes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#929292]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts…"
              aria-label="Search parts"
              className="w-full border border-[#dadada] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#0063ff] transition-colors"
            />
          </div>
          {hiddenCount > 0 && <span className="text-xs font-medium text-[#92400e]">{hiddenCount} hidden</span>}
        </div>
      </div>

      {error && (
        <p role="alert" className="m-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="p-5 space-y-6">
        {!visibleModules ? (
          !error && <div className="text-center text-[#929292] py-8">Loading parts…</div>
        ) : visibleModules.length === 0 ? (
          <div className="text-center text-[#929292] py-8">No parts found.</div>
        ) : (
          visibleModules.map((mod) => (
            <section key={mod.id}>
              <h3 className="text-[11px] uppercase tracking-wide text-[#929292] mb-2">{mod.name}</h3>
              <div className="space-y-2">
                {mod.parts.map((part) => (
                  <PartRow key={part.id} part={part} onSaved={(changes) => updatePart(part.id, changes)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
