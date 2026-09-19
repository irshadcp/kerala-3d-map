import * as THREE from 'three';
import { RoadSegment } from '../core/geoTypes';
import { disposeHierarchy } from './disposeUtils';
import { mergeGroup } from './GeometryMerger';
import { TerrainEngine } from '../core/TerrainEngine';
import { WaterSystem } from '../core/WaterSystem';

export class RoadMeshManager {
  public group: THREE.Group;
  
  // Base raw groups (will be merged into a single optimized group later)
  private rawGroup: THREE.Group;

  // Cached materials for stylized cartoon aesthetic
  private asphaltMat: THREE.MeshLambertMaterial;
  private curbMat: THREE.MeshLambertMaterial;
  private sidewalkMat: THREE.MeshLambertMaterial;
  private centerLineMat: THREE.MeshBasicMaterial;
  private parkingLineMat: THREE.MeshBasicMaterial;
  private junctionMat: THREE.MeshLambertMaterial;

  // Bridge-specific materials
  private bridgeDeckMat: THREE.MeshLambertMaterial;
  private bridgeRailingMat: THREE.MeshLambertMaterial;
  private bridgeBeamMat: THREE.MeshLambertMaterial;

  private builtSegmentIds: Set<string> = new Set(); // deprecated
   // Render roads up to 650m from center

  private terrainEngine?: TerrainEngine;
  private waterSystem?: WaterSystem;
  private metroCorridorChecker?: (x: number, z: number) => boolean;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = '3d-stylized-roads';
    this.rawGroup = new THREE.Group();

