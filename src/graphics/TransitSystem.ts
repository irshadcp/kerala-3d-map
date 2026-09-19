import { TerrainEngine } from '../core/TerrainEngine';
import * as THREE from 'three';
import { GeoCoords } from '../core/geoCoords';
import { disposeHierarchy } from './disposeUtils';
import { RailwayGraph } from '../core/RailwayGraph';
import { WaterSystem } from '../core/WaterSystem';

export interface MetroStationInfo {
  id: string;
  name: string;
  malayalamName: string;
  lat: number;
  lng: number;
}

export interface MetroStationDef {
  id: string;
  name: string;
  malayalamName: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  dir: THREE.Vector3;
}

export class TransitSystem {
  public group: THREE.Group;
  private railwayGraph?: RailwayGraph;
  private waterSystem?: WaterSystem;

  // Cached materials for Metro
  private concretePillarMat: THREE.MeshLambertMaterial;
  private viaductDeckMat: THREE.MeshLambertMaterial;
  private parapetMat: THREE.MeshLambertMaterial;
  private railSteelMat: THREE.MeshStandardMaterial;
  private metroBodyMat: THREE.MeshLambertMaterial;
  private metroCyanStripeMat: THREE.MeshLambertMaterial;
  private metroWindowMat: THREE.MeshLambertMaterial;
  private metroDoorMat: THREE.MeshLambertMaterial;
  private headlightMat: THREE.MeshBasicMaterial;
  private taillightMat: THREE.MeshBasicMaterial;
  private stationGlassMat: THREE.MeshLambertMaterial;
  private platformMat: THREE.MeshLambertMaterial;
  private fobSteelMat: THREE.MeshLambertMaterial;
  private fobRoofMat: THREE.MeshLambertMaterial;
  private concourseWallMat: THREE.MeshLambertMaterial;

  // Cached materials for Ground Highway Corridor & Median
  private roadAsphaltMat: THREE.MeshLambertMaterial;
  private roadLaneDashMat: THREE.MeshBasicMaterial;
  private medianIslandMat: THREE.MeshLambertMaterial;
  private medianCurbHazardMat: THREE.MeshLambertMaterial;
  private roadSidewalkMat: THREE.MeshLambertMaterial;

  // Cached materials for Indian Railways Train
  private trainLocoBlueMat: THREE.MeshLambertMaterial;
  private trainCoachMat: THREE.MeshLambertMaterial;
  private trainYellowStripeMat: THREE.MeshLambertMaterial;
  private sleeperWoodMat: THREE.MeshLambertMaterial;
  private ballastGravelMat: THREE.MeshLambertMaterial;

  // Metro Track & Station state
  private originLat: number;
  private originLng: number;
  private metroRoadGroup: THREE.Group;
  private viaductGroup: THREE.Group;
  private stationsGroup: THREE.Group;
  private metroTrainGroup: THREE.Group;
  private railwayGroup: THREE.Group;
  private railwayTrainGroup: THREE.Group;

  // Metro Path points in local meters
  private metroWaypoints: THREE.Vector3[] = [];
  private metroStations: MetroStationDef[] = [];
  private currentTrackDistance = 0;
  private totalTrackLength = 0;
  private metroSpeed = 16.0; // ~58 km/h
  private metroDirection = 1; // 1 = forward, -1 = reverse
  private stationDwellTimer = 0;
  private isAtStation = false;
  private targetStationIndex = 0;

  // Railway Track & Train state
  private railwayWaypoints: THREE.Vector3[] = [];
  private railwayTrainDistance = 0;
  private railwayTrackLength = 0;
  private railwaySpeed = 14.0; // ~50 km/h
  private railwayActive = false;

  /**
   * Continuous road-median baseline geometry of the Kochi Metro Blue Line corridor
   * (NH 544, Banerji Road, MG Road, SA Road, etc.).
   * BLUE LINE = THE METRO ALIGNMENT.
   */
  private static BLUE_LINE_BASELINE: [number, number][] = [
    // 1. Aluva to Muttom along NH 544 median
    [10.1098, 76.3533],
    [10.1042, 76.3503],
    [10.0988, 76.3475],
    [10.0945, 76.3452],
    [10.0903, 76.3428],
    [10.0864, 76.3406],
    [10.0825, 76.3385],
    [10.0776, 76.3361],
    [10.0728, 76.3338],
    [10.0679, 76.3314],
    [10.0630, 76.3290],
    // 2. Kalamassery to Edappally
    [10.0528, 76.3248],
    [10.0475, 76.3222],
    [10.0422, 76.3197],
    [10.0379, 76.3172],
    [10.0336, 76.3146],
    [10.0292, 76.3112],
    // 3. Edappally Curve onto Banerji Road (Old NH 47)
    [10.0248, 76.3079],
    [10.0200, 76.3058],
    [10.0152, 76.3038],
    [10.0125, 76.3028],
    [10.0102, 76.3021],
    // 4. Palarivattom & Kaloor down Banerji Road median
    [10.0076, 76.3014],
    [10.0052, 76.3008],
    [10.0025, 76.3001],
    [10.0003, 76.2995],
    [10.0000, 76.2970],
    [9.9932, 76.2936],
    [9.9907, 76.2907],
    [9.9882, 76.2879],
    [9.9840, 76.2855],
    // 5. MG Road Corridor
    [9.9798, 76.2842],
    [9.9756, 76.2850],
    [9.9715, 76.2858],
    [9.9696, 76.2875],
    [9.9678, 76.2892],
    // 6. SA Road Corridor
    [9.9675, 76.2937],
    [9.9672, 76.2982],
    [9.9674, 76.3030],
    [9.9677, 76.3079],
    [9.9675, 76.3133],
    [9.9673, 76.3188],
    // 7. South toward Thripunithura
    [9.9624, 76.3203],
    [9.9575, 76.3218],
    [9.9545, 76.3250],
    [9.9515, 76.3282],
    [9.9503, 76.3331],
    [9.9492, 76.3380],
    [9.9496, 76.3418],
    [9.9501, 76.3456],
    [9.9510, 76.3499],
    [9.9518, 76.3542],
  ];

