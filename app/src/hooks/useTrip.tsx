import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Attraction, BudgetItem, DayPlan, DayActivity, Hotel } from '@/types';
import { attractions as allAttractions, sampleHotels } from '@/data/attractions';
import {
  type TripSnapshotV2,
  type TripManifestEntry,
  readManifest,
  writeManifest,
  tripStorageKey,
  generateTripId,
  encodeSnapshot,
  decodeSnapshot,
  migrateTripSnapshot,
  STORAGE_ACTIVE,
} from '@/lib/tripShare';

interface TripContextType {
  hydrated: boolean;
  activeTripId: string;
  tripName: string;
  setTripName: (name: string) => void;
  selectedAttractions: Attraction[];
  selectedHotels: Hotel[];
  customHotels: Hotel[];
  dayPlans: DayPlan[];
  budgetItems: BudgetItem[];
  totalBudget: number;
  currentDayId: string | null;
  addAttraction: (attraction: Attraction) => void;
  removeAttraction: (attractionId: string) => void;
  isAttractionSelected: (attractionId: string) => boolean;
  addHotel: (hotel: Hotel) => void;
  removeHotel: (hotelId: string) => void;
  addCustomHotel: (hotel: Hotel) => void;
  removeCustomHotel: (hotelId: string) => void;
  addToDay: (attractionId: string, dayId: string, startTime: string) => void;
  removeFromDay: (activityId: string, dayId: string) => void;
  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  removeBudgetItem: (itemId: string) => void;
  getTotalSpent: () => number;
  getRemainingBudget: () => number;
  createDay: () => string;
  deleteDay: (dayId: string) => void;
  getAttractionDistance: (attraction1Id: string, attraction2Id: string) => number;
  getEstimatedTravelTime: (attraction1Id: string, attraction2Id: string) => number;
  getDistanceToHotel: (attractionId: string, hotelId: string) => number;
  reorderActivities: (dayId: string, oldIndex: number, newIndex: number) => void;
  setTotalBudget: (amount: number) => void;
  listTrips: () => TripManifestEntry[];
  createNewTrip: (name?: string) => void;
  switchToTrip: (tripId: string) => void;
  deleteTrip: (tripId: string) => void;
  getShareUrl: () => string;
  getShareCode: () => string;
  importFromEncoded: (encoded: string, options?: { asNewTrip?: boolean }) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371;
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function estimateTravelTime(distanceKm: number): number {
  if (distanceKm < 1.5) {
    return Math.round(distanceKm * 12);
  }
  return Math.round(10 + distanceKm * 3 + 5);
}

function applySnapshotToReactState(
  snap: TripSnapshotV2,
  setters: {
    setActiveTripId: (id: string) => void;
    setTripName: (n: string) => void;
    setSelectedAttractions: (a: Attraction[]) => void;
    setSelectedHotels: (h: Hotel[]) => void;
    setCustomHotels: (h: Hotel[]) => void;
    setDayPlans: (d: DayPlan[]) => void;
    setBudgetItems: (b: BudgetItem[]) => void;
    setTotalBudget: (n: number) => void;
  }
) {
  const snapM = migrateTripSnapshot(snap);
  const attrs = snapM.attractionIds
    .map((id) => allAttractions.find((a) => a.id === id))
    .filter(Boolean) as Attraction[];
  setters.setActiveTripId(snapM.tripId);
  setters.setTripName(snapM.name);
  setters.setSelectedAttractions(attrs);
  setters.setSelectedHotels(snapM.selectedHotels || []);
  setters.setCustomHotels(snapM.customHotels || []);
  setters.setDayPlans(snapM.dayPlans || []);
  setters.setBudgetItems(snapM.budgetItems || []);
  setters.setTotalBudget(typeof snapM.totalBudget === 'number' ? snapM.totalBudget : 183000);
}

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [activeTripId, setActiveTripId] = useState('');
  const [tripName, setTripNameState] = useState('Il mio viaggio');
  const [selectedAttractions, setSelectedAttractions] = useState<Attraction[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<Hotel[]>([]);
  const [customHotels, setCustomHotels] = useState<Hotel[]>([]);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(183000);
  const initOnce = useRef(false);

  const persistSnapshot = useCallback(
    (snap: TripSnapshotV2) => {
      localStorage.setItem(tripStorageKey(snap.tripId), JSON.stringify(snap));
      const manifest = readManifest();
      const idx = manifest.findIndex((m) => m.id === snap.tripId);
      const entry: TripManifestEntry = {
        id: snap.tripId,
        name: snap.name,
        updatedAt: snap.updatedAt,
      };
      if (idx >= 0) manifest[idx] = entry;
      else manifest.push(entry);
      writeManifest(manifest);
      localStorage.setItem(STORAGE_ACTIVE, snap.tripId);
    },
    []
  );

  const buildSnapshot = useCallback((): TripSnapshotV2 => {
    return {
      v: 2,
      tripId: activeTripId,
      name: tripName,
      attractionIds: selectedAttractions.map((a) => a.id),
      selectedHotels,
      customHotels,
      dayPlans,
      budgetItems,
      totalBudget,
      updatedAt: new Date().toISOString(),
    };
  }, [
    activeTripId,
    tripName,
    selectedAttractions,
    selectedHotels,
    customHotels,
    dayPlans,
    budgetItems,
    totalBudget,
  ]);

  // Hydrate: hash → legacy query → localStorage
  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    const apply = (snap: TripSnapshotV2) => {
      applySnapshotToReactState(snap, {
        setActiveTripId,
        setTripName: setTripNameState,
        setSelectedAttractions,
        setSelectedHotels,
        setCustomHotels,
        setDayPlans,
        setBudgetItems,
        setTotalBudget,
      });
      persistSnapshot(snap);
    };

    try {
      const hash = window.location.hash;
      if (hash.startsWith('#t=')) {
        const snap = decodeSnapshot(decodeURIComponent(hash.slice(3)));
        apply(snap);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        toast.success('Itinerario caricato dal link');
        setHydrated(true);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const tripParam = urlParams.get('trip');
      if (tripParam) {
        const decoded = decodeURIComponent(atob(tripParam).split('').map((c) =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        const tripData = JSON.parse(decoded) as {
          attractions?: string[];
          hotels?: string[];
          days?: { activities?: { attractionId: string; startTime: string; endTime?: string }[] }[];
        };

        let manifest = readManifest();
        const id = generateTripId();
        const name = `Importato ${new Date().toLocaleDateString('it-IT')}`;
        const attractionIds: string[] = [];
        const selectedHotelsL: Hotel[] = [];
        const budgetL: BudgetItem[] = [];
        const dayPlansL: DayPlan[] = [];

        if (tripData.attractions?.length) {
          tripData.attractions.forEach((idAttr) => {
            attractionIds.push(idAttr);
            const attr = allAttractions.find((a) => a.id === idAttr);
            if (attr && attr.price > 0) {
              budgetL.push({
                id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                category: 'attraction',
                description: `${attr.name} (${attr.nameJp})`,
                amount: attr.price,
              });
            }
          });
        }
        if (tripData.hotels?.length) {
          tripData.hotels.forEach((hid) => {
            const h = sampleHotels.find((x) => x.id === hid);
            if (h) {
              selectedHotelsL.push(h);
              budgetL.push({
                id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                category: 'accommodation',
                description: `${h.name} - 1 notte`,
                amount: h.price,
              });
            }
          });
        }
        if (tripData.days?.length) {
          tripData.days.forEach((day, index) => {
            dayPlansL.push({
              id: `day-${Date.now()}-${index}`,
              activities: (day.activities || []).map((activity, actIndex) => ({
                id: `activity-${Date.now()}-${actIndex}`,
                attractionId: activity.attractionId,
                startTime: activity.startTime,
                endTime: activity.endTime || activity.startTime,
                order: actIndex,
              })),
            });
          });
        }

        const snap: TripSnapshotV2 = {
          v: 2,
          tripId: id,
          name,
          attractionIds,
          selectedHotels: selectedHotelsL,
          customHotels: [],
          dayPlans: dayPlansL,
          budgetItems: budgetL,
          totalBudget: 183000,
          updatedAt: new Date().toISOString(),
        };
        manifest.push({ id, name, updatedAt: snap.updatedAt });
        writeManifest(manifest);
        apply(snap);
        window.history.replaceState({}, document.title, window.location.pathname);
        setHydrated(true);
        return;
      }
    } catch (e) {
      console.error('Trip URL import error:', e);
    }

    let manifest = readManifest();
    if (manifest.length === 0) {
      const id = generateTripId();
      const name = 'Il mio viaggio';
      manifest = [{ id, name, updatedAt: new Date().toISOString() }];
      writeManifest(manifest);
      const snap: TripSnapshotV2 = {
        v: 2,
        tripId: id,
        name,
        attractionIds: [],
        selectedHotels: [],
        customHotels: [],
        dayPlans: [],
        budgetItems: [],
        totalBudget: 183000,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(tripStorageKey(id), JSON.stringify(snap));
      localStorage.setItem(STORAGE_ACTIVE, id);
      applySnapshotToReactState(snap, {
        setActiveTripId,
        setTripName: setTripNameState,
        setSelectedAttractions,
        setSelectedHotels,
        setCustomHotels,
        setDayPlans,
        setBudgetItems,
        setTotalBudget,
      });
      setActiveTripId(id);
      setHydrated(true);
      return;
    }

    let active = localStorage.getItem(STORAGE_ACTIVE);
    if (!active || !manifest.some((m) => m.id === active)) {
      active = manifest[0].id;
      localStorage.setItem(STORAGE_ACTIVE, active);
    }

    const raw = localStorage.getItem(tripStorageKey(active!));
    if (raw) {
      try {
        const snap = JSON.parse(raw) as TripSnapshotV2;
        if (snap.v === 2) {
          applySnapshotToReactState(snap, {
            setActiveTripId,
            setTripName: setTripNameState,
            setSelectedAttractions,
            setSelectedHotels,
            setCustomHotels,
            setDayPlans,
            setBudgetItems,
            setTotalBudget,
          });
        }
      } catch {
        /* ignore */
      }
    } else {
      setActiveTripId(active!);
    }
    setHydrated(true);
  }, [persistSnapshot]);

  // Debounced persist
  useEffect(() => {
    if (!hydrated || !activeTripId) return;
    const t = setTimeout(() => {
      persistSnapshot(buildSnapshot());
    }, 450);
    return () => clearTimeout(t);
  }, [hydrated, activeTripId, buildSnapshot, persistSnapshot]);

  const setTripName = useCallback(
    (name: string) => {
      setTripNameState(name);
    },
    []
  );

  const addBudgetItem = useCallback((item: Omit<BudgetItem, 'id'>) => {
    const newItem: BudgetItem = {
      ...item,
      id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setBudgetItems((prev) => [...prev, newItem]);
  }, []);

  const addAttraction = useCallback(
    (attraction: Attraction) => {
      setSelectedAttractions((prev) => {
        if (prev.find((a) => a.id === attraction.id)) return prev;
        return [...prev, attraction];
      });
      if (attraction.price > 0) {
        addBudgetItem({
          category: 'attraction',
          description: `${attraction.name} (${attraction.nameJp})`,
          amount: attraction.price,
        });
      }
    },
    [addBudgetItem]
  );

  const removeAttraction = useCallback((attractionId: string) => {
    setSelectedAttractions((prev) => prev.filter((a) => a.id !== attractionId));
    setBudgetItems((prev) => prev.filter((item) => !item.description.includes(attractionId)));
  }, []);

  const isAttractionSelected = useCallback(
    (attractionId: string) => selectedAttractions.some((a) => a.id === attractionId),
    [selectedAttractions]
  );

  const addHotel = useCallback(
    (hotel: Hotel) => {
      setSelectedHotels((prev) => {
        if (prev.find((h) => h.id === hotel.id)) return prev;
        return [...prev, hotel];
      });
      addBudgetItem({
        category: 'accommodation',
        description: `${hotel.name} - 1 notte`,
        amount: hotel.price,
      });
    },
    [addBudgetItem]
  );

  const removeHotel = useCallback((hotelId: string) => {
    setSelectedHotels((prev) => prev.filter((h) => h.id !== hotelId));
    setBudgetItems((prev) => prev.filter((item) => !item.description.includes(hotelId)));
  }, []);

  const addCustomHotel = useCallback((hotel: Hotel) => {
    setCustomHotels((prev) => {
      if (prev.find((h) => h.id === hotel.id)) return prev;
      return [...prev, hotel];
    });
  }, []);

  const removeCustomHotel = useCallback((hotelId: string) => {
    setCustomHotels((prev) => prev.filter((h) => h.id !== hotelId));
    removeHotel(hotelId);
  }, [removeHotel]);

  const createDay = useCallback(() => {
    const newDay: DayPlan = {
      id: `day-${Date.now()}`,
      activities: [],
    };
    setDayPlans((prev) => [...prev, newDay]);
    return newDay.id;
  }, []);

  const deleteDay = useCallback((dayId: string) => {
    setDayPlans((prev) => prev.filter((d) => d.id !== dayId));
  }, []);

  const addToDay = useCallback((attractionId: string, dayId: string, startTime: string) => {
    const attraction = allAttractions.find((a) => a.id === attractionId);
    if (!attraction) return;

    setDayPlans((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;

        const [hours, minutes] = startTime.split(':').map(Number);
        let durationHours = 1;
        if (attraction.duration.includes('30 min')) durationHours = 0.5;
        else if (attraction.duration.includes('1-2')) durationHours = 1.5;
        else if (attraction.duration.includes('2-3')) durationHours = 2.5;
        else if (attraction.duration.includes('3-4')) durationHours = 3.5;
        else if (attraction.duration.includes('2 ore')) durationHours = 2;
        else if (attraction.duration.includes('1 ora')) durationHours = 1;

        const endHours = Math.floor(hours + durationHours);
        const endMinutes = minutes + (durationHours % 1) * 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${Math.round(endMinutes).toString().padStart(2, '0')}`;

        const newActivity: DayActivity = {
          id: `activity-${Date.now()}`,
          attractionId,
          startTime,
          endTime,
          order: day.activities.length,
        };

        return {
          ...day,
          activities: [...day.activities, newActivity].sort((a, b) => a.startTime.localeCompare(b.startTime)),
        };
      })
    );
  }, []);

  const removeFromDay = useCallback((activityId: string, dayId: string) => {
    setDayPlans((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          activities: day.activities.filter((a) => a.id !== activityId),
        };
      })
    );
  }, []);

  const reorderActivities = useCallback((dayId: string, oldIndex: number, newIndex: number) => {
    setDayPlans((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const activities = [...day.activities];
        const [movedActivity] = activities.splice(oldIndex, 1);
        activities.splice(newIndex, 0, movedActivity);
        return {
          ...day,
          activities: activities.map((a, i) => ({ ...a, order: i })),
        };
      })
    );
  }, []);

  const removeBudgetItem = useCallback((itemId: string) => {
    setBudgetItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const getTotalSpent = useCallback(() => {
    return budgetItems.reduce((sum, item) => sum + item.amount, 0);
  }, [budgetItems]);

  const getRemainingBudget = useCallback(() => {
    return totalBudget - getTotalSpent();
  }, [totalBudget, getTotalSpent]);

  const getAttractionDistance = useCallback((attraction1Id: string, attraction2Id: string): number => {
    const attr1 = allAttractions.find((a) => a.id === attraction1Id);
    const attr2 = allAttractions.find((a) => a.id === attraction2Id);
    if (!attr1 || !attr2) return 0;
    return calculateDistance(attr1.coordinates, attr2.coordinates);
  }, []);

  const getEstimatedTravelTime = useCallback(
    (attraction1Id: string, attraction2Id: string): number => {
      const distance = getAttractionDistance(attraction1Id, attraction2Id);
      return estimateTravelTime(distance);
    },
    [getAttractionDistance]
  );

  const getDistanceToHotel = useCallback(
    (attractionId: string, hotelId: string): number => {
      const attraction = allAttractions.find((a) => a.id === attractionId);
      const hotel = selectedHotels.find((h) => h.id === hotelId);
      if (!attraction || !hotel) return 0;
      return calculateDistance(attraction.coordinates, hotel.coordinates);
    },
    [selectedHotels]
  );

  const listTrips = useCallback(() => readManifest(), []);

  const createNewTrip = useCallback(
    (name?: string) => {
      if (!hydrated) return;
      const id = generateTripId();
      const n = name?.trim() || `Viaggio ${new Date().toLocaleDateString('it-IT')}`;
      const snap: TripSnapshotV2 = {
        v: 2,
        tripId: id,
        name: n,
        attractionIds: [],
        selectedHotels: [],
        customHotels: [],
        dayPlans: [],
        budgetItems: [],
        totalBudget: 183000,
        updatedAt: new Date().toISOString(),
      };
      persistSnapshot(snap);
      applySnapshotToReactState(snap, {
        setActiveTripId,
        setTripName: setTripNameState,
        setSelectedAttractions,
        setSelectedHotels,
        setCustomHotels,
        setDayPlans,
        setBudgetItems,
        setTotalBudget,
      });
    },
    [hydrated, persistSnapshot]
  );

  const switchToTrip = useCallback(
    (tripId: string) => {
      if (!hydrated || tripId === activeTripId) return;
      const raw = localStorage.getItem(tripStorageKey(tripId));
      if (!raw) return;
      try {
        const snap = JSON.parse(raw) as TripSnapshotV2;
        if (snap.v !== 2) return;
        applySnapshotToReactState(snap, {
          setActiveTripId,
          setTripName: setTripNameState,
          setSelectedAttractions,
          setSelectedHotels,
          setCustomHotels,
          setDayPlans,
          setBudgetItems,
          setTotalBudget,
        });
        localStorage.setItem(STORAGE_ACTIVE, tripId);
      } catch {
        /* ignore */
      }
    },
    [hydrated, activeTripId]
  );

  const deleteTrip = useCallback(
    (tripId: string) => {
      const manifest = readManifest();
      if (manifest.length <= 1) return;
      const next = manifest.filter((m) => m.id !== tripId);
      writeManifest(next);
      localStorage.removeItem(tripStorageKey(tripId));
      if (tripId === activeTripId) {
        switchToTrip(next[0].id);
      }
    },
    [activeTripId, switchToTrip]
  );

  const getShareUrl = useCallback(() => {
    const snap = buildSnapshot();
    const enc = encodeSnapshot(snap);
    return `${window.location.origin}${window.location.pathname}#t=${encodeURIComponent(enc)}`;
  }, [buildSnapshot]);

  const getShareCode = useCallback(() => activeTripId, [activeTripId]);

  const importFromEncoded = useCallback(
    (encoded: string, options?: { asNewTrip?: boolean }) => {
      const snap = decodeSnapshot(encoded.trim());
      if (options?.asNewTrip) {
        const id = generateTripId();
        const name = `${snap.name} (copia)`;
        const copy: TripSnapshotV2 = {
          ...snap,
          tripId: id,
          name,
          updatedAt: new Date().toISOString(),
        };
        const manifest = readManifest();
        manifest.push({ id, name, updatedAt: copy.updatedAt });
        writeManifest(manifest);
        applySnapshotToReactState(copy, {
          setActiveTripId,
          setTripName: setTripNameState,
          setSelectedAttractions,
          setSelectedHotels,
          setCustomHotels,
          setDayPlans,
          setBudgetItems,
          setTotalBudget,
        });
        localStorage.setItem(STORAGE_ACTIVE, id);
        localStorage.setItem(tripStorageKey(id), JSON.stringify(copy));
      } else {
        const merged: TripSnapshotV2 = {
          ...snap,
          tripId: activeTripId || snap.tripId,
          name: tripName,
          updatedAt: new Date().toISOString(),
        };
        applySnapshotToReactState(merged, {
          setActiveTripId,
          setTripName: setTripNameState,
          setSelectedAttractions,
          setSelectedHotels,
          setCustomHotels,
          setDayPlans,
          setBudgetItems,
          setTotalBudget,
        });
        persistSnapshot(merged);
      }
    },
    [activeTripId, tripName, persistSnapshot]
  );

  const value = useMemo(
    () => ({
      hydrated,
      activeTripId,
      tripName,
      setTripName,
      selectedAttractions,
      selectedHotels,
      customHotels,
      dayPlans,
      budgetItems,
      totalBudget,
      currentDayId: dayPlans.length > 0 ? dayPlans[0].id : null,
      addAttraction,
      removeAttraction,
      isAttractionSelected,
      addHotel,
      removeHotel,
      addCustomHotel,
      removeCustomHotel,
      addToDay,
      removeFromDay,
      addBudgetItem,
      removeBudgetItem,
      getTotalSpent,
      getRemainingBudget,
      createDay,
      deleteDay,
      getAttractionDistance,
      getEstimatedTravelTime,
      getDistanceToHotel,
      reorderActivities,
      setTotalBudget,
      listTrips,
      createNewTrip,
      switchToTrip,
      deleteTrip,
      getShareUrl,
      getShareCode,
      importFromEncoded,
    }),
    [
      hydrated,
      activeTripId,
      tripName,
      setTripName,
      selectedAttractions,
      selectedHotels,
      customHotels,
      dayPlans,
      budgetItems,
      totalBudget,
      addAttraction,
      removeAttraction,
      isAttractionSelected,
      addHotel,
      removeHotel,
      addCustomHotel,
      removeCustomHotel,
      addToDay,
      removeFromDay,
      addBudgetItem,
      removeBudgetItem,
      getTotalSpent,
      getRemainingBudget,
      createDay,
      deleteDay,
      getAttractionDistance,
      getEstimatedTravelTime,
      getDistanceToHotel,
      reorderActivities,
      listTrips,
      createNewTrip,
      switchToTrip,
      deleteTrip,
      getShareUrl,
      getShareCode,
      importFromEncoded,
    ]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
