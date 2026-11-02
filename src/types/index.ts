// A machine as published on gross-zerkleinerer.de (see scripts/sync-gross-site.mjs)
export interface GrossMachine {
  id: string;
  type: 'shredder' | 'briquetting';
  sourceUrl: string;
  name: string;
  category: string;
  label: string;
  summary: string;
  audience: string;
  intro: string;
  howItWorks: string;
  specs: Array<{ label: string; value: string }>;
  specsNote: string;
  brochureUrl: string | null;
  image: string;
  xrayImage: string;
  modules: Array<{ name: string; description: string; x: number; y: number }>;
}

export interface Machine extends Omit<GrossMachine, 'modules' | 'summary'> {
  model: string;
  serialNumber: string;
  description: string;
  modules: Module[];
}

export interface Module {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  parts: Part[];
}

export interface Part {
  id: string;
  // Empty until GROSS supplies real part numbers
  partNumber: string;
  name: string;
  description: string;
  // Null means price on request: GROSS doesn't publish prices, so staff enter them in admin
  price: number | null;
  currency: string;
  // Null means not shown to customers
  availability: 'in-stock' | 'low-stock' | 'on-order' | null;
  leadTimeDays?: number;
  category: string;
}

export interface CartItem {
  part: Part;
  moduleName: string;
  quantity: number;
}

// The machine a cart is being ordered for; one order always covers one machine
export interface CartMachine {
  typeId: string;
  name: string;
  serialNumber: string | null;
}
