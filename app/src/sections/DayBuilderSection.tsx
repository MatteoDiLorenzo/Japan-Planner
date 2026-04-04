import { useState } from 'react';
import { Clock, MapPin, Footprints, Train, Trash2, Plus, Calendar, ChevronDown, ChevronUp, Navigation, Hotel, Share2, Download, Camera, GripVertical, Bus, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTrip } from '@/hooks/useTrip';
import { attractions, calculateCompleteRoute } from '@/data/attractions';
import type { Attraction } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  eurToJpy,
  formatEurFromJpy,
  formatJpy,
  formatPriceEurPrimary,
  JPY_PER_EUR,
} from '@/lib/currency';
import { renderItineraryCardPng } from '@/lib/tripCardExport';

const timeSlots = [
  { id: 'morning', label: 'Mattina', timeRange: '09:00 - 12:00', icon: '🌅' },
  { id: 'afternoon', label: 'Pomeriggio', timeRange: '12:00 - 15:00', icon: '☀️' },
  { id: 'evening', label: 'Sera', timeRange: '15:00 - 18:00', icon: '🌇' },
  { id: 'night', label: 'Notte', timeRange: '18:00 - 21:00', icon: '🌙' },
];

interface TransportInfoProps {
  fromId: string;
  toId: string;
  fromCity: string;
  toCity: string;
}

