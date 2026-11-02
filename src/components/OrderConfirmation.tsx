'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Printer } from 'lucide-react';
import { CartMachine } from '@/types';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { orderReference } from '@/lib/orders';

// An order the server has confirmed it saved; this dialog is only shown for those
export interface SubmittedOrder {
  orderId: string;
  // As returned by the server, so these are the parts and prices that were actually saved
  lines: Array<{ partNumber: string; partName: string; quantity: number; unitPrice: number }>;
  total: number;
  machine: CartMachine;
  customerEmail: string;
}

interface OrderConfirmationProps {
  order: SubmittedOrder | null;
  onClose: () => void;
}

export default function OrderConfirmation({ order, onClose }: OrderConfirmationProps) {
  useEscapeKey(!!order, onClose);

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl z-[60] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 text-center border-b border-[#f1f1f1]">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f1f1] transition-colors cursor-pointer"
                aria-label="Close confirmation"
              >
                <X size={18} className="text-[#6b6969]" />
              </button>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#d6ff41]/20 mb-3"
              >
                <CheckCircle size={32} className="text-[#0063ff]" />
              </motion.div>
              <h2 className="text-[#282828] font-bold text-xl mb-1">Order Request Submitted</h2>
              <p className="text-[#6b6969] text-sm">
                Your request has been sent to the GROSS sales team. They will contact you at {order.customerEmail} with a quote.
              </p>
            </div>

            {/* Order details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#929292] uppercase tracking-widest">Order Reference</span>
                <span className="font-mono text-sm font-bold text-[#0063ff]">{orderReference(order.orderId)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#929292] uppercase tracking-widest">Machine</span>
                <span className="text-sm font-medium text-[#282828] text-right">
                  {order.machine.name}
                  {order.machine.serialNumber && <span className="font-mono text-xs text-[#929292] ml-2">{order.machine.serialNumber}</span>}
                </span>
              </div>

              <div className="space-y-2">
                {order.lines.map((line) => (
                  <div key={line.partNumber} className="flex items-center justify-between py-2 border-b border-[#f1f1f1] last:border-0">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm text-[#282828] font-medium truncate">{line.partName}</p>
                      <p className="text-[11px] text-[#929292] font-mono">{line.partNumber} × {line.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-[#282828] whitespace-nowrap">
                      €{(line.unitPrice * line.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-[#282828]">
                <span className="font-bold text-[#282828]">Total (excl. VAT)</span>
                <span className="font-bold text-xl text-[#282828]">€{order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-[#f1f1f1] flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#dadada] text-[#6b6969] rounded-xl hover:bg-[#f9f9f9] transition-colors text-sm font-medium cursor-pointer"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#282828] text-white rounded-xl hover:bg-[#141414] transition-colors text-sm font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
