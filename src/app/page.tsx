import Link from 'next/link';
import { QrCode, Wrench, Package } from 'lucide-react';
import { machines } from '@/data/machines';
import MachineCatalogue from '@/components/MachineCatalogue';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-[#dadada]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#282828] font-bold text-xl tracking-tight">GROSS</span>
            <span className="text-[#0063ff] font-mono text-[10px] uppercase tracking-widest border border-[#0063ff]/30 rounded px-1.5 py-0.5">
              Service App
            </span>
          </div>
          <Link
            href="/scan"
            className="flex items-center gap-2 px-4 py-2 bg-[#282828] text-white rounded-lg text-sm font-medium hover:bg-[#444] transition-colors"
          >
            <QrCode size={16} />
            Scan QR Code
          </Link>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero strip */}
        <section className="bg-[#282828] text-white py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl">
              <span className="font-mono text-[10px] text-[#d6ff41] uppercase tracking-[0.2em] bg-[#d6ff41]/10 px-3 py-1.5 rounded-full">
                [ After-Sales Portal ]
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold mt-5 mb-4 leading-tight">
                Order spare parts.<br />
                <span className="text-[#d6ff41]">Instantly.</span>
              </h1>
              <p className="text-[#a0a0a0] text-lg leading-relaxed mb-8">
                Select your GROSS machine below, or scan the QR code on the machine to go directly to its parts page.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: QrCode, label: 'Scan', desc: 'QR on your machine' },
                  { icon: Wrench, label: 'Click', desc: 'the part you need' },
                  { icon: Package, label: 'Order', desc: 'in seconds' },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
                    <step.icon size={16} className="text-[#d6ff41]" />
                    <span className="text-sm font-semibold">{step.label}</span>
                    <span className="text-[#a0a0a0] text-sm">{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Only what the cards need, so the full parts catalogue isn't sent to every visitor */}
        <MachineCatalogue
          machines={machines.map(({ id, name, model, type, image, description }) => ({ id, name, model, type, image, description }))}
        />
      </main>
    </div>
  );
}
