import React, { useEffect } from 'react';
import { Eye, User } from 'lucide-react';
import { PerspectiveMode, WidenLevel } from './SnapMapCanvas';

interface GamerCameraControlsProps {
  perspective: PerspectiveMode;
  widenLevel: WidenLevel;
  onPerspectiveChange: (mode: PerspectiveMode) => void;
  onWidenChange: (level: WidenLevel) => void;
}

export const GamerCameraControls: React.FC<GamerCameraControlsProps> = ({
  perspective,
  widenLevel,
  onPerspectiveChange,
  onWidenChange,
}) => {
  // Desktop keyboard hotkeys (V for FPP/TPP, 1/2/5/0 for zoom widenings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in search input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyV') {
        e.preventDefault();
        onPerspectiveChange(perspective === 'tpp' ? 'fpp' : 'tpp');
      } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        onWidenChange('1x');
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onWidenChange('2x');
      } else if (e.code === 'Digit3' || e.code === 'Digit5' || e.code === 'Numpad3' || e.code === 'Numpad5') {
        e.preventDefault();
        onWidenChange('5x');
      } else if (e.code === 'Digit4' || e.code === 'Digit0' || e.code === 'Numpad4' || e.code === 'Numpad0') {
        e.preventDefault();
        onWidenChange('10x');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [perspective, onPerspectiveChange, onWidenChange]);

  const widenOptions: { level: WidenLevel; title: string; desc: string }[] = [
    { level: '1x', title: '1x', desc: 'Close Behind Character' },
    { level: '2x', title: '2x', desc: 'Wide TPP' },
    { level: '5x', title: '5x', desc: 'Drone Overview' },
    { level: '10x', title: '10x', desc: 'Max Tactical View' },
  ];

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 select-none pointer-events-auto">
      {/* 1. TPP / FPP Toggle Pill (styled like the 3D toggle button on the right rail) */}
      <button
        onClick={() => onPerspectiveChange(perspective === 'tpp' ? 'fpp' : 'tpp')}
        className="glass-pill-button p-1 flex items-center gap-1 text-[11px] sm:text-xs font-black shadow-lg cursor-pointer"
        title="Toggle TPP (Third-Person) / FPP (First-Person) (Hot key: V)"
      >
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${
            perspective === 'tpp' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User size={10} />
          TPP
        </span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${
            perspective === 'fpp' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye size={10} />
          FPP
        </span>
      </button>

      {/* 2. Screen Widenings (1x, 2x, 5x, 10x) - Styled as round glass buttons like rotation buttons */}
      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
        {widenOptions.map((opt) => {
          const isActive = perspective === 'tpp' && widenLevel === opt.level;
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
