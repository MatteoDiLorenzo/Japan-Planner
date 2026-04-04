import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/sections/HeroSection';
import { MapSection } from '@/sections/MapSection';
import { DayBuilderSection } from '@/sections/DayBuilderSection';
import { BudgetSection } from '@/sections/BudgetSection';
import { TripProvider } from '@/hooks/useTrip';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function AppContent() {
  const [activeSection, setActiveSection] = useState('home');

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <HeroSection
            onExploreMap={() => setActiveSection('map')}
            onCreateItinerary={() => setActiveSection('itinerary')}
          />
        );
      case 'map':
        return <MapSection />;
      case 'itinerary':
        return <DayBuilderSection />;
      case 'budget':
        return <BudgetSection />;
      default:
        return (
          <HeroSection
            onExploreMap={() => setActiveSection('map')}
            onCreateItinerary={() => setActiveSection('itinerary')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main>{renderSection()}</main>
      
      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JP</span>
              </div>
              <span className="text-white font-semibold">Japan Planner</span>
            </div>
            <p className="text-white/50 text-sm">
              Pianifica il tuo viaggio perfetto in Giappone
            </p>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveSection('map')}
                className="text-white/50 hover:text-white text-sm transition-colors"
              >
                Mappa
              </button>
              <button 
                onClick={() => setActiveSection('itinerary')}
                className="text-white/50 hover:text-white text-sm transition-colors"
              >
                Itinerario
              </button>
              <button 
                onClick={() => setActiveSection('budget')}
                className="text-white/50 hover:text-white text-sm transition-colors"
              >
                Budget
              </button>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/30 text-sm">
              © 2024 Japan Planner. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <TripProvider>
      <AppContent />
      <Toaster style={{ zIndex: 11050 }} />
    </TripProvider>
  );
}

export default App;
