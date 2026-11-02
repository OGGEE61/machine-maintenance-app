import { Download } from 'lucide-react';
import type { Machine } from '@/types';

export default function MachineDetails({ machine }: { machine: Machine }) {
  return (
    <section aria-label={`About the ${machine.name}`} className="bg-[#f9f9f9] border-t border-[#f1f1f1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-2 gap-10">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-[#0063ff] uppercase tracking-widest mb-2">{machine.category}</p>
          <h2 className="text-2xl font-bold text-[#282828] mb-1">{machine.name}</h2>
          {machine.label && <p className="text-[#929292] text-sm mb-4">{machine.label}</p>}
          <p className="text-[#282828] leading-relaxed mb-6">{machine.intro}</p>

          <h3 className="font-bold text-[#282828] mb-2">How it works</h3>
          <p className="text-[#6b6969] text-sm leading-relaxed mb-6">{machine.howItWorks}</p>

          {machine.brochureUrl && (
            <a
              href={machine.brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#282828] text-white rounded-xl text-sm font-medium hover:bg-[#444] transition-colors"
            >
              <Download size={16} /> Download brochure (PDF)
            </a>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-bold text-[#282828] mb-3">Technical specifications</h3>
          <dl className="bg-white rounded-2xl border border-[#dadada]/70 divide-y divide-[#dadada]/40">
            {machine.specs.map((spec) => (
              <div key={spec.label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="text-[#6b6969]">{spec.label}</dt>
                <dd className="font-medium text-[#282828] text-right">{spec.value}</dd>
              </div>
            ))}
          </dl>
          {machine.specsNote && <p className="text-[#929292] text-xs leading-relaxed mt-3">{machine.specsNote}</p>}
        </div>
      </div>
    </section>
  );
}
