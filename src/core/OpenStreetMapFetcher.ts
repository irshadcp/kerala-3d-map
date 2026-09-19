import { NormalizedBuilding } from './geoTypes';
import { GeoDataPipeline } from './GeoDataPipeline';
import { GeoCoords } from './geoCoords';
import { MapPOIEntity } from './SignageTypes';
import { BuildingClassifier } from './BuildingClassifier';
import { REGISTERED_LOCAL_ENTITIES } from '../config/registeredEntities';

export interface OSMFetchResult {
  buildings: NormalizedBuilding[];
  roads: { points: [number, number][]; tags: Record<string, string> }[];
  railways: { points: [number, number][]; tags: Record<string, string> }[];
  water: { points: [number, number][]; tags: Record<string, string> }[];
  pois: MapPOIEntity[];
}

export class OpenStreetMapFetcher {
  // In-memory spatial cache: key -> OSMFetchResult (0ms instant return!)
  private static cache: Map<string, OSMFetchResult> = new Map();
  private static pendingFetches: Map<string, Promise<OSMFetchResult>> = new Map();

  // localStorage cache key prefix and TTL (6 hours)
  private static readonly LS_PREFIX = 'osm_cache_v3_';
  private static readonly LS_TTL_MS = 6 * 60 * 60 * 1000;

  private static lsGet(key: string): OSMFetchResult | null {
    try {
      const raw = localStorage.getItem(OpenStreetMapFetcher.LS_PREFIX + key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > OpenStreetMapFetcher.LS_TTL_MS) {
        localStorage.removeItem(OpenStreetMapFetcher.LS_PREFIX + key);
        return null;
      }
      return data as OSMFetchResult;
    } catch (_) { return null; }
  }

  private static lsSet(key: string, data: OSMFetchResult): void {
    try {
      const payload = JSON.stringify({ ts: Date.now(), data });
      // Only store if there's actual data (don't cache empty results)
      if (data.buildings.length > 0 || data.roads.length > 0) {
        localStorage.setItem(OpenStreetMapFetcher.LS_PREFIX + key, payload);
      }
    } catch (_) { /* storage full or private mode — skip */ }
  }

