import * as THREE from 'three';
import { TerrainEngine } from './TerrainEngine';
import { RealBuildingManager } from '../graphics/RealBuildingManager';
import { RoadMeshManager } from '../graphics/RoadMeshManager';
import { TreeGenerator } from '../graphics/TreeGenerator';
import { disposeHierarchy } from '../graphics/disposeUtils';
import { WaterSystem } from './WaterSystem';

/**
 * WorldChunkManager — The unified spatial streaming engine.
 *
 * The world is divided into 200m × 200m cells. Each cell (chunk) contains:
 *   terrain + trees + buildings + roads
 *
 * CACHING STRATEGY
 * ─────────────────
 * Generated chunks are cached in `chunkCache` so that when a player
 * re-enters a previously visited area, geometry is restored in O(1)
 * from cache instead of being regenerated.
 *
 * THROTTLED BUILD QUEUE
 * ──────────────────────
 * New chunk geometry is built at most CHUNKS_PER_FRAME per animation frame.
 * This prevents the main-thread hang that occurs when zooming from overhead
 * view to character (GTA) mode, where 49 chunks suddenly need geometry.
 *
 * OWNERSHIP RULE
 * ──────────────
 * A feature (building, road segment) belongs to the chunk whose cell
 * contains its centroid/midpoint. This guarantees no duplicate features
 * across chunk boundaries.
 */
export class WorldChunkManager {
  public group: THREE.Group;

  /** Currently rendered chunk keys (visible in scene) */
  private loadedChunks: Set<string> = new Set();
  /** Map from chunk key → THREE.Group currently in scene */
  private chunkObjects: Map<string, THREE.Group> = new Map();

  /** Cache of generated chunk groups (including evicted ones) */
  private chunkCache: Map<string, THREE.Group> = new Map();
  /** Insertion-order tracking for LRU eviction */
  private cacheOrder: string[] = [];
  /** Max cached chunks before oldest are disposed */
  private static readonly MAX_CACHE_SIZE = 64;

  private readonly chunkSize = 200;
  private readonly stationaryRadius = 2; // 5x5 grid = 1.0 km x 1.0 km around player, distant skyline handled by MapLibre 3D

  private terrainEngine: TerrainEngine;
  private realBuildingManager: RealBuildingManager;
  public roadMeshManager?: RoadMeshManager;
  private waterSystem: WaterSystem;
  private treeGenerator: TreeGenerator;

  /**
   * Throttled build queue — prevents main thread hang when many chunks need
   * building simultaneously (e.g. zoom-in from overhead to character mode).
   * Max CHUNKS_PER_FRAME chunks are built per animation frame.
   * Priority: lower number = closer to player = built first.
   */
  private buildQueue: Array<{ cx: number; cz: number; key: string; priority: number }> = [];
  private static readonly CHUNKS_PER_FRAME = 2; // max new geometry builds per render frame

  /** Staggered refresh queue for onDataLoaded — avoids rebuilding all chunks at once */
  private refreshQueue: string[] = [];
  private static readonly REFRESH_PER_FRAME = 2; // max refreshes per frame

  constructor(
    terrainEngine: TerrainEngine,
    realBuildingManager: RealBuildingManager,
    roadMeshManager: RoadMeshManager,
    waterSystem: WaterSystem
  ) {
    this.terrainEngine = terrainEngine;
    this.realBuildingManager = realBuildingManager;
    this.roadMeshManager = roadMeshManager;
    this.waterSystem = waterSystem;
    this.treeGenerator = new TreeGenerator();

    this.group = new THREE.Group();
    this.group.name = 'world-chunks';
  }

