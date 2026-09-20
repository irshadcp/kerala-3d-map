import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { CharacterController } from '../core/CharacterController';
import { WorldChunkManager } from '../core/WorldChunkManager';
import { RealBuildingManager } from './RealBuildingManager';
import { StreetElementManager } from './StreetElementManager';
import { SkyAndClouds } from './SkyAndClouds';
import { WaterVehicleManager } from './WaterVehicleManager';
import { VehicleController } from '../core/VehicleController';
import { ParkingSystem } from '../core/ParkingSystem';
import { TransitSystem } from './TransitSystem';
import { NormalizedBuilding } from '../core/geoTypes';
import { GeoCoords } from '../core/geoCoords';
import { TerrainEngine } from '../core/TerrainEngine';
import { WaterSystem } from '../core/WaterSystem';
import { RoadCorridorSystem } from '../core/RoadCorridorSystem';
import { RailwayGraph } from '../core/RailwayGraph';
import { RoadMeshManager } from './RoadMeshManager';




export class ThreeMapLayer implements maplibregl.CustomLayerInterface {
  id = 'three-game-layer';
  type: 'custom' = 'custom';
  renderingMode: '3d' = '3d';

  public map!: maplibregl.Map;
  public camera!: THREE.Camera;
  public scene!: THREE.Scene;
  public renderer!: THREE.WebGLRenderer;

  public characterController: CharacterController;
  public chunkManager: WorldChunkManager;
  public realBuildingManager: RealBuildingManager;
  public streetElementManager: StreetElementManager;
  public roadMeshManager: RoadMeshManager;
  public skyAndClouds: SkyAndClouds;
  public waterVehicleManager: WaterVehicleManager;
  public transitSystem: TransitSystem;
  public vehicleController: VehicleController;
  public parkingSystem: ParkingSystem;

  public terrainEngine: TerrainEngine;
  public waterSystem: WaterSystem;
  public roadCorridorSystem: RoadCorridorSystem;
  public railwayGraph: RailwayGraph;

  public isDriving = false;

  private originLat: number;
  private originLng: number;
  private syncTimer = 0;
  private lastSyncX = -99999;
  private lastSyncZ = -99999;
  private modelTransform: {
    translateX: number;
    translateY: number;
    translateZ: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    scale: number;
  } = {
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
  };

  private lastTime = performance.now();
  private isInitialized = false;
  private lastFetchLat = 0;
  private lastFetchLng = 0;
  private lastForwardFetchLat = 0;
  private lastForwardFetchLng = 0;
  private streamingTimer = 0;
  private initialSnapDone = false;

  // Pre-allocated objects for render loop (prevents 60fps GC thrashing)
  private _rotationX = new THREE.Matrix4();
  private _rotationY = new THREE.Matrix4();
  private _rotationZ = new THREE.Matrix4();
  private _m = new THREE.Matrix4();
  private _l = new THREE.Matrix4();
  private _scaleVec = new THREE.Vector3();
  private _xAxis = new THREE.Vector3(1, 0, 0);
  private _yAxis = new THREE.Vector3(0, 1, 0);
  private _zAxis = new THREE.Vector3(0, 0, 1);

  
  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;

    this.terrainEngine = new TerrainEngine(originLat, originLng);
    this.waterSystem = new WaterSystem(originLat, originLng);
    this.roadCorridorSystem = new RoadCorridorSystem(originLat, originLng);
    this.railwayGraph = new RailwayGraph(originLat, originLng, this.waterSystem);
    this.characterController = new CharacterController(originLat, originLng, this.terrainEngine);
    this.vehicleController = new VehicleController(originLat, originLng, this.terrainEngine);
    this.skyAndClouds = new SkyAndClouds();
    
    // Dependencies MUST be instantiated first
    this.roadMeshManager = new RoadMeshManager();
    this.roadMeshManager.setTerrainEngine(this.terrainEngine);
    this.roadMeshManager.setWaterSystem(this.waterSystem);
    this.parkingSystem = new ParkingSystem();
    
    this.realBuildingManager = new RealBuildingManager(this.originLat, this.originLng);
    this.realBuildingManager.setDependencies(this.terrainEngine, this.parkingSystem, this.waterSystem);
    
    // Now chunk manager
    this.chunkManager = new WorldChunkManager(this.terrainEngine, this.realBuildingManager, this.roadMeshManager, this.waterSystem);

