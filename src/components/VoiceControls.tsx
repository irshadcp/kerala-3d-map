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
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer select-none active:scale-95 border
          ${
            isActivating
              ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
              : !micEnabled || isMuted
              ? 'bg-white/95 text-red-600 hover:bg-red-50 border-red-200'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:brightness-105 border-emerald-400 shadow-emerald-500/30 ring-2 ring-emerald-300'
          }`}
        title={
          !micEnabled
            ? 'മൈക്രോഫോൺ ഓൺ ചെയ്യുക (Turn Mic On)'
            : isMuted
            ? 'മൈക്രോഫോൺ അൺമ്യൂട്ട് ചെയ്യുക (Unmute Mic)'
            : 'മൈക്രോഫോൺ മ്യൂട്ട് ചെയ്യുക (Mute Mic)'
        }
      >
        {!micEnabled || isMuted ? (
          <MicOff size={15} className="text-red-500" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Mic size={16} className="text-white animate-pulse" />
          </div>
        )}
      </button>

      {/* 2. Speaker (Deafen) Toggle Button */}
      <button
        onClick={onToggleDeafen}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer select-none active:scale-95 border
          ${
            isDeafened
              ? 'bg-white/95 text-red-600 hover:bg-red-50 border-red-200 ring-2 ring-red-300 shadow-red-500/10'
              : 'bg-white/95 text-sky-600 hover:bg-sky-50 border-sky-200'
          }`}
        title={
          isDeafened
            ? 'സ്പീക്കർ ഓൺ ചെയ്യുക (Turn Sound On)'
            : 'സ്പീക്കർ ഓഫ് ചെയ്യുക - ഒന്നും കേൾക്കില്ല (Deafen Sound)'
        }
      >
        {isDeafened ? (
          <VolumeX size={15} className="text-red-500" />
        ) : (
          <Volume2 size={15} className="text-sky-600" />
        )}
      </button>
    </div>
  );
};

export default VoiceControls;
