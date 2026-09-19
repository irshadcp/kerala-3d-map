import { LocalPoint2D } from './geoTypes';
import { GeoCoords } from './geoCoords';
import { WaterSystem } from './WaterSystem';

export interface RailwaySegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  p1: LocalPoint2D & { lat: number; lng: number };
  p2: LocalPoint2D & { lat: number; lng: number };
  length: number;
  type: 'rail' | 'light_rail' | 'subway' | 'bridge';
  gauge: number; // default broad gauge: 1.676m (standard IR) or 1.435m (Metro)
  isBridge: boolean;
  bridgeElevation?: number;
  ux: number;
  uz: number;
  nx: number;
  nz: number;
}

export interface RailwayNode {
  id: string;
  x: number;
  z: number;
  lat: number;
  lng: number;
  connectedSegmentIds: string[];
}

export interface TrackPolyline {
  id: string;
  points: (LocalPoint2D & { isBridge: boolean })[];
  totalLength: number;
}

export class RailwayGraph {
  public nodes: Map<string, RailwayNode> = new Map();
  public segments: Map<string, RailwaySegment> = new Map();
  public continuousTracks: TrackPolyline[] = [];

  private originLat: number;
  private originLng: number;
  private waterSystem?: WaterSystem;

  constructor(originLat = 9.9312, originLng = 76.2673, waterSystem?: WaterSystem) {
    this.originLat = originLat;
    this.originLng = originLng;
    this.waterSystem = waterSystem;
  }

  public setWaterSystem(waterSystem: WaterSystem) {
    this.waterSystem = waterSystem;
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.clear();
  }

  public clear() {
    this.nodes.clear();
    this.segments.clear();
    this.continuousTracks = [];
  }

