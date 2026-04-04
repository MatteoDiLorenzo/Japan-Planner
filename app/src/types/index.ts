export type Attraction = {
  id: string;
  name: string;
  nameJp: string;
  city: 'tokyo' | 'kyoto' | 'osaka' | 'nara' | 'hiroshima' | 'kanazawa' | 'hakone' | 'nikko';
  type: 'temple' | 'nature' | 'food' | 'shopping' | 'culture' | 'park' | 'museum' | 'entertainment';
  duration: string;
  price: number;
  coordinates: [number, number];
  description: string;
  image?: string;
};

export type MetroStation = {
  id: string;
  name: string;
  nameJp: string;
  line: string;
  lineColor: string;
  coordinates: [number, number];
  connections: string[];
};

export type MetroLine = {
  id: string;
  name: string;
  color: string;
  stations: string[];
  type?: 'metro' | 'bus' | 'train';
};

export type LineVisibility = {
  [lineId: string]: boolean;
};

export type TransportMode = 'metro' | 'bus' | 'walk' | 'train';

export type RouteStep = {
  type: TransportMode;
  from: string;
  to: string;
  line?: string;
  lineColor?: string;
  duration: number;
  distance: number;
  instructions: string;
};

export type DayActivity = {
  id: string;
  attractionId: string;
  startTime: string;
  endTime: string;
  order: number;
};

export type DayPlan = {
  id: string;
  date?: string;
  activities: DayActivity[];
};

export type BudgetItem = {
  id: string;
  category: 'transport' | 'food' | 'attraction' | 'shopping' | 'accommodation' | 'other';
  description: string;
  amount: number;
  date?: string;
};

export type Trip = {
  id: string;
  name: string;
  days: DayPlan[];
  budget: BudgetItem[];
  totalBudget: number;
};

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export type TimeSlotConfig = {
  id: TimeSlot;
  label: string;
  timeRange: string;
  startHour: number;
  endHour: number;
};

export type Hotel = {
  id: string;
  name: string;
  nameJp: string;
  city: string;
  coordinates: [number, number];
  address: string;
  price: number;
  rating: number;
  image?: string;
  bookingUrl: string;
};

export type WeatherData = {
  city: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
};

export type TrainSchedule = {
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  platform?: string;
  trainType: string;
};
