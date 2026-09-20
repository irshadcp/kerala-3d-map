import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Globe } from 'lucide-react';
import {
  searchGlobalPlaces,
  GeocodingResult,
  POPULAR_GLOBAL_DESTINATIONS,
} from '../services/geocodingService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: GeocodingResult) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPlace,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const places = await searchGlobalPlaces(query);
      setResults(places);
      setLoading(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/25 backdrop-blur-sm pointer-events-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md rounded-3xl p-4 shadow-2xl flex flex-col gap-3.5 border border-white/60 bg-white/90 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-2.5 bg-gray-100/90 rounded-2xl px-3.5 py-2.5 border border-gray-200/70">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.length > 0) {
                onSelectPlace(results[0]);
              }
            }}
            placeholder="Search any city, place or address worldwide..."
            className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none font-medium"
          />
          {loading && <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-200/60 transition-colors ml-1"
          >
            Cancel
          </button>
        </div>

        {/* Popular Global Destinations Chips */}
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <Globe size={13} className="text-blue-500" />
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
              Popular Global Places
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {POPULAR_GLOBAL_DESTINATIONS.map((dest) => (
              <button
                key={dest.id}
                onClick={() => onSelectPlace(dest)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200/80 shadow-sm transition-all hover:scale-[1.02]"
              >
                {dest.name} {dest.fullName.slice(-2)}
              </button>
            ))}
          </div>
        </div>

        {/* Live Search Results List */}
        {results.length > 0 && (
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto no-scrollbar pt-1 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
              Search Results ({results.length})
            </div>
            {results.map((place) => (
              <button
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-blue-50/80 text-left transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                  <MapPin size={15} className="text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                    {place.name}
                  </span>
                  <span className="text-[11px] text-gray-500 truncate">
                    {place.fullName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <div className="text-center py-6 text-xs text-gray-400">
            No places found for &quot;{query}&quot;. Try another city name.
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearchModal;
