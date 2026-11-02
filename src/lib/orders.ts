export const ORDER_STATUSES = ['new', 'processing', 'shipped', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The steps an order can take; enforced by the API and used to build the admin buttons
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['processing', 'cancelled'],
  processing: ['shipped', 'new', 'cancelled'],
  shipped: ['processing'],
  cancelled: ['new'],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

// The reference customers see, also shown to staff so the two can be matched up
export function orderReference(orderId: string): string {
  return `GRS-${orderId.slice(0, 8).toUpperCase()}`;
}
