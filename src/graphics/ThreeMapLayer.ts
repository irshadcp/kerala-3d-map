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
import { PlayerVehicle } from './PlayerVehicle';
import { BuildingLODManager } from './BuildingLODManager';
import { RemotePlayerManager } from './RemotePlayerManager';
import { PlayerNameplate } from './PlayerNameplate';

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
  private buildingLODManager!: BuildingLODManager;
  public playerVehicle!: PlayerVehicle;
  public isDrivingState: boolean = false;
  public remotePlayerManager!: RemotePlayerManager;
  public threeDGroup!: THREE.Group;
  public is3DActive: boolean = true;
  private _idleRepaintScheduled: boolean = false;
  private regenerateTimer: number | null = null;

  public originLat: number;
  public originLng: number;
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
  public localNameplate!: PlayerNameplate;
  public currentPos = new THREE.Vector2(0, 0);
  public targetPos = new THREE.Vector2(0, 0);
  public isWalking = false;
  private lastFrameTime = performance.now();
  private lastChunkCheckX = 0;
  private lastChunkCheckZ = 0;
  private loadedChunks = new Map<string, THREE.Group>();
  private readonly CHUNK_SIZE = 150;
  public isLowEndMode: boolean = false;
  private LOAD_RADIUS = 180; // Adaptive: 120m in low-end mode, 180m in high mode
  private lastRegenX = -9999;
  private lastRegenZ = -9999;

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
      antialias: false, // Disabling MSAA resolve eliminates mobile GPU stalls & battery heat
      powerPreference: 'high-performance',
    });
    this.renderer.autoClear = false;

    // Crisp, balanced lighting for high-contrast 3D clarity
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.48);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0xa7f3d0, 0.42);
    this.scene.add(hemiLight);

    const topSunLight = new THREE.DirectionalLight(0xfff8e7, 1.15);
    topSunLight.position.set(100, 260, 90);
    this.scene.add(topSunLight);

    // Deep atmospheric distance horizon fog (near 180m, far 650m) keeping gameplay crisp
    this.scene.fog = new THREE.Fog(0xdbeafe, 180, 650);

    // Grounded Realistic 3D Human Character (Deleted old floating pin badge)
    this.playerAvatarGroup = new THREE.Group();
    this.character = new RealisticCharacter(1.35);
    this.playerAvatarGroup.add(this.character.group);

    // Overhead PUBG-style floating nameplate & blinking microphone badge
    this.localNameplate = new PlayerNameplate({
      name: 'നിങ്ങൾ (You)',
      district: 'Kerala',
      isMuted: false,
      isSpeaking: false,
      isLocal: true,
    });
    this.playerAvatarGroup.add(this.localNameplate.sprite);

    // Parked / Driveable Kerala Vehicle (Auto-Rickshaw beside player)
    this.playerVehicle = new PlayerVehicle('auto', 1.0);
    this.playerAvatarGroup.add(this.playerVehicle.group);
    this.playerVehicle.setPosition(2.4, 0, 0);

    this.scene.add(this.playerAvatarGroup);

    // Dedicated 3D procedural environment group (can be toggled off at low zoom for zero load)
    this.threeDGroup = new THREE.Group();
    this.threeDGroup.name = '3d_procedural_environment';
    this.scene.add(this.threeDGroup);

    const envGroup = this.threeDGroup as unknown as THREE.Scene;
    this.petrolStationManager = new PetrolStationManager(envGroup);
    this.busStopManager = new BusStopManager(envGroup);
    this.playgroundManager = new PlaygroundManager(envGroup);
    this.villageManager = new KeralaVillageManager(envGroup);
    this.maritimeManager = new KeralaMaritimeManager(envGroup);
    this.highlandManager = new KeralaHighlandManager(envGroup);
    this.urbanManager = new KeralaUrbanManager(envGroup);
    this.coastalManager = new KeralaCoastalManager(envGroup);
    this.roadsideManager = new KeralaRoadsideManager(envGroup);
    this.buildingLODManager = new BuildingLODManager(this.scene);
    this.remotePlayerManager = new RemotePlayerManager(this.scene);

    if (typeof window !== 'undefined') {
      (window as any).__remotePlayerManager = this.remotePlayerManager;
    }

    this.updateModelTransform(this.originLat, this.originLng);
    
    // Automatically rebuild obstacles and re-evaluate trees whenever vector tiles load or camera settles
    // ONLY executed when in 3D exploration mode (zoom >= 16.2) to prevent mobile lag and heat!
    const reloadObstaclesAndRegenerate = () => {
      if (!this.is3DActive) return;
      if (this.map && this.map.getZoom() < 16.2) return;

      if (this.regenerateTimer) clearTimeout(this.regenerateTimer);
      this.regenerateTimer = window.setTimeout(() => {
        if (!this.is3DActive) return;
        if (this.map && this.map.getZoom() < 16.2) return;

        const local = GeoCoords.toLocalMeters(this.playerLat, this.playerLng, this.originLat, this.originLng);
        const distFromLast = Math.hypot(local.x - this.lastRegenX, local.z - this.lastRegenZ);
        if (this.lastRegenX !== -9999 && distFromLast < 50) return;

        this.lastRegenX = local.x;
        this.lastRegenZ = local.z;

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

          // 9. Place Kerala Roadside elements
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

          // 10. Regenerate trees strictly avoiding obstacles
          for (const group of this.loadedChunks.values()) {
            this.threeDGroup.remove(group);
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

          // 11. Dynamic Proximity Building LOD: generate rich roof parapet & ground AO plinths for nearby buildings
          this.buildingLODManager.update(this.obstacleMap, local.x, local.z, true);
        }
      }, 450);
    };

    map.on('idle', reloadObstaclesAndRegenerate);
    map.on('sourcedata', (e) => {
      if (e.sourceId === 'openmaptiles' && e.isSourceLoaded) {
        reloadObstaclesAndRegenerate();
      }
    });

    this.updatePlayerPosition(this.playerLat, this.playerLng, true);
  }

  public refreshBuildings() {
    // MapLibre GPU fill-extrusion handles all buildings globally with zero JS overhead
  }

  public updatePlayerPosition(lat: number, lng: number, immediate = false) {
    const local = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
    this.targetPos.set(local.x, local.z);
    this.isWalking = true;

    if (immediate || this.currentPos.distanceTo(this.targetPos) > 300) {
      this.currentPos.set(local.x, local.z);
      this.playerLat = lat;
      this.playerLng = lng;
      this.isWalking = false;
      if (this.playerAvatarGroup) {
        this.playerAvatarGroup.position.set(local.x, 0, local.z);
        this.updateChunks(local.x, local.z);
        this.buildingLODManager?.update(this.obstacleMap, local.x, local.z);
      }
    }
  }


  public isPositionBlocked(px: number, pz: number, radius = 0.4): boolean {
    if (!this.obstacleMap.isReady) return false;
    return (
      this.obstacleMap.isBuildingCollision(px, pz, radius, radius, 0) ||
      this.obstacleMap.isPointInWater(px, pz, 0.3)
    );
  }

  public isCameraOccluded(distance: number, bearing: number): boolean {
    if (!this.obstacleMap || !this.obstacleMap.isReady) return false;
    const bRad = (bearing * Math.PI) / 180;
    const camX = this.currentPos.x - Math.sin(bRad) * distance;
    const camZ = this.currentPos.y + Math.cos(bRad) * distance;
    return this.obstacleMap.isLineOfSightOccluded(this.currentPos.x, this.currentPos.y, camX, camZ);
  }

  public getPlayerLngLat(): { lng: number; lat: number } {
    const s = this.modelTransform.scale;
    const mx = this.modelTransform.translateX + this.currentPos.x * s;
    const my = this.modelTransform.translateY + this.currentPos.y * s;
    const coord = new maplibregl.MercatorCoordinate(mx, my, 0);
    const lngLat = coord.toLngLat();
    return { lng: lngLat.lng, lat: lngLat.lat };
  }

  public moveInDirection(dirX: number, dirZ: number, delta: number) {
    if (!this.character || !this.playerAvatarGroup) return;

    this.isWalking = true;
    const moveSpeed = this.isDrivingState ? 22.0 : 10.5; // Fast driving speed vs jog
    const stepDist = moveSpeed * delta;
    const nextX = this.currentPos.x + dirX * stepDist;
    const nextZ = this.currentPos.y + dirZ * stepDist;

    const colRadius = this.isDrivingState ? 0.65 : 0.4;
    // Obstacle collision check with smooth surface-normal wall sliding
    if (!this.isPositionBlocked(nextX, nextZ, colRadius)) {
      this.currentPos.x = nextX;
      this.currentPos.y = nextZ;
    } else {
      // Wall sliding along surface normal
      const surf = this.obstacleMap.getNearestBuildingSurface(this.currentPos.x, this.currentPos.y, 2.5);
      if (surf) {
        const dot = dirX * surf.nx + dirZ * surf.nz;
        if (dot < 0) {
          let sx = dirX - dot * surf.nx;
          let sz = dirZ - dot * surf.nz;
          const slen = Math.hypot(sx, sz);
          if (slen > 0.05) {
            sx /= slen;
            sz /= slen;
            let tx = this.currentPos.x + sx * stepDist;
            let tz = this.currentPos.y + sz * stepDist;
            const sn = this.obstacleMap.getNearestBuildingSurface(tx, tz, 1.5);
            if (sn && sn.dist < (colRadius + 0.05)) {
              tx += sn.nx * (colRadius + 0.05 - sn.dist);
              tz += sn.nz * (colRadius + 0.05 - sn.dist);
            }
            if (!this.isPositionBlocked(tx, tz, colRadius - 0.05)) {
              this.currentPos.x = tx;
              this.currentPos.y = tz;
            }
          }
        }
      } else {
        // Fallback: axis sliding
        if (!this.isPositionBlocked(nextX, this.currentPos.y, colRadius)) {
          this.currentPos.x = nextX;
        } else if (!this.isPositionBlocked(this.currentPos.x, nextZ, colRadius)) {
          this.currentPos.y = nextZ;
        }
      }
    }
    this.targetPos.copy(this.currentPos);

    this.playerAvatarGroup.position.set(this.currentPos.x, 0, this.currentPos.y);

    const heading = Math.atan2(dirX, dirZ);
    this.character.setHeading(heading);
    this.character.update(delta, true, this.isDrivingState ? 0.5 : 1.3);

    if (this.playerVehicle) {
      if (this.isDrivingState) {
        this.playerVehicle.setPosition(0, 0, 0);
        this.playerVehicle.setHeading(heading);
        this.playerVehicle.update(delta, true, true, 2.6);
      } else {
        this.playerVehicle.setPosition(2.4, 0, 0);
        this.playerVehicle.setHeading(0);
        this.playerVehicle.update(delta, false, false, 0);
      }
    }

    const coords = this.getPlayerLngLat();
    this.playerLat = coords.lat;
    this.playerLng = coords.lng;

    if (Math.hypot(this.currentPos.x - this.lastChunkCheckX, this.currentPos.y - this.lastChunkCheckZ) > 30) {
      this.lastChunkCheckX = this.currentPos.x;
      this.lastChunkCheckZ = this.currentPos.y;
      this.updateChunks(this.currentPos.x, this.currentPos.y);
    }
  }

  public toggleDrive(): boolean {
    this.isDrivingState = !this.isDrivingState;
    if (this.isDrivingState) {
      this.playerVehicle.setPosition(0, 0, 0);
      this.playerVehicle.setHeading(this.character.getHeading());
      this.playerVehicle.setDriving(true);
      // Player is inside the auto: hide outer walking character model
      this.character.group.visible = false;
      this.localNameplate?.setDriving(true);
    } else {
      this.playerVehicle.setPosition(2.4, 0, 0);
      this.playerVehicle.setHeading(0);
      this.playerVehicle.setDriving(false);
      // Player steps out on foot
      this.character.group.visible = true;
      this.character.group.position.set(0, 0, 0);
      this.character.group.scale.set(1.5, 1.5, 1.5);
      this.localNameplate?.setDriving(false);
    }
    return this.isDrivingState;
  }

  public isDriving(): boolean {
    return this.isDrivingState;
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
    this.roadsideManager?.clear();
    this.buildingLODManager?.clear();
    this.remotePlayerManager?.onOriginChange(lat, lng);

    for (const group of this.loadedChunks.values()) {
      this.threeDGroup.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }
    this.loadedChunks.clear();

    this.updatePlayerPosition(lat, lng, true);
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
    // Only generate trees if in 3D exploration mode (zoom >= 16.2)
    if (!this.is3DActive || (this.map && this.map.getZoom() < 16.2)) return;

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
              this.threeDGroup as unknown as THREE.Scene,
              this.obstacleMap,
              this.originLat,
              this.originLng
            );
            this.threeDGroup.add(chunkGroup);
            this.loadedChunks.set(key, chunkGroup);
          }
        }
      }
    }

    // Unload distant chunks
    for (const [key, group] of this.loadedChunks.entries()) {
      if (!activeChunks.has(key)) {
        this.threeDGroup.remove(group);
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
          }
        });
        this.loadedChunks.delete(key);
      }
    }

    // Dynamic Distance-based Building LOD
    this.buildingLODManager?.update(this.obstacleMap, playerX, playerZ);
  }

  public updateTapMovement(delta: number): boolean {
    if (!this.character || !this.playerAvatarGroup) return false;

    const dist = this.currentPos.distanceTo(this.targetPos);
    if (dist <= 0.3) {
      this.isWalking = false;
      return false;
    }

    this.isWalking = true;
    const baseDirX = (this.targetPos.x - this.currentPos.x) / dist;
    const baseDirZ = (this.targetPos.y - this.currentPos.y) / dist;
    const moveStep = Math.min(dist, 9.5 * delta);

    // If very close to destination and destination is inside an obstacle/building, mark arrived
    if (dist < 1.4 && this.isPositionBlocked(this.targetPos.x, this.targetPos.y, 0.2)) {
      this.targetPos.copy(this.currentPos);
      this.isWalking = false;
      return false;
    }

    const directNextX = this.currentPos.x + baseDirX * moveStep;
    const directNextZ = this.currentPos.y + baseDirZ * moveStep;

    let moved = false;
    let chosenX = this.currentPos.x;
    let chosenZ = this.currentPos.y;
    let chosenHeading = Math.atan2(baseDirX, baseDirZ);

    // 1. Check direct straight path first
    if (!this.isPositionBlocked(directNextX, directNextZ, 0.4)) {
      chosenX = directNextX;
      chosenZ = directNextZ;
      chosenHeading = Math.atan2(baseDirX, baseDirZ);
      moved = true;
    } else {
      // 2. Direct path blocked! Find nearest building surface to slide around it
      const surf = this.obstacleMap.getNearestBuildingSurface(this.currentPos.x, this.currentPos.y, 3.5);
      if (surf) {
        const dot = baseDirX * surf.nx + baseDirZ * surf.nz;

        // Left tangent along the wall (user preferred direction)
        const tanLeftX = -surf.nz;
        const tanLeftZ = surf.nx;
        const tanRightX = surf.nz;
        const tanRightZ = -surf.nx;

        let slideDirX = 0;
        let slideDirZ = 0;

        if (dot < 0) {
          // Vector points into wall: project onto wall plane
          let sx = baseDirX - dot * surf.nx;
          let sz = baseDirZ - dot * surf.nz;
          const slen = Math.hypot(sx, sz);
          if (slen > 0.15) {
            slideDirX = sx / slen;
            slideDirZ = sz / slen;
          } else {
            slideDirX = tanLeftX;
            slideDirZ = tanLeftZ;
          }
        } else {
          slideDirX = tanLeftX;
          slideDirZ = tanLeftZ;
        }

        // Test slide direction
        let testX = this.currentPos.x + slideDirX * moveStep;
        let testZ = this.currentPos.y + slideDirZ * moveStep;

        const sn = this.obstacleMap.getNearestBuildingSurface(testX, testZ, 1.5);
        if (sn && sn.dist < 0.45) {
          testX += sn.nx * (0.45 - sn.dist);
          testZ += sn.nz * (0.45 - sn.dist);
        }

        if (!this.isPositionBlocked(testX, testZ, 0.35)) {
          chosenX = testX;
          chosenZ = testZ;
          chosenHeading = Math.atan2(slideDirX, slideDirZ);
          moved = true;
        } else {
          // Try opposite side (RIGHT)
          const oppDirX = (slideDirX === tanLeftX) ? tanRightX : -slideDirX;
          const oppDirZ = (slideDirZ === tanLeftZ) ? tanRightZ : -slideDirZ;
          let testOppX = this.currentPos.x + oppDirX * moveStep;
          let testOppZ = this.currentPos.y + oppDirZ * moveStep;

          const snOpp = this.obstacleMap.getNearestBuildingSurface(testOppX, testOppZ, 1.5);
          if (snOpp && snOpp.dist < 0.45) {
            testOppX += snOpp.nx * (0.45 - snOpp.dist);
            testOppZ += snOpp.nz * (0.45 - snOpp.dist);
          }

          if (!this.isPositionBlocked(testOppX, testOppZ, 0.35)) {
            chosenX = testOppX;
            chosenZ = testOppZ;
            chosenHeading = Math.atan2(oppDirX, oppDirZ);
            moved = true;
          }
        }
      }

      // 3. Fallback: check radial fan prioritizing LEFT
      if (!moved) {
        const angles = [
          Math.PI / 2,         // Left 90°
          Math.PI / 3,         // Left 60°
          (2 * Math.PI) / 3,   // Left 120°
          Math.PI / 4,         // Left 45°
          -Math.PI / 2,        // Right 90°
          -Math.PI / 3,        // Right 60°
          -(2 * Math.PI) / 3,  // Right 120°
          -Math.PI / 4,        // Right 45°
          Math.PI              // Backtrack 180°
        ];
        const baseAngle = Math.atan2(baseDirX, baseDirZ);
        for (const off of angles) {
          const ang = baseAngle + off;
          const tx = this.currentPos.x + Math.sin(ang) * moveStep * 0.85;
          const tz = this.currentPos.y + Math.cos(ang) * moveStep * 0.85;
          if (!this.isPositionBlocked(tx, tz, 0.35)) {
            chosenX = tx;
            chosenZ = tz;
            chosenHeading = ang;
            moved = true;
            break;
          }
        }
      }
    }

    if (moved) {
      this.currentPos.x = chosenX;
      this.currentPos.y = chosenZ;

      this.playerAvatarGroup.position.set(this.currentPos.x, 0, this.currentPos.y);
      this.character.setHeading(chosenHeading);

      const coords = this.getPlayerLngLat();
      this.playerLat = coords.lat;
      this.playerLng = coords.lng;

      if (Math.hypot(this.currentPos.x - this.lastChunkCheckX, this.currentPos.y - this.lastChunkCheckZ) > 30) {
        this.lastChunkCheckX = this.currentPos.x;
        this.lastChunkCheckZ = this.currentPos.y;
        this.updateChunks(this.currentPos.x, this.currentPos.y);
      }
      this.buildingLODManager?.update(this.obstacleMap, this.currentPos.x, this.currentPos.y);
      return true;
    }
    return false;
  }

  public render(_gl: any, matrix: any) {
    if (!this.scene || !this.camera) return;

    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // Procedural animation (limb swings / idle breathing)
    if (this.character) {
      this.character.update(delta, this.isWalking, this.isDrivingState ? 0.5 : 1.25);
    }

    // Overhead PUBG-style floating nameplate & blinking microphone
    if (this.localNameplate) {
      this.localNameplate.tick(now);
      this.localNameplate.setDriving(this.isDrivingState);
    }

    if (this.playerVehicle) {
      if (this.isDrivingState) {
        this.playerVehicle.setPosition(0, 0, 0);
        this.playerVehicle.setHeading(this.character.getHeading());
        this.playerVehicle.update(delta, true, this.isWalking, 2.5);
      } else {
        this.playerVehicle.setPosition(2.4, 0, 0);
        this.playerVehicle.setHeading(0);
        this.playerVehicle.update(delta, false, false, 0);
      }
    }

    // Procedural water vessel wave floating animation
    if (this.maritimeManager) {
      this.maritimeManager.updateFloatingAnimation(now);
    }

    // Update remote multiplayer characters & proximity audio
    if (this.remotePlayerManager) {
      this.remotePlayerManager.update(delta, this.currentPos.x, this.currentPos.y);
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

    // Thermal & Battery Optimization:
    // Only repaint continuous 60 FPS if character is actively moving, local user is speaking, or nearby peer (< 80m) is moving
    const hasNearbyMovingPeer =
      this.remotePlayerManager &&
      this.remotePlayerManager.hasMovingNearbyPlayer(this.currentPos.x, this.currentPos.y, 80);

    const isLocalSpeaking = this.localNameplate && (this.localNameplate as any).isSpeaking;

    if (this.isWalking || hasNearbyMovingPeer || isLocalSpeaking) {
      this.map.triggerRepaint();
    } else if (this.is3DActive) {
      // In 3D mode when idle, throttle gentle animation tick (~15 FPS) for breathing
      if (!this._idleRepaintScheduled) {
        this._idleRepaintScheduled = true;
        setTimeout(() => {
          this._idleRepaintScheduled = false;
          if (this.map) this.map.triggerRepaint();
        }, 65);
      }
    }
    // In 2D overview mode (zoom < 16.2): ZERO idle repaints! GPU stays completely cold!
  }

  public set3DMode(is3D: boolean) {
    if (this.is3DActive === is3D) return;
    this.is3DActive = is3D;
    if (this.threeDGroup) {
      this.threeDGroup.visible = is3D;
    }
    if (is3D) {
      const local = GeoCoords.toLocalMeters(this.playerLat, this.playerLng, this.originLat, this.originLng);
      this.updateChunks(local.x, local.z);
      this.buildingLODManager?.update(this.obstacleMap, local.x, local.z, true);
      this.map?.triggerRepaint();
    } else {
      this.buildingLODManager?.clear();
      this.map?.triggerRepaint();
    }
  }

  public setPerformanceMode(isLowEnd: boolean) {
    if (this.isLowEndMode === isLowEnd) return;
    this.isLowEndMode = isLowEnd;
    this.LOAD_RADIUS = isLowEnd ? 120 : 180;
    SnapTreeGenerator.setLowEndMode(isLowEnd);
    this.buildingLODManager?.setPerformanceMode(isLowEnd);

    // Refresh chunks with new LOD & radius if 3D is active
    if (this.is3DActive) {
      for (const group of this.loadedChunks.values()) {
        this.threeDGroup.remove(group);
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
      this.map?.triggerRepaint();
    }
  }

  public setLocalProfile(name: string, district: string) {
    if (this.localNameplate) {
      this.localNameplate.update({ name, district, isLocal: true });
      this.map?.triggerRepaint();
    }
  }

  public setLocalVoiceState(isMuted: boolean, isSpeaking: boolean) {
    if (this.localNameplate) {
      this.localNameplate.update({ isMuted, isSpeaking });
      this.map?.triggerRepaint();
    }
  }
}

export default ThreeMapLayer;
