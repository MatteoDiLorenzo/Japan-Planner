import { useState, useEffect, useRef } from 'react';
import { Map, Route, Sun, Cloud, CloudRain, Snowflake, Wallet, Share2, Menu, X, ChevronDown, Wind, Droplets, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripSharingDialog } from '@/components/TripSharingDialog';
import { useTrip } from '@/hooks/useTrip';
import { getWeather, type WeatherData } from '@/services/weatherService';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavbarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const cities = [
  { id: 'tokyo', name: 'Tokyo', nameJp: '東京' },
  { id: 'kyoto', name: 'Kyoto', nameJp: '京都' },
  { id: 'osaka', name: 'Osaka', nameJp: '大阪' },
  { id: 'nara', name: 'Nara', nameJp: '奈良' },
];

export function Navbar({ activeSection, onSectionChange }: NavbarProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherCity, setWeatherCity] = useState('tokyo');
  const [showWeatherCard, setShowWeatherCard] = useState(false);
  const weatherRef = useRef<HTMLDivElement>(null);
  const { getTotalSpent, totalBudget, selectedAttractions, selectedHotels, dayPlans } = useTrip();

  const navItems = [
    { id: 'home', label: 'Home', icon: null },
    { id: 'map', label: 'Mappa', icon: Map },
    { id: 'itinerary', label: 'Itinerario', icon: Route },
  ];

  useEffect(() => {
    const fetchWeather = async () => {
      const data = await getWeather(weatherCity);
      if (data) setWeather(data);
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [weatherCity]);

  // Close weather card when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weatherRef.current && !weatherRef.current.contains(event.target as Node)) {
        setShowWeatherCard(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const spent = getTotalSpent();
  const remaining = totalBudget - spent;
  const budgetPercent = Math.min((spent / totalBudget) * 100, 100);

  const getWeatherIcon = (size: 'sm' | 'lg' = 'sm') => {
    const className = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8';
    if (!weather) return <Sun className={`${className} text-yellow-400`} />;
    if (weather.condition.toLowerCase().includes('rain')) return <CloudRain className={`${className} text-blue-400`} />;
    if (weather.condition.toLowerCase().includes('snow')) return <Snowflake className={`${className} text-blue-200`} />;
    if (weather.condition.toLowerCase().includes('cloud')) return <Cloud className={`${className} text-gray-400`} />;
    return <Sun className={`${className} text-yellow-400`} />;
  };

  const handleSaveTrip = () => {
    const tripData = {
      attractions: selectedAttractions,
      hotels: selectedHotels,
      days: dayPlans,
      budget: { total: totalBudget, spent },
      savedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(tripData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `japan-trip-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[500] bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                <span className="text-white font-bold text-sm">JP</span>
              </div>
              <span className="text-white font-semibold text-lg hidden sm:block">Japan Planner</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Side Widgets */}
            <div className="flex items-center gap-2">
              {/* Weather Widget - Desktop only */}
              <div className="relative hidden sm:block" ref={weatherRef}>
                <button
                  onClick={() => setShowWeatherCard(!showWeatherCard)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {getWeatherIcon()}
                  <span className="text-white text-sm">{weather?.temperature || 18}°C</span>
                  <span className="text-white/60 text-xs">{cities.find(c => c.id === weatherCity)?.name || 'Tokyo'}</span>
                  <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${showWeatherCard ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Weather Card */}
                {showWeatherCard && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-black/95 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-2xl z-[550]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">Meteo</h3>
                      <button 
                        onClick={() => setShowWeatherCard(false)}
                        className="text-white/50 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* City Selector */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {cities.map((city) => (
                        <button
                          key={city.id}
                          onClick={() => setWeatherCity(city.id)}
                          className={`px-2 py-1 rounded-lg text-xs transition-all ${
                            weatherCity === city.id
                              ? 'bg-red-500 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                    
                    {/* Weather Info */}
                    {weather && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          {getWeatherIcon('lg')}
                          <div>
                            <p className="text-3xl font-bold text-white">{weather.temperature}°C</p>
                            <p className="text-white/60 text-sm">{weather.condition}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="text-white/50 text-xs">Umidità</p>
                              <p className="text-white text-sm">{weather.humidity}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wind className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-white/50 text-xs">Vento</p>
                              <p className="text-white text-sm">{weather.windSpeed} km/h</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Budget Widget - Desktop only */}
              <div 
                className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors"
                onClick={() => onSectionChange('budget')}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-white text-xs font-medium">Budget</span>
                  <span className={`text-xs ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ¥{remaining.toLocaleString()}
                  </span>
                </div>
                <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${budgetPercent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>

              {/* Save Trip Button - Desktop only */}
              <Button 
                variant="outline" 
                size="sm"
                className="hidden sm:flex border-white/30 text-white hover:bg-white/10"
                onClick={handleSaveTrip}
              >
                <Navigation className="w-4 h-4 mr-1" />
                Salva
              </Button>

              {/* Condividi / itinerari - Desktop */}
              <TripSharingDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex text-white/70 hover:text-white hover:bg-white/10"
                  title="Itinerari e condivisione"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </TripSharingDialog>

              {/* Start Button */}
              <Button 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm shadow-lg shadow-red-500/20"
                onClick={() => onSectionChange('map')}
              >
                Inizia
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobile && (
        <div 
          className={`mobile-menu-container fixed inset-0 z-[480] transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div 
            className={`absolute top-16 left-0 right-0 bg-black/95 border-b border-white/10 shadow-2xl transition-transform duration-300 ${
              mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
            }`}
          >
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                  {item.label}
                </button>
              ))}
              
              {/* Mobile Budget */}
              <button
                onClick={() => handleNavClick('budget')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                  activeSection === 'budget'
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <div className="flex-1">
                  <span>Budget</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${budgetPercent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${budgetPercent}%` }}
                      />
                    </div>
                    <span className={`text-xs ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      ¥{remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
              
              {/* Mobile Weather */}
              <div className="flex items-center gap-3 px-4 py-3 text-white/70">
                {getWeatherIcon()}
                <div className="flex-1 flex items-center justify-between">
                  <span>Meteo {cities.find(c => c.id === weatherCity)?.name}</span>
                  <span className="text-white">{weather?.temperature || 18}°C</span>
                </div>
              </div>
              
              <TripSharingDialog>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  Itinerari e condivisione
                </button>
              </TripSharingDialog>

              {/* Mobile Save file */}
              <button
                onClick={() => {
                  handleSaveTrip();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <Navigation className="w-5 h-5" />
                Esporta JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
