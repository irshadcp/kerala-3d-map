import React, { useState } from 'react';
import { KERALA_DISTRICTS } from '../config/keralaDistricts';
import { MapPin, User, Navigation, Sparkles, Compass } from 'lucide-react';

export interface OnboardingResult {
  name: string;
  district: string;
  lat: number;
  lng: number;
  locationName: string;
}

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onComplete: (result: OnboardingResult) => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [name, setName] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('malappuram');
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Explorer';
    const district = KERALA_DISTRICTS.find((d) => d.id === selectedDistrictId) || KERALA_DISTRICTS[9];

    setIsLocating(true);
    setStatusMessage('ഡിവൈസ് GPS ലൊക്കേഷൻ കണ്ടെത്തുന്നു (Detecting GPS)...');

    // Attempt browser device GPS location
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          onComplete({
            name: cleanName,
            district: district.name,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            locationName: `${cleanName}'s Current Location`,
          });
        },
        (error) => {
          console.warn('[Geolocation] GPS unavailable or denied:', error.message);
          setIsLocating(false);
          // Graceful fallback to chosen Kerala District center!
          onComplete({
            name: cleanName,
            district: district.name,
            lat: district.lat,
            lng: district.lng,
            locationName: `${district.name} (${district.malayalam})`,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 60000,
        }
      );
    } else {
      // Fallback if browser doesn't support geolocation
      setIsLocating(false);
      onComplete({
        name: cleanName,
        district: district.name,
        lat: district.lat,
        lng: district.lng,
        locationName: `${district.name} (${district.malayalam})`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 flex flex-col gap-6 text-gray-900 relative overflow-hidden">
        {/* Top Decorative Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-3xl">
              🌴
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            കേരള 3D മാപ്പ്
            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-300">
              Live
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            നിങ്ങളുടെ പേരും ജില്ലയും നൽകി റിയൽ-ടൈം 3D കേരളത്തിൽ പ്രവേശിക്കൂ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black tracking-wider text-gray-700 uppercase flex items-center gap-1.5">
              <User size={13} className="text-emerald-600" />
              <span>പേര് (Your Name)</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={24}
              placeholder="നിങ്ങളുടെ പേര് നൽകുക..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border-2 border-gray-200 focus:border-emerald-500 focus:bg-white focus:outline-none text-base font-bold text-gray-900 placeholder-gray-400 transition-all shadow-inner"
            />
          </div>

          {/* District Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black tracking-wider text-gray-700 uppercase flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-600" />
              <span>സ്വന്തം ജില്ല (Kerala District)</span>
            </label>
            <div className="relative">
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/80 border-2 border-gray-200 focus:border-emerald-500 focus:bg-white focus:outline-none text-sm sm:text-base font-bold text-gray-900 appearance-none cursor-pointer transition-all shadow-inner"
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.malayalam})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          {/* Status feedback */}
          {isLocating && (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200 animate-pulse">
              <Navigation size={14} className="animate-spin text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLocating || !name.trim()}
            className={`w-full mt-2 py-3.5 px-6 rounded-2xl font-black text-white text-base shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95
              ${
                !name.trim() || isLocating
                  ? 'bg-gray-400 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-105 cursor-pointer shadow-emerald-500/25'
              }`}
          >
            <Sparkles size={18} />
            <span>കളിച്ചു തുടങ്ങാം (Start Exploring)</span>
          </button>
        </form>

        {/* Footer Hint */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-500 text-center">
          <Compass size={12} className="text-gray-400" />
          <span>GPS ലൊക്കേഷനിലോ തിരഞ്ഞെടുത്ത ജില്ലയിലോ സ്പോൺ ചെയ്യും</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOnboardingModal;
