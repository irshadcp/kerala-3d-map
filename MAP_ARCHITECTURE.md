# MAP ARCHITECTURE

Real-World 3D Open-World Game — Map Foundation Technical Reference

---

## 1. System Overview

```
RAW GEOGRAPHIC SOURCE (OpenStreetMap via Overpass API)
        ↓
  OpenStreetMapFetcher          [src/core/OpenStreetMapFetcher.ts]
        ↓
  GeoDataPipeline               [src/core/GeoDataPipeline.ts]
  (normalise, compute area, classify)
        ↓
  BuildingClassifier            [src/core/BuildingClassifier.ts]
  (category, modelFamily, height estimation)
        ↓
  RoadGraph / RailwayGraph      [src/core/RoadGraph.ts / RailwayGraph.ts]
  (network graph from raw OSM way data)
        ↓
  WorldCompiler                 [src/core/WorldCompiler.ts]
  (geometry validation, conflict resolution, importance scoring)
        ↓
  NormalizedBuilding / RoadSegment / RailwaySegment
  (canonical internal feature representations)
        ↓
  WorldChunkManager             [src/core/WorldChunkManager.ts]
  (200m × 200m spatial grid, LRU chunk cache)
        ↓
  BuildingGenerator             [src/graphics/BuildingGenerator.ts]
  RoadMeshManager               [src/graphics/RoadMeshManager.ts]
  TreeGenerator / StreetElementGenerator
        ↓
  THREE.js Scene
```

---

## 2. Coordinate System

| Property | Value |
|----------|-------|
| **Input** | Latitude / Longitude (WGS84) |
| **Local Space** | Metres, origin = player spawn lat/lng |
| **+X axis** | East |
| **+Y axis** | Up (elevation) |
| **−Z axis** | North (Three.js forward convention) |
| **Transform** | `GeoCoords.toLocalMeters(lat, lng, originLat, originLng)` |
| **Elevation unit** | Metres above sea level |
| **Scale** | 1 world unit = 1 real metre |

All systems (buildings, roads, terrain, water, railway) must use `GeoCoords.toLocalMeters()` exclusively. No system may implement its own coordinate conversion.

---

## 3. Master Feature Types

See [`src/core/geoTypes.ts`](src/core/geoTypes.ts) for all type definitions.

### NormalizedBuilding
Key fields:
- `id` — stable unique identifier
- `source` — data origin (`osm-overpass`, `osm-vector`, `overture`, `custom`)
- `coordinates` — raw `[lng, lat][]` footprint
- `localPolygon` — pre-projected metres polygon (LocalPoint2D[])
- `category` — `BuildingCategory` (HOUSE, SHOP, HOSPITAL, etc.)
- `importanceLevel` — `0–5` (drives LOD distances)
- `roadFacing` — `boolean` (faces drivable road)
- `validationStatus` — `clean | adjusted | rejected | merged`
- `conflictType` — what conflict was detected/resolved

### NormalizedPOI
Separate from buildings. A POI can reference a building via `associatedBuildingId`.

### RoadSegment
- Contains `corridorPoly` (4-vertex drivable lane polygon)
- Buildings must not occupy this polygon
- Contains `isBridge`, `isTunnel` flags

### NormalizedLandArea
Polygon areas for parks, forests, beaches, farms. Used for vegetation placement.

---

## 4. Building Importance Levels

Determined by `WorldCompiler.computeImportance()` after geometry validation.

| Level | Category | LOD2 full | LOD1 body | LOD0 silhouette |
|-------|----------|-----------|-----------|-----------------|
| 5 | Landmark | 0 m | 300 m | 700 m |
| 4 | Hospital, Station, School | 0 m | 200 m | 500 m |
| 3 | Named shop/restaurant/religious | 0 m | 120 m | 350 m |
| 2 | Road-facing / unnamed commercial | 0 m | 80 m | 250 m |
| 1 | Residential (default) | 0 m | 60 m | 200 m |
| 0 | Background / tiny shed | 0 m | 35 m | 120 m |

---

## 5. World Chunk System

```
WorldChunkManager
├── chunkSize = 200m
├── activeRadius = 2  (5×5 = 25 chunks active ≈ 1 km²)
├── chunkCache (LRU, max 80 entries)
└── chunk group → terrain + trees + buildings + roads
```

### Ownership Rule
A feature belongs to the chunk whose cell **contains its centroid/midpoint**. This eliminates boundary duplication.

### Caching Strategy
Generated chunks are stored in an LRU cache. Re-entering a previously visited chunk restores geometry in O(1) from cache. Eviction disposes WebGL geometry for the oldest uncached chunks.

### Invalidation
Call `worldChunkManager.invalidateChunk(worldX, worldZ)` when new OSM data arrives for an already-loaded area.

---

## 6. Road System

```
Raw OSM way (highway=*)
        ↓
RoadGraph.addRoadFeature()
  - classify: RoadClass (motorway, primary, secondary, tertiary, residential, service, path)
  - estimate width from lanes + class
  - generate corridorPoly (4-vertex drivable zone)
        ↓
RoadCorridorSystem
  - spatial index for conflict queries
  - isPointInRoadCorridor(x, z) → boolean
  - resolveBuildingEncroachment(polygon, cx, cz) → shift vector
        ↓
RoadMeshManager.buildChunk(minX, minZ, maxX, maxZ)
  - generates all segment meshes into a single batched rawGroup
  - merges once per chunk (1 draw call per material per chunk)
```

### Road Width Profiles (default)

