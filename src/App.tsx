import { useState, useRef } from 'react';
import SnapMapCanvas, { SnapMapCanvasRef } from './components/SnapMapCanvas';
import { LocationPreset } from './config/gameConfig';
import GlobalSearchModal from './components/GlobalSearchModal';
import { GeocodingResult } from './services/geocodingService';
import {
  MapPin,
  ChevronDown,
  Navigation,
  Search,
  MessageCircle,
  Camera,
  Users,
  PlaySquare,
  Sun,
  Flame,
  Clock,
  Sparkles,
  UserPlus,
  RotateCw,
  RotateCcw,
  Compass,
  Globe,
  Fuel,
  Bus,
  Trophy,
  Coffee,
  Ship,
  Landmark,
  Mountain
} from 'lucide-react';
import './styles/theme.css';

const DEFAULT_LOCATION: LocationPreset = {
  id: 'palarivattom',
  name: 'Palarivattom',
  subname: 'Kochi, Kerala, India',
  lat: 10.005,
  lng: 76.315,
  zoom: 17,
  pitch: 48,
  bearing: 0,
  weather: 'Sunny',
  temp: '29°C',
};

function App() {
  const [currentLocation, setCurrentLocation] = useState<LocationPreset>(DEFAULT_LOCATION);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [is3DMode, setIs3DMode] = useState(true);
  const [isRotateMode, setIsRotateMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'memories' | 'top' | 'trending' | 'visited'>('top');

  const canvasRef = useRef<SnapMapCanvasRef>(null);

  if (typeof window !== 'undefined') {
    (window as any).__snapMapSetLocation = (lat: number, lng: number, name: string) => {
      setCurrentLocation({
        id: 'nav',
        name,
        subname: '',
        lat,
        lng,
        zoom: 17,
        pitch: 48,
        bearing: 0,
        weather: 'Sunny',
        temp: '29°C',
      });
      setResetTrigger((p) => p + 1);
    };
  }

  const handleSelectPlace = (place: GeocodingResult) => {
    setCurrentLocation({
      id: place.id,
      name: place.name,
      subname: place.fullName,
      lat: place.lat,
      lng: place.lng,
      zoom: 17,
      pitch: 48,
      bearing: 0,
      weather: 'Sunny',
      temp: '28°C',
    });
    setResetTrigger((p) => p + 1);
    setIsSearchOpen(false);
  };

  const handleToggle3D = () => {
    if (canvasRef.current) {
      const mode = canvasRef.current.toggle3D();
      setIs3DMode(mode);
    }
  };

  const handleToggleRotateMode = () => {
    if (canvasRef.current) {
      const mode = canvasRef.current.toggleRotateMode();
      setIsRotateMode(mode);
    }
  };

  const handleRotateLeft = () => {
    if (canvasRef.current) {
      canvasRef.current.rotateBy(-45);
    }
  };

  const handleRotateRight = () => {
    if (canvasRef.current) {
      canvasRef.current.rotateBy(45);
    }
  };

  const handleResetRotation = () => {
    if (canvasRef.current) {
      canvasRef.current.resetRotation();
    }
  };

  const handleRecenter = () => {
    if (canvasRef.current) {
      canvasRef.current.recenter();
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#e4f3de] select-none">
      {/* 3D Map Viewport */}
      <SnapMapCanvas
        ref={canvasRef}
        currentLocation={currentLocation}
        resetTrigger={resetTrigger}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPlace={handleSelectPlace}
      />

      {/* Top Floating Snapchat Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pointer-events-none flex flex-col gap-2.5">
        {/* Row 1: Profile Avatar, Location Info / Search, Search Button */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          {/* Bitmoji Profile Avatar */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center text-xl cursor-pointer hover:scale-105 transition-transform"
            title="Search Places Worldwide"
          >
            😎
          </div>

          {/* Location Center Pill / Global Search Trigger */}
          <div className="relative">
            <button
              className="glass-pill px-4 py-2 flex items-center gap-2 shadow-md cursor-pointer hover:bg-white/95 transition-all"
              onClick={() => setIsSearchOpen(true)}
              title="Click to search any global location"
            >
              <div className="flex flex-col items-center leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-gray-900 text-sm tracking-tight">
                    {currentLocation.name}
                  </span>
                  <ChevronDown size={14} className="text-gray-500" />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                  <Sun size={11} className="text-amber-500" />
                  <span>{currentLocation.temp || '28°C'}</span>
                  <span>•</span>
                  <span>{currentLocation.weather || 'Sunny'}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Quick Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-gray-700 shadow-md hover:bg-white transition-colors pointer-events-auto"
            title="Search Any Global Place"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Row 2: Snapchat Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto px-1">
          <button
            onClick={() => setActiveTab('memories')}
            className={`glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm
              ${activeTab === 'memories' ? 'bg-white text-gray-900 shadow-md font-bold' : 'text-gray-700'}`}
          >
            <Clock size={13} className="text-purple-500" />
            <span>Memories</span>
          </button>

          <button
            onClick={() => setActiveTab('top')}
            className={`glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm
              ${activeTab === 'top' ? 'bg-white text-gray-900 shadow-md font-bold' : 'text-gray-700'}`}
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>Top visited</span>
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm
              ${activeTab === 'trending' ? 'bg-white text-gray-900 shadow-md font-bold' : 'text-gray-700'}`}
          >
            <Flame size={13} className="text-red-500" />
            <span>Trending</span>
          </button>

          <button
            onClick={() => setActiveTab('visited')}
            className={`glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm
              ${activeTab === 'visited' ? 'bg-white text-gray-900 shadow-md font-bold' : 'text-gray-700'}`}
          >
            <MapPin size={13} className="text-emerald-500" />
            <span>Visited</span>
          </button>

          <button
            onClick={() => {
              const pumps = (window as any).__pumps;
              if (pumps && pumps.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__pumpIdx || 0) % pumps.length;
                  (window as any).__pumpIdx = nextIdx + 1;
                  const targetPump = pumps[nextIdx];
                  map.flyTo({
                    center: [targetPump.lng, targetPump.lat],
                    zoom: 18.2,
                    pitch: 58,
                    bearing: 45,
                    duration: 1400,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-emerald-600 cursor-pointer"
            title="Jump to Nearest Petrol Pump"
          >
            <Fuel size={13} className="text-emerald-600" />
            <span>Petrol Pump</span>
          </button>

          <button
            onClick={() => {
              const stops = (window as any).__busStops;
              if (stops && stops.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__busIdx || 0) % stops.length;
                  (window as any).__busIdx = nextIdx + 1;
                  const targetStop = stops[nextIdx];
                  map.flyTo({
                    center: [targetStop.lng, targetStop.lat],
                    zoom: 18.5,
                    pitch: 58,
                    bearing: 30,
                    duration: 1200,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-sky-600 cursor-pointer"
            title="Jump to Nearest Bus Stop"
          >
            <Bus size={13} className="text-sky-600" />
            <span>Bus Stop</span>
          </button>

          <button
            onClick={() => {
              const grounds = (window as any).__playgrounds;
              if (grounds && grounds.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__groundIdx || 0) % grounds.length;
                  (window as any).__groundIdx = nextIdx + 1;
                  const targetGround = grounds[nextIdx];
                  map.flyTo({
                    center: [targetGround.lng, targetGround.lat],
                    zoom: 17.8,
                    pitch: 52,
                    bearing: 25,
                    duration: 1300,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-green-600 cursor-pointer"
            title="Jump to Nearest Playground"
          >
            <Trophy size={13} className="text-green-600" />
            <span>Playground</span>
          </button>

          <button
            onClick={() => {
              const items = (window as any).__villageItems?.filter((i: any) => i.type === 'chayakada');
              if (items && items.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__chayaIdx || 0) % items.length;
                  (window as any).__chayaIdx = nextIdx + 1;
                  const target = items[nextIdx];
                  map.flyTo({
                    center: [target.lng, target.lat],
                    zoom: 18.5,
                    pitch: 55,
                    bearing: 35,
                    duration: 1300,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-amber-700 cursor-pointer"
            title="Jump to Nearest Kerala Tea Shop (ചായക്കട)"
          >
            <Coffee size={13} className="text-amber-700" />
            <span>ചായക്കട</span>
          </button>

          <button
            onClick={() => {
              const items = (window as any).__maritimeItems?.filter((i: any) => i.type === 'houseboat' || i.type === 'fishing_boat' || i.type === 'boat_jetty');
              if (items && items.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__maritimeIdx || 0) % items.length;
                  (window as any).__maritimeIdx = nextIdx + 1;
                  const target = items[nextIdx];
                  map.flyTo({
                    center: [target.lng, target.lat],
                    zoom: 18.2,
                    pitch: 52,
                    bearing: 20,
                    duration: 1300,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-blue-600 cursor-pointer"
            title="Jump to Nearest Kerala Houseboat / Boat Jetty"
          >
            <Ship size={13} className="text-blue-600" />
            <span>കെട്ടുവള്ളം</span>
          </button>

          <button
            onClick={() => {
              const items = (window as any).__villageItems?.filter((i: any) => i.type === 'temple' || i.type === 'church' || i.type === 'mosque');
              if (items && items.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__worshipIdx || 0) % items.length;
                  (window as any).__worshipIdx = nextIdx + 1;
                  const target = items[nextIdx];
                  map.flyTo({
                    center: [target.lng, target.lat],
                    zoom: 18.2,
                    pitch: 54,
                    bearing: 15,
                    duration: 1300,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-purple-600 cursor-pointer"
            title="Jump to Nearest Temple / Church / Mosque"
          >
            <Landmark size={13} className="text-purple-600" />
            <span>ക്ഷേത്രം / പള്ളി</span>
          </button>

          <button
            onClick={() => {
              const items = (window as any).__highlandItems;
              if (items && items.length > 0) {
                const map = (window as any).__map;
                if (map) {
                  const nextIdx = ((window as any).__highlandIdx || 0) % items.length;
                  (window as any).__highlandIdx = nextIdx + 1;
                  const target = items[nextIdx];
                  map.flyTo({
                    center: [target.lng, target.lat],
                    zoom: 18.0,
                    pitch: 56,
                    bearing: 45,
                    duration: 1300,
                  });
                }
              }
            }}
            className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm text-gray-800 hover:bg-white hover:text-emerald-700 cursor-pointer"
            title="Jump to Nearest Highland Viewpoint / Checkpost"
          >
            <Mountain size={13} className="text-emerald-700" />
            <span>മലയോരം</span>
          </button>
        </div>
      </div>

      {/* Floating Right Side Controls (3D, Rotation, Layers, Recenter) */}
      <div className="absolute right-3 top-28 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        {/* 3D / 2D Toggle Button */}
        <button
          onClick={handleToggle3D}
          className="glass-pill-button px-3 py-2 flex items-center gap-1.5 text-xs font-black shadow-lg"
          title="Toggle 3D View"
        >
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${is3DMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            3D
          </span>
        </button>

        {/* 3D Orbit Rotate Mode Toggle */}
        <button
          onClick={handleToggleRotateMode}
          className={`w-10 h-10 rounded-full glass-pill-button flex items-center justify-center shadow-lg transition-all ${
            isRotateMode ? 'bg-blue-500 text-white ring-2 ring-blue-300' : 'text-gray-700'
          }`}
          title={isRotateMode ? 'Rotate Mode: Drag screen to orbit 360°' : 'Click to enable 360° Rotate Mode'}
        >
          <RotateCw size={17} className={isRotateMode ? 'animate-spin' : ''} />
        </button>

        {/* Rotate Left 45° */}
        <button
          onClick={handleRotateLeft}
          className="w-10 h-10 rounded-full glass-pill-button flex items-center justify-center text-gray-700 shadow-lg hover:text-blue-600"
          title="Rotate Left 45°"
        >
          <RotateCcw size={16} />
        </button>

        {/* Rotate Right 45° */}
        <button
          onClick={handleRotateRight}
          className="w-10 h-10 rounded-full glass-pill-button flex items-center justify-center text-gray-700 shadow-lg hover:text-blue-600"
          title="Rotate Right 45°"
        >
          <RotateCw size={16} />
        </button>

        {/* Compass / Reset to North */}
        <button
          onClick={handleResetRotation}
          className="w-10 h-10 rounded-full glass-pill-button flex items-center justify-center text-red-500 shadow-lg"
          title="Reset to North"
        >
          <Compass size={18} />
        </button>

        {/* Global Places / Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-10 h-10 rounded-full glass-pill-button flex items-center justify-center text-gray-700 shadow-lg hover:text-blue-600"
          title="Search Global Location"
        >
          <Globe size={17} />
        </button>

        {/* Recenter to Avatar */}
        <button
          onClick={handleRecenter}
          className="w-10 h-10 rounded-full glass-pill-button flex items-center justify-center text-blue-600 shadow-lg"
          title="Recenter on Avatar"
        >
          <Navigation size={17} className="fill-blue-500" />
        </button>
      </div>

      {/* Bottom Snapchat Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col items-center pb-2">
        {/* Helper Pill: Rotate indicator or Walk hint */}
        <div className="pointer-events-auto mb-2.5">
          {isRotateMode ? (
            <button
              onClick={handleToggleRotateMode}
              className="glass-pill px-4 py-2 shadow-lg flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700"
            >
              <RotateCw size={14} className="animate-spin" />
              <span className="text-xs font-extrabold">🔄 Rotate Mode Active — Drag to Orbit 360°</span>
            </button>
          ) : (
            <button
              onClick={() => handleRecenter()}
              className="glass-pill px-4 py-2 shadow-lg flex items-center gap-2 hover:bg-white transition-all"
            >
              <UserPlus size={15} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-800">Tap road to walk</span>
            </button>
          )}
        </div>

        {/* Snapchat Native 5-Tab Bar */}
        <div className="w-[94%] max-w-sm glass-panel py-2 px-6 flex items-center justify-between shadow-2xl pointer-events-auto rounded-3xl">
          {/* Tab 1: Map (Active) */}
          <button className="flex flex-col items-center text-blue-600">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <MapPin size={18} className="fill-blue-500 text-blue-500" />
            </div>
          </button>

          {/* Tab 2: Chat */}
          <button className="relative flex flex-col items-center text-gray-600 hover:text-gray-900">
            <MessageCircle size={22} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              4
            </span>
          </button>

          {/* Tab 3: Camera Shutter Circle */}
          <button className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 shadow-md flex items-center justify-center hover:scale-105 transition-transform text-gray-800">
            <Camera size={22} />
          </button>

          {/* Tab 4: Friends / Stories */}
          <button className="relative flex flex-col items-center text-gray-600 hover:text-gray-900">
            <Users size={22} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
          </button>

          {/* Tab 5: Spotlight */}
          <button className="flex flex-col items-center text-gray-600 hover:text-gray-900">
            <PlaySquare size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