  /**
   * Official Kochi Metro Stations catalog.
   * Stations DO NOT define the route; they are attached to the existing Blue Line geometry.
   */
  public static readonly KOCHI_METRO_STATIONS: MetroStationInfo[] = [
    { id: 'aluva', name: 'Aluva', malayalamName: 'ആലുവ', lat: 10.1098, lng: 76.3533 },
    { id: 'pulinchodu', name: 'Pulinchodu', malayalamName: 'പുളിഞ്ചോട്', lat: 10.0988, lng: 76.3475 },
    { id: 'companypady', name: 'Companypady', malayalamName: 'കമ്പനിപ്പടി', lat: 10.0903, lng: 76.3428 },
    { id: 'ambattukavu', name: 'Ambattukavu', malayalamName: 'അമ്പാട്ടുകാവ്', lat: 10.0825, lng: 76.3385 },
    { id: 'muttom', name: 'Muttom', malayalamName: 'മുട്ടം', lat: 10.0728, lng: 76.3338 },
    { id: 'kalamassery', name: 'Kalamassery', malayalamName: 'കളമശ്ശേരി', lat: 10.0528, lng: 76.3248 },
    { id: 'cusat', name: 'Cochin University', malayalamName: 'കുസാറ്റ്', lat: 10.0422, lng: 76.3197 },
    { id: 'pathadipalam', name: 'Pathadipalam', malayalamName: 'പത്തടിപ്പാലം', lat: 10.0336, lng: 76.3146 },
    { id: 'edappally', name: 'Edappally', malayalamName: 'ഇടപ്പള്ളി', lat: 10.0248, lng: 76.3079 },
    { id: 'changampuzha_park', name: 'Changampuzha Park', malayalamName: 'ചങ്ങമ്പുഴ പാർക്ക്', lat: 10.0152, lng: 76.3038 },
    { id: 'palarivattom', name: 'Palarivattom', malayalamName: 'പാലാരിവട്ടം', lat: 10.0076, lng: 76.3014 },
    { id: 'jln_stadium', name: 'JLN Stadium', malayalamName: 'കലൂർ സ്റ്റേഡിയം', lat: 10.0003, lng: 76.2995 },
    { id: 'kaloor', name: 'Kaloor', malayalamName: 'കലൂർ', lat: 9.9932, lng: 76.2936 },
    { id: 'town_hall', name: 'Town Hall', malayalamName: 'ടൗൺ ഹാൾ (ലിസ്സി)', lat: 9.9882, lng: 76.2879 },
    { id: 'mg_road', name: 'MG Road', malayalamName: 'എം.ജി റോഡ്', lat: 9.9798, lng: 76.2842 },
    { id: 'maharajas', name: 'Maharaja College', malayalamName: 'മഹാരാജാസ്', lat: 9.9715, lng: 76.2858 },
    { id: 'ernakulam_south', name: 'Ernakulam South', malayalamName: 'എറണാകുളം സൗത്ത്', lat: 9.9678, lng: 76.2892 },
    { id: 'kadavanthra', name: 'Kadavanthra', malayalamName: 'കടവന്ത്ര', lat: 9.9672, lng: 76.2982 },
    { id: 'elamkulam', name: 'Elamkulam', malayalamName: 'എളംകുളം', lat: 9.9677, lng: 76.3079 },
    { id: 'vyttila', name: 'Vyttila', malayalamName: 'വൈറ്റില ഹബ്ബ്', lat: 9.9673, lng: 76.3188 },
    { id: 'thykoodam', name: 'Thykoodam', malayalamName: 'തൈക്കൂടം', lat: 9.9575, lng: 76.3218 },
    { id: 'petta', name: 'Petta', malayalamName: 'പേട്ട', lat: 9.9515, lng: 76.3282 },
    { id: 'vadakkekotta', name: 'Vadakkekotta', malayalamName: 'വടക്കേക്കോട്ട', lat: 9.9492, lng: 76.3380 },
    { id: 'sn_junction', name: 'SN Junction', malayalamName: 'എസ്.എൻ ജംഗ്ഷൻ', lat: 9.9501, lng: 76.3456 },
    { id: 'thripunithura', name: 'Thripunithura', malayalamName: 'തൃപ്പൂണിത്തുറ', lat: 9.9518, lng: 76.3542 },
  ];

  private terrainEngine?: TerrainEngine;

