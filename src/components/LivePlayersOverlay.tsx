import React, { useState } from 'react';
import { RemotePlayerData } from '../graphics/RemotePlayerManager';
import { Users, MapPin, Navigation, X, Radio, Mic, MicOff } from 'lucide-react';

interface LivePlayersOverlayProps {
  localPlayer: {
    name: string;
    district: string;
    lat: number;
    lng: number;
  } | null;
  remotePlayers: RemotePlayerData[];
  onFlyToPlayer: (lat: number, lng: number, name: string) => void;
}

/**
 * Calculates straight line distance in meters between two lat/lng points
 */
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 50) return 'അടുത്ത് (Nearby)';
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export const LivePlayersOverlay: React.FC<LivePlayersOverlayProps> = ({
  localPlayer,
  remotePlayers,
  onFlyToPlayer,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalCount = (localPlayer ? 1 : 0) + remotePlayers.length;

  return (
    <>
      {/* Top Floating Live Counter Badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={`glass-pill px-3 py-1.5 flex items-center gap-2 shadow-md hover:bg-white/95 transition-all cursor-pointer pointer-events-auto border
          ${remotePlayers.length > 0 ? 'bg-emerald-50/95 border-emerald-400 shadow-emerald-500/20 ring-2 ring-emerald-300/60' : 'border-emerald-200'}`}
        title="ക്ലിക്ക് ചെയ്ത് ലൈവ് കളിക്കാരെ കാണുക (View Live Players)"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-1.5 text-xs font-black text-gray-800">
          <Users size={13} className="text-emerald-600" />
          <span>{totalCount} {totalCount === 1 ? 'Player' : 'Players'} Live</span>
          {remotePlayers.length > 0 && (
            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-sm ml-0.5 animate-pulse">
              Fly To 🚀
            </span>
          )}
        </div>
      </button>

      {/* Live Players Modal / Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 p-5 sm:p-6 flex flex-col gap-4 text-gray-900 max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Radio size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base sm:text-lg flex items-center gap-2">
                    <span>ലൈവ് എക്സ്പ്ലോറേഴ്സ്</span>
                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-black rounded-full">
                      {totalCount}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    കളിക്കാരിലേക്ക് നേരിട്ടെത്താൻ 'Fly To' ക്ലിക്ക് ചെയ്യുക
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Players Roster List */}
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 max-h-[55vh]">
              {/* Local Player Item (You) */}
              {localPlayer && (
                <div className="p-3 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                      👤
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-gray-900 text-sm">
                          {localPlayer.name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-md">
                          നിങ്ങൾ (You)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                        <MapPin size={11} />
                        <span>{localPlayer.district}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                    നിലവിലെ സ്ഥാനം
                  </div>
                </div>
              )}

              {/* Remote Players Items */}
              {remotePlayers.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center gap-2 text-gray-500">
                  <div className="text-3xl">👥</div>
                  <p className="text-xs font-bold">
                    മറ്റ് കളിക്കാർക്കായി കാത്തിരിക്കുന്നു...
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-xs">
                    മറ്റൊരു ബ്രൗസർ ടാബിലോ ഫോണിലോ ഈ ലിങ്ക് തുറന്ന് മൾട്ടിപ്ലെയർ ഒപ്പം പരീക്ഷിക്കാവുന്നതാണ്.
                  </p>
                </div>
              ) : (
                remotePlayers.map((player) => {
                  const dist = localPlayer
                    ? getDistanceInMeters(localPlayer.lat, localPlayer.lng, player.lat, player.lng)
                    : 0;

                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        onFlyToPlayer(player.lat, player.lng, player.name);
                        setIsOpen(false);
                      }}
                      className="p-3 rounded-2xl bg-white border border-gray-200 hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white font-black flex items-center justify-center text-sm shadow-sm">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-900 text-sm">
                              {player.name}
                            </span>
                            {player.isMuted ? (
                              <span title="Muted">
                                <MicOff size={11} className="text-red-500" />
                              </span>
                            ) : (
                              <span title="Voice Active">
                                <Mic size={11} className="text-emerald-500 animate-pulse" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                            <span className="flex items-center gap-0.5 text-gray-700 font-semibold">
                              <MapPin size={11} className="text-emerald-600" />
                              {player.district}
                            </span>
                            <span>•</span>
                            <span className="text-blue-600 font-semibold">
                              {formatDistance(dist)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fly To Button */}
                      <button
                        onClick={() => {
                          onFlyToPlayer(player.lat, player.lng, player.name);
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-800 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm group-hover:bg-emerald-500 group-hover:text-white cursor-pointer"
                        title={`${player.name}-ന്റെ അടുത്തേക്ക് പറക്കുക`}
                      >
                        <Navigation size={12} className="rotate-45" />
                        <span>Fly To</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>തത്സമയം കണക്ട് ചെയ്യപ്പെട്ടു (Zero storage ephemeral)</span>
              <button
                onClick={() => setIsOpen(false)}
                className="font-bold text-gray-700 hover:text-gray-900"
              >
                അടയ്ക്കുക (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LivePlayersOverlay;