  /**
   * Fetches real geographic data (buildings, shops, amenities, roads) directly from Overpass API
   * with localStorage 6-hour cache (instant on reload) and in-memory deduplication.
   */
  public static async fetchArea(
    centerLat: number,
    centerLng: number,
    radiusMeters = 550,
    originLat: number,
    originLng: number
  ): Promise<OSMFetchResult> {
    // Spatial grid bucket key: ~500m resolution (0.005 degrees)
    const bucketLat = Math.round(centerLat * 200) / 200;
    const bucketLng = Math.round(centerLng * 200) / 200;
    const cacheKey = `${bucketLat.toFixed(4)},${bucketLng.toFixed(4)}`;

    // 1. In-memory cache (0ms)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 2. In-flight deduplication
    if (this.pendingFetches.has(cacheKey)) {
      return this.pendingFetches.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      let result: OSMFetchResult = {
        buildings: [],
        roads: [],
        railways: [],
        water: [],
        pois: [],
      };

      // 3. localStorage cache (instant on page reload — 6hr TTL)
      const cached = this.lsGet(cacheKey);
      if (cached) {
        // Re-hydrate local registered entities in case they changed
        result = cached;
        // Still add any new registered entities not in cache
        this.mergeRegisteredEntities(result, centerLat, centerLng, radiusMeters, originLat, originLng);
        // Store in memory too
        this.memCacheSet(cacheKey, result);
        this.pendingFetches.delete(cacheKey);
        return result;
      }

      // 4. Overpass API — one comprehensive query (skip slow OSM XML API)
      const overpassMirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      ];

      // Single large query covering buildings, roads, shops, amenities, POIs
      const q = `[out:json][timeout:15];(
way["building"](around:${radiusMeters},${centerLat},${centerLng});
way["shop"](around:${radiusMeters},${centerLat},${centerLng});
way["amenity"](around:${radiusMeters},${centerLat},${centerLng});
way["office"](around:${radiusMeters},${centerLat},${centerLng});
way["tourism"](around:${radiusMeters},${centerLat},${centerLng});
way["highway"](around:${radiusMeters},${centerLat},${centerLng});
way["railway"](around:${radiusMeters},${centerLat},${centerLng});
way["waterway"](around:${radiusMeters},${centerLat},${centerLng});
way["natural"="water"](around:${radiusMeters},${centerLat},${centerLng});
way["leisure"="park"](around:${radiusMeters},${centerLat},${centerLng});
node["shop"](around:${radiusMeters},${centerLat},${centerLng});
node["amenity"](around:${radiusMeters},${centerLat},${centerLng});
node["office"](around:${radiusMeters},${centerLat},${centerLng});
node["tourism"](around:${radiusMeters},${centerLat},${centerLng});
node["highway"="bus_stop"](around:${radiusMeters},${centerLat},${centerLng});
node["amenity"="parking"](around:${radiusMeters},${centerLat},${centerLng});
way["amenity"="parking"](around:${radiusMeters},${centerLat},${centerLng});
);out geom;`;

      for (const mirrorBase of overpassMirrors) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(`${mirrorBase}?data=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            const parsed = this.parseOverpassJson(data, originLat, originLng);

            if (parsed.buildings.length > 0 || parsed.roads.length > 0) {
              result = parsed;
              break; // Got good data — stop trying mirrors
            }
          }
        } catch (_err) {
          // Try next mirror
        }
      }

      // 5. Merge registered local entities
      this.mergeRegisteredEntities(result, centerLat, centerLng, radiusMeters, originLat, originLng);

      // 6. Cache — only if real data exists
      if (result.buildings.length > 0 || result.roads.length > 0 || result.pois.length > 0) {
        this.memCacheSet(cacheKey, result);
        this.lsSet(cacheKey, result);
      }

      this.pendingFetches.delete(cacheKey);
      return result;
    })();

    this.pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private static memCacheSet(key: string, result: OSMFetchResult): void {
    if (this.cache.size >= 300) {
      let evicted = 0;
      for (const k of this.cache.keys()) {
        if (evicted >= 30) break;
        this.cache.delete(k);
        evicted++;
      }
    }
    this.cache.set(key, result);
  }

  private static mergeRegisteredEntities(
    result: OSMFetchResult,
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
    originLat: number,
    originLng: number
  ): void {
    for (const reg of REGISTERED_LOCAL_ENTITIES) {
      const dLat = (reg.lat - centerLat) * 111000;
      const dLng = (reg.lng - centerLng) * 111000 * Math.cos((centerLat * Math.PI) / 180);
      const dist = Math.hypot(dLat, dLng);
      if (dist <= radiusMeters + 150) {
        const exists = result.pois.some(
          (p) => p.id === reg.id || p.name.toLowerCase() === reg.name.toLowerCase()
        );
        if (!exists) {
          const { x: px, z: pz } = GeoCoords.toLocalMeters(reg.lat, reg.lng, originLat, originLng);
          result.pois.push({
            id: reg.id,
            sourceId: reg.id,
            name: reg.name,
            malayalamName: reg.malayalamName,
            category: reg.category,
            lat: reg.lat,
            lng: reg.lng,
            x: px,
            z: pz,
            tags: reg.tags,
            signType: 'STANDALONE_POLE',
            priorityTier: reg.isMajor ? 'HIGH' : 'MEDIUM',
          });
        }
      }
    }
  }

  /** Clear localStorage OSM cache (call when map origin changes) */
  public static clearLocalStorageCache(): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(OpenStreetMapFetcher.LS_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    OpenStreetMapFetcher.cache.clear();
    OpenStreetMapFetcher.pendingFetches.clear();
  }




  /**
   * High-speed parser for OpenStreetMap XML.
   */
  public static parseOSMXml(xmlText: string, originLat: number, originLng: number): OSMFetchResult {
    const buildings: NormalizedBuilding[] = [];
    const roads: { points: [number, number][]; tags: Record<string, string> }[] = [];
    const railways: { points: [number, number][]; tags: Record<string, string> }[] = [];
    const water: { points: [number, number][]; tags: Record<string, string> }[] = [];
    const pois: MapPOIEntity[] = [];

    // 1. Parse nodes into coordinates Map: id -> [lon, lat]
    const nodeMap = new Map<string, [number, number]>();
    const nodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = nodeRegex.exec(xmlText)) !== null) {
      nodeMap.set(match[1], [parseFloat(match[3]), parseFloat(match[2])]);
    }

    // 2. Parse ways (buildings, shops, amenities, roads, railways)
    const wayRegex = /<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;
    let wayMatch: RegExpExecArray | null;

    while ((wayMatch = wayRegex.exec(xmlText)) !== null) {
      const wayId = wayMatch[1];
      const body = wayMatch[2];

      // Extract tags
      const tags: Record<string, string> = {};
      const tagRegex = /<tag k="([^"]+)" v="([^"]+)"\/>/g;
      let tagMatch: RegExpExecArray | null;
      while ((tagMatch = tagRegex.exec(body)) !== null) {
        tags[tagMatch[1]] = tagMatch[2];
      }

      // Extract node coordinates
      const ndRegex = /<nd ref="(\d+)"\/>/g;
      const points: [number, number][] = [];
      let ndMatch: RegExpExecArray | null;
      while ((ndMatch = ndRegex.exec(body)) !== null) {
        const pt = nodeMap.get(ndMatch[1]);
        if (pt) points.push(pt);
      }

      // If it's a road (exclude all service roads, driveways, tracks, and pedestrian paths)
      if (tags.highway && points.length >= 2) {
        const hw = (tags.highway || '').toLowerCase();
        const srv = (tags.service || '').toLowerCase();
        const acc = (tags.access || '').toLowerCase();
        const isService =
          hw === 'service' ||
          hw === 'track' ||
          hw === 'footway' ||
          hw === 'path' ||
          hw === 'pedestrian' ||
          hw === 'steps' ||
          hw === 'cycleway' ||
          hw === 'bridleway' ||
          srv.length > 0 ||
          acc === 'private' ||
          acc === 'no';

        if (!isService) {
          roads.push({ points, tags });
        }
      }

      // If it's a railway
      if (tags.railway && points.length >= 2) {
        railways.push({ points, tags });
      }

      // If it's water
      if ((tags.waterway || tags.natural === 'water' || tags.water) && points.length >= 2) {
        water.push({ points, tags });
      }

      // If it's a building or commercial/civic amenity
      const isBuildingOrPOI =
        tags.building ||
        tags.shop ||
        tags.amenity ||
        tags.tourism ||
        tags.craft ||
        tags.healthcare ||
        tags.office ||
        tags.leisure;

      if (isBuildingOrPOI && points.length >= 3) {
        const normalized = GeoDataPipeline.normalizeBuilding(
          wayId,
          points,
          tags,
          originLat,
          originLng,
          'osm-overpass'
        );
        if (normalized) {
          buildings.push(normalized);

          // If the building way itself has a name or branded facility
          if (tags.name || tags.brand || tags.operator) {
            const poiName = tags.name || tags.brand || tags.operator || '';
            const isTall = (normalized.levels || 1) >= 4 || normalized.height >= 12;
            const isCommercial = ['COMMERCIAL', 'OFFICE', 'HOTEL', 'HOSPITAL', 'SHOP', 'SUPERMARKET'].includes(normalized.category);
            pois.push({
              id: `poi-way-${wayId}`,
              sourceId: wayId,
              name: poiName,
              malayalamName: tags['name:ml'],
              category: normalized.category,
              lat: normalized.centerLat,
              lng: normalized.centerLng,
              x: normalized.centerX,
              z: normalized.centerZ,
              tags,
              matchedBuildingId: String(normalized.id),
              signType: (isTall || (isCommercial && normalized.height >= 8)) ? 'ROOFTOP' : 'FACADE',
              priorityTier: normalized.importanceLevel >= 4 ? 'HIGH' : 'MEDIUM'
            });
          }
        }
      }
    }

    // 3. Parse standalone nodes with POI tags (bakeries, shops, clinics, offices mapped as nodes)
    const fullNodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)" lon="([^"]+)"[^>]*>([\s\S]*?)<\/node>/g;
    let fullNodeMatch: RegExpExecArray | null;

    while ((fullNodeMatch = fullNodeRegex.exec(xmlText)) !== null) {
      const nodeId = fullNodeMatch[1];
      const lat = parseFloat(fullNodeMatch[2]);
      const lon = parseFloat(fullNodeMatch[3]);
      const body = fullNodeMatch[4];

      const tags: Record<string, string> = {};
      const tagRegex = /<tag k="([^"]+)" v="([^"]+)"\/>/g;
      let tagMatch: RegExpExecArray | null;
      while ((tagMatch = tagRegex.exec(body)) !== null) {
        tags[tagMatch[1]] = tagMatch[2];
      }

      const isBusStop = tags.highway === 'bus_stop' || tags.public_transport === 'platform' || tags.amenity === 'bus_station';
      const isParking = tags.amenity === 'parking' || tags.amenity === 'motorcycle_parking' || tags.parking !== undefined;

      const hasPOITag =
        tags.shop ||
        tags.amenity ||
        tags.tourism ||
        tags.healthcare ||
        tags.place_of_worship ||
        tags.office ||
        isBusStop ||
        isParking ||
        (tags.name && tags.highway !== 'traffic_signals');

      if (hasPOITag) {
        const poiName =
          tags.name ||
          tags.brand ||
          tags.operator ||
          (isBusStop ? 'Bus Stop' : isParking ? 'Parking' : tags.shop ? `${tags.shop} shop` : (tags.amenity || 'Facility'));
        const category = BuildingClassifier.classify(tags);
        const { x: px, z: pz } = GeoCoords.toLocalMeters(lat, lon, originLat, originLng);
        const isMajor =
          tags.amenity === 'hospital' ||
          tags.amenity === 'bank' ||
          tags.amenity === 'clinic' ||
          tags.amenity === 'police' ||
          tags.shop === 'mall' ||
          tags.tourism === 'hotel' ||
          isParking;

        pois.push({
          id: `poi-node-${nodeId}`,
          sourceId: nodeId,
          name: poiName,
          malayalamName: tags['name:ml'] || (isBusStop ? 'ബസ് സ്റ്റോപ്പ്' : isParking ? 'പാർക്കിംഗ്' : undefined),
          category,
          lat,
          lng: lon,
          x: px,
          z: pz,
          tags,
          signType: 'STANDALONE_POLE', // Upgraded to FACADE/ROOFTOP if matched to building or synthesized
          priorityTier: isMajor ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return { buildings, roads, railways, water, pois };
  }

  /**
   * Parser for JSON from Overpass API.
   */
  private static parseOverpassJson(data: any, originLat: number, originLng: number): OSMFetchResult {
    const buildings: NormalizedBuilding[] = [];
    const roads: { points: [number, number][]; tags: Record<string, string> }[] = [];
    const railways: { points: [number, number][]; tags: Record<string, string> }[] = [];
    const water: { points: [number, number][]; tags: Record<string, string> }[] = [];
    const pois: MapPOIEntity[] = [];

    if (!data || !data.elements) return { buildings, roads, railways, water, pois };

    for (const el of data.elements) {
      if (el.type === 'way' && el.geometry && Array.isArray(el.geometry)) {
        const points: [number, number][] = el.geometry.map((pt: any) => [pt.lon, pt.lat]);
        const tags = el.tags || {};

        if (tags.highway && points.length >= 2) {
          const hw = (tags.highway || '').toLowerCase();
          const srv = (tags.service || '').toLowerCase();
          const acc = (tags.access || '').toLowerCase();
          const isService =
            hw === 'service' ||
            hw === 'track' ||
            hw === 'footway' ||
            hw === 'path' ||
            hw === 'pedestrian' ||
            hw === 'steps' ||
            hw === 'cycleway' ||
            hw === 'bridleway' ||
            srv.length > 0 ||
            acc === 'private' ||
            acc === 'no';

          if (!isService) {
            roads.push({ points, tags });
          }
        }

        if (tags.railway && points.length >= 2) {
          railways.push({ points, tags });
        }
        
        if ((tags.waterway || tags.natural === 'water' || tags.water) && points.length >= 2) {
          water.push({ points, tags });
        }

        if ((tags.building || tags.shop || tags.amenity || tags.office || tags.tourism) && points.length >= 3) {
          const b = GeoDataPipeline.normalizeBuilding(el.id, points, tags, originLat, originLng, 'osm-overpass');
          if (b) {
            buildings.push(b);
            if (tags.name || tags.brand || tags.operator) {
              const poiName = tags.name || tags.brand || tags.operator || '';
              const isTall = (b.levels || 1) >= 4 || b.height >= 12;
              const isCommercial = ['COMMERCIAL', 'OFFICE', 'HOTEL', 'HOSPITAL', 'SHOP', 'SUPERMARKET'].includes(b.category);
              pois.push({
                id: `poi-way-${el.id}`,
                sourceId: String(el.id),
                name: poiName,
                malayalamName: tags['name:ml'],
                category: b.category,
                lat: b.centerLat,
                lng: b.centerLng,
                x: b.centerX,
                z: b.centerZ,
                tags,
                matchedBuildingId: String(b.id),
                signType: (isTall || (isCommercial && b.height >= 8)) ? 'ROOFTOP' : 'FACADE',
                priorityTier: b.importanceLevel >= 4 ? 'HIGH' : 'MEDIUM'
              });
            }
          }
        }
      } else if (el.type === 'node' && el.lat && el.lon && el.tags) {
        const tags = el.tags;
        const isBusStop = tags.highway === 'bus_stop' || tags.public_transport === 'platform' || tags.amenity === 'bus_station';
        const isParking = tags.amenity === 'parking' || tags.amenity === 'motorcycle_parking' || tags.parking !== undefined;

        const hasPOITag =
          tags.shop ||
          tags.amenity ||
          tags.tourism ||
          tags.healthcare ||
          tags.place_of_worship ||
          tags.office ||
          isBusStop ||
          isParking ||
          (tags.name && tags.highway !== 'traffic_signals');

        if (hasPOITag) {
          const poiName =
            tags.name ||
            tags.brand ||
            tags.operator ||
            (isBusStop ? 'Bus Stop' : isParking ? 'Parking' : tags.shop ? `${tags.shop} shop` : (tags.amenity || 'Facility'));
          const category = BuildingClassifier.classify(tags);
          const { x: px, z: pz } = GeoCoords.toLocalMeters(el.lat, el.lon, originLat, originLng);
          const isMajor =
            tags.amenity === 'hospital' ||
            tags.amenity === 'bank' ||
            tags.amenity === 'clinic' ||
            tags.amenity === 'police' ||
            tags.shop === 'mall' ||
            tags.tourism === 'hotel' ||
            isParking;

          pois.push({
            id: `poi-node-${el.id}`,
            sourceId: String(el.id),
            name: poiName,
            malayalamName: tags['name:ml'] || (isBusStop ? 'ബസ് സ്റ്റോപ്പ്' : isParking ? 'പാർക്കിംഗ്' : undefined),
            category,
            lat: el.lat,
            lng: el.lon,
            x: px,
            z: pz,
            tags,
            signType: 'STANDALONE_POLE',
            priorityTier: isMajor ? 'HIGH' : 'MEDIUM',
          });
        }
      }
    }

    return { buildings, roads, railways, water, pois };
  }
}
