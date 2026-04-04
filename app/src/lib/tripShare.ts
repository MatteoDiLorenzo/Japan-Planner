import type { BudgetItem, DayPlan, Hotel } from '@/types';

export type TripSnapshotV2 = {
  v: 2;
  tripId: string;
  name: string;
  attractionIds: string[];
  selectedHotels: Hotel[];
  customHotels: Hotel[];
  dayPlans: DayPlan[];
  budgetItems: BudgetItem[];
  totalBudget: number;
  updatedAt: string;
};

export type TripManifestEntry = {
  id: string;
  name: string;
  updatedAt: string;
};

/** Base64url (UTF-8) per uso in hash URL */
export function toBase64Url(text: string): string {
  const utf8 = new TextEncoder().encode(text);
  let bin = '';
  utf8.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeSnapshot(snapshot: TripSnapshotV2): string {
  return toBase64Url(JSON.stringify(snapshot));
}

/** ID attrazioni rinominati (es. stesso id usato prima per la fermata metro). */
const LEGACY_ATTRACTION_ID_MAP: Record<string, string> = {
  'kiyosumi-shirakawa': 'kiyosumi-shirakawa-area',
};

export function migrateAttractionId(id: string): string {
  return LEGACY_ATTRACTION_ID_MAP[id] ?? id;
}

export function migrateTripSnapshot(snap: TripSnapshotV2): TripSnapshotV2 {
  return {
    ...snap,
    attractionIds: snap.attractionIds.map(migrateAttractionId),
    dayPlans: (snap.dayPlans || []).map((day) => ({
      ...day,
      activities: (day.activities || []).map((act) => ({
        ...act,
        attractionId: migrateAttractionId(act.attractionId),
      })),
    })),
  };
}

export function decodeSnapshot(encoded: string): TripSnapshotV2 {
  const raw = fromBase64Url(encoded.trim());
  const data = JSON.parse(raw) as TripSnapshotV2;
  if (data.v !== 2) throw new Error('Formato itinerario non supportato');
  if (!data.tripId || !Array.isArray(data.attractionIds)) throw new Error('Dati itinerario non validi');
  return migrateTripSnapshot(data);
}

export const STORAGE_MANIFEST = 'giappo-v2-manifest';
export const STORAGE_ACTIVE = 'giappo-v2-active-trip';
export const tripStorageKey = (id: string) => `giappo-v2-trip-${id}`;

export function readManifest(): TripManifestEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_MANIFEST);
    if (!raw) return [];
    const p = JSON.parse(raw) as { trips?: TripManifestEntry[] };
    return Array.isArray(p.trips) ? p.trips : [];
  } catch {
    return [];
  }
}

export function writeManifest(trips: TripManifestEntry[]) {
  localStorage.setItem(STORAGE_MANIFEST, JSON.stringify({ trips }));
}

export function generateTripId(): string {
  const p = () =>
    Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4);
  return `${p()}${p()}`.toUpperCase();
}
