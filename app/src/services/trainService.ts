import type { TrainSchedule } from '@/types';

export type { TrainSchedule };

// Shinkansen routes with approximate travel times
const shinkansenRoutes: Record<string, { duration: number; trainType: string }> = {
  'tokyo-kyoto': { duration: 135, trainType: 'Nozomi' },
  'kyoto-tokyo': { duration: 135, trainType: 'Nozomi' },
  'tokyo-osaka': { duration: 150, trainType: 'Nozomi' },
  'osaka-tokyo': { duration: 150, trainType: 'Nozomi' },
  'kyoto-osaka': { duration: 15, trainType: 'Kodama' },
  'osaka-kyoto': { duration: 15, trainType: 'Kodama' },
  'tokyo-nagoya': { duration: 100, trainType: 'Nozomi' },
  'nagoya-tokyo': { duration: 100, trainType: 'Nozomi' },
  'shin-osaka-hiroshima': { duration: 90, trainType: 'Nozomi' },
  'hiroshima-shin-osaka': { duration: 90, trainType: 'Nozomi' },
};

// Local/JR lines
const localRoutes: Record<string, { duration: number; trainType: string }> = {
  'tokyo-shinjuku': { duration: 15, trainType: 'JR Yamanote' },
  'shinjuku-tokyo': { duration: 15, trainType: 'JR Yamanote' },
  'shinjuku-shibuya': { duration: 5, trainType: 'JR Yamanote' },
  'shibuya-shinjuku': { duration: 5, trainType: 'JR Yamanote' },
  'tokyo-ueno': { duration: 8, trainType: 'JR Yamanote' },
  'ueno-tokyo': { duration: 8, trainType: 'JR Yamanote' },
  'kyoto-nara': { duration: 45, trainType: 'JR Nara Line' },
  'nara-kyoto': { duration: 45, trainType: 'JR Nara Line' },
  'osaka-nara': { duration: 50, trainType: 'JR Nara Line' },
  'nara-osaka': { duration: 50, trainType: 'JR Nara Line' },
  'osaka-kobe': { duration: 30, trainType: 'JR Kobe Line' },
  'kobe-osaka': { duration: 30, trainType: 'JR Kobe Line' },
};

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function getNextTrain(from: string, to: string): TrainSchedule | null {
  const routeKey = `${from.toLowerCase()}-${to.toLowerCase()}`;
  const route = shinkansenRoutes[routeKey] || localRoutes[routeKey];
  
  if (!route) return null;

  const now = new Date();
  
  // Shinkansen typically departs every 20-30 minutes during the day
  // Calculate next departure based on current time
  const minutesSinceHour = now.getMinutes();
  const departureInterval = routeKey.includes('shinkansen') || route.trainType === 'Nozomi' || route.trainType === 'Kodama' ? 30 : 15;
  const nextDepartureMinutes = Math.ceil(minutesSinceHour / departureInterval) * departureInterval;
  
  const departureTime = new Date(now);
  departureTime.setMinutes(nextDepartureMinutes, 0, 0);
  
  // If next departure is in the past, add one interval
  if (departureTime <= now) {
    departureTime.setMinutes(departureTime.getMinutes() + departureInterval);
  }
  
  const arrivalTime = addMinutes(departureTime, route.duration);
  const durationHours = Math.floor(route.duration / 60);
  const durationMinutes = route.duration % 60;
  
  return {
    from,
    to,
    departureTime: formatTime(departureTime),
    arrivalTime: formatTime(arrivalTime),
    duration: durationHours > 0 ? `${durationHours}h ${durationMinutes}m` : `${durationMinutes}m`,
    trainType: route.trainType,
  };
}

export function getNextTrains(from: string, to: string, count: number = 3): TrainSchedule[] {
  const trains: TrainSchedule[] = [];
  let currentTime = new Date();
  
  const routeKey = `${from.toLowerCase()}-${to.toLowerCase()}`;
  const route = shinkansenRoutes[routeKey] || localRoutes[routeKey];
  
  if (!route) return trains;
  
  const departureInterval = routeKey.includes('shinkansen') || route.trainType === 'Nozomi' || route.trainType === 'Kodama' ? 30 : 15;
  
  for (let i = 0; i < count; i++) {
    const minutesSinceHour = currentTime.getMinutes();
    const nextDepartureMinutes = Math.ceil(minutesSinceHour / departureInterval) * departureInterval;
    
    const departureTime = new Date(currentTime);
    departureTime.setMinutes(nextDepartureMinutes, 0, 0);
    
    if (departureTime <= currentTime) {
      departureTime.setMinutes(departureTime.getMinutes() + departureInterval);
    }
    
    const arrivalTime = addMinutes(departureTime, route.duration);
    const durationHours = Math.floor(route.duration / 60);
    const durationMinutes = route.duration % 60;
    
    trains.push({
      from,
      to,
      departureTime: formatTime(departureTime),
      arrivalTime: formatTime(arrivalTime),
      duration: durationHours > 0 ? `${durationHours}h ${durationMinutes}m` : `${durationMinutes}m`,
      trainType: route.trainType,
    });
    
    currentTime = addMinutes(departureTime, departureInterval);
  }
  
  return trains;
}

// Get popular routes
export function getPopularRoutes(): { from: string; to: string; label: string }[] {
  return [
    { from: 'Tokyo', to: 'Kyoto', label: 'Tokyo → Kyoto' },
    { from: 'Tokyo', to: 'Osaka', label: 'Tokyo → Osaka' },
    { from: 'Kyoto', to: 'Osaka', label: 'Kyoto → Osaka' },
    { from: 'Kyoto', to: 'Nara', label: 'Kyoto → Nara' },
    { from: 'Osaka', to: 'Nara', label: 'Osaka → Nara' },
    { from: 'Tokyo', to: 'Shin-Osaka', label: 'Tokyo → Shin-Osaka' },
  ];
}
