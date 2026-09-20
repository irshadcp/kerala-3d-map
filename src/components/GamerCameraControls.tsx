import React, { useEffect } from 'react';
import { WidenLevel } from './SnapMapCanvas';

interface GamerCameraControlsProps {
  widenLevel: WidenLevel;
  onWidenChange: (level: WidenLevel) => void;
}

export const GamerCameraControls: React.FC<GamerCameraControlsProps> = ({
  widenLevel,
  onWidenChange,
}) => {
  // Desktop keyboard hotkeys (2, 5, 0 or 2, 3, 4 for zoom widenings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in search input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onWidenChange('2x');
      } else if (e.code === 'Digit3' || e.code === 'Digit5' || e.code === 'Numpad3' || e.code === 'Numpad5') {
        e.preventDefault();
        onWidenChange('5x');
      } else if (e.code === 'Digit4' || e.code === 'Digit0' || e.code === 'Numpad4' || e.code === 'Numpad0') {
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

  const widenOptions: { level: WidenLevel; title: string; desc: string }[] = [
    { level: '2x', title: '2x', desc: 'Wide 3D View' },
    { level: '5x', title: '5x', desc: 'Drone Overview' },
    { level: '10x', title: '10x', desc: 'Max Tactical View' },
    { level: 'map', title: '🗺️', desc: '2D Tactical Map' },
  ];

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 select-none pointer-events-auto">
      {/* Screen Widenings (2x, 5x, 10x ONLY) - Styled as round glass buttons like rotation buttons */}
      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
        {widenOptions.map((opt) => {
          const isActive = widenLevel === opt.level;
          return (
            <button
              key={opt.level}
              onClick={() => onWidenChange(opt.level)}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #059669, #0d9488)',
                      color: '#ffffff',
                      border: '2px solid #34d399',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.45)',
                    }
                  : undefined
              }
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${
                !isActive ? 'glass-pill-button text-gray-800' : ''
              } flex items-center justify-center text-[11px] sm:text-xs font-black shadow-lg transition-all cursor-pointer ${
                isActive ? 'scale-110 z-10' : 'hover:text-emerald-700 hover:bg-white'
              }`}
              title={`${opt.title} View — ${opt.desc}`}
            >
              <span className={isActive ? 'text-white drop-shadow-sm font-black' : 'font-extrabold'}>{opt.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GamerCameraControls;
