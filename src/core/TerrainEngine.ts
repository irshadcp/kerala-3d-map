import * as THREE from 'three';
import { disposeHierarchy } from '../graphics/disposeUtils';

export type TopographyZone = 'coastal_plain' | 'midland_hills' | 'highland_ghats';

export interface TerrainSample {
  elevation: number;
  normal: THREE.Vector3;
  slopeAngle: number;
  zone: TopographyZone;
}

/**
 * TerrainEngine: Models authentic Kerala topography and Digital Elevation.
 * - Coastal Plains (Kochi, Alappuzha, Ponnani): Flat terrain [1m - 6m]
 * - Midland Hills (Malappuram, Thrissur, Kannur, Palakkad): Undulating hills [15m - 95m]
 * - Highland Western Ghats (Wayanad, Idukki, Munnar): Dramatic mountain slopes [600m - 1600m]
 */
export class TerrainEngine {
  public group: THREE.Group;
  private originLat: number;
  private originLng: number;
  private currentZone: TopographyZone = 'midland_hills';
  private terrainMesh: THREE.Mesh | null = null;

  // Cached materials
  private terrainMaterial: THREE.MeshLambertMaterial;

  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;

    this.group = new THREE.Group();
    this.group.name = 'world-terrain';

    // Stylized terrain material supporting vertex colors (grass, tea hills, rock cliffs)
    this.terrainMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.rebuildTerrain(originLat, originLng);
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.rebuildTerrain(lat, lng);
  }

  public getRegionZone(): TopographyZone {
    return this.currentZone;
  }

  public getOrigin(): { lat: number; lng: number } {
    return { lat: this.originLat, lng: this.originLng };
  }

  /**
   * Classifies the Kerala geographic zone based on GPS coordinates.
   */
  public static classifyZone(lat: number, lng: number): TopographyZone {
    // Highland Ghats: Wayanad (lat ~11.5 - 11.9, lng > 75.9) or Idukki/Munnar (lat ~9.5 - 10.3, lng > 76.8)
    const isWayanad = lat >= 11.45 && lat <= 11.95 && lng >= 75.92;
    const isIdukkiMunnar = lat >= 9.55 && lat <= 10.35 && lng >= 76.75;
    if (isWayanad || isIdukkiMunnar) {
      return 'highland_ghats';
    }

    // Coastal Plains: Along Arabian Sea shoreline (westernmost fringe)
    if (lng <= 75.82 || (lat <= 10.1 && lng <= 76.32)) {
      return 'coastal_plain';
    }

    // Midland Rolling Hills (Default Kerala landscape)
    return 'midland_hills';
  }

  /**
   * Rebuilds elevation model when player teleports to a new district.
   */
  public rebuildTerrain(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;
    this.currentZone = TerrainEngine.classifyZone(originLat, originLng);
  }

  /**
   * Samples terrain elevation at local meter coordinates (x, z).
   * Strictly anchored to Y = 0 to match MapLibre ground plane,
   * guaranteeing that player feet, vehicle wheels, and trees
   * firmly touch the ground with zero floating in mid-air.
   */
  public getElevation(_x: number, _z: number): number {
    return 0;
  }

  /**
   * Surface normal pointing straight up (+Y).
   */
  public getNormal(_x: number, _z: number): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0);
  }



  /**
   * Full terrain sample at (x, z) including elevation, normal, and slope angle.
   */
  public sample(x: number, z: number): TerrainSample {
    const elevation = this.getElevation(x, z);
    const normal = this.getNormal(x, z);
    // Slope angle relative to horizontal up-vector
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.y)));

    return {
      elevation,
      normal,
      slopeAngle,
      zone: this.currentZone,
    };
  }

  /**
   * Generates a stylized low-poly terrain mesh for a specific chunk.
   */
  public buildChunkMesh(cx: number, cz: number, chunkSize: number): THREE.Mesh {
    const segments = 16; // 16x16 grid per chunk for good resolution
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const centerX = cx * chunkSize + chunkSize / 2;
    const centerZ = cz * chunkSize + chunkSize / 2;
    
    // Translate geometry to chunk position natively so vertices align globally
    geometry.translate(centerX, 0, centerZ);

    const posAttr = geometry.attributes.position;
    const colors: number[] = [];

    // Stylized color palette
    const colorPlainGrass = new THREE.Color(0xe2f7d8); // Soft sunlit plain grass
    const colorHillTea = new THREE.Color(0x86efac);    // Lush tea plantation green
    const colorGhatForest = new THREE.Color(0x4ade80); // Deep Western Ghats forest
    const colorCliffRock = new THREE.Color(0x94a3b8);  // Mountain cliff rock

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const elev = this.getElevation(vx, vz);
      posAttr.setY(i, elev - 0.08); // Tiny negative bias so roads & ground decals sit cleanly

      // Slope-based vertex coloring
      const normal = this.getNormal(vx, vz);
      const slope = 1.0 - normal.y; // 0 = flat, 1 = vertical cliff

      const vertexColor = new THREE.Color();
      if (slope > 0.42) {
        // Steep slope: exposed mountain rock
        vertexColor.copy(colorCliffRock);
      } else if (this.currentZone === 'highland_ghats') {
        vertexColor.copy(colorGhatForest).lerp(colorHillTea, Math.min(1, elev / 50));
      } else if (this.currentZone === 'midland_hills') {
        vertexColor.copy(colorPlainGrass).lerp(colorHillTea, Math.min(1, elev / 25));
      } else {
        vertexColor.copy(colorPlainGrass);
      }

      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
    mesh.name = `terrain-chunk-${cx}-${cz}`;
    mesh.receiveShadow = true;
    
    // Reset position since geometry is already translated globally
    mesh.position.set(0, 0, 0); 
    return mesh;
  }

  public getZone(): TopographyZone {
    return this.currentZone;
  }

  public destroy() {
    if (this.terrainMesh) {
      this.group.remove(this.terrainMesh);
      disposeHierarchy(this.terrainMesh);
      this.terrainMesh = null;
    }
  }
}