function TransportInfo({ fromId, toId, fromCity, toCity }: TransportInfoProps) {
  const fromAttraction = attractions.find(a => a.id === fromId);
  const toAttraction = attractions.find(a => a.id === toId);
  
  if (!fromAttraction || !toAttraction) return null;
  
  const route = calculateCompleteRoute(fromAttraction.coordinates, toAttraction.coordinates, fromCity, toCity);
  
  const walkSegments = route.segments.filter(s => s.type === 'walk');
  const transportSegments = route.segments.filter(s => s.type === 'metro' || s.type === 'bus');
  const totalWalkMins = walkSegments.reduce((s, w) => s + w.duration, 0);
  const totalTransitMins = transportSegments.reduce((s, t) => s + t.duration, 0);
  
  // Format route description
  const getRouteDescription = () => {
    if (route.segments.length === 1 && route.segments[0].type === 'walk') {
      return { icon: <Footprints className="w-4 h-4 text-emerald-400" />, text: 'A piedi', bgColor: 'bg-emerald-500/20' };
    }
    
    const hasBus = transportSegments.some(s => s.type === 'bus');
    const hasMetro = transportSegments.some(s => s.type === 'metro');
    
    if (hasBus && hasMetro) {
      return { icon: <Shuffle className="w-4 h-4 text-purple-400" />, text: 'Metro + Bus', bgColor: 'bg-purple-500/20' };
    } else if (hasBus) {
      return { icon: <Bus className="w-4 h-4 text-orange-400" />, text: 'Bus', bgColor: 'bg-orange-500/20' };
    } else if (hasMetro) {
      return { icon: <Train className="w-4 h-4 text-blue-400" />, text: 'Metro', bgColor: 'bg-blue-500/20' };
    }
    
    return { icon: <Footprints className="w-4 h-4 text-emerald-400" />, text: 'A piedi', bgColor: 'bg-emerald-500/20' };
  };
  
  const { icon, text, bgColor } = getRouteDescription();
  
  // Walking only route
  if (route.segments.length === 1 && route.segments[0].type === 'walk') {
    return (
      <div className="flex flex-col py-3 px-3 bg-white/5 rounded-lg my-2 border border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <span className="text-white text-sm font-medium">{text}</span>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>{route.totalDistance.toFixed(1)} km</span>
              <span>•</span>
              <span>Totale ~{route.totalDuration} min (solo a piedi)</span>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Footprints className="w-3 h-3 text-emerald-400" />
            <span>Percorso pedonale diretto</span>
            <span className="text-white/30">· {route.segments[0].duration} min a piedi</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col py-3 px-3 bg-white/5 rounded-lg my-2 border border-white/10">
      {/* Main transport info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <span className="text-white text-sm font-medium">{text}</span>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap">
                <span>{route.totalDistance.toFixed(1)} km</span>
                <span>•</span>
                <span>Totale ~{route.totalDuration} min (porta a porta)</span>
              </div>
              {(totalWalkMins > 0 || totalTransitMins > 0) && (
                <p className="text-[11px] text-white/40">
                  di cui ~{totalWalkMins} min a piedi
                  {totalTransitMins > 0 ? ` · ~${totalTransitMins} min in mezzi pubblici` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed route: same order as calculateCompleteRoute (avoids mismatched walk/transit rows) */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex flex-col gap-1.5">
          {route.segments.map((segment, idx) => {
            if (segment.type === 'walk') {
              const isTransfer = Boolean(segment.transferStation) || segment.name.startsWith('Cambio');
              const walkDescription =
                !isTransfer && segment.name.includes('destinazione')
                  ? segment.name.replace(/destinazione/gi, toAttraction.name)
                  : segment.name;
              return (
                <div
                  key={`walk-${idx}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs py-0.5"
                >
                  <Footprints
                    className={`w-3.5 h-3.5 flex-shrink-0 ${isTransfer ? 'text-yellow-400' : 'text-emerald-400'}`}
                  />
                  <span className="text-white/70">
                    {isTransfer ? (
                      <>
                        Cambio a piedi vicino a{' '}
                        <span className="text-white/90 font-medium">{segment.transferStation?.name}</span>
                      </>
                    ) : (
                      walkDescription
                    )}
                  </span>
                  <span className="text-white/45 whitespace-nowrap">
                    · {segment.duration} min a piedi
                    {segment.distance >= 0.05 ? ` (~${segment.distance.toFixed(1)} km)` : ''}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={`transit-${idx}`}
                className="flex flex-col gap-0.5 text-xs py-0.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {segment.type === 'bus' ? (
                    <Bus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: segment.color }} />
                  ) : (
                    <Train className="w-3.5 h-3.5 flex-shrink-0" style={{ color: segment.color }} />
                  )}
                  {segment.fromStation && (
                    <span
                      className="font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${segment.fromStation.lineColor}30`,
                        color: segment.fromStation.lineColor,
                      }}
                    >
                      {segment.fromStation.name}
                    </span>
                  )}
                  <span className="text-white/40">→</span>
                  {segment.toStation && (
                    <span
                      className="font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${segment.toStation.lineColor}30`,
                        color: segment.toStation.lineColor,
                      }}
                    >
                      {segment.toStation.name}
                    </span>
                  )}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full border"
                    style={{
                      borderColor: segment.color,
                      color: segment.color,
                    }}
                  >
                    {segment.name.split('(')[0].trim()}
                  </span>
                </div>
                <div className="pl-6 text-[11px] text-white/45">
                  ~{segment.duration} min in {segment.type === 'bus' ? 'bus' : 'metro'}
                  {segment.distance >= 0.05 ? ` · ~${segment.distance.toFixed(1)} km` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex-1 h-px bg-white/10 relative mt-2">
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Navigation className="w-3 h-3 text-white/30 rotate-90" />
        </div>
      </div>
    </div>
  );
}

interface DraggableActivityProps {
  item: { activity: { id: string; startTime: string; endTime: string }; attraction?: Attraction };
  index: number;
  slotAttractions: { activity: { id: string; startTime: string; endTime: string }; attraction?: Attraction }[];
  currentDay: { id: string; activities: any[] };
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  draggingIndex: number | null;
}

function DraggableActivity({ 
  item, 
  index, 
  slotAttractions, 
  currentDay, 
  onDragStart, 
  onDragOver, 
  onDragEnd, 
  draggingIndex 
}: DraggableActivityProps) {
  const { removeFromDay } = useTrip();
  const prevItem = index > 0 ? slotAttractions[index - 1] : null;
  const isDragging = draggingIndex === index;
  
  return (
    <div 
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}`}
    >
      {/* Transport Info */}
      {prevItem && (
        <TransportInfo 
          fromId={prevItem.attraction!.id} 
          toId={item.attraction!.id}
          fromCity={prevItem.attraction!.city}
          toCity={item.attraction!.city}
        />
      )}
      
      {/* Activity Card */}
      <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-white/10 rounded-lg cursor-move hover:bg-white/15 transition-colors group">
        <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60">
          <GripVertical className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        {item.attraction!.image && (
          <img 
            src={item.attraction!.image} 
            alt={item.attraction!.name}
            className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg flex-shrink-0"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
        <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{item.attraction!.name}</p>
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-white/50 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.activity.startTime} - {item.activity.endTime}
            </span>
            <span className="hidden sm:inline">{item.attraction!.duration}</span>
            <span>{formatPriceEurPrimary(item.attraction!.price)}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={() => removeFromDay(item.activity.id, currentDay!.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function DayBuilderSection() {
  const isMobile = useIsMobile();
  const { 
    selectedAttractions, 
    selectedHotels,
    dayPlans, 
    createDay, 
    addToDay, 
    totalBudget,
    reorderActivities,
    setTotalBudget,
  } = useTrip();
  
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<string[]>(['morning']);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggleSlot = (slotId: string) => {
    setExpandedSlots(prev => 
      prev.includes(slotId) 
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const handleCreateDay = () => {
    const newDayId = createDay();
    setSelectedDay(newDayId);
  };

  const handleAddToSlot = (attraction: Attraction, slotId: string) => {
    const dayId = selectedDay || dayPlans[0]?.id;
    if (!dayId) {
      const newDayId = createDay();
      const startTime = timeSlots.find(s => s.id === slotId)?.timeRange.split(' - ')[0] || '09:00';
      addToDay(attraction.id, newDayId, startTime);
      setSelectedDay(newDayId);
    } else {
      const startTime = timeSlots.find(s => s.id === slotId)?.timeRange.split(' - ')[0] || '09:00';
      addToDay(attraction.id, dayId, startTime);
    }
  };

  const getAttractionsForSlot = (dayId: string, slotId: string) => {
    const day = dayPlans.find(d => d.id === dayId);
    if (!day) return [];
    
    const slot = timeSlots.find(s => s.id === slotId);
    if (!slot) return [];
    
    const [startHour] = slot.timeRange.split(' - ')[0].split(':').map(Number);
    const [endHour] = slot.timeRange.split(' - ')[1].split(':').map(Number);
    
    return day.activities
      .filter(a => {
        const [activityHour] = a.startTime.split(':').map(Number);
        return activityHour >= startHour && activityHour < endHour;
      })
      .map(a => ({
        activity: a,
        attraction: attractions.find(attr => attr.id === a.attractionId),
      }))
      .filter(item => item.attraction);
  };

  const currentDay = dayPlans.find(d => d.id === selectedDay) || dayPlans[0];
  
  // Calculate total cost for the day
  const calculateDayCost = (dayId: string) => {
    const day = dayPlans.find(d => d.id === dayId);
    if (!day) return 0;
    
    return day.activities.reduce((total, activity) => {
      const attraction = attractions.find(a => a.id === activity.attractionId);
      return total + (attraction?.price || 0);
    }, 0);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (draggingIndex === null || draggingIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = (slotId: string) => {
    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex && currentDay) {
      const slotAttractions = getAttractionsForSlot(currentDay.id, slotId);
      // Find the actual indices in the day's activities array
      const dayActivities = currentDay.activities;
      const fromActivity = slotAttractions[draggingIndex];
      const toActivity = slotAttractions[dragOverIndex];
      
      if (fromActivity && toActivity) {
        const fromIndex = dayActivities.findIndex(a => a.id === fromActivity.activity.id);
        const toIndex = dayActivities.findIndex(a => a.id === toActivity.activity.id);
        
        if (fromIndex !== -1 && toIndex !== -1) {
          reorderActivities(currentDay.id, fromIndex, toIndex);
        }
      }
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const generateTripCardImage = async () => {
    await renderItineraryCardPng({ dayPlans, totalBudgetJpy: totalBudget });
  };

  // Share trip function with Unicode support
  const handleShareTrip = () => {
    const tripData = {
      attractions: selectedAttractions.map(a => a.id),
      hotels: selectedHotels.map(h => h.id),
      days: dayPlans.map(day => ({
        activities: day.activities.map(a => ({
          attractionId: a.attractionId,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      })),
    };
    
    // Encode with Unicode support
    const jsonString = JSON.stringify(tripData);
    const encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
    const url = `${window.location.origin}${window.location.pathname}?trip=${encoded}`;
    
    setShareUrl(url);
    setShowShareDialog(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <section className="min-h-screen bg-black pt-16 md:pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Costruisci il tuo giorno</h2>
            <p className="text-white/60 text-sm md:text-base">Organizza il tuo itinerario con distanze e linee metro</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {dayPlans.length > 0 && (
              <select
                value={selectedDay || dayPlans[0]?.id}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 md:px-4 py-2 text-white text-sm"
              >
                {dayPlans.map((day, index) => (
                  <option key={day.id} value={day.id} className="bg-gray-900">
                    Giorno {index + 1}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={handleCreateDay} className="bg-red-500 hover:bg-red-600 text-sm h-10">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Nuovo Giorno</span>
              <span className="sm:hidden">Nuovo</span>
            </Button>
            <Button 
              onClick={generateTripCardImage} 
              variant="outline" 
              size="sm"
              className="border-white/30 text-white hover:bg-white/10 h-10"
            >
              <Camera className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Scarica Card</span>
              <span className="sm:hidden">Card</span>
            </Button>
            <Button 
              onClick={handleShareTrip} 
              variant="outline" 
              size="sm"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-10"
            >
              <Share2 className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Condividi</span>
              <span className="sm:hidden">Share</span>
            </Button>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className={`bg-gray-900 border-white/10 ${isMobile ? 'max-w-[95vw] w-full' : 'max-w-lg'}`}>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                Condividi il tuo viaggio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-white/70 text-sm">
                Copia questo link per condividere il tuo itinerario con gli amici:
              </p>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
                />
                <Button onClick={copyToClipboard} className="bg-blue-500 hover:bg-blue-600">
                  <Download className="w-4 h-4 mr-2" />
                  Copia
                </Button>
              </div>
              <p className="text-white/50 text-xs">
                Il link contiene tutti i dati del tuo viaggio codificati in base64.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Selected Hotels */}
        {selectedHotels.length > 0 && (
          <Card className="bg-white/5 border-white/10 p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <Hotel className="w-4 h-4 text-purple-400" />
              <span className="text-white font-medium text-sm md:text-base">Hotel Selezionati</span>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {selectedHotels.map((hotel) => (
                <div key={hotel.id} className="flex items-center gap-2 bg-purple-500/20 rounded-lg px-2 md:px-3 py-1.5 md:py-2">
                  <span className="text-white text-xs md:text-sm">{hotel.name}</span>
                  <span className="text-white/50 text-xs">{formatPriceEurPrimary(hotel.price)}/notte</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {dayPlans.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Calendar className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Nessun giorno creato</h3>
            <p className="text-white/60 mb-4 md:mb-6 text-sm md:text-base">Inizia creando il tuo primo giorno di viaggio</p>
            <Button onClick={handleCreateDay} className="bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" />
              Crea Giorno
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Time Slots */}
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              {/* Day Summary */}
              {currentDay && (
                <Card className="bg-white/5 border-white/10 p-3 md:p-4 mb-3 md:mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-white/60 text-xs md:text-sm">Costo attrazioni giorno</p>
                      <p className="text-white text-lg md:text-xl font-bold">
                        {formatEurFromJpy(calculateDayCost(currentDay.id), 0)}
                      </p>
                      <p className="text-white/40 text-xs">{formatJpy(calculateDayCost(currentDay.id))}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs md:text-sm">Attività totali</p>
                      <p className="text-white text-lg md:text-xl font-bold">{currentDay.activities.length}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs md:text-sm">Budget totale</p>
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-white text-lg md:text-xl font-bold">
                            {formatEurFromJpy(totalBudget, 0)}
                          </span>
                          <p className="text-white/40 text-xs">{formatJpy(totalBudget)}</p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white p-1">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className={`bg-gray-900 border-white/10 ${isMobile ? 'max-w-[95vw] w-full' : ''}`}>
                            <DialogHeader>
                              <DialogTitle className="text-white">Modifica Budget</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <p className="text-white/50 text-xs">
                                Cambio fisso: 1 € = {JPY_PER_EUR} ¥ (importi salvati in yen).
                              </p>
                              <div>
                                <label className="text-white/70 text-sm mb-2 block">Budget totale (€)</label>
                                <input
                                  type="number"
                                  value={Math.round(totalBudget / JPY_PER_EUR)}
                                  onChange={(e) => setTotalBudget(eurToJpy(Number(e.target.value) || 0))}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                                  min="0"
                                  step="50"
                                />
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  onClick={() => setTotalBudget(eurToJpy(1000))}
                                  variant="outline"
                                  className="flex-1 border-white/30 text-white"
                                >
                                  €1.000
                                </Button>
                                <Button
                                  onClick={() => setTotalBudget(eurToJpy(1500))}
                                  variant="outline"
                                  className="flex-1 border-white/30 text-white"
                                >
                                  €1.500
                                </Button>
                                <Button
                                  onClick={() => setTotalBudget(eurToJpy(2500))}
                                  variant="outline"
                                  className="flex-1 border-white/30 text-white"
                                >
                                  €2.500
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
              
              {timeSlots.map((slot) => {
                const slotAttractions = currentDay ? getAttractionsForSlot(currentDay.id, slot.id) : [];
                const isExpanded = expandedSlots.includes(slot.id);
                
                return (
                  <Card key={slot.id} className="bg-white/5 border-white/10 overflow-hidden">
                    <button
                      onClick={() => toggleSlot(slot.id)}
                      className="w-full p-3 md:p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-xl md:text-2xl">{slot.icon}</span>
                        <div className="text-left">
                          <h3 className="font-semibold text-white text-sm md:text-base">{slot.label}</h3>
                          <p className="text-white/50 text-xs md:text-sm">{slot.timeRange}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <Badge variant="secondary" className="bg-white/10 text-white/70 text-xs">
                          {slotAttractions.length} attività
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
                        ) : (
                          <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-2 md:px-4 pb-3 md:pb-4">
                        {slotAttractions.length === 0 ? (
                          <div className="text-center py-4 md:py-6 border-2 border-dashed border-white/10 rounded-lg">
                            <p className="text-white/40 text-sm">Aggiungi un'attività a questo slot</p>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="mt-2 text-red-400">
                                  <Plus className="w-4 h-4 mr-1" />
                                  Aggiungi
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={`bg-gray-900 border-white/10 ${isMobile ? 'max-w-[95vw] w-full max-h-[80vh]' : 'max-w-md max-h-[80vh]'} overflow-y-auto`}>
                                <DialogHeader>
                                  <DialogTitle className="text-white">Aggiungi attrazione</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2 mt-4">
                                  {selectedAttractions.length === 0 ? (
                                    <p className="text-white/50 text-center py-4">
                                      Nessuna attrazione selezionata. Vai alla mappa per aggiungerne!
                                    </p>
                                  ) : (
                                    selectedAttractions.map((attr) => (
                                      <button
                                        key={attr.id}
                                        onClick={() => handleAddToSlot(attr, slot.id)}
                                        className="w-full text-left p-2 md:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                      >
                                        <div className="flex gap-2 md:gap-3">
                                          {attr.image && (
                                            <img src={attr.image} alt={attr.name} className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg" referrerPolicy="no-referrer" loading="lazy" />
                                          )}
                                          <div>
                                            <p className="text-white font-medium text-sm md:text-base">{attr.name}</p>
                                            <p className="text-white/50 text-xs md:text-sm">{attr.duration}</p>
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {slotAttractions.map((item, index) => (
                              <DraggableActivity
                                key={item.activity.id}
                                item={item}
                                index={index}
                                slotAttractions={slotAttractions}
                                currentDay={currentDay!}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={() => handleDragEnd(slot.id)}
                                draggingIndex={draggingIndex}
                              />
                            ))}
                            
                            {/* Add more button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" className="w-full text-white/50 hover:text-white text-sm">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Aggiungi attività
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={`bg-gray-900 border-white/10 ${isMobile ? 'max-w-[95vw] w-full max-h-[80vh]' : 'max-w-md max-h-[80vh]'} overflow-y-auto`}>
                                <DialogHeader>
                                  <DialogTitle className="text-white">Aggiungi attrazione</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2 mt-4">
                                  {selectedAttractions.length === 0 ? (
                                    <p className="text-white/50 text-center py-4">
                                      Nessuna attrazione selezionata. Vai alla mappa per aggiungerne!
                                    </p>
                                  ) : (
                                    selectedAttractions.map((attr) => (
                                      <button
                                        key={attr.id}
                                        onClick={() => handleAddToSlot(attr, slot.id)}
                                        className="w-full text-left p-2 md:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                      >
                                        <div className="flex gap-2 md:gap-3">
                                          {attr.image && (
                                            <img src={attr.image} alt={attr.name} className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg" referrerPolicy="no-referrer" loading="lazy" />
                                          )}
                                          <div>
                                            <p className="text-white font-medium text-sm md:text-base">{attr.name}</p>
                                            <p className="text-white/50 text-xs md:text-sm">{attr.duration}</p>
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Sidebar - Available Attractions */}
            <div className="lg:col-span-1">
              <Card className="bg-white/5 border-white/10 p-3 md:p-4 lg:sticky lg:top-24">
                <h3 className="font-semibold text-white mb-3 md:mb-4 text-sm md:text-base">Le tue attrazioni</h3>
                {selectedAttractions.length === 0 ? (
                  <div className="text-center py-4 md:py-6">
                    <p className="text-white/50 text-sm">Nessuna attrazione selezionata</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto scrollbar-hide">
                    {selectedAttractions.map((attr) => (
                      <div key={attr.id} className="p-2 md:p-3 bg-white/5 rounded-lg flex gap-2 md:gap-3">
                        {attr.image && (
                          <img src={attr.image} alt={attr.name} className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg flex-shrink-0" referrerPolicy="no-referrer" loading="lazy" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs md:text-sm font-medium truncate">{attr.name}</p>
                          <p className="text-white/50 text-xs">{attr.city}</p>
                          {attr.price > 0 && (
                            <p className="text-white/40 text-xs">{formatPriceEurPrimary(attr.price)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
