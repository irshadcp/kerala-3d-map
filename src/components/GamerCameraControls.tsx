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
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full glass-pill-button flex items-center justify-center text-[11px] sm:text-xs font-black shadow-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-300 shadow-emerald-500/30 scale-105 z-10'
                  : 'text-gray-700 hover:text-emerald-700 hover:bg-white'
              }`}
              title={`${opt.title} View — ${opt.desc}`}
            >
              <span>{opt.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GamerCameraControls;
