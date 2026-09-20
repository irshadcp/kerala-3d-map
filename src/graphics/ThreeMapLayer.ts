import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { GeoCoords } from '../core/geoCoords';
import { SnapTreeGenerator } from './TreeGenerator';

import { SpatialObstacleMap } from './SpatialObstacleMap';
import { PetrolStationManager } from './PetrolStationManager';
import { BusStopManager } from './BusStopManager';
import { PlaygroundManager } from './PlaygroundManager';

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

  private originLat: number;
  private originLng: number;
  private playerLat: number;
  private playerLng: number;

  private modelTransform = {
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
  };

  private playerAvatarGroup!: THREE.Group;
  private avatarMesh!: THREE.Mesh;
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

    // Snapchat Bitmoji-style avatar pin
    this.playerAvatarGroup = new THREE.Group();

    // 1. Outer ground ripple / aura ring
    const auraGeo = new THREE.RingGeometry(3.5, 4.2, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x00a8ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    auraMesh.position.y = 0.12;
    this.playerAvatarGroup.add(auraMesh);

    // 2. Soft ground shadow
    const shadowGeo = new THREE.CircleGeometry(3.2, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x112211,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.08;
    this.playerAvatarGroup.add(shadowMesh);

    // 3. Cute 3D Bitmoji Pin: Floating White Circle Badge with blue center & pin point
    const pinBadge = new THREE.Group();
    pinBadge.position.y = 7.5;

    // White badge border
    const whiteDiscGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.6, 24);
    const whiteDiscMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const whiteDisc = new THREE.Mesh(whiteDiscGeo, whiteDiscMat);
    whiteDisc.rotation.x = Math.PI / 2;
    pinBadge.add(whiteDisc);

    // Blue inner avatar face disc
    const innerDiscGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.65, 24);
    const innerDiscMat = new THREE.MeshLambertMaterial({ color: 0x0099ff });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.rotation.x = Math.PI / 2;
    pinBadge.add(innerDisc);

    // Cute small sphere (avatar head icon)
    const headGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffe0bd });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.3, 0.4);
    pinBadge.add(head);

    // Small dark sunglasses / hair
    const hairGeo = new THREE.SphereGeometry(1.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.35, 0.4);
    pinBadge.add(hair);

    this.avatarMesh = pinBadge as unknown as THREE.Mesh;
    this.playerAvatarGroup.add(pinBadge);

    this.scene.add(this.playerAvatarGroup);

    this.petrolStationManager = new PetrolStationManager(this.scene);
    this.busStopManager = new BusStopManager(this.scene);
    this.playgroundManager = new PlaygroundManager(this.scene);

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

        // 4. Regenerate trees - will strictly avoid buildings, roads, water, fuel stations, bus stops, AND playgrounds!
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

  public updatePlayerPosition(lat: number, lng: number) {
    this.playerLat = lat;
    this.playerLng = lng;
    if (this.playerAvatarGroup) {
      const local = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
      this.playerAvatarGroup.position.set(local.x, 0, local.z);
      this.updateChunks(local.x, local.z);
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

    // Gentle floating bounce on avatar pin
    if (this.avatarMesh) {
      const time = performance.now() * 0.003;
      this.avatarMesh.position.y = 7.5 + Math.sin(time) * 0.6;
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
