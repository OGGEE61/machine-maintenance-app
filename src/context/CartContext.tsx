'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
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

const CartContext = createContext<CartContextType | undefined>(undefined);

// A catalogue page has no serial number, so it counts as the same machine as a scanned one of that type
export function isSameMachine(a: CartMachine, b: CartMachine): boolean {
  if (a.typeId !== b.typeId) return false;
  return !a.serialNumber || !b.serialNumber || a.serialNumber === b.serialNumber;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [machine, setMachine] = useState<CartMachine | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((part: Part, moduleName: string, partMachine: CartMachine) => {
    setMachine((prev) =>
      prev && isSameMachine(prev, partMachine)
        ? { ...prev, serialNumber: prev.serialNumber ?? partMachine.serialNumber }
        : partMachine
    );
    setItems((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        return prev.map((item) =>
          item.part.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { part, moduleName, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((partId: string) => {
    setItems((prev) => prev.filter((item) => item.part.id !== partId));
  }, []);

  const updateQuantity = useCallback((partId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.part.id !== partId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.part.id === partId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setMachine(null);
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
