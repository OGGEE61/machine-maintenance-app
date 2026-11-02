'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { machines as machineTypes } from '@/data/machines';
import { adminRequest, errorMessage } from './api';

interface PartVisibility {
  id: string;
  name: string;
  partNumber: string;
  category: string;
  visible: boolean;
}

interface ModuleVisibility {
  id: string;
  name: string;
  parts: PartVisibility[];
}

export default function PartsTab() {
  const [machineTypeId, setMachineTypeId] = useState(machineTypes[0].id);
  // Keyed by machine type, so a missing entry means that machine is still loading
  const [modulesByType, setModulesByType] = useState<Record<string, ModuleVisibility[]>>({});
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { modules } = await adminRequest<{ modules: ModuleVisibility[] }>(
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

  const toggle = async (partId: string, visible: boolean) => {
    setPendingId(partId);
    setError('');
    try {
      await adminRequest(`/api/parts/${encodeURIComponent(partId)}`, 'PATCH', { visible });
      setModulesByType((prev) => ({
        ...prev,
        [machineTypeId]: (prev[machineTypeId] ?? []).map((mod) => ({
          ...mod,
          parts: mod.parts.map((part) => (part.id === partId ? { ...part, visible } : part)),
        })),
      }));
    } catch (err) {
      setError(`The part was not updated: ${errorMessage(err)}`);
    } finally {
      setPendingId(null);
    }
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
          <h2 className="font-bold text-[#282828]">Parts Customers Can Order</h2>
          <p className="text-sm text-[#929292] mt-0.5">Hidden parts disappear from the machine&apos;s parts page immediately and can&apos;t be ordered.</p>
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
                  <div key={part.id} className="flex items-center justify-between p-3 rounded-xl border border-[#dadada]/50">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className={`font-medium text-sm truncate ${part.visible ? 'text-[#282828]' : 'text-[#929292]'}`}>{part.name}</p>
                      <p className="text-xs text-[#929292] truncate">{part.partNumber} · {part.category}</p>
                    </div>
                    <button
                      onClick={() => toggle(part.id, !part.visible)}
                      disabled={pendingId === part.id}
                      aria-label={`${part.visible ? 'Hide' : 'Show'} ${part.name}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-60 ${part.visible ? 'bg-[#dcfce7] text-[#16a34a] hover:bg-[#bbf7d0]' : 'bg-[#f3f2f2] text-[#929292] hover:bg-[#e8e8e8]'}`}
                    >
                      {part.visible ? <><Eye size={13} /> Visible</> : <><EyeOff size={13} /> Hidden</>}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
