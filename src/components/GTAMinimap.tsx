import React from 'react';
import { Navigation, Radio, Volume2 } from 'lucide-react';
import { PlayerState } from '../core/CharacterController';

interface GTAMinimapProps {
  playerState: PlayerState;
  isDriving: boolean;
  speedKmh: number;
  locationName: string;
  subname: string;
  bearing: number;
  radioStation: string;
  onToggleRadio: () => void;
  onHonk: () => void;
}

export const GTAMinimap: React.FC<GTAMinimapProps> = ({
  playerState,
  isDriving,
  speedKmh,
  locationName,
  subname,
  bearing,
  radioStation,
  onToggleRadio,
  onHonk,
}) => {
  return (
    <div className="interactive-ui absolute top-4 left-4 z-30 pointer-events-auto flex flex-col gap-2">
      {/* GTA-Style Location & Status Banner */}
      <div className="bg-slate-950/85 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl flex flex-col gap-1 min-w-[230px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              {isDriving ? 'GTA VEHICLE MODE' : 'EXPLORING'}
            </span>
          </div>
          {/* Star rating for exploration */}
          <div className="flex gap-0.5 text-amber-400 text-xs">
            {'★'.repeat(5)}
          </div>
        </div>

        {/* Location Name */}
        <div className="text-base font-black tracking-wide text-white uppercase drop-shadow">
          {locationName}
        </div>
        <div className="text-[11px] font-semibold text-slate-300 truncate">
          {subname}
        </div>

        {/* Radio & Audio Controls when Driving */}
        {isDriving && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={onToggleRadio}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-md"
              title="Change Radio Station (R)"
            >
              <Radio size={12} />
              <span className="truncate max-w-[110px]">{radioStation || 'Radio (R)'}</span>
            </button>

            <button
              onClick={onHonk}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-[11px] font-bold transition-all shadow-md active:scale-95"
              title="Honk Rickshaw Horn (H)"
            >
              <Volume2 size={12} />
              <span>Horn (H)</span>
            </button>
          </div>
        )}
      </div>

      {/* GTA Radar Widget */}
      <div className="relative w-28 h-28 rounded-full bg-slate-950/80 backdrop-blur-xl border-2 border-white/30 shadow-2xl overflow-hidden flex items-center justify-center">
        {/* Radar concentric sweep circles */}
        <div className="absolute inset-2 rounded-full border border-sky-500/20" />
        <div className="absolute inset-6 rounded-full border border-sky-500/30" />
        <div className="absolute w-full h-[1px] bg-sky-500/20" />
        <div className="absolute h-full w-[1px] bg-sky-500/20" />

        {/* Rotating North Indicator */}
        <div
          className="absolute inset-0 flex items-start justify-center pt-1 transition-transform"
          style={{ transform: `rotate(${-bearing}deg)` }}
        >
          <span className="text-[10px] font-black text-rose-500">N</span>
        </div>

        {/* Player Indicator (Arrow in center pointing towards character heading) */}
        <div
          className="relative z-10 transition-transform duration-75"
          style={{ transform: `rotate(${playerState.headingDeg}deg)` }}
        >
          <Navigation
            size={22}
            className={`${
              isDriving ? 'fill-amber-400 text-amber-500' : 'fill-sky-400 text-sky-500'
            } drop-shadow-md`}
          />
        </div>

        {/* Speed readout badge */}
        {isDriving && (
          <div className="absolute bottom-1 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-mono font-black text-amber-400">
            {Math.round(speedKmh)} km/h
          </div>
        )}
      </div>
    </div>
  );
};
