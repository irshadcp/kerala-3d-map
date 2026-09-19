import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, Send, Search, Loader2, Compass, Sparkles, X } from 'lucide-react';
import { LOCATION_PRESETS, LocationPreset } from '../config/gameConfig';

interface LocationSelectorProps {
  currentLocation: LocationPreset;
  onSelectLocation: (preset: LocationPreset) => void;
  onCustomCoords: (lat: number, lng: number, name: string) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  currentLocation,
  onSelectLocation,
  onCustomCoords,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'hometown' | 'north' | 'central' | 'south' | 'world'>('hometown');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const searchTimeoutRef = useRef<number | null>(null);

  // Multi-tier fast search: Preset Match + Photon API (Komoot) + Nominatim Fallback
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // 1. Instant internal match from presets
    const localMatches: SearchResult[] = LOCATION_PRESETS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.subname.toLowerCase().includes(q)
    ).map((p) => ({
      place_id: parseInt(p.id.replace(/\D/g, '') || '100', 10),
      display_name: `${p.name}, ${p.subname}`,
      lat: String(p.lat),
      lon: String(p.lng),
      type: 'preset',
      address: { city: p.name, state: p.subname },
    }));

    if (localMatches.length > 0) {
      setSearchResults(localMatches);
    }

    setIsSearching(true);

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        let results: SearchResult[] = [...localMatches];

        // 2. Query Photon by Komoot (Fast, typo-tolerant, biased towards Kerala/South India)
        try {
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
            searchQuery
          )}&lat=10.85&lon=76.27&limit=6`;
          const pRes = await fetch(photonUrl);
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData && Array.isArray(pData.features)) {
              const photonItems: SearchResult[] = pData.features.map(
                (f: any, idx: number) => {
                  const props = f.properties || {};
                  const coords = f.geometry?.coordinates || [0, 0];
                  const placeName = props.name || props.city || props.town || props.street || 'Location';
                  const areaParts = [props.district, props.state, props.country].filter(Boolean);
                  const fullAddress = `${placeName}, ${areaParts.join(', ')}`;
                  return {
                    place_id: 1000 + idx,
                    display_name: fullAddress,
                    lat: String(coords[1]),
                    lon: String(coords[0]),
                    type: props.osm_value || 'place',
                    address: {
                      city: placeName,
                      state_district: props.district,
                      state: props.state,
                      country: props.country,
                    },
                  };
                }
              );
              results = [...results, ...photonItems];
            }
          }
        } catch (pErr) {
          console.warn('Photon API note:', pErr);
        }

        // 3. Fallback to OpenStreetMap Nominatim if fewer than 2 results
        if (results.length < 2) {
          try {
            const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              searchQuery
            )}&addressdetails=1&limit=5`;
            const nRes = await fetch(nomUrl, {
              headers: { 'Accept': 'application/json' },
            });
            if (nRes.ok) {
              const nData = await nRes.json();
              if (Array.isArray(nData)) {
                results = [...results, ...nData];
              }
            }
          } catch (nErr) {
            console.warn('Nominatim fallback note:', nErr);
          }
        }

        // Deduplicate by approximate coordinates
        const unique: SearchResult[] = [];
        const seenCoords = new Set<string>();
        for (const item of results) {
          const key = `${parseFloat(item.lat).toFixed(2)},${parseFloat(item.lon).toFixed(2)}`;
          if (!seenCoords.has(key)) {
            seenCoords.add(key);
            unique.push(item);
          }
        }

        setSearchResults(unique.slice(0, 6));
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      // Clamped strictly to Kerala boundaries (8.1°N - 12.85°N, 74.7°E - 77.65°E)
      const clampedLat = Math.max(8.10, Math.min(12.85, lat));
      const clampedLng = Math.max(74.70, Math.min(77.65, lng));
      const addr = result.address || {};
      const primaryName = addr.city || addr.town || addr.village || addr.suburb || result.display_name.split(',')[0];
      const stateOrCountry = addr.state_district || addr.state || addr.country || '';
      const name = stateOrCountry ? `${primaryName}, ${stateOrCountry}` : primaryName;

      onCustomCoords(clampedLat, clampedLng, name);
      setIsOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      // Clamped strictly to Kerala boundaries (8.1°N - 12.85°N, 74.7°E - 77.65°E)
      const clampedLat = Math.max(8.10, Math.min(12.85, lat));
      const clampedLng = Math.max(74.70, Math.min(77.65, lng));
      onCustomCoords(clampedLat, clampedLng, `Kerala (${clampedLat.toFixed(3)}, ${clampedLng.toFixed(3)})`);
      setIsOpen(false);
      setCustomLat('');
      setCustomLng('');
    }
  };

  const filteredPresets = LOCATION_PRESETS.filter((p) => {
    if (activeTab === 'hometown') return p.category === 'hometown';
    if (activeTab === 'north') return p.category === 'north_kerala';
    if (activeTab === 'central') return p.category === 'central_kerala';
    if (activeTab === 'south') return p.category === 'south_kerala';
    if (activeTab === 'world') return p.category === 'world';
    return true;
  });

  return (
    <div className="relative">
      {/* Location Selector Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="location-pill glass-pill-button flex items-center gap-2"
        title="Switch Location or Search Anywhere in the World"
      >
        <MapPin size={16} className="text-red-500 fill-red-500 flex-shrink-0 animate-bounce" />
        <div className="text-left leading-tight min-w-0 max-w-[150px] sm:max-w-[200px] truncate">
          <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">{currentLocation.name}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate">{currentLocation.subname}</div>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="location-dropdown glass-panel animate-scale-up absolute top-[calc(100%+8px)] left-0 w-[320px] sm:w-[380px] p-3 z-50 max-h-[85vh] flex flex-col shadow-2xl">
          {/* Header & Global Search Bar */}
          <div className="mb-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search any district, city, or place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/90 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Display if Querying */}
          {searchQuery.trim() ? (
            <div className="flex-1 overflow-y-auto max-h-64 my-1 divide-y divide-slate-100">
              {isSearching ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span>Searching world map...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res) => {
                  const title = res.display_name.split(',')[0];
                  const details = res.display_name.split(',').slice(1, 4).join(',').trim();
                  return (
                    <button
                      key={res.place_id}
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2.5 hover:bg-blue-50/80 rounded-xl transition-colors flex items-start gap-2 group"
                    >
                      <MapPin size={15} className="text-blue-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">{title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{details}</div>
                      </div>
                      <Sparkles size={13} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No places found for "{searchQuery}". Try a district or city name.
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Category Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl mb-2 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActiveTab('hometown')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                    activeTab === 'hometown' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🏡 Home</span>
                </button>
                <button
                  onClick={() => setActiveTab('north')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                    activeTab === 'north' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🌴 North</span>
                </button>
                <button
                  onClick={() => setActiveTab('central')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                    activeTab === 'central' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🏙️ Central</span>
                </button>
                <button
                  onClick={() => setActiveTab('south')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                    activeTab === 'south' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>⛵ South</span>
                </button>
                <button
                  onClick={() => setActiveTab('world')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                    activeTab === 'world' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🔒 World</span>
                </button>
              </div>

              {/* Presets List */}
              <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-1">
                {filteredPresets.map((preset) => {
                  const isSelected = preset.id === currentLocation.id;
                  const isLocked = !!preset.locked;
                  return (
                    <button
                      key={preset.id}
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) return;
                        onSelectLocation(preset);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        isLocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-400'
                          : isSelected
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                          : 'hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 truncate">{preset.name}</span>
                          {preset.malayalamName && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                              {preset.malayalamName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{preset.subname}</div>
                      </div>
                      {isLocked ? (
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex-shrink-0">
                          🔒 Locked
                        </span>
                      ) : isSelected ? (
                        <Check size={14} className="text-blue-600 flex-shrink-0" />
                      ) : (
                        <div className="text-[10px] font-mono text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded flex-shrink-0">
                          {preset.temp}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Quick Coordinate Teleporter */}
          <div className="border-t border-slate-100 mt-2.5 pt-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
              <span>Direct GPS Coordinates</span>
              <Compass size={11} className="text-slate-400" />
            </div>
            <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
              <input
                type="number"
                step="any"
                placeholder="Lat (e.g. 10.814)"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                type="number"
                step="any"
                placeholder="Lng (e.g. 75.986)"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                title="Teleport to Coordinates"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