  /**
   * Adds raw railway way from OSM / vector tiles.
   */
  public addRailwayWay(
    points: [number, number][], // [lng, lat][]
    tags: Record<string, string> = {}
  ): void {
    if (points.length < 2) return;

    const railwayType = (tags.railway === 'subway' || tags.railway === 'light_rail')
      ? tags.railway
      : 'rail';

    const isBridgeTag = tags.bridge === 'yes' || tags.viaduct === 'yes';

    for (let i = 0; i < points.length - 1; i++) {
      const [lng1, lat1] = points[i];
      const [lng2, lat2] = points[i + 1];

      const loc1 = GeoCoords.toLocalMeters(lat1, lng1, this.originLat, this.originLng);
      const loc2 = GeoCoords.toLocalMeters(lat2, lng2, this.originLat, this.originLng);

      const dx = loc2.x - loc1.x;
      const dz = loc2.z - loc1.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.2) continue;

      const ux = dx / length;
      const uz = dz / length;
      const nx = -uz;
      const nz = ux;

      const node1Id = `rn-${lat1.toFixed(6)}-${lng1.toFixed(6)}`;
      const node2Id = `rn-${lat2.toFixed(6)}-${lng2.toFixed(6)}`;

      if (!this.nodes.has(node1Id)) {
        this.nodes.set(node1Id, {
          id: node1Id,
          x: loc1.x,
          z: loc1.z,
          lat: lat1,
          lng: lng1,
          connectedSegmentIds: [],
        });
      }
      if (!this.nodes.has(node2Id)) {
        this.nodes.set(node2Id, {
          id: node2Id,
          x: loc2.x,
          z: loc2.z,
          lat: lat2,
          lng: lng2,
          connectedSegmentIds: [],
        });
      }

      // Check if crossing water body
      const midX = (loc1.x + loc2.x) * 0.5;
      const midZ = (loc1.z + loc2.z) * 0.5;
      const overWater = this.waterSystem ? this.waterSystem.isPointInWater(midX, midZ) : false;
      const isBridge = isBridgeTag || overWater;

      const segId = `rseg-${node1Id}-${node2Id}`;
      const segment: RailwaySegment = {
        id: segId,
        fromNodeId: node1Id,
        toNodeId: node2Id,
        p1: { x: loc1.x, z: loc1.z, lat: lat1, lng: lng1 },
        p2: { x: loc2.x, z: loc2.z, lat: lat2, lng: lng2 },
        length,
        type: isBridge ? 'bridge' : railwayType,
        gauge: railwayType === 'subway' ? 1.435 : 1.676,
        isBridge,
        bridgeElevation: isBridge ? 6.5 : 0.4,
        ux,
        uz,
        nx,
        nz,
      };

      this.segments.set(segId, segment);
      this.nodes.get(node1Id)!.connectedSegmentIds.push(segId);
      this.nodes.get(node2Id)!.connectedSegmentIds.push(segId);
    }
  }

  /**
   * Reconstructs continuous railway polylines, stitching tile gaps (< 45m).
   */
  public compileContinuousTracks(maxBridgeGap = 45.0): void {
    this.continuousTracks = [];
    const visitedSegments = new Set<string>();

    for (const [segId, seg] of this.segments) {
      if (visitedSegments.has(segId)) continue;

      const trackPoints: (LocalPoint2D & { isBridge: boolean })[] = [
        { x: seg.p1.x, z: seg.p1.z, isBridge: seg.isBridge },
        { x: seg.p2.x, z: seg.p2.z, isBridge: seg.isBridge },
      ];
      visitedSegments.add(segId);

      // Walk forward along connected nodes
      let currentNodeId = seg.toNodeId;
      let forwardGrowing = true;

      while (forwardGrowing) {
        const node = this.nodes.get(currentNodeId);
        if (!node) break;

        let nextSeg: RailwaySegment | null = null;
        let nextNodeId = '';

        for (const candidateId of node.connectedSegmentIds) {
          if (!visitedSegments.has(candidateId)) {
            const cand = this.segments.get(candidateId);
            if (cand) {
              nextSeg = cand;
              nextNodeId = cand.fromNodeId === currentNodeId ? cand.toNodeId : cand.fromNodeId;
              break;
            }
          }
        }

        if (nextSeg) {
          visitedSegments.add(nextSeg.id);
          const nextTarget = this.nodes.get(nextNodeId);
          if (nextTarget) {
            trackPoints.push({ x: nextTarget.x, z: nextTarget.z, isBridge: nextSeg.isBridge });
            currentNodeId = nextNodeId;
          } else {
            forwardGrowing = false;
          }
        } else {
          // Check for nearby disconnected node within maxBridgeGap (gap healing)
          let closestGapNode: RailwayNode | null = null;
          let minGapDist = maxBridgeGap;

          for (const otherNode of this.nodes.values()) {
            if (otherNode.id === currentNodeId) continue;
            const dist = Math.hypot(otherNode.x - node.x, otherNode.z - node.z);
            if (dist > 1.0 && dist < minGapDist) {
              // Check if any unvisited segment touches otherNode
              const hasUnvisited = otherNode.connectedSegmentIds.some((id) => !visitedSegments.has(id));
              if (hasUnvisited) {
                minGapDist = dist;
                closestGapNode = otherNode;
              }
            }
          }

          if (closestGapNode) {
            // Heal gap: connect via bridge segment
            trackPoints.push({
              x: closestGapNode.x,
              z: closestGapNode.z,
              isBridge: true, // healed gap over land or water
            });
            currentNodeId = closestGapNode.id;
          } else {
            forwardGrowing = false;
          }
        }
      }

      // Calculate total length
      let totalLength = 0;
      for (let i = 0; i < trackPoints.length - 1; i++) {
        totalLength += Math.hypot(
          trackPoints[i + 1].x - trackPoints[i].x,
          trackPoints[i + 1].z - trackPoints[i].z
        );
      }

      this.continuousTracks.push({
        id: `track-${this.continuousTracks.length + 1}`,
        points: trackPoints,
        totalLength,
      });
    }
  }

  /**
   * Tests if point penetrates railway clearance corridor (default 6m width).
   */
  public isPointInRailwayCorridor(x: number, z: number, corridorRadius = 6.0): boolean {
    for (const seg of this.segments.values()) {
      const vx = x - seg.p1.x;
      const vz = z - seg.p1.z;
      const segDx = seg.p2.x - seg.p1.x;
      const segDz = seg.p2.z - seg.p1.z;
      const lenSq = segDx * segDx + segDz * segDz;
      if (lenSq === 0) continue;

      let t = (vx * segDx + vz * segDz) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = seg.p1.x + t * segDx;
      const projZ = seg.p1.z + t * segDz;
      const dist = Math.hypot(x - projX, z - projZ);

      if (dist < corridorRadius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolves distance and nearest point along railway track.
   */
  public getDistanceToRailway(
    x: number,
    z: number
  ): { distance: number; nearestX: number; nearestZ: number; isBridge: boolean } | null {
    let minDistance = Infinity;
    let nearestX = x;
    let nearestZ = z;
    let isBridge = false;

    for (const seg of this.segments.values()) {
      const vx = x - seg.p1.x;
      const vz = z - seg.p1.z;
      const segDx = seg.p2.x - seg.p1.x;
      const segDz = seg.p2.z - seg.p1.z;
      const lenSq = segDx * segDx + segDz * segDz;
      if (lenSq === 0) continue;

      let t = (vx * segDx + vz * segDz) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = seg.p1.x + t * segDx;
      const projZ = seg.p1.z + t * segDz;
      const dist = Math.hypot(x - projX, z - projZ);

      if (dist < minDistance) {
        minDistance = dist;
        nearestX = projX;
        nearestZ = projZ;
        isBridge = seg.isBridge;
      }
    }

    if (minDistance === Infinity) return null;
    return { distance: minDistance, nearestX, nearestZ, isBridge };
  }
}
