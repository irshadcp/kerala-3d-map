import React, { useState } from 'react';
import { LOCATION_PRESETS, LocationPreset } from './config/gameConfig';
import { MapProviderRegistry, IMapProvider } from './providers/MapProvider';
import { MapGameCanvas, CameraMode } from './components/MapGameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { PlayerState } from './core/CharacterController';
import './styles/theme.css';

export const App: React.FC = () => {
  const defaultPreset = LOCATION_PRESETS.find((p) => p.id === 'palarivattom_metro') || LOCATION_PRESETS[0];
  const [currentLocation, setCurrentLocation] = useState<LocationPreset>(defaultPreset);
  const [cameraMode, setCameraMode] = useState<CameraMode>('tpp');
  const [activeProvider] = useState<IMapProvider>(
    MapProviderRegistry.getProvider('custom-pastel')
  );
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const [playerState, setPlayerState] = useState<PlayerState>({
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    x: 0,
    z: 0,
    speed: 0,
    speedKmh: 0,
    headingDeg: 0,
    isMoving: false,
    isSprinting: false,
  });

  const handleSelectLocation = (preset: LocationPreset) => {
    setCurrentLocation(preset);
  };

  const handleCustomCoords = (lat: number, lng: number, name: string) => {
    const customPreset: LocationPreset = {
      id: `custom-${Date.now()}`,
      name,
      subname: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      lat,
      lng,
      zoom: 19.8,
      pitch: 78,
      bearing: 0,
      weather: 'Fair',
      temp: '27°C',
    };
    setCurrentLocation(customPreset);
  };

  const handleResetPosition = () => {
    setResetTrigger((prev) => prev + 1);
  };

  const handleCycleCameraMode = () => {
    setCameraMode((prev) => (prev === 'tpp' ? 'fpp' : prev === 'fpp' ? '2d' : 'tpp'));
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#e2f7d8]"
      style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      {/* 3D Map Canvas */}
      <MapGameCanvas
        currentLocation={currentLocation}
        activeProvider={activeProvider}
        cameraMode={cameraMode}
        onCycleCameraMode={handleCycleCameraMode}
        onPlayerStateChange={setPlayerState}
        resetTrigger={resetTrigger}
      />

      {/* Floating Modern Game HUD Overlay */}
      <UIOverlay
        currentLocation={currentLocation}
        playerState={playerState}
        cameraMode={cameraMode}
        onCycleCameraMode={handleCycleCameraMode}
        onSelectLocation={handleSelectLocation}
        onCustomCoords={handleCustomCoords}
        onResetPosition={handleResetPosition}
      />
    </main>
  );
};

export default App;
