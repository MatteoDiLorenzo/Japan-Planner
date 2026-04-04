import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { X, Layers, Plus, Check, ExternalLink, Train, Bus, Eye, EyeOff, Navigation, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  tokyoMetroStations, 
  tokyoMetroLines, 
  kyotoMetroStations, 
  kyotoMetroLines,
  osakaMetroStations,
  osakaMetroLines,
  naraStations,
  naraLines,
  sampleHotels,
  findNearestMetroStation,
  getAllLinesForCity,
  tokyoBusStations,
  kyotoBusStations,
  osakaBusStations,
  naraBusStations,
  tokyoBusLines,
  kyotoBusLines,
  osakaBusLines,
  naraBusLines
} from '@/data/attractions';
import { useTrip } from '@/hooks/useTrip';
import type { Attraction, MetroStation, Hotel, LineVisibility } from '@/types';
import { eurToJpy, JPY_PER_EUR } from '@/lib/currency';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Custom icons - Larger for mobile touch targets
const createAttractionIcon = (type: string, isSelected: boolean, isMobile: boolean) => {
  const colors: Record<string, string> = {
    temple: '#8B5CF6',
    nature: '#10B981',
    food: '#F59E0B',
    shopping: '#EC4899',
    culture: '#3B82F6',
    park: '#22C55E',
    museum: '#6366F1',
    entertainment: '#F97316',
  };
  const color = isSelected ? '#EF4444' : (colors[type] || '#6B7280');
  const size = isMobile ? 44 : 36;
  const fontSize = isMobile ? 18 : 16;
  
  return new DivIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        cursor: pointer;
        transition: transform 0.2s;
      ">📍</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createMetroIcon = (lineColor: string, isMobile: boolean) => {
  const size = isMobile ? 18 : 16;
  return new DivIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${lineColor};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createHotelIcon = (isMobile: boolean) => {
  const size = isMobile ? 38 : 32;
  const fontSize = isMobile ? 16 : 14;
  return new DivIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: #3B82F6;
        border: 3px solid white;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
      ">🏨</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createBusIcon = (lineColor: string, isMobile: boolean) => {
  const size = isMobile ? 20 : 18;
  return new DivIcon({
    className: 'custom-marker bus-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${lineColor};
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 9px; color: white;">🚌</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

interface MapViewProps {
  selectedCity: string;
  showMetro: boolean;
  showHotels: boolean;
  showBus?: boolean;
  selectedAttraction: Attraction | null;
  onAttractionSelect: (attraction: Attraction | null) => void;
  attractions: Attraction[];
}

// Map controller component
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Geocoding function using Nominatim
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Mobile Legend Component
function MobileLegend({ 
  showMetro, 
  showBus, 
  showHotels, 
  cityMetroLines, 
  cityBusLines, 
  lineVisibility 
}: { 
  showMetro: boolean; 
  showBus: boolean;
  showHotels: boolean;
  cityMetroLines: any[];
  cityBusLines: any[];
  lineVisibility: LineVisibility;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const categories = [
    { color: '#8B5CF6', label: 'Tempio' },
    { color: '#10B981', label: 'Natura' },
    { color: '#F59E0B', label: 'Food' },
    { color: '#EC4899', label: 'Shop' },
    { color: '#3B82F6', label: 'Cultura' },
    { color: '#22C55E', label: 'Parco' },
    { color: '#6366F1', label: 'Museo' },
    { color: '#F97316', label: 'Divert.' },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-[510] pointer-events-auto">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 bg-black/90 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20 shadow-lg"
      >
        <Layers className="w-4 h-4 text-white" />
        <span className="text-white text-xs">Legenda</span>
        {isExpanded ? <ChevronDown className="w-3 h-3 text-white/60" /> : <ChevronUp className="w-3 h-3 text-white/60" />}
      </button>
      
      {isExpanded && (
        <div className="mt-2 bg-black/95 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-xl max-w-[180px]">
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-white/80 text-xs">{cat.label}</span>
              </div>
            ))}
          </div>
          {(showMetro || showBus || showHotels) && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              {showMetro && cityMetroLines.filter(l => lineVisibility[l.id]).length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-white/80 text-xs">Metro</span>
                </div>
              )}
              {showBus && cityBusLines.filter(l => lineVisibility[l.id]).length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-orange-400" />
                  <span className="text-white/80 text-xs">Bus</span>
                </div>
              )}
              {showHotels && (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded bg-purple-500" />
                  <span className="text-white/80 text-xs">Hotel</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MapView({ 
  selectedCity, 
  showMetro, 
  showHotels,
  showBus = true,
  selectedAttraction, 
  onAttractionSelect,
  attractions: attractionsList
}: MapViewProps) {
  const isMobile = useIsMobile();
  const { addAttraction, removeAttraction, isAttractionSelected, addHotel, selectedHotels, removeHotel, customHotels, addCustomHotel } = useTrip();
  const [selectedStation, setSelectedStation] = useState<MetroStation | null>(null);
  const [showAddHotelDialog, setShowAddHotelDialog] = useState(false);
  const [newHotel, setNewHotel] = useState({
    name: '',
    address: '',
    bookingUrl: '',
    price: '',
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Line visibility state
  const [lineVisibility, setLineVisibility] = useState<LineVisibility>({});
  const [showLineControls, setShowLineControls] = useState(false);
  const [animatedLines, setAnimatedLines] = useState(true);
  
  // Initialize line visibility when city changes
  useEffect(() => {
    const allLines = getAllLinesForCity(selectedCity);
    const visibility: LineVisibility = {};
    allLines.forEach(line => {
      visibility[line.id] = true;
    });
    setLineVisibility(visibility);
  }, [selectedCity]);
  
  const toggleLineVisibility = useCallback((lineId: string) => {
    setLineVisibility(prev => ({
      ...prev,
      [lineId]: !prev[lineId]
    }));
  }, []);
  
  const showAllLines = useCallback(() => {
    const allLines = getAllLinesForCity(selectedCity);
    const visibility: LineVisibility = {};
    allLines.forEach(line => {
      visibility[line.id] = true;
    });
    setLineVisibility(visibility);
  }, [selectedCity]);
  
  const hideAllLines = useCallback(() => {
    const allLines = getAllLinesForCity(selectedCity);
    const visibility: LineVisibility = {};
    allLines.forEach(line => {
      visibility[line.id] = false;
    });
    setLineVisibility(visibility);
  }, [selectedCity]);

  // Get city center coordinates
  const cityCenter: [number, number] = useMemo(() => {
    const centers: Record<string, [number, number]> = {
      tokyo: [35.6762, 139.6503],
      kyoto: [35.0116, 135.7681],
      osaka: [34.6937, 135.5023],
      nara: [34.6851, 135.8048],
      all: [35.6762, 139.6503],
    };
    return centers[selectedCity] || centers.tokyo;
  }, [selectedCity]);
  
  // Get metro stations and lines for selected city
  const cityMetroStations = useMemo(() => {
    if (!showMetro) return [];
    switch (selectedCity) {
      case 'tokyo': return tokyoMetroStations;
      case 'kyoto': return kyotoMetroStations;
      case 'osaka': return osakaMetroStations;
      case 'nara': return naraStations;
      case 'all': return tokyoMetroStations;
      default: return [];
    }
  }, [showMetro, selectedCity]);

  const cityMetroLines = useMemo(() => {
    if (!showMetro) return [];
    switch (selectedCity) {
      case 'tokyo': return tokyoMetroLines;
      case 'kyoto': return kyotoMetroLines;
      case 'osaka': return osakaMetroLines;
      case 'nara': return naraLines;
      case 'all': return tokyoMetroLines;
      default: return [];
    }
  }, [showMetro, selectedCity]);
  
  // Get bus stations and lines for selected city
  const cityBusStations = useMemo(() => {
    if (!showBus) return [];
    switch (selectedCity) {
      case 'tokyo': return tokyoBusStations;
      case 'kyoto': return kyotoBusStations;
      case 'osaka': return osakaBusStations;
      case 'nara': return naraBusStations;
      case 'all': return tokyoBusStations;
      default: return [];
    }
  }, [showBus, selectedCity]);

  const cityBusLines = useMemo(() => {
    if (!showBus) return [];
    switch (selectedCity) {
      case 'tokyo': return tokyoBusLines;
      case 'kyoto': return kyotoBusLines;
      case 'osaka': return osakaBusLines;
      case 'nara': return naraBusLines;
      case 'all': return tokyoBusLines;
      default: return [];
    }
  }, [showBus, selectedCity]);
  
  // Get all lines for the city (for line controls)
  useMemo(() => {
    return getAllLinesForCity(selectedCity);
  }, [selectedCity]);

  // Get hotels for selected city
  const cityHotels = useMemo(() => {
    if (!showHotels) return [];
    const allHotels = [...sampleHotels, ...customHotels];
    if (selectedCity === 'all') return allHotels;
    return allHotels.filter(h => h.city === selectedCity);
  }, [showHotels, selectedCity, customHotels]);

  const toggleAttraction = (attraction: Attraction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAttractionSelected(attraction.id)) {
      removeAttraction(attraction.id);
    } else {
      addAttraction(attraction);
    }
  };

  const toggleHotel = (hotel: Hotel, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSelected = selectedHotels.some(h => h.id === hotel.id);
    if (isSelected) {
      removeHotel(hotel.id);
    } else {
      addHotel(hotel);
    }
  };

  const isHotelSelected = (hotelId: string) => {
    return selectedHotels.some(h => h.id === hotelId);
  };

  const handleAddHotel = async () => {
    if (!newHotel.name || !newHotel.address || !newHotel.bookingUrl) return;
    
    setIsGeocoding(true);
    const coordinates = await geocodeAddress(newHotel.address);
    setIsGeocoding(false);
    
    if (coordinates) {
      const hotel: Hotel = {
        id: `custom-hotel-${Date.now()}`,
        name: newHotel.name,
        nameJp: newHotel.name,
        city: selectedCity === 'all' ? 'tokyo' : selectedCity,
        coordinates,
        address: newHotel.address,
        price: eurToJpy(parseFloat(newHotel.price) || 0) || eurToJpy(80),
        rating: 4.0,
        bookingUrl: newHotel.bookingUrl,
      };
      
      addCustomHotel(hotel);
      setNewHotel({ name: '', address: '', bookingUrl: '', price: '' });
      setShowAddHotelDialog(false);
    } else {
      alert('Impossibile trovare le coordinate per questo indirizzo. Riprova con un indirizzo più specifico.');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-2xl overflow-hidden">
      <MapContainer
        center={cityCenter}
        zoom={isMobile ? 11 : 12}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
        zoomControl={!isMobile}
      >
        <MapController center={cityCenter} zoom={selectedCity === 'all' ? (isMobile ? 5 : 6) : (isMobile ? 11 : 12)} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Italian Labels Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.3}
        />

        {/* Metro Lines with enhanced styling and animations */}
        {showMetro && cityMetroLines.map((line) => {
          if (!lineVisibility[line.id]) return null;
          
          const stations = line.stations
            .map(sId => cityMetroStations.find(s => s.id === sId))
            .filter(Boolean) as MetroStation[];
          
          if (stations.length < 2) return null;
          
          const positions = stations.map(s => s.coordinates);
          
          return (
            <>
              {/* Shadow line for better visibility */}
              <Polyline
                key={`${line.id}-shadow`}
                positions={positions}
                color="#000000"
                weight={isMobile ? 10 : 8}
                opacity={0.3}
              />
              {/* Main line */}
              <Polyline
                key={line.id}
                positions={positions}
                color={line.color}
                weight={isMobile ? 6 : 5}
                opacity={0.9}
                dashArray={animatedLines ? "10, 5" : undefined}
                className={animatedLines ? "animated-line" : ""}
              />
              {/* Highlight line */}
              <Polyline
                key={`${line.id}-highlight`}
                positions={positions}
                color={line.color}
                weight={isMobile ? 3 : 2}
                opacity={0.5}
              />
            </>
          );
        })}
        
        {/* Bus Lines with distinct styling */}
        {showBus && cityBusLines.map((line) => {
          if (!lineVisibility[line.id]) return null;
          
          const stations = line.stations
            .map(sId => cityBusStations.find(s => s.id === sId))
            .filter(Boolean) as MetroStation[];
          
          if (stations.length < 2) return null;
          
          const positions = stations.map(s => s.coordinates);
          
          return (
            <>
              {/* Shadow line for better visibility */}
              <Polyline
                key={`${line.id}-shadow`}
                positions={positions}
                color="#000000"
                weight={isMobile ? 8 : 6}
                opacity={0.3}
              />
              {/* Main bus line - dotted style */}
              <Polyline
                key={line.id}
                positions={positions}
                color={line.color}
                weight={isMobile ? 5 : 4}
                opacity={0.85}
                dashArray="8, 8"
                className={animatedLines ? "animated-bus-line" : ""}
              />
            </>
          );
        })}

        {/* Metro Stations */}
        {showMetro && cityMetroStations.map((station) => (
          <Marker
            key={station.id}
            position={station.coordinates}
            icon={createMetroIcon(station.lineColor, isMobile)}
            eventHandlers={{
              click: () => {
                setShowLineControls(false);
                setSelectedStation(station);
              },
            }}
          >
            <Popup className={isMobile ? 'mobile-popup' : ''}>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: station.lineColor }}
                  />
                  <h4 className="font-semibold">{station.name}</h4>
                </div>
                <p className="text-sm text-gray-500">{station.nameJp}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Linea: {cityMetroLines.find(l => l.id === station.line)?.name}
                </p>
                {station.connections.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Connessioni:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {station.connections.map(conn => (
                        <span key={conn} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {conn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Bus Stations */}
        {showBus && cityBusStations.map((station) => (
          <Marker
            key={station.id}
            position={station.coordinates}
            icon={createBusIcon(station.lineColor, isMobile)}
            eventHandlers={{
              click: () => {
                setShowLineControls(false);
                setSelectedStation(station);
              },
            }}
          >
            <Popup className={isMobile ? 'mobile-popup' : ''}>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-4 h-4 rounded flex items-center justify-center" 
                    style={{ backgroundColor: station.lineColor }}
                  >
                    <span className="text-[8px]">🚌</span>
                  </div>
                  <h4 className="font-semibold">{station.name}</h4>
                </div>
                <p className="text-sm text-gray-500">{station.nameJp}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Linea Bus: {cityBusLines.find(l => l.id === station.line)?.name}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Attractions */}
        {attractionsList.map((attraction) => {
          const isSelected = isAttractionSelected(attraction.id);
          return (
            <Marker
              key={attraction.id}
              position={attraction.coordinates}
              icon={createAttractionIcon(attraction.type, isSelected, isMobile)}
              eventHandlers={{
                click: () => {
                  setShowLineControls(false);
                  onAttractionSelect(attraction);
                },
              }}
            >
              <Popup className={isMobile ? 'mobile-popup' : ''}>
                <div className="p-2 min-w-[220px]">
                  {attraction.image && (
                    <img 
                      src={attraction.image} 
                      alt={attraction.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{attraction.name}</h4>
                      <p className="text-sm text-gray-500">{attraction.nameJp}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {attraction.duration}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{attraction.description}</p>
                  
                  {/* Nearest Station */}
                  {(() => {
                    const nearest = findNearestMetroStation(attraction.coordinates, attraction.city);
                    if (nearest) {
                      return (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <Train className="w-3 h-3" />
                          <span>Stazione più vicina: {nearest.name}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {attraction.price > 0
                        ? `${Math.round(attraction.price / JPY_PER_EUR)} € (¥${attraction.price.toLocaleString('it-IT')})`
                        : 'Gratis'}
                    </span>
                    <Button
                      size={isMobile ? "default" : "sm"}
                      className={isSelected 
                        ? "bg-red-600 hover:bg-red-700 text-white border-0" 
                        : "bg-blue-600 hover:bg-blue-700 text-white border-0"
                      }
                      onClick={(e) => toggleAttraction(attraction, e)}
                    >
                      {isSelected ? 'Rimuovi' : 'Aggiungi'}
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Hotels */}
        {cityHotels.map((hotel) => {
          const isSelected = isHotelSelected(hotel.id);
          return (
            <Marker
              key={hotel.id}
              position={hotel.coordinates}
              icon={createHotelIcon(isMobile)}
              eventHandlers={{
                click: () => setShowLineControls(false),
              }}
            >
              <Popup className={isMobile ? 'mobile-popup' : ''}>
                <div className="p-2 min-w-[220px]">
                  {hotel.image && (
                    <img 
                      src={hotel.image} 
                      alt={hotel.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{hotel.name}</h4>
                      <p className="text-sm text-gray-500">{hotel.nameJp}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{hotel.address}</p>
                  
                  {/* Nearest Station */}
                  {(() => {
                    const nearest = findNearestMetroStation(hotel.coordinates, hotel.city);
                    if (nearest) {
                      return (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <Train className="w-3 h-3" />
                          <span>Stazione più vicina: {nearest.name}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {Math.round(hotel.price / JPY_PER_EUR)} € (¥{hotel.price.toLocaleString('it-IT')})/notte
                    </span>
                    <span className="text-sm text-yellow-500">★ {hotel.rating}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size={isMobile ? "default" : "sm"}
                      className={`flex-1 ${isSelected 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" 
                        : "bg-blue-600 hover:bg-blue-700 text-white border-0"
                      }`}
                      onClick={(e) => toggleHotel(hotel, e)}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {isSelected ? 'Selezionato' : 'Aggiungi'}
                    </Button>
                    <a 
                      href={hotel.bookingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Booking
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

        {/* Add Hotel Button - Repositioned for mobile */}
      {showHotels && (
        <div className={`absolute z-[520] ${isMobile ? 'bottom-20 right-4' : 'top-4 left-4'}`}>
          <Dialog open={showAddHotelDialog} onOpenChange={setShowAddHotelDialog}>
            <DialogTrigger asChild>
              <Button 
                className={`bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-0 ${isMobile ? 'rounded-full w-12 h-12 p-0' : ''}`}
                size={isMobile ? "icon" : "default"}
              >
                <Plus className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4 mr-2'}`} />
                {!isMobile && 'Aggiungi Hotel'}
              </Button>
            </DialogTrigger>
            <DialogContent className={`bg-gray-900 border-white/10 ${isMobile ? 'max-w-[95vw] w-full max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
              <DialogHeader>
                <DialogTitle className="text-white">Aggiungi Hotel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Nome Hotel</label>
                  <Input
                    placeholder="Es. Hotel Granvia"
                    value={newHotel.name}
                    onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Indirizzo Completo</label>
                  <Input
                    placeholder="Es. 1-1-1 Shibuya, Tokyo, Japan"
                    value={newHotel.address}
                    onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                  <p className="text-white/40 text-xs mt-1">Inserisci l'indirizzo completo per calcolare le coordinate</p>
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Link Booking.com</label>
                  <Input
                    placeholder="https://www.booking.com/hotel/..."
                    value={newHotel.bookingUrl}
                    onChange={(e) => setNewHotel({ ...newHotel, bookingUrl: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Prezzo per notte (€, 1€=183¥)</label>
                  <Input
                    type="number"
                    placeholder="120"
                    value={newHotel.price}
                    onChange={(e) => setNewHotel({ ...newHotel, price: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <Button 
                  onClick={handleAddHotel} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                  disabled={isGeocoding}
                >
                  {isGeocoding ? 'Calcolo coordinate...' : 'Aggiungi Hotel'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Line Controls Toggle */}
      {showMetro && (
        <div className={`absolute z-[520] ${isMobile ? 'top-4 right-4' : 'top-4 right-4'}`}>
          <Button
            onClick={() => {
              setShowLineControls((open) => {
                const next = !open;
                if (next) {
                  setSelectedStation(null);
                  onAttractionSelect(null);
                }
                return next;
              });
            }}
            className="bg-gray-800 hover:bg-gray-700 text-white border border-white/20 shadow-lg"
            size={isMobile ? "sm" : "default"}
          >
            <Navigation className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4 mr-2'}`} />
            {!isMobile && (showLineControls ? 'Nascondi Linee' : 'Mostra Linee')}
          </Button>
        </div>
      )}
      
      {/* Line Controls Panel */}
      {showLineControls && (
        <div className={`absolute bg-black/95 backdrop-blur-md rounded-xl p-4 border border-white/20 z-[540] shadow-2xl overflow-hidden flex flex-col ${
          isMobile 
            ? 'top-16 left-4 right-4 max-h-[55vh]' 
            : 'top-16 right-4 w-72 max-h-[70vh]'
        }`}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-white font-semibold text-sm">Controlla Linee</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowLineControls(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Chiudi pannello linee"
              >
                <X className="w-4 h-4" />
              </button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs text-white border-white/30 hover:bg-white/10 hover:text-white h-6 px-2"
                onClick={showAllLines}
              >
                Tutte
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs text-white border-white/30 hover:bg-white/10 hover:text-white h-6 px-2"
                onClick={hideAllLines}
              >
                Nessuna
              </Button>
            </div>
          </div>
          
          {/* Animation Toggle */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
            <span className="text-white/70 text-xs">Animazioni</span>
            <Switch
              checked={animatedLines}
              onCheckedChange={setAnimatedLines}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
          
          <ScrollArea className={isMobile ? "h-[40vh]" : "h-[50vh]"}>
            <div className="space-y-3">
              {/* Metro Lines */}
              {cityMetroLines.length > 0 && (
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Train className="w-3 h-3" /> Metro/Treni
                  </p>
                  <div className="space-y-1">
                    {cityMetroLines.map(line => (
                      <button
                        key={line.id}
                        onClick={() => toggleLineVisibility(line.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {lineVisibility[line.id] ? (
                          <Eye className="w-3 h-3 text-white/60" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-white/30" />
                        )}
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: line.color }}
                        />
                        <span className={`text-xs ${lineVisibility[line.id] ? 'text-white' : 'text-white/40'}`}>
                          {line.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Bus Lines */}
              {cityBusLines.length > 0 && (
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Bus className="w-3 h-3" /> Bus
                  </p>
                  <div className="space-y-1">
                    {cityBusLines.map(line => (
                      <button
                        key={line.id}
                        onClick={() => toggleLineVisibility(line.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {lineVisibility[line.id] ? (
                          <Eye className="w-3 h-3 text-white/60" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-white/30" />
                        )}
                        <div 
                          className="w-3 h-3 rounded flex-shrink-0 border border-white/30"
                          style={{ backgroundColor: line.color }}
                        />
                        <span className={`text-xs ${lineVisibility[line.id] ? 'text-white' : 'text-white/40'}`}>
                          {line.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* Legend - Mobile optimized */}
      {isMobile && !showLineControls ? (
        <MobileLegend 
          showMetro={showMetro} 
          showBus={showBus}
          showHotels={showHotels}
          cityMetroLines={cityMetroLines}
          cityBusLines={cityBusLines}
          lineVisibility={lineVisibility}
        />
      ) : !isMobile ? (
        /* Desktop Legend */
        <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-sm rounded-xl p-4 border border-white/20 z-[510] max-w-[240px] shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-bold">Legenda</span>
          </div>
          
          {/* Attractions */}
          <div className="space-y-2 mb-3">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Attrazioni</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 border border-white/30" />
              <span className="text-white/90 text-xs">Tempio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white/30" />
              <span className="text-white/90 text-xs">Natura</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-white/30" />
              <span className="text-white/90 text-xs">Gastronomia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500 border border-white/30" />
              <span className="text-white/90 text-xs">Shopping</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-white/30" />
              <span className="text-white/90 text-xs">Cultura</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border border-white/30" />
              <span className="text-white/90 text-xs">Parco</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500 border border-white/30" />
              <span className="text-white/90 text-xs">Museo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 border border-white/30" />
              <span className="text-white/90 text-xs">Divertimento</span>
            </div>
          </div>
          
          {/* Transport - Dynamic based on visible lines */}
          {(showMetro || showBus || showHotels) && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Trasporti</p>
              
              {/* Visible Metro Lines */}
              {showMetro && cityMetroLines.filter(l => lineVisibility[l.id]).length > 0 && (
                <div className="space-y-1">
                  <p className="text-white/40 text-[10px] uppercase">Metro/Treni</p>
                  {cityMetroLines.filter(l => lineVisibility[l.id]).slice(0, 4).map(line => (
                    <div key={line.id} className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="text-white/80 text-xs truncate">{line.name.split('(')[0]}</span>
                    </div>
                  ))}
                  {cityMetroLines.filter(l => lineVisibility[l.id]).length > 4 && (
                    <p className="text-white/40 text-[10px] pl-4">
                      +{cityMetroLines.filter(l => lineVisibility[l.id]).length - 4} altre
                    </p>
                  )}
                </div>
              )}
              
              {/* Visible Bus Lines */}
              {showBus && cityBusLines.filter(l => lineVisibility[l.id]).length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-white/40 text-[10px] uppercase">Bus</p>
                  {cityBusLines.filter(l => lineVisibility[l.id]).slice(0, 3).map(line => (
                    <div key={line.id} className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded border border-white/30" 
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="text-white/80 text-xs truncate">{line.name.split('(')[0]}</span>
                    </div>
                  ))}
                  {cityBusLines.filter(l => lineVisibility[l.id]).length > 3 && (
                    <p className="text-white/40 text-[10px] pl-4">
                      +{cityBusLines.filter(l => lineVisibility[l.id]).length - 3} altre
                    </p>
                  )}
                </div>
              )}
              
              {showHotels && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 rounded bg-purple-500 border border-white/30" />
                  <span className="text-white/90 text-xs">Hotel</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Selected Station Panel - Mobile: Bottom Sheet, Desktop: Top Right */}
      {selectedStation && (
        <div className={`bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl ${
          isMobile 
            ? 'fixed bottom-0 left-0 right-0 z-[600] rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[50vh] overflow-y-auto' 
            : 'absolute top-4 right-4 z-[540] w-72 rounded-xl p-4'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">{selectedStation.name}</h3>
              <p className="text-sm text-white/60">{selectedStation.nameJp}</p>
            </div>
            <button 
              onClick={() => setSelectedStation(null)}
              className="text-white/50 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div 
            className="w-full h-1 rounded-full mb-3" 
            style={{ backgroundColor: selectedStation.lineColor }}
          />
          <p className="text-white/70 text-sm mb-2">
            Linea: {cityMetroLines.find(l => l.id === selectedStation.line)?.name}
          </p>
          {selectedStation.connections.length > 0 && (
            <div>
              <p className="text-white/50 text-sm mb-1">Connessioni:</p>
              <div className="flex flex-wrap gap-1">
                {selectedStation.connections.map(conn => (
                  <Badge key={conn} variant="secondary" className="bg-white/10">
                    {conn}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Attraction Panel - Mobile: Bottom Sheet, Desktop: Top Right */}
      {selectedAttraction && (
        <div className={`bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl ${
          isMobile 
            ? 'fixed bottom-0 left-0 right-0 z-[600] rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[60vh] overflow-y-auto' 
            : 'absolute top-4 right-4 z-[540] w-80 rounded-xl p-4'
        }`}>
          {selectedAttraction.image && (
            <img 
              src={selectedAttraction.image} 
              alt={selectedAttraction.name}
              className={`w-full object-cover rounded-lg mb-3 ${isMobile ? 'h-40' : 'h-32'}`}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-2">
              <h3 className="font-semibold text-white">{selectedAttraction.name}</h3>
              <p className="text-sm text-white/60">{selectedAttraction.nameJp}</p>
            </div>
            <button 
              onClick={() => onAttractionSelect(null)}
              className="text-white/50 hover:text-white p-1 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/70 mb-3">{selectedAttraction.description}</p>
          
          {/* Nearest Station */}
          {(() => {
            const nearest = findNearestMetroStation(selectedAttraction.coordinates, selectedAttraction.city);
            if (nearest) {
              return (
                <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                  <Train className="w-4 h-4 text-blue-400" />
                  <span>Stazione più vicina: <span className="text-white">{nearest.name}</span></span>
                </div>
              );
            }
            return null;
          })()}
          
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="text-white/60">⏱ {selectedAttraction.duration}</span>
            <span className="text-white/60">
              {selectedAttraction.price > 0
                ? `${Math.round(selectedAttraction.price / JPY_PER_EUR)} € (¥${selectedAttraction.price.toLocaleString('it-IT')})`
                : 'Gratis'}
            </span>
          </div>
          <Button
            className={`w-full ${isMobile ? 'h-12 text-base' : ''}`}
            variant={isAttractionSelected(selectedAttraction.id) ? "destructive" : "default"}
            onClick={(e) => toggleAttraction(selectedAttraction, e)}
          >
            {isAttractionSelected(selectedAttraction.id) ? 'Rimuovi dal viaggio' : 'Aggiungi al viaggio'}
          </Button>
        </div>
      )}
    </div>
  );
}
