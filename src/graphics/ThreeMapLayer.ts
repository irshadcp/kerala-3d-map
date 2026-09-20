import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { GeoCoords } from '../core/geoCoords';
import { SnapTreeGenerator } from './TreeGenerator';

import { SpatialObstacleMap } from './SpatialObstacleMap';
import { PetrolStationManager } from './PetrolStationManager';
import { BusStopManager } from './BusStopManager';
import { PlaygroundManager } from './PlaygroundManager';
import { KeralaVillageManager } from './KeralaVillageManager';
import { KeralaMaritimeManager } from './KeralaMaritimeManager';
import { KeralaHighlandManager } from './KeralaHighlandManager';
import { KeralaUrbanManager } from './KeralaUrbanManager';
import { KeralaCoastalManager } from './KeralaCoastalManager';
import { KeralaRoadsideManager } from './KeralaRoadsideManager';
import { RealisticCharacter } from './RealisticCharacter';

export class ThreeMapLayer implements maplibregl.CustomLayerInterface {
  public id = '3d-model-layer';
  public type: 'custom' = 'custom';
  public renderingMode: '3d' = '3d';

  public map!: maplibregl.Map;
  public camera!: THREE.Camera;
  public scene!: THREE.Scene;
  public renderer!: THREE.WebGLRenderer;

  private obstacleMap = new SpatialObstacleMap();
  private petrolStationManager!: PetrolStationManager;
  private busStopManager!: BusStopManager;
  private playgroundManager!: PlaygroundManager;
  private villageManager!: KeralaVillageManager;
  private maritimeManager!: KeralaMaritimeManager;
  private highlandManager!: KeralaHighlandManager;
  private urbanManager!: KeralaUrbanManager;
  private coastalManager!: KeralaCoastalManager;
  private roadsideManager!: KeralaRoadsideManager;

  private originLat: number;
  private originLng: number;
  public playerLat: number;
  public playerLng: number;

  private modelTransform = {
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
  };

  public playerAvatarGroup!: THREE.Group;
  public character!: RealisticCharacter;
  public currentPos = new THREE.Vector2(0, 0);
  public targetPos = new THREE.Vector2(0, 0);
  public isWalking = false;
  private lastFrameTime = performance.now();
  private lastChunkCheckX = 0;
  private lastChunkCheckZ = 0;
  private loadedChunks = new Map<string, THREE.Group>();
  private readonly CHUNK_SIZE = 150;
  private readonly LOAD_RADIUS = 450;