  constructor(
    originLat: number,
    originLng: number,
    railwayGraph?: RailwayGraph,
    waterSystem?: WaterSystem,
    terrainEngine?: TerrainEngine
  ) {
    this.terrainEngine = terrainEngine;
    this.originLat = originLat;
    this.originLng = originLng;
    this.railwayGraph = railwayGraph;
    this.waterSystem = waterSystem;

    this.group = new THREE.Group();
    this.group.name = 'transit-system';

    this.metroRoadGroup = new THREE.Group();
    this.viaductGroup = new THREE.Group();
    this.stationsGroup = new THREE.Group();
    this.metroTrainGroup = new THREE.Group();
    this.railwayGroup = new THREE.Group();
    this.railwayTrainGroup = new THREE.Group();

    this.group.add(this.metroRoadGroup);
    this.group.add(this.viaductGroup);
    this.group.add(this.stationsGroup);
    this.group.add(this.metroTrainGroup);
    this.group.add(this.railwayGroup);
    this.group.add(this.railwayTrainGroup);

    // Road materials for Metro Corridor
    this.roadAsphaltMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    (this.roadAsphaltMat as any).isSharedMaterial = true;

    this.roadLaneDashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, depthWrite: false });
    (this.roadLaneDashMat as any).isSharedMaterial = true;

    this.medianIslandMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    (this.medianIslandMat as any).isSharedMaterial = true;

    this.medianCurbHazardMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    (this.medianCurbHazardMat as any).isSharedMaterial = true;

    this.roadSidewalkMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    (this.roadSidewalkMat as any).isSharedMaterial = true;

    // Initialize materials (tagged with isSharedMaterial to prevent disposal by disposeHierarchy)
    this.concretePillarMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 });
    (this.concretePillarMat as any).isSharedMaterial = true;

    this.viaductDeckMat = new THREE.MeshLambertMaterial({ color: 0xe7e5e4 });
    (this.viaductDeckMat as any).isSharedMaterial = true;

    this.parapetMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    (this.parapetMat as any).isSharedMaterial = true;

    this.railSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
    (this.railSteelMat as any).isSharedMaterial = true;

    this.metroBodyMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    (this.metroBodyMat as any).isSharedMaterial = true;

    this.metroCyanStripeMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
    (this.metroCyanStripeMat as any).isSharedMaterial = true;

    this.metroWindowMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    (this.metroWindowMat as any).isSharedMaterial = true;

    this.metroDoorMat = new THREE.MeshLambertMaterial({ color: 0x0891b2 });
    (this.metroDoorMat as any).isSharedMaterial = true;

    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    (this.headlightMat as any).isSharedMaterial = true;

    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    (this.taillightMat as any).isSharedMaterial = true;

    this.stationGlassMat = new THREE.MeshLambertMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.65 });
    (this.stationGlassMat as any).isSharedMaterial = true;

    this.platformMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    (this.platformMat as any).isSharedMaterial = true;

    this.fobSteelMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    (this.fobSteelMat as any).isSharedMaterial = true;

    this.fobRoofMat = new THREE.MeshLambertMaterial({ color: 0x0891b2 });
    (this.fobRoofMat as any).isSharedMaterial = true;

    this.concourseWallMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    (this.concourseWallMat as any).isSharedMaterial = true;

    // Railway materials
    this.trainLocoBlueMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    (this.trainLocoBlueMat as any).isSharedMaterial = true;

    this.trainCoachMat = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    (this.trainCoachMat as any).isSharedMaterial = true;

    this.trainYellowStripeMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    (this.trainYellowStripeMat as any).isSharedMaterial = true;

    this.sleeperWoodMat = new THREE.MeshLambertMaterial({ color: 0x713f12 });
    (this.sleeperWoodMat as any).isSharedMaterial = true;

    this.ballastGravelMat = new THREE.MeshLambertMaterial({ color: 0xa8a29e });
    (this.ballastGravelMat as any).isSharedMaterial = true;

    this.rebuildNetwork(originLat, originLng);
  }

  /**
   * Rebuilds transit system centered around the player's current location.
   */
  public rebuildNetwork(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;

    this.clear();

    // Check if player is near any point on the Kochi Metro Blue Line (< 35km)
    let minMetroDist = Infinity;
    for (const [lat, lng] of TransitSystem.BLUE_LINE_BASELINE) {
      const d = GeoCoords.distanceMeters(originLat, originLng, lat, lng);
      if (d < minMetroDist) minMetroDist = d;
    }

    if (minMetroDist < 35000) {
      // Build authentic Kochi Metro elevated flyover, pillars & stations from Blue Line geometry
      this.buildKochiMetroCorridor();
    }
  }

  /**
   * Chains raw disconnected MapLibre vector tile LineString segments into a single,
   * continuous, ordered polyline representing the authentic Blue Line geometry.
   */
  private chainLineSegments(segments: [number, number][][]): [number, number][] {
    if (segments.length === 0) return [];
    if (segments.length === 1) return segments[0];

    // Sort so northernmost segment starts first (Aluva -> Thripunithura orientation)
    const remaining = [...segments];
    remaining.sort((a, b) => b[0][1] - a[0][1]);

    const chained: [number, number][] = [...remaining.shift()!];

    let changed = true;
    while (changed && remaining.length > 0) {
      changed = false;
      const head = chained[0];
      const tail = chained[chained.length - 1];

      let bestIdx = -1;
      let attachTail = true;
      let reverse = false;
      let bestDist = 50.0; // max threshold in meters

      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        const s0 = seg[0];
        const s1 = seg[seg.length - 1];

        // Tail to start of seg
        const d1 = GeoCoords.distanceMeters(tail[1], tail[0], s0[1], s0[0]);
        if (d1 < bestDist) {
          bestDist = d1;
          bestIdx = i;
          attachTail = true;
          reverse = false;
        }

        // Tail to end of seg
        const d2 = GeoCoords.distanceMeters(tail[1], tail[0], s1[1], s1[0]);
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = i;
          attachTail = true;
          reverse = true;
        }

        // Head to end of seg
        const d3 = GeoCoords.distanceMeters(head[1], head[0], s1[1], s1[0]);
        if (d3 < bestDist) {
          bestDist = d3;
          bestIdx = i;
          attachTail = false;
          reverse = false;
        }

        // Head to start of seg
        const d4 = GeoCoords.distanceMeters(head[1], head[0], s0[1], s0[0]);
        if (d4 < bestDist) {
          bestDist = d4;
          bestIdx = i;
          attachTail = false;
          reverse = true;
        }
      }

      if (bestIdx !== -1) {
        let seg = remaining.splice(bestIdx, 1)[0];
        if (reverse) seg.reverse();

        if (attachTail) {
          chained.push(...seg.slice(1));
        } else {
          chained.unshift(...seg.slice(0, seg.length - 1));
        }
        changed = true;
      }
    }

    return chained;
  }

  /**
   * Synchronizes metro alignment directly from rendered MapLibre vector features.
   * Extracts the exact Blue Line geometry rendered from OpenMapTiles `railway-transit` layer,
   * chains the segments into a seamless path, and re-attaches stations to that exact path.
   */
  public syncFromMap(map: any) {
    if (!map) return;
    try {
      const features = map.queryRenderedFeatures({ layers: ['railway-transit'] }) || [];
      if (!features || features.length === 0) return;

      const segments: [number, number][][] = [];
      for (const feat of features) {
        if (!feat.geometry) continue;
        const geom = feat.geometry;
        if (geom.type === 'LineString') {
          segments.push(geom.coordinates as [number, number][]);
        } else if (geom.type === 'MultiLineString') {
          for (const line of geom.coordinates) {
            segments.push(line as [number, number][]);
          }
        }
      }

      if (segments.length === 0) return;

      // Chain segments into a continuous line
      const chainedCoords = this.chainLineSegments(segments);
      if (chainedCoords.length < 2) return;

      const VIADUCT_HEIGHT = 7.2;
      const newWaypoints: THREE.Vector3[] = [];
      for (const [lng, lat] of chainedCoords) {
        const { x, z } = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
        if (Math.hypot(x, z) <= 3200) {
          newWaypoints.push(new THREE.Vector3(x, VIADUCT_HEIGHT, z));
        }
      }

      if (newWaypoints.length < 2) return;

      // Check if the new vector tile waypoints differ meaningfully from current waypoints
      let maxDelta = 0;
      if (this.metroWaypoints.length === newWaypoints.length) {
        for (let i = 0; i < newWaypoints.length; i++) {
          const d = this.metroWaypoints[i].distanceTo(newWaypoints[i]);
          if (d > maxDelta) maxDelta = d;
        }
        if (maxDelta < 0.5) return; // already in sync!
      }

      this.metroWaypoints = newWaypoints;
      this.attachStationsToBlueLine();

      this.hideMapBuildingsNearMetro(map);

      disposeHierarchy(this.metroRoadGroup);
      disposeHierarchy(this.viaductGroup);
      disposeHierarchy(this.stationsGroup);
      this.metroRoadGroup.clear();
      this.viaductGroup.clear();
      this.stationsGroup.clear();

      this.generateMetroRoadCorridor();
      this.generateViaductMesh();
      this.buildMetroStations();
    } catch (_err) {}
  }

  /**
   * Constructs the authentic elevated concrete viaduct (flyover) along the road median.
   * BLUE LINE = THE METRO ALIGNMENT.
   * Pillars are placed at Y = 0 in the central road median.
   * Stations attach to this exact existing geometry.
   */
  private buildKochiMetroCorridor() {
    this.metroWaypoints = [];
    this.metroStations = [];

    // 1. Build alignment from the Blue Line baseline coordinates within active radius
    const VIADUCT_HEIGHT = 7.2;
    const activePoints: THREE.Vector3[] = [];

    for (const [lat, lng] of TransitSystem.BLUE_LINE_BASELINE) {
      const { x, z } = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
      const distFromPlayer = Math.hypot(x, z);
      if (distFromPlayer <= 3200) {
        activePoints.push(new THREE.Vector3(x, VIADUCT_HEIGHT, z));
      }
    }

    if (activePoints.length < 3) {
      let closestIdx = 0;
      let closestD = Infinity;
      for (let i = 0; i < TransitSystem.BLUE_LINE_BASELINE.length; i++) {
        const [lat, lng] = TransitSystem.BLUE_LINE_BASELINE[i];
        const d = GeoCoords.distanceMeters(this.originLat, this.originLng, lat, lng);
        if (d < closestD) {
          closestD = d;
          closestIdx = i;
        }
      }
      const startIdx = Math.max(0, closestIdx - 5);
      const endIdx = Math.min(TransitSystem.BLUE_LINE_BASELINE.length, closestIdx + 6);
      activePoints.length = 0;
      for (let i = startIdx; i < endIdx; i++) {
        const [lat, lng] = TransitSystem.BLUE_LINE_BASELINE[i];
        const { x, z } = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
        activePoints.push(new THREE.Vector3(x, VIADUCT_HEIGHT, z));
      }
    }

    if (activePoints.length < 2) return;

    this.metroWaypoints = activePoints;

    // 2. Attach stations to this exact Blue Line geometry
    this.attachStationsToBlueLine();

    // 3. Generate ground 4-lane divided road with central raised median
    this.generateMetroRoadCorridor();

    // 4. Generate elevated viaduct deck and road median pillars along the Blue Line
    this.generateViaductMesh();

    // 5. Build realistic compact stations attached to the viaduct
    this.buildMetroStations();

    // 6. Place 3-coach train on the viaduct
    this.spawnMetroTrain();
  }

  /**
   * Attaches official Metro stations to the existing Blue Line geometry.
   * Stations DO NOT define the route; they are projected onto the exact segment of the Blue Line.
   */
  private attachStationsToBlueLine() {
    this.metroStations = [];
    if (this.metroWaypoints.length < 2) return;

    for (const info of TransitSystem.KOCHI_METRO_STATIONS) {
      const { x: stX, z: stZ } = GeoCoords.toLocalMeters(info.lat, info.lng, this.originLat, this.originLng);
      const distFromPlayer = Math.hypot(stX, stZ);
      if (distFromPlayer > 3200) continue;

      // Project station onto the nearest segment of the Blue Line viaduct geometry
      let bestDist = Infinity;
      let bestPoint: THREE.Vector3 | null = null;
      let bestDir: THREE.Vector3 | null = null;

      for (let i = 0; i < this.metroWaypoints.length - 1; i++) {
        const p1 = this.metroWaypoints[i];
        const p2 = this.metroWaypoints[i + 1];
        const segVec = new THREE.Vector3().subVectors(p2, p1);
        const segLenSq = segVec.x * segVec.x + segVec.z * segVec.z;
        if (segLenSq < 0.1) continue;

        const toSt = new THREE.Vector3(stX - p1.x, 0, stZ - p1.z);
        const dot = (toSt.x * segVec.x + toSt.z * segVec.z) / segLenSq;
        const t = Math.max(0, Math.min(1, dot));

        const proj = new THREE.Vector3(
          p1.x + segVec.x * t,
          7.2,
          p1.z + segVec.z * t
        );

        const d = Math.hypot(stX - proj.x, stZ - proj.z);
        if (d < bestDist) {
          bestDist = d;
          bestPoint = proj;
          bestDir = new THREE.Vector3(segVec.x, 0, segVec.z).normalize();
        }
      }

      // If station is near the corridor (< 120m), attach it to this exact point on the viaduct!
      if (bestPoint && bestDir && bestDist < 120.0) {
        this.metroStations.push({
          id: info.id,
          name: info.name,
          malayalamName: info.malayalamName,
          lat: info.lat,
          lng: info.lng,
          x: bestPoint.x,
          z: bestPoint.z,
          dir: bestDir,
        });
      }
    }
  }

  /**
   * Generates ONLY the sleek Central Raised Median Divider along the road center.
   * - No extra custom asphalt slabs or side elements: the map's own smooth road remains visible underneath!
   * - Metro pillars rise cleanly out of this central median divider.
   */
  private generateMetroRoadCorridor() {
    if (this.metroWaypoints.length < 2) return;

    const medianWidth = 2.4;
    const medianHeight = 0.20;
    const roadElevation = 0.02;

    for (let i = 0; i < this.metroWaypoints.length - 1; i++) {
      const p1 = this.metroWaypoints[i];
      const p2 = this.metroWaypoints[i + 1];
      const segLen = p1.distanceTo(p2);
      if (segLen < 1.0) continue;

      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const mid = new THREE.Vector3((p1.x + p2.x) * 0.5, roadElevation, (p1.z + p2.z) * 0.5);

      const sliceGroup = new THREE.Group();
      sliceGroup.position.copy(mid);
      sliceGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

      // CENTRAL RAISED MEDIAN DIVIDER (Width 2.4m, Height 0.20m)
      const medianGeo = new THREE.BoxGeometry(medianWidth, medianHeight, segLen);
      const medianMesh = new THREE.Mesh(medianGeo, this.medianIslandMat);
      medianMesh.position.set(0, medianHeight * 0.5, 0);
      sliceGroup.add(medianMesh);

      // Clean curb trims along left and right of the divider
      const curbGeo = new THREE.BoxGeometry(0.16, medianHeight + 0.02, segLen);
      const leftMedCurb = new THREE.Mesh(curbGeo, this.medianCurbHazardMat);
      leftMedCurb.position.set(-medianWidth * 0.5 + 0.08, (medianHeight + 0.02) * 0.5, 0);
      sliceGroup.add(leftMedCurb);

      const rightMedCurb = new THREE.Mesh(curbGeo, this.medianCurbHazardMat);
      rightMedCurb.position.set(medianWidth * 0.5 - 0.08, (medianHeight + 0.02) * 0.5, 0);
      sliceGroup.add(rightMedCurb);

      this.metroRoadGroup.add(sliceGroup);
    }
  }

  /**
   * Generates continuous elevated U-girder viaduct deck, parapet crash walls,
   * dual steel rails, and cylindrical support pillars standing strictly inside the central median.
   */
  private generateViaductMesh() {
    if (this.metroWaypoints.length < 2) return;

    this.totalTrackLength = 0;
    const deckWidth = 6.6;
    const deckThickness = 0.85;

    for (let i = 0; i < this.metroWaypoints.length - 1; i++) {
      const p1 = this.metroWaypoints[i];
      const p2 = this.metroWaypoints[i + 1];
      const segLen = p1.distanceTo(p2);
      if (segLen < 1.0) continue;

      this.totalTrackLength += segLen;

      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      // Pre-stressed Concrete Viaduct Deck Slab
      const deckGeo = new THREE.BoxGeometry(deckWidth, deckThickness, segLen);
      const deckMesh = new THREE.Mesh(deckGeo, this.viaductDeckMat);
      deckMesh.position.copy(mid);
      deckMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      this.viaductGroup.add(deckMesh);

      // Left and Right safety crash parapets
      const parapetGeo = new THREE.BoxGeometry(0.35, 1.1, segLen);
      const leftParapet = new THREE.Mesh(parapetGeo, this.parapetMat);
      leftParapet.position.set(-deckWidth * 0.5 + 0.18, 0.7, 0);
      deckMesh.add(leftParapet);

      const rightParapet = new THREE.Mesh(parapetGeo, this.parapetMat);
      rightParapet.position.set(deckWidth * 0.5 - 0.18, 0.7, 0);
      deckMesh.add(rightParapet);

      // Dual Steel Rails (Track 1 & Track 2 for standard gauge 1.435m)
      const railGeo = new THREE.BoxGeometry(0.12, 0.16, segLen);
      const r1 = new THREE.Mesh(railGeo, this.railSteelMat);
      r1.position.set(-2.0, 0.48, 0);
      deckMesh.add(r1);

      const r2 = new THREE.Mesh(railGeo, this.railSteelMat);
      r2.position.set(-0.6, 0.48, 0);
      deckMesh.add(r2);

      const r3 = new THREE.Mesh(railGeo, this.railSteelMat);
      r3.position.set(0.6, 0.48, 0);
      deckMesh.add(r3);

      const r4 = new THREE.Mesh(railGeo, this.railSteelMat);
      r4.position.set(2.0, 0.48, 0);
      deckMesh.add(r4);

      // Concrete Support Pillars (Piers) standing strictly inside the central road median every ~26m
      const pillarSpacing = 26.0;
      const numPillars = Math.max(1, Math.round(segLen / pillarSpacing));

      for (let j = 0; j < numPillars; j++) {
        const t = (j + 0.5) / numPillars;
        const pillarPos = new THREE.Vector3().lerpVectors(p1, p2, t);

        // Ground level is Y = 0 (the road surface). Pillar height is pillarPos.y - 0.5
        const pillarHeight = pillarPos.y - 0.5;
        // Diameter 1.4m (radius 0.7m) strictly confined within 2.8m median divider
        const pierRadius = 0.7;

        // Cylindrical concrete pier
        const pierGeo = new THREE.CylinderGeometry(pierRadius, pierRadius * 1.1, pillarHeight, 16);
        const pierMesh = new THREE.Mesh(pierGeo, this.concretePillarMat);
        pierMesh.position.set(pillarPos.x, pillarHeight * 0.5, pillarPos.z);
        pierMesh.castShadow = true;
        this.viaductGroup.add(pierMesh);

        // Pier Cap (Hammerhead bracket cross-beam at the top)
        const capGeo = new THREE.BoxGeometry(5.6, 0.75, 2.0);
        const capMesh = new THREE.Mesh(capGeo, this.concretePillarMat);
        capMesh.position.set(pillarPos.x, pillarHeight + 0.35, pillarPos.z);
        capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.viaductGroup.add(capMesh);
      }
    }
  }

  /**
   * Builds authentic, compact Kochi Metro stations:
   * 1. Compact Island Platform elevated at Y = 7.2m (width 7.6m, length 42m)
   * 2. Full road clearance underneath: 4-lane traffic passes freely underneath the station!
   * 3. Single, realistic roadside entrance concourse & staircase tower on the sidewalk.
   * 4. Covered Foot Overbridge (skywalk) connecting elevated concourse to roadside entry.
   * 5. Bilingual Kochi Metro signboards ("പാലാരിവട്ടം / PALARIVATTOM").
   */
  private buildMetroStations() {
    for (const st of this.metroStations) {
      if (st.x === undefined || st.z === undefined) continue;

      const stationGroup = new THREE.Group();
      stationGroup.position.set(st.x, 7.2, st.z);

      if (st.dir) {
        stationGroup.rotation.y = Math.atan2(st.dir.x, st.dir.z);
      }

      const stLen = 42.0; // Compact realistic station length
      const stWidth = 7.6; // Compact island platform width
      const stHeight = 5.4;

      // 1. Central Island Platform Slab (elevated above road median at Y = 7.2m)
      const platformFloorGeo = new THREE.BoxGeometry(stWidth, 0.45, stLen);
      const platformFloorMesh = new THREE.Mesh(platformFloorGeo, this.viaductDeckMat);
      stationGroup.add(platformFloorMesh);

      // Yellow tactile edge warning tiles
      const warnGeo = new THREE.BoxGeometry(0.3, 0.08, stLen);
      const wLeft = new THREE.Mesh(warnGeo, this.platformMat);
      wLeft.position.set(-stWidth * 0.5 + 0.2, 0.25, 0);
      stationGroup.add(wLeft);

      const wRight = new THREE.Mesh(warnGeo, this.platformMat);
      wRight.position.set(stWidth * 0.5 - 0.2, 0.25, 0);
      stationGroup.add(wRight);

      // Platform Screen Doors (Glass & steel railings)
      const psdGeo = new THREE.BoxGeometry(0.1, 1.35, stLen * 0.88);
      const psdLeft = new THREE.Mesh(psdGeo, this.stationGlassMat);
      psdLeft.position.set(-stWidth * 0.5 + 0.35, 0.9, 0);
      stationGroup.add(psdLeft);

      const psdRight = new THREE.Mesh(psdGeo, this.stationGlassMat);
      psdRight.position.set(stWidth * 0.5 - 0.35, 0.9, 0);
      stationGroup.add(psdRight);

      // 2. Iconic Kochi Metro Curved Arched Canopy Roof (Cyan & Glass)
      const roofRadius = stWidth * 0.6;
      const roofGeo = new THREE.CylinderGeometry(roofRadius, roofRadius, stLen, 16, 1, false, 0, Math.PI);
      roofGeo.rotateZ(Math.PI / 2);
      roofGeo.rotateY(Math.PI / 2);
      const roofMesh = new THREE.Mesh(roofGeo, this.stationGlassMat);
      roofMesh.position.set(0, stHeight * 0.82, 0);
      stationGroup.add(roofMesh);

      // Signature Turquoise Arches at front and back of station
      const archGeo = new THREE.TorusGeometry(roofRadius * 0.98, 0.32, 8, 16, Math.PI);
      archGeo.rotateZ(Math.PI);

      const archFront = new THREE.Mesh(archGeo, this.metroCyanStripeMat);
      archFront.position.set(0, stHeight * 0.82, stLen * 0.5);
      stationGroup.add(archFront);

      const archBack = new THREE.Mesh(archGeo, this.metroCyanStripeMat);
      archBack.position.set(0, stHeight * 0.82, -stLen * 0.5);
      stationGroup.add(archBack);

      // 3. Elevated Portal Frame Support Pillars (grounded strictly in central median at Y = 0)
      [-14.0, 0, 14.0].forEach((zOff) => {
        const framePillarGeo = new THREE.CylinderGeometry(0.65, 0.75, 7.2, 12);
        const framePillar = new THREE.Mesh(framePillarGeo, this.concretePillarMat);
        framePillar.position.set(0, -3.6, zOff);
        stationGroup.add(framePillar);

        const portalCrossGeo = new THREE.BoxGeometry(stWidth + 0.8, 0.65, 1.8);
        const portalCross = new THREE.Mesh(portalCrossGeo, this.concretePillarMat);
        portalCross.position.set(0, -0.25, zOff);
        stationGroup.add(portalCross);
      });

      // 4. Authentic elevated station structure:
      // The station is elevated at Y = 7.2m with median pillars only.
      // Ground road below is 100% free of any structures or blocks!


      // 6. Bilingual Station Signboard ("പാലാരിവട്ടം / PALARIVATTOM")
      const signTexture = this.createStationSignTexture(st.malayalamName, st.name);
      if (signTexture) {
        const signMat = new THREE.MeshBasicMaterial({ map: signTexture });
        const signGeo = new THREE.PlaneGeometry(5.4, 1.4);

        const signFront = new THREE.Mesh(signGeo, signMat);
        signFront.position.set(0, 3.4, stLen * 0.5 + 0.1);
        stationGroup.add(signFront);

        const signBack = new THREE.Mesh(signGeo, signMat);
        signBack.position.set(0, 3.4, -stLen * 0.5 - 0.1);
        signBack.rotation.y = Math.PI;
        stationGroup.add(signBack);
      }

      this.stationsGroup.add(stationGroup);
    }
  }

  /**
   * Checks whether a 2D local coordinate (x, z) is along the Metro corridor.
   */
  public isNearMetroCorridor(x: number, z: number, threshold = 14.0): boolean {
    if (this.metroWaypoints.length < 2) return false;
    for (let i = 0; i < this.metroWaypoints.length - 1; i++) {
      const p1 = this.metroWaypoints[i];
      const p2 = this.metroWaypoints[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 0.1) continue;

      const dot = ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq;
      const t = Math.max(0, Math.min(1, dot));
      const px = p1.x + t * dx;
      const pz = p1.z + t * dz;
      if (Math.hypot(x - px, z - pz) <= threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Hides any generic 3D building boxes from MapLibre that overlap with Kochi Metro stations.
   */
  public hideMapBuildingsNearMetro(map: any) {
    if (!map) return;
    try {
      const features = map.queryRenderedFeatures({ layers: ['3d-buildings'] }) || [];
      for (const feat of features) {
        if (!feat.geometry) continue;
        let coords: [number, number] | null = null;
        if (feat.geometry.type === 'Point') {
          coords = feat.geometry.coordinates;
        } else if (feat.geometry.type === 'Polygon' && feat.geometry.coordinates?.[0]?.[0]) {
          coords = feat.geometry.coordinates[0][0];
        } else if (feat.geometry.type === 'MultiPolygon' && feat.geometry.coordinates?.[0]?.[0]?.[0]) {
          coords = feat.geometry.coordinates[0][0][0];
        }
        if (!coords) continue;
        const [lng, lat] = coords;
        for (const st of TransitSystem.KOCHI_METRO_STATIONS) {
          if (GeoCoords.distanceMeters(lat, lng, st.lat, st.lng) < 65.0) {
            if (feat.id != null) {
              map.setFeatureState(
                { source: 'openmaptiles', sourceLayer: 'building', id: feat.id },
                { hidden: true }
              );
            }
          }
        }
      }
    } catch (_err) {}
  }

  /**
   * Helper: Generates a crisp Canvas Texture with Kochi Metro cyan styling and bilingual text.
   */
  private createStationSignTexture(mlName: string, enName: string): THREE.Texture | null {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Kochi Metro signature cyan background
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(0, 0, 512, 128);

      // Clean white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 116);

      // Station icon & text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(mlName, 256, 50);

      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(enName.toUpperCase(), 256, 95);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    } catch (_err) {
      return null;
    }
  }

  /**
   * Spawns an authentic 3-coach Kochi Metro train (Alstom Metropolis in white & cyan livery).
   */
  private spawnMetroTrain() {
    disposeHierarchy(this.metroTrainGroup);
    this.metroTrainGroup.clear();

    const carLength = 11.2;
    const carWidth = 2.8;
    const carHeight = 2.9;

    // 3 Coaches: Cab A (Front) -> Trailer (Middle) -> Cab B (Rear)
    const cars = [-1, 0, 1];

    for (const offset of cars) {
      const carGroup = new THREE.Group();
      carGroup.position.z = offset * (carLength + 0.4);

      // 1. Aerodynamic White Car Body
      const bodyGeo = new THREE.BoxGeometry(carWidth, carHeight, carLength);
      const bodyMesh = new THREE.Mesh(bodyGeo, this.metroBodyMat);
      bodyMesh.position.y = carHeight * 0.5 + 0.3;
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      // 2. Turquoise Cyan Kochi Metro Livery Stripe
      const stripeGeo = new THREE.BoxGeometry(carWidth + 0.05, 0.48, carLength + 0.05);
      const stripeMesh = new THREE.Mesh(stripeGeo, this.metroCyanStripeMat);
      stripeMesh.position.y = carHeight * 0.55;
      carGroup.add(stripeMesh);

      // 3. Tinted Passenger Windows along sides
      const numWindows = 4;
      for (let w = 0; w < numWindows; w++) {
        const wz = (w - (numWindows - 1) / 2) * 2.2;
        const winGeo = new THREE.BoxGeometry(carWidth + 0.08, 0.9, 1.4);
        const winMesh = new THREE.Mesh(winGeo, this.metroWindowMat);
        winMesh.position.set(0, carHeight * 0.65, wz);
        carGroup.add(winMesh);
      }

      // 4. Passenger Automated Sliding Doors
      const doorGeo = new THREE.BoxGeometry(carWidth + 0.09, 1.8, 1.1);
      const doorMesh = new THREE.Mesh(doorGeo, this.metroDoorMat);
      doorMesh.position.set(0, carHeight * 0.4, 0);
      carGroup.add(doorMesh);

      // 5. Front/Rear Cabs with Headlights / Taillights
      if (offset === -1 || offset === 1) {
        const isFront = offset === 1;
        const noseZ = isFront ? carLength * 0.5 + 0.05 : -carLength * 0.5 - 0.05;

        // Front Windshield
        const windGeo = new THREE.BoxGeometry(carWidth * 0.82, 1.1, 0.1);
        const windMesh = new THREE.Mesh(windGeo, this.metroWindowMat);
        windMesh.position.set(0, carHeight * 0.65, noseZ);
        carGroup.add(windMesh);

        // LED Headlights
        const lightMat = isFront ? this.headlightMat : this.taillightMat;
        const lightGeo = new THREE.BoxGeometry(0.3, 0.15, 0.12);

        const l1 = new THREE.Mesh(lightGeo, lightMat);
        l1.position.set(-0.8, carHeight * 0.28, noseZ);
        carGroup.add(l1);

        const l2 = new THREE.Mesh(lightGeo, lightMat);
        l2.position.set(0.8, carHeight * 0.28, noseZ);
        carGroup.add(l2);
      }

      this.metroTrainGroup.add(carGroup);
    }

    this.currentTrackDistance = 0;
    this.isAtStation = false;
    this.targetStationIndex = 0;
  }

  /**
   * Builds an Indian Railways railway line with steel rails, wooden sleepers,
   * ballast gravel bed, and an animated classic passenger train.
   */
  public rebuildIndianRailwaysLine() {
    disposeHierarchy(this.railwayGroup);
    disposeHierarchy(this.railwayTrainGroup);
    this.railwayGroup.clear();
    this.railwayTrainGroup.clear();
    this.railwayWaypoints = [];
    this.railwayActive = false;

    if (!this.railwayGraph || this.railwayGraph.continuousTracks.length === 0) return;

    let longestTrack = this.railwayGraph.continuousTracks[0];
    for (const track of this.railwayGraph.continuousTracks) {
      if (track.totalLength > longestTrack.totalLength) {
        longestTrack = track;
      }
    }

    const waypoints = [];
    for (const tp of longestTrack.points) {
      let y = this.terrainEngine ? this.terrainEngine.getElevation(tp.x, tp.z) + 0.35 : 0.35;
      if (tp.isBridge) {
        y = Math.max(y, (this.terrainEngine ? this.terrainEngine.getElevation(tp.x, tp.z) : 0) + 6.2);
      }
      waypoints.push(new THREE.Vector3(tp.x, y, tp.z));
    }

    this.railwayWaypoints = waypoints;
    this.railwayTrackLength = longestTrack.totalLength;
    this.railwayActive = true;

    this.buildRailwayTracks(this.railwayWaypoints);
    this.spawnIndianRailwaysTrain();
  }

  /**
   * Spawns Indian Railways Train (WAP-7 Engine + 3 Passenger Coaches).
   */
  private buildRailwayTracks(points: THREE.Vector3[]) {
    if (points.length < 2) return;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segLen = p1.distanceTo(p2);
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      const isOverWater = p1.y > 1.0 || p2.y > 1.0 || (this.waterSystem && this.waterSystem.isPointInWater(mid.x, mid.z, 6.0));

      if (isOverWater) {
        // Heavy steel/concrete girder bridge deck
        const girderGeo = new THREE.BoxGeometry(5.6, 1.2, segLen);
        const girderMesh = new THREE.Mesh(girderGeo, this.viaductDeckMat);
        girderMesh.position.copy(mid);
        girderMesh.position.y -= 0.6;
        girderMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.railwayGroup.add(girderMesh);

        // Steel truss / side safety railings on the bridge
        const railGuardGeo = new THREE.BoxGeometry(0.3, 1.4, segLen);
        const leftGuard = new THREE.Mesh(railGuardGeo, this.parapetMat);
        leftGuard.position.set(-2.6, 0.7, 0);
        girderMesh.add(leftGuard);

        const rightGuard = new THREE.Mesh(railGuardGeo, this.parapetMat);
        rightGuard.position.set(2.6, 0.7, 0);
        girderMesh.add(rightGuard);

        // Solid concrete bridge pier pillars descending into the riverbed
        const numPiers = Math.max(1, Math.floor(segLen / 16.0));
        const pierGeo = new THREE.CylinderGeometry(0.65, 0.75, 8.0, 12);
        for (let p = 0; p < numPiers; p++) {
          const pier = new THREE.Mesh(pierGeo, this.concretePillarMat);
          const pz = -segLen * 0.4 + (p / Math.max(1, numPiers - 1)) * (segLen * 0.8);
          pier.position.set(0, -4.6, pz);
          girderMesh.add(pier);
        }

        // Wooden/concrete railway sleepers on bridge deck
        const numSleepers = Math.floor(segLen / 1.6);
        for (let s = 0; s < numSleepers; s++) {
          const sleeperGeo = new THREE.BoxGeometry(3.2, 0.16, 0.35);
          const sleeperMesh = new THREE.Mesh(sleeperGeo, this.sleeperWoodMat);
          sleeperMesh.position.set(0, 0.68, (s - numSleepers / 2) * 1.6);
          girderMesh.add(sleeperMesh);
        }

        // Continuous steel rails mounted on bridge
        const railGeo = new THREE.BoxGeometry(0.12, 0.18, segLen);
        const railLeft = new THREE.Mesh(railGeo, this.railSteelMat);
        railLeft.position.set(-0.85, 0.82, 0);
        girderMesh.add(railLeft);

        const railRight = new THREE.Mesh(railGeo, this.railSteelMat);
        railRight.position.set(0.85, 0.82, 0);
        girderMesh.add(railRight);
      } else {
        const ballastGeo = new THREE.BoxGeometry(4.2, 0.28, segLen);
        const ballastMesh = new THREE.Mesh(ballastGeo, this.ballastGravelMat);
        ballastMesh.position.copy(mid);
        ballastMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.railwayGroup.add(ballastMesh);

        const numSleepers = Math.floor(segLen / 1.6);
        for (let s = 0; s < numSleepers; s++) {
          const sleeperGeo = new THREE.BoxGeometry(3.2, 0.16, 0.35);
          const sleeperMesh = new THREE.Mesh(sleeperGeo, this.sleeperWoodMat);
          sleeperMesh.position.set(0, 0.18, (s - numSleepers / 2) * 1.6);
          ballastMesh.add(sleeperMesh);
        }

        const railGeo = new THREE.BoxGeometry(0.12, 0.18, segLen);
        const railLeft = new THREE.Mesh(railGeo, this.railSteelMat);
        railLeft.position.set(-0.85, 0.32, 0);
        ballastMesh.add(railLeft);

        const railRight = new THREE.Mesh(railGeo, this.railSteelMat);
        railRight.position.set(0.85, 0.32, 0);
        ballastMesh.add(railRight);
      }
    }
  }

  private spawnIndianRailwaysTrain() {
    disposeHierarchy(this.railwayTrainGroup);
    this.railwayTrainGroup.clear();

    const coachLen = 13.5;
    const coachWidth = 3.1;
    const coachHeight = 3.4;

    for (let c = 0; c < 4; c++) {
      const vehicleGroup = new THREE.Group();
      vehicleGroup.position.z = c * (coachLen + 0.6);

      const isLoco = c === 0;
      const bodyMat = isLoco ? this.trainLocoBlueMat : this.trainCoachMat;

      const bodyGeo = new THREE.BoxGeometry(coachWidth, coachHeight, coachLen);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = coachHeight * 0.5 + 0.4;
      bodyMesh.castShadow = true;
      vehicleGroup.add(bodyMesh);

      const bandGeo = new THREE.BoxGeometry(coachWidth + 0.05, 0.35, coachLen + 0.05);
      const bandMesh = new THREE.Mesh(bandGeo, this.trainYellowStripeMat);
      bandMesh.position.y = coachHeight * 0.6;
      vehicleGroup.add(bandMesh);

      if (isLoco) {
        const cabWinGeo = new THREE.BoxGeometry(coachWidth * 0.8, 0.9, 0.1);
        const cabWin = new THREE.Mesh(cabWinGeo, this.metroWindowMat);
        cabWin.position.set(0, coachHeight * 0.65, -coachLen * 0.5 - 0.05);
        vehicleGroup.add(cabWin);

        const locoLightGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
        locoLightGeo.rotateX(Math.PI / 2);
        const locoLight = new THREE.Mesh(locoLightGeo, this.headlightMat);
        locoLight.position.set(0, coachHeight * 0.4, -coachLen * 0.5 - 0.1);
        vehicleGroup.add(locoLight);
      } else {
        const numW = 6;
        for (let w = 0; w < numW; w++) {
          const wz = (w - (numW - 1) / 2) * 2.0;
          const winGeo = new THREE.BoxGeometry(coachWidth + 0.08, 0.75, 1.2);
          const winMesh = new THREE.Mesh(winGeo, this.metroWindowMat);
          winMesh.position.set(0, coachHeight * 0.65, wz);
          vehicleGroup.add(winMesh);
        }
      }

      this.railwayTrainGroup.add(vehicleGroup);
    }

    this.railwayTrainDistance = 0;
  }

  /**
   * Main per-frame simulation update.
   */
  public update(delta: number) {
    if (this.metroWaypoints.length >= 2) {
      this.updateKochiMetro(delta);
    }
    if (this.railwayActive && this.railwayWaypoints.length >= 2) {
      this.updateIndianRailways(delta);
    }
  }

  private updateKochiMetro(delta: number) {
    if (this.isAtStation) {
      this.stationDwellTimer -= delta;
      if (this.stationDwellTimer <= 0) {
        this.isAtStation = false;
        if (this.metroDirection > 0) {
          this.targetStationIndex = Math.min(this.metroStations.length - 1, this.targetStationIndex + 1);
        } else {
          this.targetStationIndex = Math.max(0, this.targetStationIndex - 1);
        }
      }
    } else {
      const moveDist = this.metroSpeed * delta * this.metroDirection;
      this.currentTrackDistance += moveDist;

      if (this.currentTrackDistance >= this.totalTrackLength) {
        this.currentTrackDistance = this.totalTrackLength;
        this.metroDirection = -1;
      } else if (this.currentTrackDistance <= 0) {
        this.currentTrackDistance = 0;
        this.metroDirection = 1;
      }

      // Check if train is near target station platform
      if (this.targetStationIndex >= 0 && this.targetStationIndex < this.metroStations.length) {
        const targetSt = this.metroStations[this.targetStationIndex];
        if (targetSt.x !== undefined && targetSt.z !== undefined) {
          const trainPos = this.metroTrainGroup.position;
          const distToStation = Math.hypot(trainPos.x - targetSt.x, trainPos.z - targetSt.z);
          if (distToStation < 15.0) {
            this.isAtStation = true;
            this.stationDwellTimer = 3.5;
          }
        }
      }
    }

    // Interpolate train position along viaduct waypoints
    const trainTransform = this.getPointAlongPath(this.metroWaypoints, this.currentTrackDistance);
    if (trainTransform) {
      this.metroTrainGroup.position.copy(trainTransform.position);
      if (this.metroDirection > 0) {
        this.metroTrainGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), trainTransform.tangent);
      } else {
        this.metroTrainGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), trainTransform.tangent);
      }
    }
  }

  private updateIndianRailways(delta: number) {
    this.railwayTrainDistance += this.railwaySpeed * delta;
    if (this.railwayTrainDistance >= this.railwayTrackLength) {
      this.railwayTrainDistance = 0;
    }

    const rwTransform = this.getPointAlongPath(this.railwayWaypoints, this.railwayTrainDistance);
    if (rwTransform) {
      this.railwayTrainGroup.position.copy(rwTransform.position);
      this.railwayTrainGroup.position.y += 0.35;
      this.railwayTrainGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), rwTransform.tangent);

      const rockAngle = Math.sin(this.railwayTrainDistance * 0.12) * 0.015;
      this.railwayTrainGroup.rotation.z += rockAngle;
    }
  }

  private getPointAlongPath(
    points: THREE.Vector3[],
    dist: number
  ): { position: THREE.Vector3; tangent: THREE.Vector3 } | null {
    if (points.length < 2) return null;

    let accumulated = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segLen = p1.distanceTo(p2);

      if (accumulated + segLen >= dist || i === points.length - 2) {
        const segDist = Math.max(0, Math.min(segLen, dist - accumulated));
        const t = segDist / segLen;
        const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
        const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
        return { position: pos, tangent };
      }
      accumulated += segLen;
    }

    return null;
  }

  public clear() {
    disposeHierarchy(this.metroRoadGroup);
    disposeHierarchy(this.viaductGroup);
    disposeHierarchy(this.stationsGroup);
    disposeHierarchy(this.metroTrainGroup);
    disposeHierarchy(this.railwayGroup);
    disposeHierarchy(this.railwayTrainGroup);
    this.metroRoadGroup.clear();
    this.viaductGroup.clear();
    this.stationsGroup.clear();
    this.metroTrainGroup.clear();
    this.railwayGroup.clear();
    this.railwayTrainGroup.clear();
  }

  public destroy() {
    this.clear();
  }
}
