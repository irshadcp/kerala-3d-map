import { RoadSegment, RoadNode, RoadClass, LocalPoint2D } from './geoTypes';
import { GeoCoords } from './geoCoords';

export class RoadGraph {
  public nodes: Map<string, RoadNode> = new Map();
  public segments: Map<string, RoadSegment> = new Map();
  private spatialGrid: Map<string, string[]> = new Map();
  private cellSize = 30.0; // 30m spatial index cells

  public clear() {
    this.nodes.clear();
    this.segments.clear();
    this.spatialGrid.clear();
  }

  /**
   * Resolves road class, width and lane count from raw OSM feature properties.
   */
  public static parseRoadProperties(props: Record<string, any> = {}): {
    roadClass: RoadClass;
    width: number;
    lanes: number;
    oneway: boolean;
  } {
    const highway = (props.class || props.highway || '').toLowerCase();
    const service = (props.service || '').toLowerCase();
    const access = (props.access || '').toLowerCase();
    const oneway = props.oneway === 'yes' || props.oneway === '1' || props.oneway === true;

    // Filter out private driveways, parking tracks, alleys, and pedestrian paths
    const isService =
      highway === 'service' ||
      highway === 'track' ||
      highway.includes('driveway') ||
      highway.includes('alley') ||
      highway.includes('parking') ||
      highway === 'path' ||
      highway === 'footway' ||
      highway === 'pedestrian' ||
      highway === 'steps' ||
      highway === 'cycleway' ||
      highway === 'bridleway' ||
      service.length > 0 ||
      access === 'private' ||
      access === 'no';

    if (isService) {
      return { roadClass: 'service', width: 3.0, lanes: 1, oneway: true };
    }

    let roadClass: RoadClass = 'residential';
    let lanes = 2;
    let baseWidth = 4.5;

    const isRoundabout = props.junction === 'roundabout' || highway.includes('roundabout');

    if (isRoundabout) {
      roadClass = 'secondary';
      lanes = 2;
      baseWidth = 6.0;
    } else if (highway.includes('motorway_link') || highway.includes('trunk_link')) {
      roadClass = 'motorway';
      lanes = 1;
      baseWidth = 5.5;
    } else if (highway.includes('primary_link')) {
      roadClass = 'primary';
      lanes = 1;
      baseWidth = 5.0;
    } else if (highway.includes('secondary_link') || highway.includes('tertiary_link') || highway.includes('link') || props.ramp) {
      roadClass = 'secondary';
      lanes = 1;
      baseWidth = 4.8;
    } else if (highway.includes('motorway') || highway.includes('trunk')) {
      roadClass = 'motorway';
      // NH: Reduced to MDR size
      lanes = oneway ? 2 : 3;
      baseWidth = oneway ? 6.5 : 9.5;
    } else if (highway.includes('primary') || highway.includes('major')) {
      roadClass = 'primary';
      // MDR: Reduced to normal road size
      lanes = oneway ? 2 : 2;
      baseWidth = oneway ? 5.5 : 7.5;
    } else if (highway.includes('secondary')) {
      roadClass = 'secondary';
      lanes = 2;
      baseWidth = 6.5;
    } else if (highway.includes('tertiary')) {
      roadClass = 'tertiary';
      lanes = 2;
      baseWidth = 5.5;
    } else if (highway.includes('service')) {
      roadClass = 'service';
      lanes = 1;
      baseWidth = 3.2;
    } else if (highway.includes('track')) {
      roadClass = 'service';
      lanes = 1;
      baseWidth = 2.4;
    } else if (highway.includes('path') || highway.includes('footway') || highway.includes('pedestrian')) {
      roadClass = 'path';
      lanes = 1;
      baseWidth = 1.6;
    } else {
      // Local Panchayat / Residential street
      roadClass = 'residential';
      lanes = 2;
      baseWidth = 4.5;
    }

    if (props.lanes) {
      const parsedLanes = parseInt(props.lanes, 10);
      if (!isNaN(parsedLanes) && parsedLanes > 0) {
        lanes = parsedLanes;
        baseWidth = Math.max(baseWidth, lanes * 2.8);
      }
    }

    return { roadClass, width: baseWidth, lanes, oneway };
  }

