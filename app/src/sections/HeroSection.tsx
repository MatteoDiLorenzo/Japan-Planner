import { useState, useEffect } from 'react';
import { ArrowRight, MapPin, Train, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNextTrain, type TrainSchedule } from '@/services/trainService';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeroSectionProps {
  onExploreMap: () => void;
  onCreateItinerary: () => void;
}

export function HeroSection({ onExploreMap, onCreateItinerary }: HeroSectionProps) {
  const isMobile = useIsMobile();
  const [nextTrain, setNextTrain] = useState<TrainSchedule | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Get next train from Tokyo to Kyoto
    const train = getNextTrain('Tokyo', 'Kyoto');
    setNextTrain(train);
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      const updatedTrain = getNextTrain('Tokyo', 'Kyoto');
      setNextTrain(updatedTrain);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80')`,
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/85" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 md:mb-8">
          <MapPin className="w-4 h-4 text-red-400" />
          <span className="text-white/90 text-sm">Esplora il Giappone</span>
        </div>

        {/* Main Title - Responsive sizing */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 leading-tight">
          <span className="block">Il tuo viaggio in</span>
          <span className="block bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent mt-2">
            Giappone
          </span>
          <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-light mt-2 md:mt-4">
            perfettamente orchestrato.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 md:mb-10 px-2">
          Dalla prenotazione del treno alla scoperta del ramen nascosto, 
          organizza ogni istante del tuo viaggio nei dettagli.
        </p>

        {/* Feature Pills - Hidden on very small screens */}
        <div className="hidden sm:flex flex-wrap justify-center gap-3 md:gap-4 mb-8 md:mb-10">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <MapPin className="w-4 h-4 text-red-400" />
            <span className="text-white/90 text-sm">Mappa Interattiva</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <Train className="w-4 h-4 text-blue-400" />
            <span className="text-white/90 text-sm">Orari Treni Reali</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-white/90 text-sm">Pianificazione</span>
          </div>
        </div>

        {/* CTA Buttons - Responsive sizing */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
          <Button
            size={isMobile ? "default" : "lg"}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 hover:scale-105 active:scale-95"
            onClick={onCreateItinerary}
          >
            <span className="sm:hidden">Inizia ora</span>
            <span className="hidden sm:inline">Inizia la tua avventura</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
          <Button
            size={isMobile ? "default" : "lg"}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl backdrop-blur-sm transition-all active:scale-95"
            onClick={onExploreMap}
          >
            Esplora la mappa
          </Button>
        </div>
      </div>

      {/* Train Info Card - Bottom Right - Responsive */}
      {nextTrain && (
        <div className="absolute bottom-20 sm:bottom-8 right-4 sm:right-8 z-20">
          <div className="bg-black/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20 max-w-[200px] sm:max-w-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Train className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white/60 text-xs">Prossimo treno</p>
                  <span className="text-white/40 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatCurrentTime()} JST
                  </span>
                </div>
                <p className="text-white font-semibold text-xs sm:text-sm truncate">{nextTrain.from} → {nextTrain.to}</p>
                <p className="text-red-400 text-xs">
                  {nextTrain.departureTime} - {nextTrain.duration} ({nextTrain.trainType})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
