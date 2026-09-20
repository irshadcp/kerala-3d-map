import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEnableMic: () => Promise<boolean>;
  isDeafened: boolean;
  onToggleDeafen: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMuted,
  onToggleMute,
  onEnableMic,
  isDeafened,
  onToggleDeafen,
}) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleMicClick = async () => {
    if (!micEnabled) {
      setIsActivating(true);
      const success = await onEnableMic();
      setIsActivating(false);
      if (success) {
        setMicEnabled(true);
      }
    } else {
      onToggleMute();
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
      {/* 1. Microphone Toggle Button */}
      <button
        onClick={handleMicClick}
        disabled={isActivating}
        className={`glass-pill px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 shadow-md transition-all cursor-pointer select-none active:scale-95 border
          ${
            isActivating
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : !micEnabled || isMuted
              ? 'bg-white/95 text-red-600 hover:bg-red-50 border-red-200'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-400 shadow-emerald-500/25 ring-2 ring-emerald-300'
          }`}
        title={
          !micEnabled
            ? 'മൈക്രോഫോൺ ഓൺ ചെയ്ത് സംസാരിക്കുക (Turn Mic On)'
            : isMuted
            ? 'മൈക്രോഫോൺ അൺമ്യൂട്ട് ചെയ്യുക (Unmute Mic)'
            : 'മൈക്രോഫോൺ മ്യൂട്ട് ചെയ്യുക (Mute Mic - Privacy)'
        }
      >
        {!micEnabled || isMuted ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <MicOff size={12} />
            </div>
            <span className="text-[11px] sm:text-xs font-black text-gray-800 whitespace-nowrap">
              {isActivating ? 'Connecting...' : 'Mic Off'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <Mic size={13} className="animate-pulse" />
            <span className="text-[11px] sm:text-xs font-black text-white whitespace-nowrap">
              Mic On
            </span>
          </div>
        )}
      </button>

      {/* 2. Speaker (Deafen) Toggle Button */}
      <button
        onClick={onToggleDeafen}
        className={`glass-pill px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 shadow-md transition-all cursor-pointer select-none active:scale-95 border
          ${
            isDeafened
              ? 'bg-white/95 text-red-600 hover:bg-red-50 border-red-200 ring-1 ring-red-300'
              : 'bg-white/95 text-sky-700 hover:bg-sky-50 border-sky-200'
          }`}
        title={
          isDeafened
            ? 'സ്പീക്കർ ഓൺ ചെയ്യുക (Turn Sound On)'
            : 'സ്പീക്കർ ഓഫ് ചെയ്യുക - ഒന്നും കേൾക്കില്ല (Deafen Sound)'
        }
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div
            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ${
              isDeafened ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'
            }`}
          >
            {isDeafened ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </div>
          <span className="text-[11px] sm:text-xs font-black text-gray-800 whitespace-nowrap">
            {isDeafened ? 'Sound Off' : 'Sound On'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default VoiceControls;