  /**
   * Adds a polyline road feature into the graph with connected nodes and corridor bounding polygons.
   */
  public addRoadFeature(
    coordinates: [number, number][], // [lng, lat][]
    properties: Record<string, any>,
    originLat: number,
    originLng: number
  ) {
    if (!coordinates || coordinates.length < 2) return;

    const { roadClass, width, lanes, oneway } = RoadGraph.parseRoadProperties(properties);
    if (roadClass === 'service' || roadClass === 'path') return; // Keep only clean Main and Sub roads!
    const roadName = properties.name || properties['name:en'];
    const malayalamName = properties['name:ml'];

    // Detect bridge / viaduct tag from OSM data
    const isBridgeTagged =
      properties.bridge === 'yes' ||
      properties.bridge === '1' ||
      properties.viaduct === 'yes' ||
      properties.man_made === 'bridge';

    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1Lat = coordinates[i][1];
      const p1Lng = coordinates[i][0];
      const p2Lat = coordinates[i + 1][1];
      const p2Lng = coordinates[i + 1][0];

      const p1Local = GeoCoords.toLocalMeters(p1Lat, p1Lng, originLat, originLng);
      const p2Local = GeoCoords.toLocalMeters(p2Lat, p2Lng, originLat, originLng);

      const dx = p2Local.x - p1Local.x;
      const dz = p2Local.z - p1Local.z;
      const length = Math.hypot(dx, dz);

      if (length < 1.5 || length > 450) continue; // Skip degenerate or giant outlier lines

      const ux = dx / length;
      const uz = dz / length;
      const nx = -uz;
      const nz = ux;

      const halfW = width / 2;

      // 4-corner corridor polygon bounding the drivable surface
      const corridorPoly: LocalPoint2D[] = [
        { x: p1Local.x + nx * halfW, z: p1Local.z + nz * halfW },
        { x: p2Local.x + nx * halfW, z: p2Local.z + nz * halfW },
        { x: p2Local.x - nx * halfW, z: p2Local.z - nz * halfW },
        { x: p1Local.x - nx * halfW, z: p1Local.z - nz * halfW },
      ];

      // Node IDs based on rounded coordinates (~2m bucket)
      const fromNodeId = `node-${Math.round(p1Local.x / 2.0)}-${Math.round(p1Local.z / 2.0)}`;
      const toNodeId = `node-${Math.round(p2Local.x / 2.0)}-${Math.round(p2Local.z / 2.0)}`;

      if (!this.nodes.has(fromNodeId)) {
        this.nodes.set(fromNodeId, {
          id: fromNodeId,
          x: p1Local.x,
          z: p1Local.z,
          lat: p1Lat,
          lng: p1Lng,
          connectedSegmentIds: [],
        });
      }
      if (!this.nodes.has(toNodeId)) {
        this.nodes.set(toNodeId, {
          id: toNodeId,
          x: p2Local.x,
          z: p2Local.z,
          lat: p2Lat,
          lng: p2Lng,
          connectedSegmentIds: [],
        });
      }

      const segId = `seg-${Math.round(p1Local.x)}-${Math.round(p1Local.z)}-${Math.round(p2Local.x)}-${Math.round(p2Local.z)}`;
      if (this.segments.has(segId)) continue;

      const segment: RoadSegment = {
        id: segId,
        fromNodeId,
        toNodeId,
        p1: { ...p1Local, lat: p1Lat, lng: p1Lng },
        p2: { ...p2Local, lat: p2Lat, lng: p2Lng },
        length,
        roadClass,
        width,
        lanes,
        oneway,
        name: roadName,
        malayalamName,
        ux,
        uz,
        nx,
        nz,
        corridorPoly,
        isBridge: isBridgeTagged,
      };

      this.segments.set(segId, segment);
      this.nodes.get(fromNodeId)!.connectedSegmentIds.push(segId);
      this.nodes.get(toNodeId)!.connectedSegmentIds.push(segId);

      // Index in spatial grid
      this.indexSegment(segment);
    }
  }

  private indexSegment(seg: RoadSegment) {
    const minX = Math.min(seg.p1.x, seg.p2.x) - seg.width;
    const maxX = Math.max(seg.p1.x, seg.p2.x) + seg.width;
    const minZ = Math.min(seg.p1.z, seg.p2.z) - seg.width;
    const maxZ = Math.max(seg.p1.z, seg.p2.z) + seg.width;

    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCZ = Math.floor(minZ / this.cellSize);
    const endCZ = Math.floor(maxZ / this.cellSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cz = startCZ; cz <= endCZ; cz++) {
        const key = `${cx},${cz}`;
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, []);
        this.spatialGrid.get(key)!.push(seg.id);
      }
    }
  }

  /**
   * Retrieves all junction nodes (intersections where 3+ segments meet,
   * or significant 2-way road turns/forks) within the given bounds.
   */
  public getJunctionNodesInBounds(minX: number, minZ: number, maxX: number, maxZ: number): RoadNode[] {
    const junctions: RoadNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.x >= minX && node.x < maxX && node.z >= minZ && node.z < maxZ) {
        if (node.connectedSegmentIds.length >= 3) {
          junctions.push(node);
        } else if (node.connectedSegmentIds.length === 2) {
          const s1 = this.segments.get(node.connectedSegmentIds[0]);
          const s2 = this.segments.get(node.connectedSegmentIds[1]);
          if (s1 && s2) {
            const dot = s1.ux * s2.ux + s1.uz * s2.uz;
            if (Math.abs(dot) < 0.70) {
              junctions.push(node);
            }
          }
        }
      }
    }
    return junctions;
  }

  /**
   * Finds the closest road segment to a given local coordinate (x, z).
   */
  public getNearestSegment(
    x: number,
    z: number,
    maxRadius = 60.0
  ): { segment: RoadSegment; dist: number; t: number; projX: number; projZ: number } | null {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    const checked = new Set<string>();
    let bestSeg: RoadSegment | null = null;
    let minDist = maxRadius;
    let bestT = 0;
    let bestProjX = x;
    let bestProjZ = z;

    const searchRange = Math.max(2, Math.ceil(maxRadius / this.cellSize));

    for (let dx = -searchRange; dx <= searchRange; dx++) {
      for (let dz = -searchRange; dz <= searchRange; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const segIds = this.spatialGrid.get(key);
        if (!segIds) continue;

        for (const id of segIds) {
          if (checked.has(id)) continue;
          checked.add(id);

          const seg = this.segments.get(id);
          if (!seg) continue;

          // Projection along line segment
          const vx = x - seg.p1.x;
          const vz = z - seg.p1.z;
          const segDx = seg.p2.x - seg.p1.x;
          const segDz = seg.p2.z - seg.p1.z;
          const segLenSq = segDx * segDx + segDz * segDz;

          let t = (vx * segDx + vz * segDz) / segLenSq;
          t = Math.max(0, Math.min(1, t));

          const projX = seg.p1.x + t * segDx;
          const projZ = seg.p1.z + t * segDz;
          const dist = Math.hypot(x - projX, z - projZ);

          if (dist < minDist) {
            minDist = dist;
            bestSeg = seg;
            bestT = t;
            bestProjX = projX;
            bestProjZ = projZ;
          }
        }
      }
    }

    if (!bestSeg) return null;
    return { segment: bestSeg, dist: minDist, t: bestT, projX: bestProjX, projZ: bestProjZ };
  }

  /**
   * Returns ALL road segments within the given radius of point (x, z).
   * Each result includes the segment, distance, and projection point.
   */
  public getAllSegmentsNear(
    x: number,
    z: number,
    maxRadius: number
  ): { segment: RoadSegment; dist: number; projX: number; projZ: number }[] {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const searchRange = Math.max(2, Math.ceil(maxRadius / this.cellSize));

    const checked = new Set<string>();
    const results: { segment: RoadSegment; dist: number; projX: number; projZ: number }[] = [];

    for (let dx = -searchRange; dx <= searchRange; dx++) {
      for (let dz = -searchRange; dz <= searchRange; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const segIds = this.spatialGrid.get(key);
        if (!segIds) continue;

        for (const id of segIds) {
          if (checked.has(id)) continue;
          checked.add(id);

          const seg = this.segments.get(id);
          if (!seg) continue;

          const vx = x - seg.p1.x;
          const vz = z - seg.p1.z;
          const segDx = seg.p2.x - seg.p1.x;
          const segDz = seg.p2.z - seg.p1.z;
          const segLenSq = segDx * segDx + segDz * segDz;

          let t = segLenSq > 0 ? (vx * segDx + vz * segDz) / segLenSq : 0;
          t = Math.max(0, Math.min(1, t));

          const projX = seg.p1.x + t * segDx;
          const projZ = seg.p1.z + t * segDz;
          const dist = Math.hypot(x - projX, z - projZ);

          if (dist < maxRadius) {
            results.push({ segment: seg, dist, projX, projZ });
          }
        }
      }
    }

    return results;
  }

  /**
   * Checks whether a 2D local point is inside any drivable road corridor.
   */
  public isPointInDrivableCorridor(x: number, z: number): boolean {
    const match = this.getNearestSegment(x, z, 30.0);
    if (!match) return false;
    // Disallow pedestrian paths for vehicular drivable corridors
    if (match.segment.roadClass === 'path') return false;
    // Disallow central median divider on dual carriageways / metro corridors
    if (match.segment.isDualCarriageway && match.dist < 1.5) return false;
    return match.dist <= match.segment.width / 2.0;
  }

  /**
   * Clamps a position into the nearest drivable road corridor if it drifts out.
   */
  public clampToRoadCorridor(x: number, z: number): { x: number; z: number; headingRad: number } {
    const match = this.getNearestSegment(x, z, 100.0);
    if (!match) return { x, z, headingRad: 0 };

    if (match.segment.isDualCarriageway) {
      // Dual carriageway with central median: guide vehicle into left or right driving lane
      const cross = (x - match.projX) * match.segment.uz - (z - match.projZ) * match.segment.ux;
      const side = cross >= 0 ? 1 : -1;
      const nx = -match.segment.uz;
      const nz = match.segment.ux;

      // Keep vehicle out of the central median divider (within 1.5m of center)
      if (match.dist < 1.5) {
        return {
          x: match.projX + nx * (side * 2.2),
          z: match.projZ + nz * (side * 2.2),
          headingRad: Math.atan2(match.segment.ux, match.segment.uz),
        };
      }
    }

    const halfW = (match.segment.width / 2.0) * 0.88; // Keep slightly inside curb
    if (match.dist > halfW) {
      // Vector from projected centerline to (x, z)
      const dx = x - match.projX;
      const dz = z - match.projZ;
      const d = Math.hypot(dx, dz);
      if (d > 0.001) {
        return {
          x: match.projX + (dx / d) * halfW,
          z: match.projZ + (dz / d) * halfW,
          headingRad: Math.atan2(match.segment.ux, match.segment.uz),
        };
      }
    }

    return {
      x,
      z,
      headingRad: Math.atan2(match.segment.ux, match.segment.uz),
    };
  }

  /**
   * Automatically detects and merges parallel carriageways of National Highways / primary roads,
   * unifying them into a single wide, solid road corridor.
   */
  public resolveDualCarriageways() {
    const candidateClasses = new Set<RoadClass>(['motorway', 'trunk', 'primary']);
    const highwaySegs = Array.from(this.segments.values()).filter((s) => candidateClasses.has(s.roadClass));
    const toRemove = new Set<string>();

    for (let i = 0; i < highwaySegs.length; i++) {
      const s1 = highwaySegs[i];
      if (toRemove.has(s1.id)) continue;

      const m1x = (s1.p1.x + s1.p2.x) * 0.5;
      const m1z = (s1.p1.z + s1.p2.z) * 0.5;

      for (let j = i + 1; j < highwaySegs.length; j++) {
        const s2 = highwaySegs[j];
        if (toRemove.has(s2.id)) continue;

        // Check if segments are roughly parallel (opposing or same direction)
        const dot = s1.ux * s2.ux + s1.uz * s2.uz;
        const absDot = Math.abs(dot);

        // Within ~35 degrees of parallel
        if (absDot > 0.7) {
          const m2x = (s2.p1.x + s2.p2.x) * 0.5;
          const m2z = (s2.p1.z + s2.p2.z) * 0.5;
          const dist = Math.hypot(m1x - m2x, m1z - m2z);

          // Small to medium physical median distance (up to 28m) -> Merge into ONE unified single road!
          if (dist >= 2.0 && dist <= 28.0) {
            // Unify centerline: average the endpoints
            if (dot < 0) {
              // Opposing directions: s2.p1 is near s1.p2, s2.p2 is near s1.p1
              s1.p1.x = (s1.p1.x + s2.p2.x) * 0.5;
              s1.p1.z = (s1.p1.z + s2.p2.z) * 0.5;
              s1.p1.lat = (s1.p1.lat + s2.p2.lat) * 0.5;
              s1.p1.lng = (s1.p1.lng + s2.p2.lng) * 0.5;

              s1.p2.x = (s1.p2.x + s2.p1.x) * 0.5;
              s1.p2.z = (s1.p2.z + s2.p1.z) * 0.5;
              s1.p2.lat = (s1.p2.lat + s2.p1.lat) * 0.5;
              s1.p2.lng = (s1.p2.lng + s2.p1.lng) * 0.5;
            } else {
              // Same direction
              s1.p1.x = (s1.p1.x + s2.p1.x) * 0.5;
              s1.p1.z = (s1.p1.z + s2.p1.z) * 0.5;
              s1.p1.lat = (s1.p1.lat + s2.p1.lat) * 0.5;
              s1.p1.lng = (s1.p1.lng + s2.p1.lng) * 0.5;

              s1.p2.x = (s1.p2.x + s2.p2.x) * 0.5;
              s1.p2.z = (s1.p2.z + s2.p2.z) * 0.5;
              s1.p2.lat = (s1.p2.lat + s2.p2.lat) * 0.5;
              s1.p2.lng = (s1.p2.lng + s2.p2.lng) * 0.5;
            }

            // Recompute s1 orientation, length, and normal
            const dx = s1.p2.x - s1.p1.x;
            const dz = s1.p2.z - s1.p1.z;
            s1.length = Math.hypot(dx, dz);
            if (s1.length > 0.01) {
              s1.ux = dx / s1.length;
              s1.uz = dz / s1.length;
              s1.nx = -s1.uz;
              s1.nz = s1.ux;
            }

            // Unified road width bridging full physical span with sleeker profile
            const unifiedWidth = Math.max(s1.width + s2.width + dist * 0.4, 14.0);
            s1.width = unifiedWidth;
            s1.lanes = Math.max(s1.lanes + s2.lanes, 4);
            s1.oneway = false; // Merged corridor serves both travel directions
            s1.isDualCarriageway = true;
            s1.name = s1.name || s2.name;
            s1.malayalamName = s1.malayalamName || s2.malayalamName;

            // Rebuild corridor bounding polygon with full unified width
            const halfW = s1.width * 0.5;
            s1.corridorPoly = [
              { x: s1.p1.x + s1.nx * halfW, z: s1.p1.z + s1.nz * halfW },
              { x: s1.p2.x + s1.nx * halfW, z: s1.p2.z + s1.nz * halfW },
              { x: s1.p2.x - s1.nx * halfW, z: s1.p2.z - s1.nz * halfW },
              { x: s1.p1.x - s1.nx * halfW, z: s1.p1.z - s1.nz * halfW },
            ];

            // Remove s2 so only ONE unified segment exists in graph
            toRemove.add(s2.id);
            break;
          }
        }
      }
    }

    for (const id of toRemove) {
      this.segments.delete(id);
    }

    // Rebuild spatial grid so all nearest segment and corridor queries use unified roads
    this.rebuildSpatialIndex();
  }

  /**
   * Rebuilds the spatial grid index across all active road segments.
   */
  public rebuildSpatialIndex() {
    this.spatialGrid.clear();
    for (const seg of this.segments.values()) {
      this.indexSegment(seg);
    }
  }
}