| Class | Width (m) | Lanes |
|-------|-----------|-------|
| motorway / trunk | 14–18 | 4+ |
| primary | 10–12 | 4 |
| secondary | 8–10 | 2–4 |
| tertiary | 6–8 | 2 |
| residential | 5–7 | 2 |
| service | 4–5 | 1–2 |
| path | 2–3 | 1 |

---

## 7. Water System

`WaterSystem` maintains:
- `polygons[]` — all known water bodies (river, lake, pond, canal, sea)
- `spatialGrid` — 500m cells for fast lookup

### Exclusion Zones
`isPointInWater(x, z, margin)` returns `true` for:
- buildings (rejected unless pier/ferry/houseboat)
- trees
- regular vehicles
- player spawn points

Exceptions allowed:
- bridges (flagged on road/rail segments)
- piers and ferry terminals
- marine vehicles

---

## 8. Railway System

`RailwayGraph` builds a connected graph of segments. Key properties per segment:
- `isBridge` — elevated over water / road
- `gauge` — 1.676m (Indian broad gauge) or 1.435m (metro)
- `type` — `rail | light_rail | subway`

Railway never terminates at chunk or tile boundary. The `RailwayGraph` is built globally from all fetched OSM data.

---

## 9. Terrain System

`TerrainEngine` currently uses procedural elevation based on geographic region:

| Zone | Elevation Range | Example Locations |
|------|----------------|-------------------|
| `coastal_plain` | 1–6 m | Kochi, Alappuzha, Ponnani |
| `midland_hills` | 15–95 m | Malappuram, Thrissur, Kannur |
| `highland_ghats` | 600–1600 m | Wayanad, Idukki, Munnar |

Future: Replace procedural with Copernicus GLO-30 DEM tile fetching.

---

## 10. WorldCompiler Pipeline

Called after OSM fetch to produce validated game-ready buildings:

1. **Geometry integrity** — reject polygons with <3 vertices or area <4m²
2. **Building-building overlap** — detect by centroid distance vs area radius; displace or reject
3. **Building-road conflict** — use `RoadCorridorSystem.resolveBuildingEncroachment()`
4. **Building-water conflict** — push away from water edge; reject if fully submerged
5. **Building-railway conflict** — push away 8m from track centre
6. **Terrain grounding** — sample elevation at vertices; set `elevation` and `foundationDepth`
7. **Importance scoring** — `WorldCompiler.computeImportance()` → `importanceLevel: 0–5`

---

## 11. Validation Report

`WorldCompileReport` tracks:
- `buildingsScanned` — raw input count
- `buildingsNormalized` — after parsing
- `buildingsValidated` — after geometry filter
- `buildingsGenerated` — successfully added to world
- `overlapsDetected / overlapsCorrected`
- `roadConflicts / waterConflicts / railwayConflicts / terrainConflicts`
- `importanceLevelCount` — breakdown by importance level
- `categoriesCount` — breakdown by building category

---

## 12. Performance Strategy

| Technique | Where Used |
|-----------|-----------|
| Geometry merging | Per-chunk roads and buildings merged to 1 draw call each |
| LOD | Three.js LOD with importance-driven distance thresholds |
| Chunk LRU cache | 80-chunk cache avoids re-generating visited areas |
| Spatial indexing | Road corridor, water bodies, railway — 30-500m grid cells |
| Material sharing | All roads share 5 material instances; buildings share wall/roof/window materials |
| Async OSM fetch | Overpass queries are async; scene is never blocked |
| In-flight dedup | `OpenStreetMapFetcher` deduplicates concurrent requests for same bucket |
| Chunk deactivation | Out-of-range chunks removed from scene (not disposed) for fast restore |

---

## 13. Data Sources

See [`DATA_LICENSES.md`](DATA_LICENSES.md) for full license information.

| Source | Purpose | Status |
|--------|---------|--------|
| OpenStreetMap via Overpass | Buildings, roads, water, railway, POIs | ✅ Active |
| OpenFreeMap | Base map tiles (MapLibre) | ✅ Active |
| Copernicus DEM GLO-30 | Real elevation data | 🕐 Planned |
| Overture Maps | Building footprints, heights | 🕐 Planned |

---

## 14. Key Files Reference

| File | Responsibility |
|------|---------------|
| `src/core/geoTypes.ts` | All canonical feature type definitions |
| `src/core/geoCoords.ts` | Single geographic→world transform service |
| `src/core/OpenStreetMapFetcher.ts` | OSM data fetching + caching |
| `src/core/GeoDataPipeline.ts` | Building normalisation + geometry utilities |
| `src/core/BuildingClassifier.ts` | OSM tag → BuildingCategory + ModelFamily |
| `src/core/WorldCompiler.ts` | Conflict resolution + importance scoring |
| `src/core/WorldChunkManager.ts` | Spatial streaming + LRU chunk cache |
| `src/core/RoadGraph.ts` | Road network graph |
| `src/core/RoadCorridorSystem.ts` | Road exclusion zone queries |
| `src/core/RailwayGraph.ts` | Railway network graph |
| `src/core/WaterSystem.ts` | Water exclusion zones |
| `src/core/TerrainEngine.ts` | Elevation sampling + terrain mesh |
| `src/graphics/BuildingGenerator.ts` | 3D stylized building mesh + LOD |
| `src/graphics/RoadMeshManager.ts` | Batched road mesh per chunk |
| `src/graphics/RealBuildingManager.ts` | Building fetch, normalize, chunk build |
| `src/graphics/ThreeMapLayer.ts` | Three.js scene + MapLibre integration |
| `src/config/gameConfig.ts` | Color palette + tunable constants |
