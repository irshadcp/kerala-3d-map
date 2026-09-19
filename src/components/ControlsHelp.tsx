import React, { useState } from 'react';
import { HelpCircle, X, Keyboard, Navigation, MousePointer } from 'lucide-react';

export const ControlsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="controls-help-container">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="glass-pill-button text-xs flex items-center gap-1.5"
          title="Controls Guide"
        >
          <HelpCircle size={15} />
          <span>Controls</span>
        </button>
      )}

      {isOpen && (
        <div className="controls-modal glass-panel animate-scale-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Keyboard size={16} className="text-blue-500" />
              Game Controls
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Navigation size={14} className="text-sky-500" />
                Move / Pan Map (നീക്കാൻ)
              </span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold text-[11px]">
                Drag in Move Mode
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <MousePointer size={14} className="text-purple-500" />
                360° Rotate & Tilt (തിരിക്കാൻ)
              </span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold text-[11px]">
                Right Drag / Rotate Mode / Q,E
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5 font-semibold text-sky-600">
                <Navigation size={14} className="text-sky-500" />
                Camera Perspective (ക്യാമറ മാറ്റാൻ)
              </span>
              <span className="font-mono bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded font-bold text-[11px]">
                V (TPP / FPP / 2D)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Navigation size={14} className="text-emerald-500" />
                Walk on Foot (നടക്കാൻ)
              </span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold text-[11px]">
                W A S D / On-Screen D-Pad
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Sprint / Run</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold text-[11px]">
                Shift / Sprint Icon
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Jump / Hop</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold text-[11px]">
                Spacebar / Jump Icon
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                Drive Vehicle (ഓട്ടോ ഓടിക്കാൻ)
              </span>
              <span className="font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold text-[11px]">
                E (Enter/Exit)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                Park Curbside (പാർക്ക് ചെയ്യാൻ)
              </span>
              <span className="font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold text-[11px]">
                P (When near curb)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5 font-semibold text-purple-600">
                Inspect Building (ഡാറ്റ കാണാൻ)
              </span>
              <span className="font-mono bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold text-[11px]">
                Click Building / F2
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Zoom In / Out</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold text-[11px]">
                Scroll / 2-Finger Pinch
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span>Reset North</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                Click Compass
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
