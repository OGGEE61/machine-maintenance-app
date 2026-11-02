'use client';

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
import { CartItem, CartMachine, Part } from '@/types';

interface CartContextType {
  items: CartItem[];
  machine: CartMachine | null;
  addItem: (part: Part, moduleName: string, machine: CartMachine) => void;
  removeItem: (partId: string) => void;
  updateQuantity: (partId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface CartState {
  items: CartItem[];
  machine: CartMachine | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'gross-cart-v1';
const EMPTY_CART: CartState = { items: [], machine: null };

// The cart lives in localStorage so it survives a refresh or a phone closing the tab.
// Storage can be unavailable or hold anything, so reads and writes must never throw.
function readStoredCart(): CartState {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(stored?.items) && stored.items.length > 0 && stored.machine?.typeId) {
      return { items: stored.items, machine: stored.machine };
    }
  } catch {
    // Fall through to an empty cart
  }
  return EMPTY_CART;
}

let cart: CartState | null = null;
const listeners = new Set<() => void>();

function getCart(): CartState {
  cart ??= readStoredCart();
  return cart;
}

function setCart(update: (current: CartState) => CartState) {
  cart = update(getCart());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // The cart still works for this page view
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cart = readStoredCart();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// A catalogue page has no serial number, so it counts as the same machine as a scanned one of that type
export function isSameMachine(a: CartMachine, b: CartMachine): boolean {
  if (a.typeId !== b.typeId) return false;
  return !a.serialNumber || !b.serialNumber || a.serialNumber === b.serialNumber;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, machine } = useSyncExternalStore(subscribe, getCart, () => EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((part: Part, moduleName: string, partMachine: CartMachine) => {
    setCart((current) => {
      const existing = current.items.find((item) => item.part.id === part.id);
      return {
        machine: current.machine && isSameMachine(current.machine, partMachine)
          ? { ...current.machine, serialNumber: current.machine.serialNumber ?? partMachine.serialNumber }
          : partMachine,
        items: existing
          ? current.items.map((item) =>
              item.part.id === part.id ? { ...item, quantity: item.quantity + 1 } : item
            )
          : [...current.items, { part, moduleName, quantity: 1 }],
      };
    });
  }, []);

  const removeItem = useCallback((partId: string) => {
    setCart((current) => ({ ...current, items: current.items.filter((item) => item.part.id !== partId) }));
  }, []);

  const updateQuantity = useCallback((partId: string, quantity: number) => {
    setCart((current) => ({
      ...current,
      items: quantity <= 0
        ? current.items.filter((item) => item.part.id !== partId)
        : current.items.map((item) => (item.part.id === partId ? { ...item, quantity } : item)),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(() => EMPTY_CART);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.part.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        machine: items.length > 0 ? machine : null,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