    // 1. Clean stylized road fill (Apple Maps smooth light cartoon white)
    this.asphaltMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // 2. Crisp outline curbs (soft light slate cartoon border)
    this.curbMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    // 3. Sidewalk matches soft pearl
    this.sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    // 4. Warm amber cartoon centerlines (visible on white road)
    this.centerLineMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      depthWrite: false,
      transparent: true,
      opacity: 0.75,
    });
    // 5. Soft slate parking lines
    this.parkingLineMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      depthWrite: false,
      transparent: true,
      opacity: 0.6,
    });
    // 6. Junction matches road
    this.junctionMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Bridge materials
    this.bridgeDeckMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db }); // Light concrete grey
    this.bridgeRailingMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af }); // Darker grey railing
    this.bridgeBeamMat = new THREE.MeshLambertMaterial({ color: 0xb0b8c4 }); // Mid concrete beam
  }

  public setMetroCorridorChecker(checker: (x: number, z: number) => boolean) {
    this.metroCorridorChecker = checker;
  }

  public setTerrainEngine(engine: TerrainEngine) {
    this.terrainEngine = engine;
  }

  public setWaterSystem(ws: WaterSystem) {
    this.waterSystem = ws;
  }

  
  private roadSegments: any[] = [];

  private nodeRadii = new Map<string, number>();

  public setSegments(segments: any[]) {
    this.roadSegments = segments;
    this.nodeRadii.clear();
    for (const seg of segments) {
      const w = seg.width;
      const current1 = this.nodeRadii.get(seg.fromNodeId) || 0;
      if (w > current1) this.nodeRadii.set(seg.fromNodeId, w);
      
      const current2 = this.nodeRadii.get(seg.toNodeId) || 0;
      if (w > current2) this.nodeRadii.set(seg.toNodeId, w);
    }
  }

  public buildChunk(minX: number, minZ: number, maxX: number, maxZ: number): THREE.Group | null {
    if (!this.roadSegments || this.roadSegments.length === 0) return null;

    const chunkGroup = new THREE.Group();
    chunkGroup.name = `roads-${minX}-${minZ}`;
    let added = 0;

    const processedNodes = new Set<string>();

    for (const seg of this.roadSegments) {
      const midX = (seg.p1.x + seg.p2.x) * 0.5;
      const midZ = (seg.p1.z + seg.p2.z) * 0.5;

      if (midX >= minX && midX < maxX && midZ >= minZ && midZ < maxZ) {
        const r1 = (this.nodeRadii.get(seg.fromNodeId) || seg.width) * 0.45;
        const r2 = (this.nodeRadii.get(seg.toNodeId) || seg.width) * 0.45;

        this.buildSegmentMesh(seg, r1, r2);

        if (!processedNodes.has(seg.fromNodeId)) {
          processedNodes.add(seg.fromNodeId);
          this.buildJunctionCap(seg.p1.x, seg.p1.z, r1);
        }
        if (!processedNodes.has(seg.toNodeId)) {
          processedNodes.add(seg.toNodeId);
          this.buildJunctionCap(seg.p2.x, seg.p2.z, r2);
        }
        added++;
      }
    }

    if (added === 0 || this.rawGroup.children.length === 0) {
      this.rawGroup.clear();
      return null;
    }

    // Merge ALL segment geometries together once — O(1) draw calls per chunk
    const merged = mergeGroup(this.rawGroup);
    this.rawGroup.clear();
    chunkGroup.add(merged);
    return chunkGroup;
  }


  private buildSegmentMesh(seg: RoadSegment, r1: number, r2: number) {
    const p12D = new THREE.Vector2(seg.p1.x, seg.p1.z);
    const p22D = new THREE.Vector2(seg.p2.x, seg.p2.z);
    const fullLen = p12D.distanceTo(p22D);
    
    if (fullLen <= r1 + r2) return;

    if (this.metroCorridorChecker) {
      const midX = (seg.p1.x + seg.p2.x) * 0.5;
      const midZ = (seg.p1.z + seg.p2.z) * 0.5;
      if (this.metroCorridorChecker(midX, midZ)) {
        return;
      }
    }

    // ─── BRIDGE AUTO-DETECTION ──────────────────────────────────────────
    // A segment is a bridge if it is tagged bridge=yes OR if any sample points
    // along the segment cross over a water body (river/canal/pond/lake).
    const midX = (seg.p1.x + seg.p2.x) * 0.5;
    const midZ = (seg.p1.z + seg.p2.z) * 0.5;
    const isOverWater =
      seg.isBridge === true ||
      Boolean(
        this.waterSystem &&
          (this.waterSystem.isPointInWater(midX, midZ, 0.2) ||
            this.waterSystem.isPointInWater(seg.p1.x, seg.p1.z, 0.2) ||
            this.waterSystem.isPointInWater(seg.p2.x, seg.p2.z, 0.2) ||
            this.waterSystem.isPointInWater(seg.p1.x * 0.75 + seg.p2.x * 0.25, seg.p1.z * 0.75 + seg.p2.z * 0.25, 0.2) ||
            this.waterSystem.isPointInWater(seg.p1.x * 0.25 + seg.p2.x * 0.75, seg.p1.z * 0.25 + seg.p2.z * 0.75, 0.2))
      );

    if (isOverWater) {
      this.buildBridgeMesh(seg, r1, r2);
      return; // Bridge replaces normal road mesh
    }
    // ────────────────────────────────────────────────────────────────────

    const dir2D = new THREE.Vector2().subVectors(p22D, p12D).normalize();

    // Inset endpoints
    const p1Inset = p12D.clone().addScaledVector(dir2D, r1);
    const p2Inset = p22D.clone().addScaledVector(dir2D, -r2);
    const len = p1Inset.distanceTo(p2Inset);
    
    // Subdivide into ~10m pieces to follow terrain
    const numSubdivisions = Math.max(1, Math.ceil(len / 10.0));
    const subLen = len / numSubdivisions;

    const roadWidth = seg.width;
    const curbWidth = 0.35;
    const curbHeight = 0.12;
    const sidewalkWidth = 1.35;
    const hasParking = seg.roadClass === 'residential' || seg.roadClass === 'secondary';

    for (let i = 0; i < numSubdivisions; i++) {
      const subP1 = p1Inset.clone().addScaledVector(dir2D, i * subLen);
      const subP2 = p1Inset.clone().addScaledVector(dir2D, (i + 1) * subLen);
      
      const y1 = this.terrainEngine ? this.terrainEngine.getElevation(subP1.x, subP1.y) : 0;
      const y2 = this.terrainEngine ? this.terrainEngine.getElevation(subP2.x, subP2.y) : 0;

      const pA = new THREE.Vector3(subP1.x, y1, subP1.y);
      const pB = new THREE.Vector3(subP2.x, y2, subP2.y);
      
      const subDir = new THREE.Vector3().subVectors(pB, pA);
      const actualLen = subDir.length();
      subDir.normalize();

      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);

      // Pitch (X rot) and Yaw (Y rot)
      const angleY = Math.atan2(subDir.x, subDir.z);
      const pitch = Math.asin(-subDir.y); // Negative because +y goes up, but we want pitch

      // We'll create a local group for this sub-segment, rotate it, then add pieces
      const sliceGroup = new THREE.Group();
      sliceGroup.position.copy(mid);
      sliceGroup.rotation.y = angleY;
      sliceGroup.rotation.x = pitch;
      
      // 1. ASPHALT ROAD SURFACE
      const roadGeo = new THREE.BoxGeometry(roadWidth, 0.04, actualLen);
      const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
      roadMesh.receiveShadow = true;
      sliceGroup.add(roadMesh);

      // 2. RAISED CONCRETE CURBS
      const halfRoad = roadWidth * 0.5;
      const curbGeo = new THREE.BoxGeometry(curbWidth, curbHeight, actualLen);
      const leftCurb = new THREE.Mesh(curbGeo, this.curbMat);
      leftCurb.position.set(-halfRoad - curbWidth * 0.5, curbHeight * 0.5 - 0.02, 0);
      sliceGroup.add(leftCurb);

      const rightCurb = new THREE.Mesh(curbGeo, this.curbMat);
      rightCurb.position.set(halfRoad + curbWidth * 0.5, curbHeight * 0.5 - 0.02, 0);
      sliceGroup.add(rightCurb);

      // 3. SIDEWALKS
      if (seg.roadClass !== 'motorway' && seg.roadClass !== 'trunk') {
        const swGeo = new THREE.BoxGeometry(sidewalkWidth, 0.06, actualLen);
        const leftSw = new THREE.Mesh(swGeo, this.sidewalkMat);
        leftSw.position.set(-halfRoad - curbWidth - sidewalkWidth * 0.5, 0.03, 0);
        sliceGroup.add(leftSw);

        const rightSw = new THREE.Mesh(swGeo, this.sidewalkMat);
        rightSw.position.set(halfRoad + curbWidth + sidewalkWidth * 0.5, 0.03, 0);
        sliceGroup.add(rightSw);
      }

      // 4. PARKING BAYS (White box lines)
      if (hasParking && actualLen > 2.0) {
        const pLineGeo = new THREE.BoxGeometry(0.1, 0.015, actualLen);
        const pMarkL = new THREE.Mesh(pLineGeo, this.parkingLineMat);
        pMarkL.position.set(-halfRoad + 2.2, 0.025, 0);
        sliceGroup.add(pMarkL);
        
        const pMarkR = new THREE.Mesh(pLineGeo, this.parkingLineMat);
        pMarkR.position.set(halfRoad - 2.2, 0.025, 0);
        sliceGroup.add(pMarkR);
      }

      // 5. CENTERLINES
      if (seg.lanes >= 2 && seg.roadClass !== 'residential') {
        const dashLen = 2.8;
        const gapLen = 2.4;
        const cycle = dashLen + gapLen;
        const numDashes = Math.floor(actualLen / cycle);
        if (numDashes > 0) {
          const dashGeo = new THREE.BoxGeometry(0.22, 0.015, dashLen);
          for (let d = 0; d < numDashes; d++) {
            const offsetZ = -actualLen * 0.5 + (d + 0.5) * cycle;
            const dashMesh = new THREE.Mesh(dashGeo, this.centerLineMat);
            dashMesh.position.set(0, 0.025, offsetZ);
            sliceGroup.add(dashMesh);
          }
        }
      }
      
      this.rawGroup.add(sliceGroup);
    }
  }

  /**
   * Renders a physical 3D bridge mesh for road segments that cross water bodies.
   * Includes: elevated concrete deck + road surface + side guard railings + support beams + piers down to riverbed.
   */
  private buildBridgeMesh(seg: RoadSegment, r1: number, r2: number) {
    const p12D = new THREE.Vector2(seg.p1.x, seg.p1.z);
    const p22D = new THREE.Vector2(seg.p2.x, seg.p2.z);
    const dir2D = new THREE.Vector2().subVectors(p22D, p12D).normalize();

    const p1Inset = p12D.clone().addScaledVector(dir2D, r1);
    const p2Inset = p22D.clone().addScaledVector(dir2D, -r2);
    const len = p1Inset.distanceTo(p2Inset);
    if (len < 0.5) return;

    // Bridge elevation above water
    const bridgeY = 3.6;
    const roadWidth = seg.width;
    const deckThick = 0.55;
    const railH = 1.25;
    const railW = 0.25;
    const beamH = 1.2;
    const beamW = roadWidth + 1.2;

    const midPt = new THREE.Vector2().addVectors(p1Inset, p2Inset).multiplyScalar(0.5);
    const angleY = Math.atan2(dir2D.x, dir2D.y);

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(midPt.x, bridgeY, midPt.y);
    bridgeGroup.rotation.y = angleY;

    // 1. Concrete deck slab (bridge body)
    const deckGeo = new THREE.BoxGeometry(roadWidth + 1.4, deckThick, len);
    const deck = new THREE.Mesh(deckGeo, this.bridgeDeckMat);
    deck.position.y = -deckThick * 0.5;
    deck.receiveShadow = true;
    deck.castShadow = true;
    bridgeGroup.add(deck);

    // 2. Road surface on top of deck (asphalt)
    const surfGeo = new THREE.BoxGeometry(roadWidth, 0.05, len);
    const surf = new THREE.Mesh(surfGeo, this.asphaltMat);
    surf.position.y = 0.025;
    surf.receiveShadow = true;
    bridgeGroup.add(surf);

    // 3. Left guard railing (concrete parapet)
    const railGeo = new THREE.BoxGeometry(railW, railH, len);
    const leftRail = new THREE.Mesh(railGeo, this.bridgeRailingMat);
    leftRail.position.set(-(roadWidth * 0.5 + 0.5), railH * 0.5, 0);
    leftRail.castShadow = true;
    bridgeGroup.add(leftRail);

    // 4. Right guard railing (concrete parapet)
    const rightRail = new THREE.Mesh(railGeo, this.bridgeRailingMat);
    rightRail.position.set(roadWidth * 0.5 + 0.5, railH * 0.5, 0);
    rightRail.castShadow = true;
    bridgeGroup.add(rightRail);

    // 5. Support crossbeams and solid concrete piers (pillars) extending into water/ground
    const numPillars = Math.max(2, Math.floor(len / 12.0));
    const beamGeo = new THREE.BoxGeometry(beamW, beamH, 0.6);
    const pierRadius = 0.55;
    const pierHeight = bridgeY + 3.0; // Extends down into underwater riverbed
    const pierGeo = new THREE.CylinderGeometry(pierRadius, pierRadius * 1.1, pierHeight, 10);

    for (let b = 0; b < numPillars; b++) {
      const bz = -len * 0.5 + (b + 0.5) * (len / numPillars);
      
      // Crossbeam under deck
      const beam = new THREE.Mesh(beamGeo, this.bridgeBeamMat);
      beam.position.set(0, -deckThick - beamH * 0.5, bz);
      beam.castShadow = true;
      bridgeGroup.add(beam);

      // Left concrete pier column
      const pierL = new THREE.Mesh(pierGeo, this.bridgeBeamMat);
      pierL.position.set(-roadWidth * 0.35, -deckThick - beamH - pierHeight * 0.5, bz);
      pierL.castShadow = true;
      bridgeGroup.add(pierL);

      // Right concrete pier column
      const pierR = new THREE.Mesh(pierGeo, this.bridgeBeamMat);
      pierR.position.set(roadWidth * 0.35, -deckThick - beamH - pierHeight * 0.5, bz);
      pierR.castShadow = true;
      bridgeGroup.add(pierR);
    }

    // 6. Safety reflectors along the railings
    const reflectorCount = Math.max(2, Math.floor(len / 8.0));
    const refGeo = new THREE.BoxGeometry(0.08, 0.15, 0.25);
    const refMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let r = 0; r < reflectorCount; r++) {
      const rz = -len * 0.5 + (r + 0.5) * (len / reflectorCount);
      const rL = new THREE.Mesh(refGeo, refMat);
      rL.position.set(-(roadWidth * 0.5 + 0.5) + 0.12, railH * 0.7, rz);
      bridgeGroup.add(rL);
      const rR = new THREE.Mesh(refGeo, refMat);
      rR.position.set((roadWidth * 0.5 + 0.5) - 0.12, railH * 0.7, rz);
      bridgeGroup.add(rR);
    }

    // 7. Centerline dashes (on bridge road surface)
    if (seg.lanes >= 2) {
      const dashLen = 2.5;
      const gap = 2.0;
      const cycle = dashLen + gap;
      const nDashes = Math.floor(len / cycle);
      const dashGeo = new THREE.BoxGeometry(0.22, 0.01, dashLen);
      for (let d = 0; d < nDashes; d++) {
        const dz = -len * 0.5 + (d + 0.5) * cycle;
        const dash = new THREE.Mesh(dashGeo, this.centerLineMat);
        dash.position.set(0, 0.06, dz);
        bridgeGroup.add(dash);
      }
    }

    this.rawGroup.add(bridgeGroup);
  }

  private buildJunctionCap(x: number, z: number, radius: number) {
    if (radius < 1.0) return;
    const y = this.terrainEngine ? this.terrainEngine.getElevation(x, z) : 0.04;
    
    // Sample normal to align the junction cap slope
    const normal = this.terrainEngine ? this.terrainEngine.getNormal(x, z) : new THREE.Vector3(0, 1, 0);
    
    const capGeo = new THREE.CylinderGeometry(radius, radius, 0.04, 24);
    
    // CylinderGeometry points UP along Y by default. We can use lookAt to align with normal.
    capGeo.rotateX(Math.PI / 2); // Make it point along Z
    
    const capMesh = new THREE.Mesh(capGeo, this.junctionMat);
    capMesh.position.set(x, y, z);
    capMesh.lookAt(x + normal.x, y + normal.y, z + normal.z);
    
    capMesh.receiveShadow = true;
    this.rawGroup.add(capMesh);
  }

  public clear() {
    disposeHierarchy(this.group);
    this.group.clear();
    this.rawGroup.clear();
    this.builtSegmentIds.clear();
  }

  public destroy() {
    this.clear();
  }
}
