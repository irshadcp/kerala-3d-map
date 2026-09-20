import { useState, useRef, useEffect } from 'react';
import SnapMapCanvas, { SnapMapCanvasRef, WidenLevel } from './components/SnapMapCanvas';
import { LocationPreset } from './config/gameConfig';
import GlobalSearchModal from './components/GlobalSearchModal';
import VirtualJoystick from './components/VirtualJoystick';
import GamerCameraControls from './components/GamerCameraControls';
import WelcomeOnboardingModal, { OnboardingResult } from './components/WelcomeOnboardingModal';
import LivePlayersOverlay from './components/LivePlayersOverlay';
import VoiceControls from './components/VoiceControls';
import { MultiplayerManager, LocalUserProfile } from './network/MultiplayerManager';
import { RemotePlayerData } from './graphics/RemotePlayerManager';
import { GeocodingResult } from './services/geocodingService';
import { ChevronDown, Sun, Search } from 'lucide-react';
import './styles/theme.css';

const DEFAULT_LOCATION: LocationPreset = {
  id: 'palarivattom',
  name: 'Palarivattom',
  subname: 'Kochi, Kerala, India',
  lat: 10.005,
  lng: 76.315,
  zoom: 17.8,
  pitch: 75,
  bearing: 0,
  weather: 'Sunny',
  temp: '29°C',
};

