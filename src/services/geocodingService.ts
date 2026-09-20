export interface GeocodingResult {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

export const POPULAR_GLOBAL_DESTINATIONS: GeocodingResult[] = [
  { id: 'dubai', name: 'Dubai', fullName: 'United Arab Emirates 🇦🇪', lat: 25.1972, lng: 55.2744 },
  { id: 'london', name: 'London', fullName: 'United Kingdom 🇬🇧', lat: 51.5074, lng: -0.1278 },
  { id: 'tokyo', name: 'Tokyo', fullName: 'Japan 🇯🇵', lat: 35.6762, lng: 139.6503 },
  { id: 'newyork', name: 'New York', fullName: 'United States 🇺🇸', lat: 40.7128, lng: -74.0060 },
  { id: 'paris', name: 'Paris', fullName: 'France 🇫🇷', lat: 48.8566, lng: 2.3522 },
  { id: 'malappuram', name: 'Malappuram', fullName: 'Kerala, India 📍', lat: 11.0734, lng: 76.0740 },
  { id: 'kochi', name: 'Kochi (Edappally)', fullName: 'Kerala, India 🌴', lat: 10.0270, lng: 76.3075 },
  { id: 'calicut', name: 'Kozhikode Beach', fullName: 'Kerala, India 🏖️', lat: 11.2588, lng: 75.7804 },
];

export async function searchGlobalPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();

  // 1. Try OpenStreetMap Nominatim with User-Agent
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&limit=6&accept-language=en`,
      {
        headers: {
          'User-Agent': 'RealWorld3DMap/1.0',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => {
          const parts = (item.display_name || '').split(',');
          const mainName = item.name || parts[0]?.trim() || q;
          const subName = parts.slice(1).join(',').trim();
          return {
            id: `nom_${item.place_id || idx}`,
            name: mainName,
            fullName: subName || item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
      }
    }
  } catch (_) {
    // Fall through to Photon
  }

  // 2. Fallback to Photon API
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        return data.features.map((f: any, idx: number) => {
          const props = f.properties || {};
          const mainName = props.name || q;
          const subParts = [props.city, props.state, props.country].filter(Boolean);
          return {
            id: `pho_${props.osm_id || idx}`,
            name: mainName,
            fullName: subParts.join(', ') || props.country || '',
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          };
        });
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }

  return [];
}
