'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Printer,
  Download,
  QrCode,
  Search,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { machines as machineTypes } from '@/data/machines';

interface RegisteredMachine {
  serial_number: string;
  machine_type_id: string;
  machine_type_name: string;
  client_name: string;
  client_email: string;
}

interface QRCard {
  serialNumber: string;
  machineTypeId: string;
  machineTypeName: string;
  clientName: string;
  dataUrl: string;
}

function QRCodesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusSN = searchParams.get('sn');

  const [qrCards, setQrCards] = useState<QRCard[]>([]);
  const [selectedSN, setSelectedSN] = useState<string | null>(focusSN);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const highlightSectionRef = useRef<HTMLDivElement>(null);

  const generateQR = useCallback(async (url: string): Promise<string> => {
    return QRCode.toDataURL(url, { width: 300, margin: 1, color: { dark: '#282828', light: '#ffffff' } });
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/machines-db');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      const list: RegisteredMachine[] = data.machines ?? [];

      const cards: QRCard[] = await Promise.all(
        list.map(async (m) => {
          const url = `${window.location.origin}/machine/${m.serial_number}`;
          const dataUrl = await generateQR(url);
          const typeName = machineTypes.find((t) => t.id === m.machine_type_id)?.name ?? m.machine_type_name;
          return {
            serialNumber: m.serial_number,
            machineTypeId: m.machine_type_id,
            machineTypeName: typeName,
            clientName: m.client_name,
            dataUrl,
          };
        })
      );
      setQrCards(cards);
      setLoading(false);

      // If URL had a specific SN, pick it; otherwise default to the first machine
      if (focusSN) {
        setSelectedSN(focusSN);
      } else if (cards.length > 0) {
        setSelectedSN(cards[0].serialNumber);
      }
    }
    load();
  }, [router, generateQR, focusSN]);

  const handleSelectCard = (sn: string | null, shouldScroll = false) => {
    setSelectedSN(sn);
    const newUrl = sn ? `/admin/qr-codes?sn=${encodeURIComponent(sn)}` : '/admin/qr-codes';
    window.history.replaceState(null, '', newUrl);

    if (shouldScroll && highlightSectionRef.current) {
      highlightSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const downloadSingle = (card: QRCard) => {
    const a = document.createElement('a');
    a.href = card.dataUrl;
    a.download = `qr-${card.serialNumber}.png`;
    a.click();
  };

  const copyMachineLink = (sn: string) => {
    const url = `${window.location.origin}/machine/${sn}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const focusedCard = selectedSN ? qrCards.find((c) => c.serialNumber === selectedSN) : null;
  const currentIndex = focusedCard ? qrCards.findIndex((c) => c.serialNumber === focusedCard.serialNumber) : -1;

  const handlePrev = () => {
    if (qrCards.length === 0) return;
    const prevIdx = (currentIndex - 1 + qrCards.length) % qrCards.length;
    handleSelectCard(qrCards[prevIdx].serialNumber);
  };

  const handleNext = () => {
    if (qrCards.length === 0) return;
    const nextIdx = (currentIndex + 1) % qrCards.length;
    handleSelectCard(qrCards[nextIdx].serialNumber);
  };

  const filteredCards = qrCards.filter((card) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      card.serialNumber.toLowerCase().includes(q) ||
      card.machineTypeName.toLowerCase().includes(q) ||
      (card.clientName && card.clientName.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } .print-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; } }`}</style>
      <div className="min-h-screen bg-[#f9f9f9]">
        {/* Header */}
        <header className="no-print fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-[#dadada]/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-[#f3f2f2] rounded-lg transition-colors cursor-pointer"
                title="Back to dashboard"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="font-bold text-[#282828]">QR Code Manager</span>
                <span className="text-xs text-[#929292] ml-2 hidden sm:inline">({qrCards.length} machines)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-[#282828] text-white rounded-xl text-sm font-medium hover:bg-[#444] transition-colors cursor-pointer"
              >
                <Printer size={16} /> Print All
              </button>
            </div>
          </div>
        </header>

        <main className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
            <div className="text-center py-24 text-[#929292]">Generating QR codes…</div>
          ) : qrCards.length === 0 ? (
            <div className="text-center py-24">
              <QrCode size={48} className="text-[#dadada] mx-auto mb-4" />
              <p className="text-[#929292] mb-4">No registered machines yet.</p>
              <button
                onClick={() => router.push('/admin')}
                className="px-6 py-3 bg-[#282828] text-white font-bold rounded-xl hover:bg-[#444] transition-colors cursor-pointer"
              >
                Register a Machine
              </button>
            </div>
          ) : (
            <>
              {/* Highlighted / Focused Card */}
              <div ref={highlightSectionRef}>
                <AnimatePresence mode="wait">
                  {focusedCard ? (
                    <motion.div
                      key={focusedCard.serialNumber}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="no-print mb-8 bg-white rounded-2xl border border-[#0063ff]/40 p-6 shadow-lg shadow-[#0063ff]/5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0063ff] via-[#4f46e5] to-[#0063ff]" />

                      {/* Top bar of highlighted card */}
                      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#dadada]/40 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0063ff]/10 text-[#0063ff] text-xs font-semibold rounded-full">
                            <CheckCircle2 size={13} /> Highlighted Machine
                          </span>
                          <span className="text-xs text-[#929292] font-mono">
                            {currentIndex + 1} of {qrCards.length}
                          </span>
                        </div>

                        {/* Switch machine dropdown & navigation */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-[#f3f2f2] rounded-xl p-1 gap-1">
                            <button
                              onClick={handlePrev}
                              className="p-1.5 hover:bg-white rounded-lg text-[#282828] transition-colors cursor-pointer"
                              title="Previous machine"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <select
                              value={focusedCard.serialNumber}
                              onChange={(e) => handleSelectCard(e.target.value)}
                              className="bg-transparent text-xs font-medium text-[#282828] px-2 py-1 focus:outline-none cursor-pointer max-w-[200px] truncate"
                            >
                              {qrCards.map((c) => (
                                <option key={c.serialNumber} value={c.serialNumber}>
                                  {c.serialNumber} — {c.machineTypeName}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleNext}
                              className="p-1.5 hover:bg-white rounded-lg text-[#282828] transition-colors cursor-pointer"
                              title="Next machine"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>

                          <button
                            onClick={() => handleSelectCard(null)}
                            className="p-2 text-[#929292] hover:text-[#282828] hover:bg-[#f3f2f2] rounded-xl transition-colors cursor-pointer"
                            title="Close highlight"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Main info */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="p-2 bg-white rounded-2xl border border-[#dadada] shadow-sm flex-shrink-0">
                          <img
                            src={focusedCard.dataUrl}
                            alt="QR"
                            className="w-36 h-36 rounded-xl"
                          />
                        </div>

                        <div className="flex-1 text-center sm:text-left min-w-0">
                          <p className="font-bold text-[#282828] text-2xl">{focusedCard.machineTypeName}</p>
                          <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                            <span className="font-mono text-sm font-semibold text-[#0063ff] bg-[#0063ff]/10 px-2 py-0.5 rounded-lg">
                              {focusedCard.serialNumber}
                            </span>
                          </div>
                          <p className="text-sm text-[#929292] mt-2">
                            {focusedCard.clientName ? `Client: ${focusedCard.clientName}` : 'No client assigned'}
                          </p>

                          {/* Quick URL snippet */}
                          <div className="mt-3 flex items-center gap-2 bg-[#f9f9f9] border border-[#dadada]/60 rounded-xl px-3 py-1.5 max-w-md">
                            <span className="font-mono text-xs text-[#666] truncate flex-1">
                              {typeof window !== 'undefined' ? `${window.location.origin}/machine/${focusedCard.serialNumber}` : `/machine/${focusedCard.serialNumber}`}
                            </span>
                            <button
                              onClick={() => copyMachineLink(focusedCard.serialNumber)}
                              className="text-xs text-[#0063ff] hover:text-[#004fd4] font-medium flex items-center gap-1 cursor-pointer flex-shrink-0"
                            >
                              {copied ? <Check size={12} className="text-[#16a34a]" /> : <Copy size={12} />}
                              {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex sm:flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() => downloadSingle(focusedCard)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0063ff] text-white rounded-xl text-sm font-medium hover:bg-[#004fd4] transition-colors cursor-pointer shadow-sm"
                          >
                            <Download size={15} /> Download PNG
                          </button>
                          <a
                            href={`/machine/${focusedCard.serialNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f3f2f2] text-[#282828] rounded-xl text-sm font-medium hover:bg-[#e8e8e8] transition-colors cursor-pointer"
                          >
                            <ExternalLink size={15} /> Parts Page
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="no-print mb-8 p-4 bg-white rounded-2xl border border-dashed border-[#dadada] flex items-center justify-between text-sm text-[#929292]">
                      <div className="flex items-center gap-2">
                        <QrCode size={18} className="text-[#0063ff]" />
                        <span>Click any machine below to highlight it and access its QR code.</span>
                      </div>
                      {qrCards.length > 0 && (
                        <button
                          onClick={() => handleSelectCard(qrCards[0].serialNumber)}
                          className="text-xs font-semibold text-[#0063ff] hover:underline cursor-pointer"
                        >
                          Highlight first
                        </button>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Filter and stats bar */}
              <div className="no-print flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#929292]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by serial number, model, or client…"
                    className="w-full bg-white border border-[#dadada] rounded-xl pl-10 pr-4 py-2 text-sm text-[#282828] placeholder-[#929292] focus:outline-none focus:border-[#0063ff] transition-colors shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#929292] hover:text-[#282828]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="text-xs text-[#929292] flex items-center gap-3">
                  <span>Showing: <strong>{filteredCards.length}</strong> of {qrCards.length}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Click card to change highlighted machine</span>
                </div>
              </div>

              {/* Cards Grid */}
              <div ref={printRef} className="print-grid grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredCards.map((card, i) => {
                  const isSelected = card.serialNumber === selectedSN;
                  return (
                    <motion.div
                      key={card.serialNumber}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => handleSelectCard(card.serialNumber, true)}
                      className={`bg-white rounded-2xl border p-5 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 relative group ${
                        isSelected
                          ? 'border-[#0063ff] ring-2 ring-[#0063ff]/20 bg-[#f0f6ff]/20 shadow-md -translate-y-0.5'
                          : 'border-[#dadada]/70 hover:border-[#0063ff]/50 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Active indicator badge */}
                      {isSelected ? (
                        <div className="no-print absolute top-3 right-3 flex items-center gap-1 text-[11px] font-semibold bg-[#0063ff] text-white px-2 py-0.5 rounded-full shadow-xs">
                          <Check size={11} /> Highlighted
                        </div>
                      ) : (
                        <div className="no-print absolute top-3 right-3 text-[11px] font-medium text-[#929292] opacity-0 group-hover:opacity-100 transition-opacity bg-[#f3f2f2] px-2 py-0.5 rounded-full">
                          Select ↗
                        </div>
                      )}

                      <div className="p-2 bg-white rounded-xl border border-[#dadada]/50 shadow-xs mt-1">
                        <img
                          src={card.dataUrl}
                          alt={`QR for ${card.serialNumber}`}
                          className="w-40 h-40 rounded-lg"
                        />
                      </div>

                      <div className="text-center w-full px-1">
                        <p className="font-bold text-[#282828] text-sm truncate" title={card.machineTypeName}>
                          {card.machineTypeName}
                        </p>
                        <p className="font-mono text-xs text-[#0063ff] font-semibold mt-0.5">
                          {card.serialNumber}
                        </p>
                        {card.clientName ? (
                          <p className="text-xs text-[#929292] mt-0.5 truncate" title={card.clientName}>
                            {card.clientName}
                          </p>
                        ) : (
                          <p className="text-xs text-[#dadada] mt-0.5">—</p>
                        )}
                      </div>

                      <div className="no-print flex items-center gap-3 pt-1 border-t border-[#dadada]/30 w-full justify-between">
                        <span className="text-[11px] text-[#929292] group-hover:text-[#0063ff] transition-colors">
                          {isSelected ? 'Active' : 'Click to highlight'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingle(card);
                          }}
                          className="flex items-center gap-1 text-xs text-[#282828] hover:text-[#0063ff] px-2 py-1 hover:bg-[#f3f2f2] rounded-lg transition-colors cursor-pointer"
                          title="Download PNG file"
                        >
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default function QRCodesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-[#929292]">Loading…</div>}>
      <QRCodesContent />
    </Suspense>
  );
}