function App() {
  const [currentLocation, setCurrentLocation] = useState<LocationPreset>(DEFAULT_LOCATION);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [widenLevel, setWidenLevel] = useState<WidenLevel>('2x');
  const [isDeafened, setIsDeafened] = useState(false);

  // User profile state - auto-generated ephemeral profile so P2P networking connects immediately on load
  const [userProfile, setUserProfile] = useState<LocalUserProfile>(() => ({
    id: 'kerala_' + Math.random().toString(36).substring(2, 9),
    name: 'Explorer_' + Math.floor(Math.random() * 1000),
    district: 'Kerala',
  }));
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(true);
  const [remotePlayersList, setRemotePlayersList] = useState<RemotePlayerData[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const multiplayerRef = useRef<MultiplayerManager | null>(null);

  const canvasRef = useRef<SnapMapCanvasRef>(null);

  const [isDriving, setIsDriving] = useState(false);

  // Clear any past session profile from device storage
  useEffect(() => {
    try {
      localStorage.removeItem('kerala_3d_user_profile');
    } catch (_) {}
  }, []);

  const handleToggleDrive = () => {
    if (canvasRef.current) {
      const state = canvasRef.current.toggleDrive();
      setIsDriving(state);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['KeyF', 'KeyE'].includes(e.code)) {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        handleToggleDrive();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize or reconfigure MultiplayerManager
  useEffect(() => {
    if (!userProfile) return;

    if (multiplayerRef.current) {
      multiplayerRef.current.destroy();
      multiplayerRef.current = null;
    }

    const mgr = new MultiplayerManager(
      userProfile,
      currentLocation.lat,
      currentLocation.lng
    );
    multiplayerRef.current = mgr;

    mgr.onPlayerUpdate = (player) => {
      const threeLayer = canvasRef.current?.getThreeLayer() || (window as any).__threeLayer;
      if (threeLayer?.remotePlayerManager) {
        const originLat = threeLayer.originLat ?? currentLocation.lat;
        const originLng = threeLayer.originLng ?? currentLocation.lng;
        threeLayer.remotePlayerManager.updatePlayer(
          player,
          originLat,
          originLng
        );
      }
      setRemotePlayersList(Array.from(mgr.remotePlayers.values()));
    };

    mgr.onPlayerStateChange = (id, remoteIsMuted, remoteIsSpeaking) => {
      const threeLayer = canvasRef.current?.getThreeLayer() || (window as any).__threeLayer;
      if (threeLayer?.remotePlayerManager) {
        threeLayer.remotePlayerManager.updatePlayerState(id, remoteIsMuted, remoteIsSpeaking);
      }
      setRemotePlayersList(Array.from(mgr.remotePlayers.values()));
    };

    mgr.onPlayerRemove = (id) => {
      const threeLayer = canvasRef.current?.getThreeLayer() || (window as any).__threeLayer;
      if (threeLayer?.remotePlayerManager) {
        threeLayer.remotePlayerManager.removePlayer(id);
      }
      setRemotePlayersList(Array.from(mgr.remotePlayers.values()));
    };

    mgr.onRemoteStream = (peerId, stream, audioCtx) => {
      const threeLayer = canvasRef.current?.getThreeLayer() || (window as any).__threeLayer;
      if (threeLayer?.remotePlayerManager) {
        threeLayer.remotePlayerManager.registerAudioStream(peerId, stream, audioCtx);
      }
    };

    mgr.onMuteStateChange = (muted) => {
      setIsMuted(muted);
    };

    mgr.onLocalSpeakingChange = (speaking) => {
      setIsSpeaking(speaking);
    };

    return () => {
      mgr.destroy();
      multiplayerRef.current = null;
    };
  }, [userProfile?.id]);

  const handleOnboardingComplete = (res: OnboardingResult) => {
    const updatedProfile: LocalUserProfile = {
      id: userProfile.id,
      name: res.name,
      district: res.district,
    };
    try {
      localStorage.removeItem('kerala_3d_user_profile');
    } catch (_) {}
    setUserProfile(updatedProfile);
    setIsOnboardingOpen(false);

    // Update profile in multiplayer manager without dropping WebRTC connections
    multiplayerRef.current?.updateProfile(res.name, res.district);

    // Spawn at detected GPS coordinates or district center!
    setCurrentLocation({
      id: 'user_spawn',
      name: res.locationName,
      subname: `${res.district}, Kerala`,
      lat: res.lat,
      lng: res.lng,
      zoom: 18.2,
      pitch: 70,
      bearing: 0,
      weather: 'Sunny',
      temp: '28°C',
    });
    setResetTrigger((p) => p + 1);
  };

  const handlePlayerMove = (
    lat: number,
    lng: number,
    heading = 0,
    isWalking = false,
    drivingState = isDriving
  ) => {
    multiplayerRef.current?.updateLocalTransform(lat, lng, heading, isWalking, drivingState);
  };

  const handleWidenChange = (level: WidenLevel) => {
    setWidenLevel(level);
    canvasRef.current?.setWidenLevel(level);
  };

  if (typeof window !== 'undefined') {
    (window as any).__snapMapSetLocation = (lat: number, lng: number, name: string) => {
      setCurrentLocation({
        id: 'nav',
        name,
        subname: '',
        lat,
        lng,
        zoom: 17.8,
        pitch: 75,
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
      zoom: 17.8,
      pitch: 75,
      bearing: 0,
      weather: 'Sunny',
      temp: '28°C',
    });
    setResetTrigger((p) => p + 1);
    setIsSearchOpen(false);
  };

  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    const threeLayer = canvasRef.current?.getThreeLayer() || (window as any).__threeLayer;
    threeLayer?.remotePlayerManager?.setDeafened(nextDeafened);
  };

  const handleFlyToPlayer = (lat: number, lng: number, name: string) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    // Spawn ~1.5m offset next to the remote player so they stand side-by-side
    const spawnLat = lat + 0.000015;
    const spawnLng = lng + 0.000015;

    // Always lock into 2x 3D View
    setWidenLevel('2x');

    // 1. Instant 2x 3D teleportation
    canvasRef.current?.teleportToLocation(spawnLat, spawnLng);

    // 2. Update currentLocation state in App
    setCurrentLocation({
      id: 'player_nav_' + Date.now(),
      name: `${name}-ന്റെ അടുത്ത്`,
      subname: 'Kerala, India',
      lat: spawnLat,
      lng: spawnLng,
      zoom: 20.6,
      pitch: 68,
      bearing: 0,
      weather: 'Sunny',
      temp: '28°C',
    });

    // 3. Immediately notify all peers across WebRTC of new coordinates
    multiplayerRef.current?.updateLocalTransform(spawnLat, spawnLng, 0, false, isDriving);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#e4f3de] select-none">
      {/* 3D Map Viewport */}
      <SnapMapCanvas
        ref={canvasRef}
        currentLocation={currentLocation}
        resetTrigger={resetTrigger}
        onPlayerMove={handlePlayerMove}
        remotePlayers={remotePlayersList}
        localPlayer={userProfile}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        onSelectPlayer={(player) => {
          handleFlyToPlayer(player.lat, player.lng, player.name);
        }}
      />

      {/* Welcome Onboarding Modal for Name & Kerala District (Auto GPS Spawn) */}
      <WelcomeOnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={handleOnboardingComplete}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPlace={handleSelectPlace}
      />

      {/* Top Floating Snapchat Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pointer-events-none flex flex-col gap-2.5">
        {/* Row 1: Profile Avatar & Live Players, Location Info, Voice Controls & Search */}
        <div className="flex items-center justify-between w-full pointer-events-auto gap-2">
          {/* Left: Profile Bitmoji & Live Players Count Pill */}
          <div className="flex items-center gap-1.5">
            <div
              onClick={() => setIsOnboardingOpen(true)}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md flex items-center justify-center text-lg cursor-pointer hover:scale-105 transition-transform"
              title={userProfile ? `${userProfile.name} (${userProfile.district}) — ക്ലിക്ക് ചെയ്ത് പ്രൊഫൈൽ മാറ്റാം` : 'Set Profile'}
            >
              {userProfile ? '😎' : '👤'}
            </div>

            {/* Live Players Counter & Roster Trigger */}
            <LivePlayersOverlay
              localPlayer={
                userProfile
                  ? {
                      name: userProfile.name,
                      district: userProfile.district,
                      lat: multiplayerRef.current?.localLat || currentLocation.lat,
                      lng: multiplayerRef.current?.localLng || currentLocation.lng,
                    }
                  : null
              }
              remotePlayers={remotePlayersList}
              onFlyToPlayer={handleFlyToPlayer}
            />
          </div>

          {/* Center: Location Pill / Global Search Trigger */}
          <div className="relative">
            <button
              className="glass-pill px-3.5 py-2 flex items-center gap-2 shadow-md cursor-pointer hover:bg-white/95 transition-all"
              onClick={() => setIsSearchOpen(true)}
              title="Click to search any global location"
            >
              <div className="flex flex-col items-center leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-gray-900 text-xs sm:text-sm tracking-tight">
                    {currentLocation.name}
                  </span>
                  <ChevronDown size={14} className="text-gray-500" />
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-gray-500">
                  <Sun size={11} className="text-amber-500" />
                  <span>{currentLocation.temp || '28°C'}</span>
                  <span>•</span>
                  <span>{currentLocation.weather || 'Sunny'}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Right: Proximity Voice Controls & Quick Search Button */}
          <div className="flex items-center gap-2">
            <VoiceControls
              isMuted={isMuted}
              onToggleMute={() => {
                if (multiplayerRef.current) {
                  const nextMuted = multiplayerRef.current.toggleMute();
                  setIsMuted(nextMuted);
                }
              }}
              onEnableMic={async () => {
                if (multiplayerRef.current) {
                  const res = await multiplayerRef.current.enableMicrophone();
                  if (res) {
                    setIsMuted(false);
                  }
                  return res;
                }
                return false;
              }}
              isDeafened={isDeafened}
              onToggleDeafen={handleToggleDeafen}
            />

            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-gray-700 shadow-md hover:bg-white transition-colors pointer-events-auto"
              title="Search Any Global Place"
            >
              <Search size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Right Side Camera Controls: 2x, 5x, 10x, and Map */}
      <div className="absolute right-3 top-24 sm:top-28 z-20 pointer-events-auto">
        <GamerCameraControls
          widenLevel={widenLevel}
          onWidenChange={handleWidenChange}
        />
      </div>

      {/* Floating Virtual Joystick & Drive Vehicle Controls for Mobile & Desktop */}
      <div className="absolute bottom-6 sm:bottom-8 left-3 sm:left-5 z-30 pointer-events-auto flex items-end gap-2.5">
        <VirtualJoystick
          onMove={(dirX, dirZ, isMoving, dt, sUp) => {
            canvasRef.current?.moveInDirection(dirX, dirZ, isMoving, dt, sUp);
          }}
          getCameraBearing={() => canvasRef.current?.getCameraBearing() || 0}
        />

        {/* Drive / Exit Kerala Vehicle Button */}
        <button
          onClick={handleToggleDrive}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-xl transition-all pointer-events-auto backdrop-blur-md active:scale-95 mb-2 ${
            isDriving
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-300 shadow-amber-500/30 ring-2 ring-amber-400/50'
              : 'bg-white/95 hover:bg-white text-gray-800 border border-gray-200/90 hover:shadow-2xl'
          }`}
          title={isDriving ? "Exit Vehicle (Press E or F)" : "Drive Vehicle (Press E or F)"}
        >
          <span className="text-xl leading-none">{isDriving ? '🚶' : '🛺'}</span>
          <div className="flex flex-col text-left">
            <span className="leading-tight font-extrabold text-[12px]">
              {isDriving ? 'Exit Auto' : 'Drive Auto'}
            </span>
            <span className="text-[10px] opacity-85 font-semibold leading-none">
              {isDriving ? 'ഇറങ്ങുക' : 'ഓടിക്കുക'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default App;