  /**
   * Called every animation frame. Processes the throttled build queue and
   * refresh queue so chunk geometry builds are spread across many frames.
   * Call this from the render loop BEFORE update().
   */
  public tick() {
    // Process pending chunk builds (max CHUNKS_PER_FRAME per tick)
    let built = 0;
    while (this.buildQueue.length > 0 && built < WorldChunkManager.CHUNKS_PER_FRAME) {
      const item = this.buildQueue.shift()!;
      // Skip if already loaded by a previous tick
      if (this.loadedChunks.has(item.key)) continue;
      // Skip if key was removed from needed (player moved away)
      this._buildAndActivate(item.cx, item.cz, item.key);
      built++;
    }

    // Process staggered refresh queue (max REFRESH_PER_FRAME per tick)
    let refreshed = 0;
    while (this.refreshQueue.length > 0 && refreshed < WorldChunkManager.REFRESH_PER_FRAME) {
      const key = this.refreshQueue.shift()!;
      // Only refresh if still loaded
      if (!this.loadedChunks.has(key)) continue;
      const [cxStr, czStr] = key.split(',');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);

      const oldGroup = this.chunkObjects.get(key);
      const newGroup = this.buildChunkGeometry(cx, cz, key);
      if (oldGroup) {
        this.group.remove(oldGroup);
        disposeHierarchy(oldGroup);
      }
      this.group.add(newGroup);
      this.chunkObjects.set(key, newGroup);
      this.chunkCache.set(key, newGroup);
      refreshed++;
    }
  }

  /**
   * Velocity-Aware Dynamic Streaming Update:
   * 1. Stationary / Low Speed (<= 2.5 m/s): Loads full 7x7 chunk grid (~1.4 km² full city coverage).
   * 2. High Speed Driving (> 2.5 m/s):
   *    - Asymmetric Forward Cone: Streams up to 1,000m (5 chunks ahead along velocity vector).
   *    - Horizon & Skyline: Pre-loads distant city buildings and road corridors before arrival.
   *    - Rear Culling Boundary: Proactively unloads chunks left behind (> 220m rearward)
   *      and aggressively disposes distant rear chunks (> 380m) to maintain rock-solid 60 FPS.
   *
   * NOTE: New chunk geometry is queued (not built immediately) and processed by tick()
   * at most CHUNKS_PER_FRAME per frame to prevent main-thread hangs.
   */
  public update(playerX: number, playerZ: number, vx = 0, vz = 0) {
    const currentChunkX = Math.floor(playerX / this.chunkSize);
    const currentChunkZ = Math.floor(playerZ / this.chunkSize);

    const neededChunks: Set<string> = new Set();
    const speed = Math.hypot(vx, vz);

    // MODE A: STATIONARY OR SLOW EXPLORATION (<= 2.5 m/s)
    if (speed <= 2.5) {
      for (let dx = -this.stationaryRadius; dx <= this.stationaryRadius; dx++) {
        for (let dz = -this.stationaryRadius; dz <= this.stationaryRadius; dz++) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const key = `${cx},${cz}`;
          neededChunks.add(key);

          if (!this.loadedChunks.has(key)) {
            // Priority: distance² from player — build closest chunks first
            const priority = dx * dx + dz * dz;
            this.enqueueChunk(cx, cz, key, priority);
          }
        }
      }
    }
    // MODE B: HIGH-SPEED DRIVING / SPRINTING (> 2.5 m/s)
    else {
      const dirX = vx / speed;
      const dirZ = vz / speed;

      // 1. Immediate core around player (3x3 grid) — always build first
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const cenX = (cx + 0.5) * this.chunkSize;
          const cenZ = (cz + 0.5) * this.chunkSize;
          const proj = (cenX - playerX) * dirX + (cenZ - playerZ) * dirZ;

          // Enforce strict rear boundary cutoff: do NOT load if more than 220m behind player
          if (proj < -220) continue;

          const key = `${cx},${cz}`;
          neededChunks.add(key);
          if (!this.loadedChunks.has(key)) {
            this.enqueueChunk(cx, cz, key, 0); // Highest priority
          }
        }
      }

      // 2. High-Velocity Asymmetric Forward Look-Ahead Cone (Up to 1,000m ahead!)
      // Steps along velocity vector at 200m, 400m, 600m, 800m, 1000m
      const lookSteps = [200, 400, 600, 800, 1000];
      for (const dist of lookSteps) {
        const stepX = playerX + dirX * dist;
        const stepZ = playerZ + dirZ * dist;
        const stepChunkX = Math.floor(stepX / this.chunkSize);
        const stepChunkZ = Math.floor(stepZ / this.chunkSize);

        // Lateral spread: width of 3 chunks (lead chunk + 1 on each side)
        // For mid-distance (200-600m), expand lateral spread to width of 5 chunks
        const lateralSpread = dist <= 600 ? 2 : 1;

        for (let lx = -lateralSpread; lx <= lateralSpread; lx++) {
          for (let lz = -lateralSpread; lz <= lateralSpread; lz++) {
            const cx = stepChunkX + lx;
            const cz = stepChunkZ + lz;
            const key = `${cx},${cz}`;
            neededChunks.add(key);

            if (!this.loadedChunks.has(key)) {
              this.enqueueChunk(cx, cz, key, dist); // farther = lower priority
            }
          }
        }
      }
    }

    // 3. REAR CULLING & PROACTIVE DISPOSAL
    // Unload chunks that are out of the active cone or left behind the rear boundary
    const dirX = speed > 0.1 ? vx / speed : 0;
    const dirZ = speed > 0.1 ? vz / speed : 0;

    for (const key of Array.from(this.loadedChunks)) {
      if (!neededChunks.has(key)) {
        const [cxStr, czStr] = key.split(',');
        const cx = parseInt(cxStr, 10);
        const cz = parseInt(czStr, 10);
        const cenX = (cx + 0.5) * this.chunkSize;
        const cenZ = (cz + 0.5) * this.chunkSize;
        const proj = (cenX - playerX) * dirX + (cenZ - playerZ) * dirZ;

        // If high speed and chunk is far behind (> 350m rearward), aggressively purge geometry
        const shouldPurgeGpu = speed > 2.5 && proj < -350;
        this.deactivateChunk(key, shouldPurgeGpu);
      }
    }

    // 4. Also cancel queued builds for chunks no longer needed
    if (this.buildQueue.length > 0) {
      this.buildQueue = this.buildQueue.filter(item => neededChunks.has(item.key));
    }
  }

  /**
   * Enqueue a chunk for deferred building. Skips if already in queue or already loaded.
   * Sorts queue by priority so closest chunks are built first.
   */
  private enqueueChunk(cx: number, cz: number, key: string, priority: number) {
    // Skip if already in the queue
    if (this.buildQueue.some(item => item.key === key)) return;

    // Cache hit → activate immediately (O(1), no geometry cost)
    if (this.chunkCache.has(key)) {
      this._activateFromCache(key);
      return;
    }

    // Queue for deferred build
    this.buildQueue.push({ cx, cz, key, priority });

    // Keep queue sorted: closest first (lowest priority number first)
    if (this.buildQueue.length > 1) {
      this.buildQueue.sort((a, b) => a.priority - b.priority);
    }
  }

  /** Activate a chunk from cache (O(1)) — called immediately without queuing. */
  private _activateFromCache(key: string) {
    const chunkGroup = this.chunkCache.get(key)!;
    this.group.add(chunkGroup);
    this.chunkObjects.set(key, chunkGroup);
    this.loadedChunks.add(key);
  }

  /** Build geometry and activate a chunk (expensive — called from tick() throttled). */
  private _buildAndActivate(cx: number, cz: number, key: string) {
    const chunkGroup = this.buildChunkGeometry(cx, cz, key);
    this.storeInCache(key, chunkGroup);
    this.group.add(chunkGroup);
    this.chunkObjects.set(key, chunkGroup);
    this.loadedChunks.add(key);
  }

  /**
   * Selectively refreshes active chunks in-place when new OSM/POIs arrive.
   * Uses a staggered queue (REFRESH_PER_FRAME per frame) to avoid hitching.
   * Completely avoids full world resets, hitching, or visual pop-in.
   */
  public refreshActiveChunks() {
    // Add all currently loaded chunks to the refresh queue (avoid duplicates)
    for (const key of Array.from(this.loadedChunks)) {
      if (!this.refreshQueue.includes(key)) {
        this.refreshQueue.push(key);
      }
    }
  }


  /**
   * Remove a chunk from the scene and proactively dispose if outside budget or force purged.
   */
  private deactivateChunk(key: string, forcePurgeGpu = false) {
    const chunk = this.chunkObjects.get(key);
    if (chunk) {
      this.group.remove(chunk);
      this.chunkObjects.delete(key);
    }
    this.loadedChunks.delete(key);

    // If force purged (rear culling) or cache is over budget, proactively dispose geometry from GPU
    if (forcePurgeGpu || this.chunkCache.size > WorldChunkManager.MAX_CACHE_SIZE) {
      const cached = this.chunkCache.get(key);
      if (cached) {
        disposeHierarchy(cached);
        this.chunkCache.delete(key);
        const idx = this.cacheOrder.indexOf(key);
        if (idx !== -1) this.cacheOrder.splice(idx, 1);
      }
    }
  }

  /** Build all geometry for a new chunk. Called only on cache miss. */
  private buildChunkGeometry(cx: number, cz: number, key: string): THREE.Group {
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk-${key}`;

    const minX = cx * this.chunkSize;
    const minZ = cz * this.chunkSize;
    const centerX = minX + this.chunkSize / 2;
    const centerZ = minZ + this.chunkSize / 2;
    const chunkSeed = Math.abs((cx * 73856093) ^ (cz * 19349663));

    // 1. Ambient vegetation (cute stylized trees placed on free green open spaces)
    if (chunkSeed % 2 === 0) {
      const treeCluster = this.treeGenerator.generateTreeCluster(
        centerX,
        centerZ,
        5,
        this.chunkSize * 0.38,
        14.0,
        (x, z) => {
          // Never place trees in water (minimum 2.5m clearance from shoreline/ponds/rivers)
          if (this.waterSystem.isPointInWater(x, z, 2.5)) return true;
          // Never place trees inside buildings
          if (this.realBuildingManager.isPointInsideBuilding(x, z)) return true;
          // Never place trees inside road corridors (strictly min 4.0m clearance from ANY road edge, 11m on highways)
          const nearby = this.realBuildingManager.roadGraph.getAllSegmentsNear(x, z, 40.0);
          for (const match of nearby) {
            const seg = match.segment;
            const minClearance = (seg.roadClass === 'motorway' || seg.roadClass === 'trunk')
              ? 11.0
              : (seg.width * 0.5 + 4.0);
            if (match.dist < minClearance) return true;
          }
          return false;
        },
        this.terrainEngine
      );
      if (treeCluster.children.length > 0) {
        chunkGroup.add(treeCluster);
      }
    }


    // 3. Cleaned, validated procedural buildings (guaranteed zero road overlaps!)
    const buildingChunk = this.realBuildingManager.buildChunk(
      minX,
      minZ,
      minX + this.chunkSize,
      minZ + this.chunkSize
    );
    if (buildingChunk && buildingChunk.children.length > 0) {
      chunkGroup.add(buildingChunk);
    }

    return chunkGroup;
  }

  /**
   * Store a newly generated chunk group in the LRU cache.
   * Evicts the oldest entry when the cache is full.
   */
  private storeInCache(key: string, group: THREE.Group) {
    this.chunkCache.set(key, group);
    this.cacheOrder.push(key);

    // Evict oldest if over budget
    while (this.cacheOrder.length > WorldChunkManager.MAX_CACHE_SIZE) {
      const oldest = this.cacheOrder.shift()!;
      if (!this.loadedChunks.has(oldest)) {
        // Only dispose if not currently visible
        const old = this.chunkCache.get(oldest);
        if (old) {
          disposeHierarchy(old);
          this.chunkCache.delete(oldest);
        }
      }
    }
  }

  /**
   * Invalidates a specific chunk so it will be fully regenerated on next entry.
   * Used when OSM data arrives for an area already loaded.
   */
  public invalidateChunk(worldX: number, worldZ: number) {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;

    // Remove from active scene
    const active = this.chunkObjects.get(key);
    if (active) {
      this.group.remove(active);
      this.chunkObjects.delete(key);
      this.loadedChunks.delete(key);
    }

    // Evict from cache so it is regenerated
    const cached = this.chunkCache.get(key);
    if (cached) {
      disposeHierarchy(cached);
      this.chunkCache.delete(key);
      this.cacheOrder = this.cacheOrder.filter(k => k !== key);
    }
  }

  /**
   * Full reset — called on teleport / origin change.
   * Clears all active chunks AND cache.
   */
  public reset() {
    // Remove all active chunks from scene
    for (const key of Array.from(this.loadedChunks)) {
      const chunk = this.chunkObjects.get(key);
      if (chunk) this.group.remove(chunk);
    }
    this.loadedChunks.clear();
    this.chunkObjects.clear();

    // Dispose and clear entire cache
    for (const group of this.chunkCache.values()) {
      disposeHierarchy(group);
    }
    this.chunkCache.clear();
    this.cacheOrder = [];

    // Clear queues
    this.buildQueue = [];
    this.refreshQueue = [];
  }

  /** Stats for developer overlay. */
  public getStats(): { active: number; cached: number; cacheSize: number; queued: number } {
    return {
      active: this.loadedChunks.size,
      cached: this.chunkCache.size,
      cacheSize: WorldChunkManager.MAX_CACHE_SIZE,
      queued: this.buildQueue.length,
    };
  }
}
