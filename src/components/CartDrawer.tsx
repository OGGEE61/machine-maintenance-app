'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, X, Minus, Plus, Trash2, Send, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { formatPrice } from '@/lib/price';
import type { CartItem } from '@/types';
import { useState } from 'react';
import OrderConfirmation, { SubmittedOrder } from './OrderConfirmation';

const emptyContact = { name: '', email: '', phone: '', notes: '', website: '' };

const inputClass = 'w-full border border-[#dadada] rounded-xl px-4 py-2.5 text-sm text-[#282828] focus:outline-none focus:border-[#0063ff] transition-colors bg-white';
const labelClass = 'text-xs font-medium text-[#6b6969] block mb-1';

function CartTotal({ items, totalPrice }: { items: CartItem[]; totalPrice: number }) {
  const unpriced = items.filter((item) => item.part.price === null).length;
  if (unpriced === items.length) {
    return <p className="text-[#6b6969] text-sm">The GROSS sales team will send you a quote for these parts.</p>;
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6b6969] text-sm">
        Subtotal (excl. VAT){unpriced > 0 && `, plus ${unpriced} on request`}
      </span>
      <span className="text-[#282828] font-bold text-xl">€{totalPrice.toFixed(2)}</span>
    </div>
  );
}

export default function CartDrawer() {
  const {
    items,
    machine,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    isOpen,
    setIsOpen,
  } = useCart();
  const [step, setStep] = useState<'items' | 'details'>('items');
  const [contact, setContact] = useState(emptyContact);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);

  const showDetails = step === 'details' && items.length > 0;

  useEscapeKey(isOpen, () => setIsOpen(false));

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineTypeId: machine.typeId,
          serialNumber: machine.serialNumber,
          customerName: contact.name,
          customerEmail: contact.email,
          customerPhone: contact.phone,
          notes: contact.notes,
          website: contact.website,
          items: items.map((item) => ({ partId: item.part.id, quantity: item.quantity })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.orderId) {
        setError(data?.error ?? 'We could not send your order. Please try again.');
        return;
      }
      setSubmittedOrder({ orderId: data.orderId, lines: data.lines, total: data.total, machine, customerEmail: contact.email.trim() });
      setContact((prev) => ({ ...prev, notes: '' }));
      setStep('items');
      setIsOpen(false);
      clearCart();
    } catch {
      setError('We could not reach the server. Your cart is still here, so please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Cart header */}
              <div className="flex items-center justify-between p-5 border-b border-[#f1f1f1]">
                <div className="flex items-center gap-3 min-w-0">
                  {showDetails ? (
                    <button
                      onClick={() => setStep('items')}
                      className="flex items-center justify-center w-8 h-8 -ml-1 rounded-lg hover:bg-[#f1f1f1] transition-colors cursor-pointer"
                      aria-label="Back to cart"
                    >
                      <ArrowLeft size={18} className="text-[#6b6969]" />
                    </button>
                  ) : (
                    <ShoppingCart size={20} className="text-[#282828]" />
                  )}
                  <h2 className="text-[#282828] font-bold text-lg">
                    {showDetails ? 'Your Details' : 'Order Request'}
                  </h2>
                  <span className="bg-[#f1f1f1] text-[#6b6969] text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f1f1f1] transition-colors cursor-pointer"
                  aria-label="Close cart"
                >
                  <X size={18} className="text-[#6b6969]" />
                </button>
              </div>

              {/* The machine this order is for */}
              {machine && (
                <div className="px-5 py-2.5 bg-[#f9f9f9] border-b border-[#f1f1f1] text-xs text-[#6b6969]">
                  For: <span className="font-medium text-[#282828]">{machine.name}</span>
                  {machine.serialNumber && <span className="font-mono text-[#929292] ml-2">S/N: {machine.serialNumber}</span>}
                </div>
              )}

              {showDetails ? (
                <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <p className="text-[#6b6969] text-sm">
                      The GROSS sales team will use these details to send you a quote.
                    </p>
                    <div>
                      <label htmlFor="order-name" className={labelClass}>Name / company *</label>
                      <input
                        id="order-name"
                        required
                        maxLength={200}
                        autoComplete="organization"
                        value={contact.name}
                        onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="order-email" className={labelClass}>Email *</label>
                      <input
                        id="order-email"
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={contact.email}
                        onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="order-phone" className={labelClass}>Phone</label>
                      <input
                        id="order-phone"
                        type="tel"
                        maxLength={40}
                        autoComplete="tel"
                        value={contact.phone}
                        onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="order-notes" className={labelClass}>Notes</label>
                      <textarea
                        id="order-notes"
                        rows={3}
                        maxLength={2000}
                        value={contact.notes}
                        onChange={(e) => setContact((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Delivery address, urgency, anything else we should know"
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                    {/* Honeypot for spam bots: hidden from people and skipped by keyboard */}
                    <div className="absolute -left-[9999px]" aria-hidden="true">
                      <label htmlFor="order-website">Website</label>
                      <input
                        id="order-website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={contact.website}
                        onChange={(e) => setContact((p) => ({ ...p, website: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#f1f1f1] p-5 space-y-4">
                    {error && (
                      <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        {error}
                      </p>
                    )}
                    <CartTotal items={items} totalPrice={totalPrice} />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-[#d6ff41] text-[#282828] font-bold rounded-xl hover:bg-[#c0e33a] transition-all duration-200 shadow-lg shadow-[#d6ff41]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      {submitting ? 'Sending…' : 'Submit Order Request'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Cart items */}
                  <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#f1f1f1] flex items-center justify-center mb-4">
                          <ShoppingCart size={28} className="text-[#dadada]" />
                        </div>
                        <p className="text-[#6b6969] font-medium mb-1">Your cart is empty</p>
                        <p className="text-[#929292] text-sm">
                          Click the + buttons on the machine diagram to browse spare parts.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {items.map((item) => (
                          <motion.div
                            key={item.part.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#f9f9f9] rounded-xl p-4 border border-[#f1f1f1]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0 mr-3">
                                {item.part.partNumber && (
                                  <p className="font-mono text-[10px] text-[#929292] uppercase tracking-wide">
                                    {item.part.partNumber}
                                  </p>
                                )}
                                <h4 className="text-[#282828] font-medium text-sm">
                                  {item.part.name}
                                </h4>
                                {item.moduleName !== item.part.name && (
                                  <p className="text-[#929292] text-[11px] mt-0.5">
                                    Module: {item.moduleName}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(item.part.id)}
                                className="text-[#c1c1c1] hover:text-red-500 transition-colors p-1 cursor-pointer"
                                aria-label={`Remove ${item.part.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-white border border-[#f1f1f1] rounded-lg">
                                <button
                                  onClick={() => updateQuantity(item.part.id, item.quantity - 1)}
                                  className="p-1.5 hover:bg-[#f1f1f1] rounded-l-lg transition-colors cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={14} className="text-[#6b6969]" />
                                </button>
                                <span className="text-sm font-medium text-[#282828] w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.part.id, item.quantity + 1)}
                                  className="p-1.5 hover:bg-[#f1f1f1] rounded-r-lg transition-colors cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={14} className="text-[#6b6969]" />
                                </button>
                              </div>
                              <span className="text-[#282828] font-bold">
                                {formatPrice(item.part.price, item.quantity)}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cart footer */}
                  {items.length > 0 && (
                    <div className="border-t border-[#f1f1f1] p-5 space-y-4">
                      <CartTotal items={items} totalPrice={totalPrice} />

                      <button
                        onClick={() => { setError(''); setStep('details'); }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-[#d6ff41] text-[#282828] font-bold rounded-xl hover:bg-[#c0e33a] transition-all duration-200 shadow-lg shadow-[#d6ff41]/20 cursor-pointer"
                      >
                        Continue to Your Details
                      </button>

                      <button
                        onClick={clearCart}
                        className="w-full text-center text-[#929292] text-xs hover:text-[#6b6969] transition-colors cursor-pointer"
                      >
                        Clear all items
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <OrderConfirmation order={submittedOrder} onClose={() => setSubmittedOrder(null)} />
    </>
  );
}
