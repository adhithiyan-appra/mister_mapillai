export interface TrackingStage {
  title: string;
  description: string;
}

export interface OrderRecord {
  id: string;
  name: string;
  phone: string;
  city?: string;
  events: string;
  date: string;
  look: string;
  outfits: string;
  theme?: string;
  budget?: string;
  mode?: string;
  appt?: string;
  notes?: string;
  stage: number;
  next: string;
  dates: readonly string[];
}

export const trackingStages: readonly TrackingStage[] = [
  { title: 'Order Received', description: 'We have your booking' },
  { title: 'Consultation Done', description: 'Your style & events finalised' },
  { title: 'Design Approved', description: 'Sketches & fabrics confirmed' },
  { title: 'Measurements Taken', description: 'Precise fit recorded' },
  { title: 'Stitching', description: 'Our tailors are crafting your look' },
  { title: 'Fitting / Trial', description: 'Try-on and refinements' },
  { title: 'Final Touches', description: 'Pressing, finishing & quality check' },
  { title: 'Ready / Delivered', description: 'Your look is wedding-ready' },
];

export const sampleOrders: readonly OrderRecord[] = [
  {
    id: 'MM-2611-0042',
    name: 'Karthik Raman',
    phone: '9876543210',
    events: 'Muhurtham, Reception',
    date: '2026-12-06',
    look: 'Temple Gold Heritage',
    outfits: '2–3',
    stage: 4,
    next: 'Trial fitting on 24 Nov, 4 PM at studio',
    dates: ['02 Nov', '05 Nov', '09 Nov', '12 Nov', '15 Nov'],
  },
  {
    id: 'MM-0911-0117',
    name: 'Karthik Raman',
    phone: '9876543210',
    events: 'Engagement',
    date: '2026-11-28',
    look: 'Engagement Ivory Jacket',
    outfits: '1 (Groom only)',
    stage: 6,
    next: 'Pickup ready from 22 Nov',
    dates: ['20 Oct', '23 Oct', '26 Oct', '29 Oct', '03 Nov', '10 Nov', '16 Nov'],
  },
  {
    id: 'MM-1511-0233',
    name: 'Arun Prakash',
    phone: '9123456780',
    events: 'Reception',
    date: '2027-01-18',
    look: 'Royal Maroon Bandhgala',
    outfits: '1 (Groom only)',
    stage: 1,
    next: 'Design review on 21 Nov, 11 AM (video call)',
    dates: ['15 Nov'],
  },
];

const STORAGE_KEY = 'mm_orders';
let memoryOrders: OrderRecord[] = [];

export function getStoredOrders(): OrderRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrderRecord[]) : [];
  } catch {
    return memoryOrders;
  }
}

export function saveOrder(order: OrderRecord): void {
  const existing = getStoredOrders();
  const updated = [...existing, order];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    memoryOrders = updated;
  }
}

export function findOrders(query: string): OrderRecord[] {
  const normalized = query.trim().toUpperCase().replace(/\s/g, '');
  if (!normalized) return [];
  const strippedPhone = normalized.replace(/^(\+?91)/, '');
  const isPhone = /^\d{10}$/.test(strippedPhone);
  const all = [...sampleOrders, ...getStoredOrders()];
  return all.filter(order => (isPhone ? order.phone === strippedPhone : order.id.toUpperCase() === normalized));
}
