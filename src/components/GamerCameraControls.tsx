import React, { useEffect } from 'react';
import { Eye, User, Layers } from 'lucide-react';
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

  const widenOptions: { level: WidenLevel; title: string; subtitle: string }[] = [
    { level: '1x', title: '1x', subtitle: 'Close' },
    { level: '2x', title: '2x', subtitle: 'Wide' },
    { level: '5x', title: '5x', subtitle: 'Drone' },
    { level: '10x', title: '10x', subtitle: 'Max' },
  ];

  return (
    <div className="flex items-center gap-2 select-none pointer-events-auto">
      {/* 1. TPP / FPP Perspective Switcher */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/25 shadow-2xl">
        <button
          onClick={() => onPerspectiveChange('tpp')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ${
            perspective === 'tpp'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Third-Person Perspective (Hot key: V)"
        >
          <User size={13} className={perspective === 'tpp' ? 'text-white' : 'text-gray-400'} />
          <span>TPP</span>
        </button>

        <button
          onClick={() => onPerspectiveChange('fpp')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ${
            perspective === 'fpp'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="First-Person Perspective (Hot key: V)"
        >
          <Eye size={13} className={perspective === 'fpp' ? 'text-white' : 'text-gray-400'} />
          <span>FPP</span>
        </button>
      </div>

      {/* 2. Screen Widenings: 1x, 2x, 5x, 10x */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/25 shadow-2xl">
        <div className="hidden sm:flex items-center px-2 text-[10px] uppercase font-black tracking-widest text-emerald-400/90 gap-1 border-r border-white/15 mr-1">
          <Layers size={11} />
          <span>FOV</span>
        </div>

        {widenOptions.map((opt) => {
          const isActive = perspective === 'tpp' && widenLevel === opt.level;
          return (
            <button
              key={opt.level}
              onClick={() => onWidenChange(opt.level)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex flex-col items-center leading-none ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/40 scale-105'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title={`${opt.title} View (${opt.subtitle})`}
            >
              <span>{opt.title}</span>
              <span className={`text-[8px] font-medium tracking-tight mt-0.5 ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>
                {opt.subtitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GamerCameraControls;
