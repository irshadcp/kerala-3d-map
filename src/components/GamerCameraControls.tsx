import React, { useEffect } from 'react';
import { WidenLevel } from './SnapMapCanvas';
import { Map as MapIcon } from 'lucide-react';

interface GamerCameraControlsProps {
  widenLevel: WidenLevel;
  onWidenChange: (level: WidenLevel) => void;
}

export const GamerCameraControls: React.FC<GamerCameraControlsProps> = ({
  widenLevel,
  onWidenChange,
}) => {
  // Desktop keyboard hotkeys (2, 5, 0/1 for zoom widenings, M for Map)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onWidenChange('2x');
      } else if (e.code === 'Digit5' || e.code === 'Numpad5') {
        e.preventDefault();
        onWidenChange('5x');
      } else if (e.code === 'Digit0' || e.code === 'Digit1' || e.code === 'Numpad0' || e.code === 'Numpad1') {
        e.preventDefault();
        onWidenChange('10x');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onWidenChange(widenLevel === 'map' ? '2x' : 'map');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onWidenChange, widenLevel]);

  const zoomLevels: { level: WidenLevel; label: string; desc: string }[] = [
    { level: '2x', label: '2x', desc: 'Close-up 3D View' },
    { level: '5x', label: '5x', desc: 'Drone Overview' },
    { level: '10x', label: '10x', desc: 'High Tactical View' },
  ];

  const isMapActive = widenLevel === 'map';

  return (
    <div className="flex flex-col items-center gap-2 select-none pointer-events-auto">
      {/* 2x, 5x, 10x Buttons Stack */}
      <div className="flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-white/80 backdrop-blur-md shadow-xl border border-white/60">
        {zoomLevels.map((item) => {
          const isActive = widenLevel === item.level;
          return (
            <button
              key={item.level}
              onClick={() => onWidenChange(item.level)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all cursor-pointer active:scale-95 shadow-sm
                ${
                  isActive
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105'
                    : 'bg-white/90 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              title={`${item.label} — ${item.desc}`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Map (മാപ്പ്) Toggle Button with Map Icon & Label */}
      <button
        onClick={() => onWidenChange(isMapActive ? '2x' : 'map')}
        className={`w-12 py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xl border
          ${
            isMapActive
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-blue-400 ring-2 ring-blue-300 shadow-blue-500/30'
              : 'bg-white/90 text-gray-800 border-white/80 hover:bg-white hover:text-blue-600'
          }`}
        title={isMapActive ? 'തിരികെ 3D ക്യാരക്ടർ വ്യൂവിലേക്ക് (Return to 3D View)' : '2D മാപ്പ് വ്യൂവിലേക്ക് മാറുക (Switch to Map Overview)'}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isMapActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
          }`}
        >
          <MapIcon size={14} />
        </div>
        <span className="text-[10px] font-black tracking-tight leading-none">
          {isMapActive ? '3D' : 'Map'}
        </span>
      </button>
    </div>
  );
};

export default GamerCameraControls;