  // Pre-allocated matrices for render loop
  private _m = new THREE.Matrix4();
  private _l = new THREE.Matrix4();
  private _rotationX = new THREE.Matrix4();
  private _rotationY = new THREE.Matrix4();
  private _rotationZ = new THREE.Matrix4();
  private _scaleVec = new THREE.Vector3();

  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;
    this.playerLat = originLat;
    this.playerLng = originLng;
  }

  public onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl as WebGLRenderingContext,
      antialias: true,
    });
    this.renderer.autoClear = false;

    // Soft warm sunny lighting matching Snapchat Map
    const ambientLight = new THREE.AmbientLight(0xfffdf7, 0.95);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffeedd, 0.85);
    this.scene.add(hemiLight);

    const topSunLight = new THREE.DirectionalLight(0xfffdf0, 0.9);
    topSunLight.position.set(50, 300, 50);
    this.scene.add(topSunLight);

    // Grounded Realistic 3D Human Character (Deleted old floating pin badge)
    this.playerAvatarGroup = new THREE.Group();
    this.character = new RealisticCharacter();
    this.playerAvatarGroup.add(this.character.group);

    this.scene.add(this.playerAvatarGroup);

    this.petrolStationManager = new PetrolStationManager(this.scene);
    this.busStopManager = new BusStopManager(this.scene);
    this.playgroundManager = new PlaygroundManager(this.scene);
    this.villageManager = new KeralaVillageManager(this.scene);
    this.maritimeManager = new KeralaMaritimeManager(this.scene);
    this.highlandManager = new KeralaHighlandManager(this.scene);
    this.urbanManager = new KeralaUrbanManager(this.scene);
    this.coastalManager = new KeralaCoastalManager(this.scene);
    this.roadsideManager = new KeralaRoadsideManager(this.scene);

    this.updateModelTransform(this.originLat, this.originLng);
    
    // Automatically rebuild obstacles and re-evaluate trees whenever vector tiles load or camera settles
    const reloadObstaclesAndRegenerate = () => {
      const refreshed = this.obstacleMap.update(this.map, this.originLat, this.originLng);
      if (refreshed) {
        // 1. Place roadside petrol stations in free spaces & register footprints in obstacleMap
        this.petrolStationManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 2. Place roadside bus stops in free spaces & register footprints in obstacleMap
        this.busStopManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 3. Place neighborhood sports playgrounds in free spaces away from highway junctions
        this.playgroundManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 4. Place Kerala Village & Cultural elements (Chayakada, Wells, Temples, Churches, Mosques)
        this.villageManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 5. Place Kerala Maritime & Backwater elements (Houseboats, Fishing Boats, Jetties, Fish Markets)
        this.maritimeManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 6. Place Kerala Highland & Western Ghats elements (Tea plantations, Checkposts, Viewpoints)
        this.highlandManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 7. Place Kerala Urban elements (Traffic signals, Highway Billboards)
        this.urbanManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 8. Place Kerala Coastal elements (Seawalls, Breakwaters, Fishing Houses, Drying Racks, Harbours)
        this.coastalManager.update(this.obstacleMap, this.originLat, this.originLng);

        // 9. Place Kerala Roadside elements (ConcretePole, StreetLight, RoadSign, BusStop, SmallShop, TeaShop, Bakery, Pharmacy, CompoundWall, Gate, Drain, Culvert, Bridge, Billboard, AutoStand)
        this.roadsideManager.update(this.obstacleMap, this.originLat, this.originLng);

        // Expose placed landmarks globally for UI navigation and inspection
        if (typeof window !== 'undefined') {
          (window as any).__petrolStations = this.petrolStationManager.placedStations;
          (window as any).__busStops = this.busStopManager.placedStops;
          (window as any).__playgrounds = this.playgroundManager.placedPlaygrounds;
          (window as any).__villageItems = this.villageManager.placedItems;
          (window as any).__maritimeItems = this.maritimeManager.placedItems;
          (window as any).__highlandItems = this.highlandManager.placedItems;
          (window as any).__urbanItems = this.urbanManager.placedItems;
          (window as any).__coastalItems = this.coastalManager.placedItems;
          (window as any).__roadsideItems = this.roadsideManager.placedItems;
        }

        // 9. Regenerate trees - will strictly avoid buildings, roads, water, fuel stations, bus stops, playgrounds, and all landmarks!
        for (const group of this.loadedChunks.values()) {
          this.scene.remove(group);
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.geometry?.dispose();
            }
          });
        }
        this.loadedChunks.clear();

        const local = GeoCoords.toLocalMeters(this.playerLat, this.playerLng, this.originLat, this.originLng);
        this.updateChunks(local.x, local.z);
      }
    };

    map.on('idle', reloadObstaclesAndRegenerate);
    map.on('moveend', reloadObstaclesAndRegenerate);
    map.on('sourcedata', (e) => {
      if (e.sourceId === 'openmaptiles' && e.isSourceLoaded) {
        reloadObstaclesAndRegenerate();
      }
    });

    this.updatePlayerPosition(this.playerLat, this.playerLng);
  }

  public refreshBuildings() {
    // MapLibre GPU fill-extrusion handles all buildings globally with zero JS overhead
  }

  public updatePlayerPosition(lat: number, lng: number, immediate = false) {
    const local = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
    this.targetPos.set(local.x, local.z);

    if (immediate || this.currentPos.distanceTo(this.targetPos) > 300) {
      this.currentPos.set(local.x, local.z);
      this.playerLat = lat;
      this.playerLng = lng;
      if (this.playerAvatarGroup) {
        this.playerAvatarGroup.position.set(local.x, 0, local.z);
        this.updateChunks(local.x, local.z);
      }
    }
  }

  public moveInDirection(dirX: number, dirZ: number, delta: number) {
    if (!this.character || !this.playerAvatarGroup) return;

    const moveSpeed = 10.5; // 10.5 m/s jog speed
    const stepX = dirX * moveSpeed * delta;
    const stepZ = dirZ * moveSpeed * delta;

    const nextX = this.currentPos.x + stepX;
    const nextZ = this.currentPos.y + stepZ;

    // Zero Building Collision: Ensure character cannot walk through solid building walls
    if (!this.obstacleMap.isBuildingCollision(nextX, nextZ, 0.45, 0.45, 0)) {
      this.currentPos.x = nextX;
      this.currentPos.y = nextZ;
    }
    this.targetPos.copy(this.currentPos);

    this.playerAvatarGroup.position.set(this.currentPos.x, 0, this.currentPos.y);

    const heading = Math.atan2(dirX, dirZ);
    this.character.setHeading(heading);
    this.character.update(delta, true, 1.3);

    const coords = GeoCoords.toLatLng(this.currentPos.x, this.currentPos.y, this.originLat, this.originLng);
    this.playerLat = coords.lat;
    this.playerLng = coords.lng;

    if (Math.hypot(this.currentPos.x - this.lastChunkCheckX, this.currentPos.y - this.lastChunkCheckZ) > 30) {
      this.lastChunkCheckX = this.currentPos.x;
      this.lastChunkCheckZ = this.currentPos.y;
      this.updateChunks(this.currentPos.x, this.currentPos.y);
    }
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.playerLat = lat;
    this.playerLng = lng;
    this.updateModelTransform(lat, lng);

    this.petrolStationManager?.clear();
    this.busStopManager?.clear();
    this.playgroundManager?.clear();
    this.villageManager?.clear();
    this.maritimeManager?.clear();
    this.highlandManager?.clear();
    this.urbanManager?.clear();
    this.coastalManager?.clear();

    for (const group of this.loadedChunks.values()) {
      this.scene.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }
    this.loadedChunks.clear();

    this.updatePlayerPosition(lat, lng);
  }

  private updateModelTransform(lat: number, lng: number) {
    const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    this.modelTransform = {
      translateX: mercator.x,
      translateY: mercator.y,
      translateZ: mercator.z,
      rotateX: Math.PI / 2,
      rotateY: 0,
      rotateZ: 0,
      scale: mercator.meterInMercatorCoordinateUnits(),
    };
  }

  private updateChunks(playerX: number, playerZ: number) {
    // Only generate trees once obstacle map has vector tile data!
    if (!this.obstacleMap.isReady) {
      this.obstacleMap.update(this.map, this.originLat, this.originLng);
      if (!this.obstacleMap.isReady) return;
    }

    const playerChunkX = Math.floor(playerX / this.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerZ / this.CHUNK_SIZE);

    const chunkRadius = Math.ceil(this.LOAD_RADIUS / this.CHUNK_SIZE);

    const activeChunks = new Set<string>();

    for (let cx = -chunkRadius; cx <= chunkRadius; cx++) {
      for (let cz = -chunkRadius; cz <= chunkRadius; cz++) {
        const chunkX = playerChunkX + cx;
        const chunkZ = playerChunkZ + cz;

        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        const dist = Math.hypot(centerX - playerX, centerZ - playerZ);

        if (dist <= this.LOAD_RADIUS) {
          const key = `${chunkX},${chunkZ}`;
          activeChunks.add(key);

          if (!this.loadedChunks.has(key)) {
            const chunkGroup = SnapTreeGenerator.generateTreesForChunk(
              chunkX,
              chunkZ,
              this.CHUNK_SIZE,
              this.scene,
              this.obstacleMap,
              this.originLat,
              this.originLng
            );
            this.scene.add(chunkGroup);
            this.loadedChunks.set(key, chunkGroup);
          }
        }
      }
    }

    // Unload distant chunks
    for (const [key, group] of this.loadedChunks.entries()) {
      if (!activeChunks.has(key)) {
        this.scene.remove(group);
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
          }
        });
        this.loadedChunks.delete(key);
      }
    }
  }

  public render(_gl: any, matrix: any) {
    if (!this.scene || !this.camera) return;

    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // Smooth character walking & procedural animation
    if (this.character && this.playerAvatarGroup) {
      const dist = this.currentPos.distanceTo(this.targetPos);
      if (dist > 0.25) {
        this.isWalking = true;
        const dirX = (this.targetPos.x - this.currentPos.x) / dist;
        const dirZ = (this.targetPos.y - this.currentPos.y) / dist;
        const moveStep = Math.min(dist, 9.5 * delta);

        const nextX = this.currentPos.x + dirX * moveStep;
        const nextZ = this.currentPos.y + dirZ * moveStep;

        if (!this.obstacleMap.isBuildingCollision(nextX, nextZ, 0.45, 0.45, 0)) {
          this.currentPos.x = nextX;
          this.currentPos.y = nextZ;
        } else {
          this.targetPos.copy(this.currentPos);
        }

        this.playerAvatarGroup.position.set(this.currentPos.x, 0, this.currentPos.y);

        const heading = Math.atan2(dirX, dirZ);
        this.character.setHeading(heading);
        this.character.update(delta, true, 1.25);

        const coords = GeoCoords.toLatLng(this.currentPos.x, this.currentPos.y, this.originLat, this.originLng);
        this.playerLat = coords.lat;
        this.playerLng = coords.lng;

        if (Math.hypot(this.currentPos.x - this.lastChunkCheckX, this.currentPos.y - this.lastChunkCheckZ) > 30) {
          this.lastChunkCheckX = this.currentPos.x;
          this.lastChunkCheckZ = this.currentPos.y;
          this.updateChunks(this.currentPos.x, this.currentPos.y);
        }
      } else {
        this.isWalking = false;
        this.character.update(delta, false, 1.0);
      }
    }

    // Sync MapLibre Camera to Three.js Projection
    this._rotationX.makeRotationAxis(new THREE.Vector3(1, 0, 0), this.modelTransform.rotateX);
    this._rotationY.makeRotationAxis(new THREE.Vector3(0, 1, 0), this.modelTransform.rotateY);
    this._rotationZ.makeRotationAxis(new THREE.Vector3(0, 0, 1), this.modelTransform.rotateZ);

    this._scaleVec.set(
      this.modelTransform.scale,
      -this.modelTransform.scale,
      this.modelTransform.scale
    );

    this._m.fromArray(matrix);

    this._l
      .makeTranslation(
        this.modelTransform.translateX,
        this.modelTransform.translateY,
        this.modelTransform.translateZ
      )
      .scale(this._scaleVec)
      .multiply(this._rotationX)
      .multiply(this._rotationY)
      .multiply(this._rotationZ);

    const maplibreVP = this._m.multiply(this._l);
    this.camera.projectionMatrix.copy(maplibreVP);

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }
}

export default ThreeMapLayer;