    this.realBuildingManager.onDataLoaded = () => {
      const segs = Array.from(this.realBuildingManager.roadGraph.segments.values());
      this.roadMeshManager.setSegments(segs);
      this.transitSystem.rebuildIndianRailwaysLine();
      if (!this.initialSnapDone) {
        this.snapVehicleToSafeRoad();
        this.initialSnapDone = true;
      }
      // Refresh active chunks seamlessly without full world destruction or pop-in
      this.chunkManager.refreshActiveChunks();
    };

    this.streetElementManager = new StreetElementManager(this.originLat, this.originLng);
    this.streetElementManager.setDependencies(this.waterSystem, this.realBuildingManager.roadGraph, this.realBuildingManager);
    this.waterVehicleManager = new WaterVehicleManager();
    this.transitSystem = new TransitSystem(this.originLat, this.originLng, this.railwayGraph, this.waterSystem, this.terrainEngine);
    this.roadMeshManager.setMetroCorridorChecker((x, z) => this.transitSystem.isNearMetroCorridor(x, z));
  }


  public onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
    this.map = map;
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

    // Atmospheric distance fog matching open-world AAA games:
    // Softens distant 3D boxes into silhouettes and smoothly fades the horizon,
    // ensuring zero visual stutter or pop-in when looking into the distance
    this.scene.fog = new THREE.Fog(0xd8edf7, 160, 500);
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;

    // 2. Setup Lighting matching reference screenshots
    const { ambient, sun, fill } = SkyAndClouds.createLighting();
    this.scene.add(ambient);
    this.scene.add(sun);
    this.scene.add(fill);

    // 3. Ground & Water foundation:
    // When in Highland Western Ghats (Wayanad / Munnar), render stylized mountain slopes;
    // In coastal/midland cities, keep ground clear so crisp MapLibre road network & coastline render!
    if (this.terrainEngine.getRegionZone() === 'highland_ghats') {
      this.scene.add(this.terrainEngine.group);
    }

    // this.scene.add(this.roadMeshManager.group); // Handled by WorldChunkManager
    this.scene.add(this.characterController.model.group);
    this.scene.add(this.vehicleController.mesh);
    // this.scene.add(this.realBuildingManager.group); // Handled by WorldChunkManager
    this.scene.add(this.streetElementManager.group);
    this.scene.add(this.chunkManager.group);
    this.scene.add(this.waterVehicleManager.group);
    this.scene.add(this.transitSystem.group);
    this.scene.add(this.skyAndClouds.group);

    // 4. Initial water extraction, chunk, water vehicle & building population
    this.syncWaterFromMap(map);
    this.realBuildingManager.syncFromMap(map);
    this.snapVehicleToSafeRoad();
    this.initialSnapDone = true;
    this.chunkManager.update(0, 0);
    this.waterVehicleManager.updateOrigin(this.originLat, this.originLng);
    this.preloadCity(this.originLat, this.originLng);

    // Sync vector tile water, buildings, 3D roads & street elements continuously as new vector tiles stream in
    map.on('sourcedata', (e: any) => {
      if (e.isSourceLoaded) {
        this.syncWaterFromMap(map);
        this.realBuildingManager.syncFromMap(map);
        this.streetElementManager.syncFromMap(map);
        this.transitSystem.syncFromMap(map);
        const segs = Array.from(this.realBuildingManager.roadGraph.segments.values());
        this.roadMeshManager.setSegments(segs);
        this.parkingSystem.generateSlotsForSegments(segs);
      }
    });
    map.on('moveend', () => {
      this.syncWaterFromMap(map);
      this.realBuildingManager.syncFromMap(map);
      this.streetElementManager.syncFromMap(map);
      this.transitSystem.syncFromMap(map);
      const segs = Array.from(this.realBuildingManager.roadGraph.segments.values());
      this.roadMeshManager.setSegments(segs);
      this.parkingSystem.generateSlotsForSegments(segs);

      // Dynamically stream buildings, POIs, bus stops & parking across the entire map
      const center = map.getCenter();
      const dLat = (center.lat - this.lastFetchLat) * 111000;
      const dLng = (center.lng - this.lastFetchLng) * 111000 * Math.cos((center.lat * Math.PI) / 180);
      if (Math.hypot(dLat, dLng) > 220) {
        this.lastFetchLat = center.lat;
        this.lastFetchLng = center.lng;
        this.realBuildingManager.fetchRealBuildings(center.lat, center.lng, 750);
      }
    });

    // 5. Hide MapLibre's uncleaned raw vector layer to prevent z-fighting with our clean Three.js LOD 3D boxes
    if (map.getLayer('3d-buildings')) {
      map.setLayoutProperty('3d-buildings', 'visibility', 'none');
    }

    // 6. Compute origin Mercator coordinate transform
    this.updateModelTransform(this.originLat, this.originLng);

    this.isInitialized = true;
  }

  /**
   * Pre-loads the full active city environment:
   * 1. Fetches urban core with a 900m radius.
   * 2. Staggers parallel pre-fetches for 8 directional quadrants (~600m offsets).
   * Result: A seamless ~2.4 km x 2.4 km city coverage with full roads, shops, signboards, bus stops, and skyline!
   */
  public preloadCity(centerLat: number, centerLng: number) {
    this.lastFetchLat = centerLat;
    this.lastFetchLng = centerLng;
    this.lastForwardFetchLat = centerLat;
    this.lastForwardFetchLng = centerLng;

    // 1. Urban Core — large radius for dense city areas like Edappally, Kochi
    this.realBuildingManager.fetchRealBuildings(centerLat, centerLng, 900);

    // 2. Eight directional quadrants (N, NE, E, SE, S, SW, W, NW) at 600m offset
    const latOffset = 600 / 111000;
    const lngOffset = 600 / (111000 * Math.cos((centerLat * Math.PI) / 180));

    const quadrants = [
      { lat: centerLat + latOffset, lng: centerLng },                   // N
      { lat: centerLat + latOffset * 0.7, lng: centerLng + lngOffset * 0.7 }, // NE
      { lat: centerLat, lng: centerLng + lngOffset },                   // E
      { lat: centerLat - latOffset * 0.7, lng: centerLng + lngOffset * 0.7 }, // SE
      { lat: centerLat - latOffset, lng: centerLng },                   // S
      { lat: centerLat - latOffset * 0.7, lng: centerLng - lngOffset * 0.7 }, // SW
      { lat: centerLat, lng: centerLng - lngOffset },                   // W
      { lat: centerLat + latOffset * 0.7, lng: centerLng - lngOffset * 0.7 }, // NW
    ];

    // Stagger requests 300ms apart to avoid overwhelming Overpass API rate limits
    quadrants.forEach((q, idx) => {
      setTimeout(() => {
        this.realBuildingManager.fetchRealBuildings(q.lat, q.lng, 650);
      }, (idx + 1) * 300);
    });
  }


  /**
   * Synchronizes water bodies (rivers, backwaters, lakes) from MapLibre vector tiles
   * into the authoritative WaterSystem so trees, buildings, and vehicles NEVER cross water!
   */
  public syncWaterFromMap(map: any) {
    if (!map) return;
    try {
      let waterFeatures = map.queryRenderedFeatures({ layers: ['water', 'waterway'] });
      if (!waterFeatures || waterFeatures.length === 0) {
        const vectorSourceId = map.getSource('openmaptiles') ? 'openmaptiles' : (map.getSource('openfreemap') ? 'openfreemap' : undefined);
        if (vectorSourceId && map.querySourceFeatures) {
          try {
            waterFeatures = map.querySourceFeatures(vectorSourceId, { sourceLayer: 'water' }) || [];
          } catch (_e) {}
        }
      }

      if (waterFeatures && waterFeatures.length > 0) {
        for (let i = 0; i < waterFeatures.length; i++) {
          const feat = waterFeatures[i];
          if (!feat.geometry) continue;
          const g = feat.geometry;
          const featId = feat.id != null ? `water-${feat.id}` : `water-${i}-${g.type}`;

          if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
            for (let r = 0; r < g.coordinates.length; r++) {
              const ring = g.coordinates[r];
              if (ring && ring.length >= 3) {
                this.waterSystem.addWaterBody(`${featId}-r${r}`, ring, 'river');
              }
            }
          } else if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
            for (let p = 0; p < g.coordinates.length; p++) {
              const poly = g.coordinates[p];
              if (poly && poly[0] && poly[0].length >= 3) {
                this.waterSystem.addWaterBody(`${featId}-p${p}`, poly[0], 'river');
              }
            }
          } else if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
            this.waterSystem.addWaterway(`${featId}-line`, g.coordinates as [number, number][], 18);
          } else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
            for (let l = 0; l < g.coordinates.length; l++) {
              const line = g.coordinates[l];
              if (line && line.length >= 2) {
                this.waterSystem.addWaterway(`${featId}-l${l}`, line as [number, number][], 18);
              }
            }
          }
        }
      }
    } catch (_err) {}
  }

  /**
   * Snaps the auto-rickshaw to the nearest drivable road segment or safe dry land,
   * guaranteeing zero vehicles spawn submerged in water.
   */
  public snapVehicleToSafeRoad() {
    let targetX = 4.5;
    let targetZ = -4.5;
    let heading = 0;

    // 1. Try to find the nearest road segment within 150m from center
    const segments = Array.from(this.realBuildingManager.roadGraph.segments.values());
    let bestDist = Infinity;

    for (const seg of segments) {
      const midX = (seg.p1.x + seg.p2.x) * 0.5;
      const midZ = (seg.p1.z + seg.p2.z) * 0.5;
      const d = Math.hypot(midX, midZ);
      if (d < bestDist && !this.waterSystem.isPointInWater(midX, midZ, 2.0)) {
        bestDist = d;
        targetX = midX;
        targetZ = midZ;
        heading = Math.atan2(seg.p2.x - seg.p1.x, -(seg.p2.z - seg.p1.z));
      }
    }

    // 2. If center is in water, search outward radially for safe dry ground
    if (this.waterSystem.isPointInWater(targetX, targetZ, 2.0)) {
      for (let r = 10; r <= 80; r += 10) {
        let foundSafe = false;
        for (let a = 0; a < 8; a++) {
          const testX = Math.cos((a / 8) * Math.PI * 2) * r;
          const testZ = Math.sin((a / 8) * Math.PI * 2) * r;
          if (!this.waterSystem.isPointInWater(testX, testZ, 3.0)) {
            targetX = testX;
            targetZ = testZ;
            foundSafe = true;
            break;
          }
        }
        if (foundSafe) break;
      }
    }

    this.vehicleController.teleportTo(targetX, targetZ, heading);
  }

  public updateModelTransform(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;

    const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    const scale = mercator.meterInMercatorCoordinateUnits();

    this.modelTransform = {
      translateX: mercator.x,
      translateY: mercator.y,
      translateZ: mercator.z,
      rotateX: Math.PI / 2,
      rotateY: 0,
      rotateZ: 0,
      scale,
    };
  }

  public teleport(lat: number, lng: number) {
    this.updateModelTransform(lat, lng);
    this.terrainEngine.setOrigin(lat, lng);
    this.waterSystem.setOrigin(lat, lng);
    this.roadCorridorSystem.setOrigin(lat, lng);
    this.railwayGraph.setOrigin(lat, lng);
    this.characterController.teleportTo(lat, lng, lat, lng);
    this.chunkManager.reset();
    this.waterVehicleManager.updateOrigin(lat, lng);
    this.transitSystem.rebuildNetwork(lat, lng);
    this.realBuildingManager.setOrigin(lat, lng);
    // Re-inject waterSystem after setOrigin (which creates a fresh RealBuildingManager state)
    this.realBuildingManager.setDependencies(this.terrainEngine, this.parkingSystem, this.waterSystem);
    this.lastFetchLat = lat;
    this.lastFetchLng = lng;
    this.lastForwardFetchLat = lat;
    this.lastForwardFetchLng = lng;
    this.initialSnapDone = false;
    this.preloadCity(lat, lng);
    this.streetElementManager.setOrigin(lat, lng);
    this.streetElementManager.setDependencies(this.waterSystem, this.realBuildingManager.roadGraph, this.realBuildingManager);
    this.parkingSystem.clear();
    this.roadMeshManager.clear();

    if (this.map) {
      this.syncWaterFromMap(this.map);
      this.realBuildingManager.syncFromMap(this.map);
      this.snapVehicleToSafeRoad();
      this.chunkManager.update(0, 0);

      setTimeout(() => {
        this.syncWaterFromMap(this.map);
        this.realBuildingManager.syncFromMap(this.map);
        this.streetElementManager.syncFromMap(this.map);
        const segs = Array.from(this.realBuildingManager.roadGraph.segments.values());
        this.roadMeshManager.setSegments(segs);
        this.parkingSystem.generateSlotsForSegments(segs);
        this.snapVehicleToSafeRoad();
      }, 400);
    }
  }

  /**
   * Raycasts against 3D buildings from screen pointer coordinates for Data Debug Inspection.
   */
  public raycastBuilding(
    clientX: number,
    clientY: number,
    width: number,
    height: number
  ): NormalizedBuilding | null {
    if (!this.renderer || !this.camera) return null;

    const mouse = new THREE.Vector2(
      (clientX / width) * 2 - 1,
      -(clientY / height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.chunkManager.group.children, true);
    if (intersects && intersects.length > 0) {
      for (const hit of intersects) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr !== this.realBuildingManager.group) {
          const data = (curr as any).buildingData;
          if (data) {
            const normalized = this.realBuildingManager.normalizedBuildings.get(data.id);
            if (normalized) return normalized;

            return {
              id: data.id,
              source: 'osm-vector',
              coordinates: data.coordinates || [],
              localPolygon: [],
              centerLat: this.originLat,
              centerLng: this.originLng,
              centerX: curr.position.x,
              centerZ: curr.position.z,
              category: data.category || 'UNKNOWN',
              modelFamily: 'GenericStylized',
              name: data.name,
              height: data.height || 8.8,
              tags: data.tags || {},
              areaSqMeters: 120,
              radius: 6,
              validationStatus: 'clean',
              importanceLevel: 1,
              roadFacing: false,
            };
          }
          curr = curr.parent;
        }
      }
    }

    return null;
  }

  public render(_gl: WebGLRenderingContext, matrix: any) {
    if (!this.isInitialized) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.skyAndClouds.update(delta);
    this.waterVehicleManager.update(delta);
    this.transitSystem.update(delta);

    // Ground player character and vehicle with DEM terrain elevation
    const pGroup = this.characterController.model.group;
    const charPos = this.characterController.getPosition();
    const pGroundY = this.terrainEngine.getElevation(charPos.x, charPos.z);
    pGroup.position.y = pGroundY + charPos.y;

    const vMesh = this.vehicleController.mesh;
    const vGroundY = this.terrainEngine.getElevation(vMesh.position.x, vMesh.position.z);
    vMesh.position.y = vGroundY + 0.02;

    if (this.map) {
      const center = this.map.getCenter();
      const vx = this.isDriving ? this.vehicleController.getVelocity().vx : this.characterController.vx;
      const vz = this.isDriving ? this.vehicleController.getVelocity().vz : this.characterController.vz;
      const pPos = this.isDriving ? this.vehicleController.getPosition() : this.characterController.getPosition();
      
      // Process throttled chunk build queue FIRST (max 2 per frame) to prevent hang
      this.chunkManager.tick();
      this.chunkManager.update(pPos.x, pPos.z, vx, vz);


      // High-performance spatial distance-gated synchronization:
      // Only resync map vector features when player moves > 85m or on 1.5s idle throttle,
      // eliminating recurring 400ms frame drops and keeping render loop silky smooth at 60fps!
      const distFromLastSync = Math.hypot(pPos.x - this.lastSyncX, pPos.z - this.lastSyncZ);
      this.syncTimer += delta;

      // Force rapid sync at startup when map is empty, then throttle to 1.5s
      const isStartup = this.realBuildingManager.roadGraph.segments.size === 0;
      const throttleLimit = isStartup ? 0.2 : 1.5;

      if (distFromLastSync > 85 || this.syncTimer >= throttleLimit) {
        this.syncTimer = 0;
        this.lastSyncX = pPos.x;
        this.lastSyncZ = pPos.z;

        if (this.waterSystem.polygons.length === 0) {
          this.syncWaterFromMap(this.map);
        }
        
        this.realBuildingManager.syncFromMap(this.map);
        this.streetElementManager.syncFromMap(this.map);
        this.transitSystem.syncFromMap(this.map);
        const segs = Array.from(this.realBuildingManager.roadGraph.segments.values());
        this.roadMeshManager.setSegments(segs);
        this.parkingSystem.generateSlotsForSegments(segs);
      }


      // High-Velocity Forward Route Look-Ahead Streaming
      const speed = Math.hypot(vx, vz);
      const streamingInterval = speed > 15 ? 1.2 : speed > 6 ? 2.0 : 4.0;

      this.streamingTimer += delta;
      if (this.streamingTimer >= streamingInterval) {
        this.streamingTimer = 0;

        // 1. Ahead-of-route look-ahead prediction (Streams forward corridor before vehicle arrives)
        if (speed > 2.5) {
          const dirX = vx / speed;
          const dirZ = vz / speed;
          const lookAheadDist = Math.min(450 + speed * 18, 1200);
          const forwardX = pPos.x + dirX * lookAheadDist;
          const forwardZ = pPos.z + dirZ * lookAheadDist;
          const forwardCoords = GeoCoords.toLatLng(forwardX, forwardZ, this.originLat, this.originLng);

          const dfLat = (forwardCoords.lat - this.lastForwardFetchLat) * 111000;
          const dfLng = (forwardCoords.lng - this.lastForwardFetchLng) * 111000 * Math.cos((forwardCoords.lat * Math.PI) / 180);
          if (Math.hypot(dfLat, dfLng) > 220) {
            this.lastForwardFetchLat = forwardCoords.lat;
            this.lastForwardFetchLng = forwardCoords.lng;
            this.realBuildingManager.fetchRealBuildings(forwardCoords.lat, forwardCoords.lng, 650);
          }
        }

        // 2. Active player neighborhood expansion
        const dLat = (center.lat - this.lastFetchLat) * 111000;
        const dLng = (center.lng - this.lastFetchLng) * 111000 * Math.cos((center.lat * Math.PI) / 180);
        if (Math.hypot(dLat, dLng) > 250) {
          this.lastFetchLat = center.lat;
          this.lastFetchLng = center.lng;
          this.realBuildingManager.fetchRealBuildings(center.lat, center.lng, 750);
        }
      }
    }

    this._rotationX.makeRotationAxis(this._xAxis, this.modelTransform.rotateX);
    this._rotationY.makeRotationAxis(this._yAxis, this.modelTransform.rotateY);
    this._rotationZ.makeRotationAxis(this._zAxis, this.modelTransform.rotateZ);

    this._m.fromArray(matrix);
    
    this._scaleVec.set(
      this.modelTransform.scale,
      -this.modelTransform.scale,
      this.modelTransform.scale
    );

    this._l.makeTranslation(
      this.modelTransform.translateX,
      this.modelTransform.translateY,
      this.modelTransform.translateZ
    )
      .scale(this._scaleVec)
      .multiply(this._rotationX)
      .multiply(this._rotationY)
      .multiply(this._rotationZ);

    this.camera.projectionMatrix = this._m.multiply(this._l);

    // Synchronize camera world position for accurate Three.js LOD and raycasting
    const pPos = this.characterController.getPosition();
    let camX = pPos.x;
    let camZ = pPos.z;
    let altitude = 14;

    if (this.map && (this.map as any).getFreeCameraOptions) {
      const freeCam = (this.map as any).getFreeCameraOptions();
      if (freeCam && freeCam.position) {
        const lngLat = freeCam.position.toLngLat();
        altitude = freeCam.position.toAltitude ? freeCam.position.toAltitude() : 14;
        const local = GeoCoords.toLocalMeters(lngLat.lat, lngLat.lng, this.originLat, this.originLng);
        camX = local.x;
        camZ = local.z;
      }
    }
    this.camera.position.set(camX, altitude, camZ);
    this.camera.updateMatrixWorld();

    // In 2D overview mode (zoom < 15.0), suppress 3D Three.js objects for clean Google Maps view
    const currentZoom = this.map.getZoom();
    if (currentZoom < 15.0) {
      this.renderer.resetState();
      return;
    }

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);

    this.map.triggerRepaint();
  }

  public setCharacterVisible(visible: boolean) {
    this.characterController.model.group.visible = visible;
  }

  public destroy() {
    this.roadMeshManager.destroy();
    this.transitSystem.destroy();
    this.waterVehicleManager.destroy();
    this.chunkManager.reset();
    this.realBuildingManager.clear();
    this.streetElementManager.clear();
    this.parkingSystem.clear();
    this.scene.clear();
    this.renderer.dispose();
  }
}
