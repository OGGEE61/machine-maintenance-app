import type { OrderStatus } from '@/lib/orders';

export interface MachineTypeOption {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  serial_number: string | null;
  machine_type_id: string | null;
  status: OrderStatus;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  registered_client: string | null;
  created_at: string;
  items: Array<{ id: string; partNumber: string | null; partName: string; quantity: number; unitPrice: number | null; currency: string }>;
}

export interface RegisteredMachine {
  serial_number: string;
  machine_type_id: string;
  machine_type_name: string;
  client_name: string | null;
  client_email: string | null;
  client_address: string | null;
  client_phone: string | null;
  installed_at: string | null;
  notes: string | null;
  order_count: number;
  created_at: string;
}
