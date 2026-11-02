'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, Copy, Download, ExternalLink, Loader2, Printer, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { machineUrl } from '@/lib/machine-url';
import type { RegisteredMachine } from './types';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface MachineQrModalProps {
  machine: RegisteredMachine;
  justRegistered: boolean;
  onClose: () => void;
}

export default function MachineQrModal({ machine, justRegistered, onClose }: MachineQrModalProps) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = machineUrl(machine.serial_number);
  useEscapeKey(true, onClose);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 340, margin: 1, color: { dark: '#282828', light: '#ffffff' } })
      .then(setDataUrl)
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        setFailed(true);
      });
  }, [url]);

  const download = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${machine.serial_number}.png`;
    a.click();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // The sticker stays on the machine through resales, so it carries no client details
  const print = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const serial = escapeHtml(machine.serial_number);
    win.document.write(`
      <html>
        <head>
          <title>QR Code - ${serial}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
            .card { border: 2px solid #282828; border-radius: 16px; padding: 32px; text-align: center; max-width: 360px; }
            img { width: 260px; height: 260px; display: block; margin: 0 auto; }
            h2 { margin: 16px 0 4px; font-size: 20px; color: #282828; }
            .sn { font-family: monospace; font-size: 14px; font-weight: bold; color: #0063ff; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${dataUrl}" alt="QR Code" />
            <h2>${escapeHtml(machine.machine_type_name)}</h2>
            <div class="sn">${serial}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div role="dialog" aria-modal="true" aria-label={`QR sticker for ${machine.serial_number}`} className="w-full max-w-md max-h-full overflow-y-auto bg-white rounded-3xl shadow-2xl border border-[#dadada]/70 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#dadada]/50 bg-gradient-to-b from-[#f9f9f9] to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0063ff]/10 text-[#0063ff] flex items-center justify-center">
                <QrCode size={18} />
              </div>
              <div>
                <h3 className="font-bold text-[#282828] text-base leading-tight">{machine.machine_type_name}</h3>
                <p className="font-mono text-xs text-[#0063ff] font-semibold">{machine.serial_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 hover:bg-[#f3f2f2] rounded-xl text-[#929292] hover:text-[#282828] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col items-center">
            {justRegistered && (
              <p className="w-full mb-4 flex items-start gap-2 text-sm text-[#166534] bg-[#dcfce7] rounded-xl px-4 py-3">
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                Machine registered. Next, print this sticker and attach it to the machine.
              </p>
            )}

            <div className="p-3 bg-white rounded-2xl border border-[#dadada] shadow-md">
              {failed ? (
                <div className="w-64 h-64 flex items-center justify-center text-sm text-red-600 text-center">
                  The QR code could not be generated.
                </div>
              ) : !dataUrl ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-[#0063ff]" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL, nothing to optimise
                <img src={dataUrl} alt={`QR for ${machine.serial_number}`} className="w-64 h-64 rounded-xl" />
              )}
            </div>

            <div className="w-full mt-4 flex items-center gap-2 bg-[#f9f9f9] border border-[#dadada]/60 rounded-xl px-3 py-2">
              <span className="font-mono text-xs text-[#666] truncate flex-1">{url}</span>
              <button
                onClick={copyLink}
                className="text-xs font-semibold text-[#0063ff] hover:text-[#004fd4] flex items-center gap-1 cursor-pointer flex-shrink-0"
              >
                {copied ? <Check size={13} className="text-[#16a34a]" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
              <button
                onClick={print}
                disabled={!dataUrl}
                className="flex items-center justify-center gap-2 py-2.5 bg-[#282828] text-white rounded-xl text-sm font-semibold hover:bg-[#444] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer size={15} /> Print Sticker
              </button>
              <button
                onClick={download}
                disabled={!dataUrl}
                className="flex items-center justify-center gap-2 py-2.5 bg-[#0063ff] text-white rounded-xl text-sm font-semibold hover:bg-[#004fd4] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Download size={15} /> Download PNG
              </button>
            </div>

            <div className="w-full flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#dadada]/40 text-xs">
              <a
                href={`/machine/${encodeURIComponent(machine.serial_number)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0063ff] hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink size={12} /> Machine Parts Page
              </a>
              <Link href={`/admin/qr-codes?sn=${encodeURIComponent(machine.serial_number)}`} className="text-[#929292] hover:text-[#282828]">
                All stickers →
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
