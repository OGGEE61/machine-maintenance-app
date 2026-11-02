'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, QrCode, Wrench } from 'lucide-react';
import type { Machine } from '@/types';

type CatalogueMachine = Pick<Machine, 'id' | 'name' | 'model' | 'type' | 'image' | 'description'>;

export default function MachineCatalogue({ machines }: { machines: CatalogueMachine[] }) {
  const [filter, setFilter] = useState<'all' | 'shredder' | 'briquetting'>('all');

  const filteredMachines = machines.filter((m) => filter === 'all' || m.type === filter);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[#282828]">Machine Catalogue</h2>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Filter */}
          <div className="flex bg-[#e0e0e0] p-1 rounded-lg">
            {[
              { id: 'all' as const, label: 'All Machines' },
              { id: 'shredder' as const, label: 'Shredders' },
              { id: 'briquetting' as const, label: 'Briquetting Presses' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-white text-[#0063ff] shadow-sm'
                    : 'text-[#6b6969] hover:text-[#282828]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Link href="/scan" className="flex items-center gap-2 text-[#0063ff] text-sm font-medium hover:underline">
            <QrCode size={16} />
            Scan QR instead
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredMachines.map((machine) => (
          <Link
            key={machine.id}
            href={`/machine/${machine.id}`}
            className="group bg-white rounded-2xl border border-[#dadada]/70 hover:border-[#0063ff]/40 hover:shadow-xl hover:shadow-[#0063ff]/5 transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* Machine image area */}
            <div className="relative h-48 bg-[#f3f2f2]">
              <Image
                src={machine.image}
                alt={machine.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                className="object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3">
                <span className="text-xs font-mono text-[#929292] uppercase tracking-wider bg-white/80 backdrop-blur px-2 py-1 rounded">
                  {machine.model}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-[#282828] text-lg leading-tight">{machine.name}</h3>
                <ChevronRight size={18} className="text-[#929292] group-hover:text-[#0063ff] group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
              </div>
              <p className="text-[#6b6969] text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
                {machine.description}
              </p>

              <div className="flex items-center gap-1.5 text-[#0063ff] text-sm font-semibold group-hover:gap-2.5 transition-all mt-auto">
                <Wrench size={14} />
                View parts &amp; order
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
