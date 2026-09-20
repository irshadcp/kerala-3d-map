import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEnableMic: () => Promise<boolean>;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMuted,
  onToggleMute,
  onEnableMic,
}) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleClick = async () => {
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
    <div className="flex items-center gap-1.5 pointer-events-auto">
      <button
        onClick={handleClick}
        disabled={isActivating}
        className={`glass-pill px-3 py-2 flex items-center gap-2 shadow-lg transition-all cursor-pointer select-none
          ${
            isActivating
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : !micEnabled || isMuted
              ? 'bg-white/90 text-red-600 hover:bg-red-50 border-red-200'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-400 shadow-emerald-500/25 ring-2 ring-emerald-300'
          }`}
        title={
          !micEnabled
            ? 'മൈക്രോഫോൺ ഓൺ ചെയ്ത് പ്രോക്സിമിറ്റി വോയ്സ് ചാറ്റിൽ സംസാരിക്കുക'
            : isMuted
            ? 'മൈക്രോഫോൺ അൺമ്യൂട്ട് ചെയ്യുക'
            : 'മൈക്രോഫോൺ മ്യൂട്ട് ചെയ്യുക'
        }
      >
        {!micEnabled || isMuted ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <MicOff size={13} />
            </div>
            <span className="text-xs font-black text-gray-800">
              {isActivating ? 'Connecting Mic...' : 'Mic Muted'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <Mic size={14} className="animate-pulse" />
            <span className="text-xs font-black text-white">
              Voice On (Proximity)
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

export default VoiceControls;
