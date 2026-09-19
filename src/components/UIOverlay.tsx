import React from 'react';
import { Layers, Sun, Navigation2, Zap, RotateCcw } from 'lucide-react';
import { LocationPreset } from '../config/gameConfig';
import { LocationSelector } from './LocationSelector';
import { ControlsHelp } from './ControlsHelp';
import { PlayerState } from '../core/CharacterController';
import { IMapProvider } from '../providers/MapProvider';

export type CameraMode = 'tpp' | 'fpp' | '2d';

interface UIOverlayProps {
  currentLocation: LocationPreset;
  playerState: PlayerState;
  is3DMode?: boolean;
  onToggle3D?: () => void;
  cameraMode?: CameraMode;
  onCycleCameraMode?: () => void;
  onSelectLocation: (preset: LocationPreset) => void;
  onCustomCoords: (lat: number, lng: number, name: string) => void;
  onResetPosition: () => void;
  activeProvider?: IMapProvider;
  providers?: IMapProvider[];
  onSelectProvider?: (providerId: string) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  currentLocation,
  playerState,
  cameraMode = 'tpp',
  onCycleCameraMode,
  onSelectLocation,
  onCustomCoords,
  onResetPosition,
}) => {
  return (
    <div className="ui-overlay pointer-events-none">
      {/* Top Header Bar */}
      <header className="top-header pointer-events-auto flex items-center justify-between p-4 max-w-5xl mx-auto w-full">
        {/* Left: Avatar & Location Picker */}
        <div className="flex items-center gap-2.5">
          <div className="avatar-badge glass-circle" title="3D Explorer">
            <span className="text-xl">🧑‍🌾</span>
          </div>

          <LocationSelector
            currentLocation={currentLocation}
            onSelectLocation={onSelectLocation}
            onCustomCoords={onCustomCoords}
          />
        </div>

        {/* Center / Right: Weather, Camera Mode & Help */}
        <div className="flex items-center gap-2">
          {/* Weather Badge matching Snapchat reference */}
          <div className="weather-badge glass-pill flex items-center gap-1.5 px-3 py-1.5">
            <Sun size={15} className="text-amber-500 fill-amber-400" />
            <span className="font-bold text-slate-800 text-xs">{currentLocation.temp}</span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">{currentLocation.weather}</span>
          </div>

          {/* Camera Mode (TPP / FPP / 2D) Toggle Button */}
          <button
            onClick={onCycleCameraMode}
            className={`mode-toggle-btn glass-pill-button font-extrabold text-xs px-3.5 py-1.5 flex items-center gap-1.5 transition-all ${
              cameraMode === 'tpp'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : cameraMode === 'fpp'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-200 text-slate-700'
            }`}
            title="Toggle Camera: TPP (GTA/PUBG) / FPP / 2D Map (Press 'V')"
          >
            <Layers size={14} />
            <span>
              {cameraMode === 'tpp' ? '🎮 TPP' : cameraMode === 'fpp' ? '👁️ FPP' : '🗺️ 2D'}
            </span>
            <span className="text-[10px] opacity-75 font-mono bg-black/20 px-1 py-0.2 rounded ml-0.5">V</span>
          </button>

          {/* Controls Help Modal */}
          <ControlsHelp />
        </div>
      </header>

      {/* Bottom Status Bar: Coordinates, Speed, Heading */}
      <footer className="bottom-bar pointer-events-auto p-4 max-w-5xl mx-auto w-full flex flex-wrap items-end justify-between gap-3">
        {/* Telemetry Pill */}
        <div className="telemetry-card glass-panel flex items-center gap-3 px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <Navigation2
              size={14}
              className="text-emerald-600 transition-transform"
              style={{ transform: `rotate(${playerState.headingDeg}deg)` }}
            />
            <div className="text-[11px] font-mono font-bold text-slate-800">
              {playerState.lat.toFixed(5)}°N, {playerState.lng.toFixed(5)}°E
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <Zap size={13} className={playerState.isMoving ? 'text-amber-500 animate-pulse' : 'text-slate-400'} />
            <span className="font-bold font-mono text-slate-800">{playerState.speedKmh.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500">km/h</span>
          </div>

          <button
            onClick={onResetPosition}
            title="Reset position to center"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors ml-1"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </footer>
    </div>
  );
};
