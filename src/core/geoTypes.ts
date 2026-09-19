/**
 * geoTypes.ts — Master geographic feature type definitions.
 *
 * This is the SINGLE source of truth for all normalized geographic data
 * that flows through the world pipeline.
 *
 * Pipeline:
 *   RAW SOURCE → SOURCE ADAPTER → NORMALIZER → VALIDATOR → MASTER WORLD DATA → WORLD CHUNK → 3D REPRESENTATION
 */

// ============================================================
// BUILDING TYPES
// ============================================================

export type BuildingCategory =
  | 'HOUSE'
  | 'APARTMENT'
  | 'SHOP'
  | 'RESTAURANT'
  | 'CAFE'
  | 'SUPERMARKET'
  | 'SCHOOL'
  | 'COLLEGE'
  | 'HOSPITAL'
  | 'HOTEL'
  | 'OFFICE'
  | 'GOVERNMENT'
  | 'RELIGIOUS'
  | 'INDUSTRIAL'
  | 'WAREHOUSE'
  | 'GARAGE'
  | 'FARM'
  | 'PUBLIC'
  | 'RAILWAY_STATION'
  | 'BUS_STOP'
  | 'PARKING'
  | 'LANDMARK'
  | 'OTHER'
  | 'UNKNOWN';

export type BuildingModelFamily =
  | 'ResidentialHouse'
  | 'ApartmentBlock'
  | 'CommercialStore'
  | 'ReligiousMosque'
  | 'ReligiousTemple'
  | 'ReligiousChurch'
  | 'CivicSchool'
  | 'CivicHospital'
  | 'FuelStation'
  | 'IndustrialWarehouse'
  | 'GenericStylized';

/**
 * Importance of a building for LOD and streaming priority.
 *
 * 0 = background (backyard shed, anonymous structure)
 * 1 = generic residential
 * 2 = road-facing residential or commercial
 * 3 = named commercial / public building
 * 4 = major POI (hospital, school, station)
 * 5 = landmark (iconic structure, known name)
 */
export type BuildingImportanceLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Tracks how far through the processing pipeline a feature has travelled.
 * Used for debugging "where did this building disappear?" issues.
 */
export interface DataCompleteness {
  sourceExists: boolean;
  normalized: boolean;
  validated: boolean;
  generated: boolean;
  visibleInChunk: boolean;
}

// ============================================================
// GEOMETRY
// ============================================================

export interface LocalPoint2D {
  x: number;
  z: number;
}

// ============================================================
// NORMALIZED BUILDING
// ============================================================

export interface NormalizedBuilding {
  id: string | number;

  /** Which data source this feature came from */
  source: 'osm-vector' | 'osm-overpass' | 'overture' | 'custom';

  /** Source-specific IDs preserved for conflict detection / deduplication */
  sourceIds?: string[];

  /** Raw geographic footprint polygon [lng, lat][] */
  coordinates: [number, number][];

  /** Pre-computed local-space polygon in meters relative to scene origin */
  localPolygon: LocalPoint2D[];

  /** Cleaned gameplay polygon after clipping road intersections */
  cleanedPolygon?: LocalPoint2D[][]; // Multipolygon because clipping can split buildings
  
  /** The area of the cleaned polygon */
  cleanedAreaSqMeters?: number;

  /** Overlap severity percentage (0.0 to 1.0) */
  overlapSeverity?: number;

  centerLat: number;
  centerLng: number;
  centerX: number;   // metres, scene-local
  centerZ: number;   // metres, scene-local

  category: BuildingCategory;
  modelFamily: BuildingModelFamily;

  /** Semantic importance (0–5). Affects LOD distances and streaming priority. */
  importanceLevel: BuildingImportanceLevel;

  /** True when a building has at least one edge facing a drivable road */
  roadFacing: boolean;

  name?: string;
  height: number;
  levels?: number;
  tags: Record<string, string>;
  areaSqMeters: number;
  radius: number;

  /** Ground elevation at building centroid */
  elevation?: number;

  /** Downward depth of foundation mesh to avoid floating on slopes */
  foundationDepth?: number;

  validationStatus: 'clean' | 'adjusted' | 'rejected' | 'merged' | 'clipped';
  conflictDetails?: string;
  conflictType?: 'none' | 'road' | 'water' | 'railway' | 'overlap' | 'geometry';

  /** Developer debug overlay color (hex string) */
  debugColor?: string;

  /** Whether this is a building:part (sub-feature of a larger building) */
  isPart?: boolean;

  completeness?: DataCompleteness;
}

// ============================================================
// POI (Point of Interest)
// ============================================================

export type POICategory =
  | 'SHOP'
  | 'RESTAURANT'
  | 'CAFE'
  | 'SUPERMARKET'
  | 'SCHOOL'
  | 'HOSPITAL'
  | 'HOTEL'
  | 'STATION'
  | 'PETROL_STATION'
  | 'BANK'
  | 'PHARMACY'
  | 'PLACE_OF_WORSHIP'
  | 'GOVERNMENT'
  | 'PARK'
  | 'LANDMARK'
  | 'OTHER';

export interface NormalizedPOI {
  id: string;
  source: 'osm-overpass' | 'overture' | 'custom';
  category: POICategory;
  name?: string;
  nameLocal?: string; // e.g., name:ml for Malayalam
  lat: number;
  lng: number;
  localX: number;
  localZ: number;
  importanceLevel: BuildingImportanceLevel;
  /** Associated building ID if the POI maps to a building footprint */
  associatedBuildingId?: string | number;
  tags: Record<string, string>;
}

// ============================================================
// ROAD TYPES
// ============================================================

export type RoadClass =
  | 'motorway'
  | 'trunk'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'residential'
  | 'service'
  | 'unclassified'
  | 'path';

export interface RoadSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  p1: LocalPoint2D & { lat: number; lng: number };
  p2: LocalPoint2D & { lat: number; lng: number };
  length: number;
  roadClass: RoadClass;
  width: number;
  lanes: number;
  oneway: boolean;
  name?: string;
  malayalamName?: string;
  /** Unit direction vector (p1 → p2) */
  ux: number;
  uz: number;
  /** Perpendicular normal (left-hand side) */
  nx: number;
  nz: number;
  /** 4-vertex polygon bounding the drivable lane corridor */
  corridorPoly: LocalPoint2D[];
  /** Whether segment is on a bridge */
  isBridge?: boolean;
  /** Whether segment is in a tunnel */
  isTunnel?: boolean;
  /** Speed limit in km/h where available */
  speedLimitKph?: number;
  /** True if this is one side of a divided dual-carriageway highway (e.g. National Highway) */
  isDualCarriageway?: boolean;
  /** Paired opposing carriageway segment ID */
  pairedSegmentId?: string;
}

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  lat: number;
  lng: number;
  connectedSegmentIds: string[];
}

// ============================================================
// LAND AREA
// ============================================================

export type LandAreaClass =
  | 'park'
  | 'forest'
  | 'farmland'
  | 'grass'
  | 'meadow'
  | 'beach'
  | 'scrub'
  | 'industrial'
  | 'residential'
  | 'commercial'
  | 'cemetery'
  | 'military'
  | 'unknown';

export interface NormalizedLandArea {
  id: string;
  source: 'osm-overpass' | 'overture' | 'custom';
  class: LandAreaClass;
  polygon: LocalPoint2D[];
  areaSqMeters: number;
}

// ============================================================
// PARKING
// ============================================================

export interface ParkingSlot {
  id: string;
  roadSegmentId: string;
  position: LocalPoint2D;
  rotationY: number;
  width: number;
  length: number;
  isOccupied: boolean;
}

// ============================================================
// VALIDATION / REPORTING
// ============================================================

/** Per-build validation report produced by WorldCompiler */
export interface WorldCompileReport {
  timestamp: string;
  buildingsScanned: number;
  buildingsNormalized: number;
  buildingsValidated: number;
  buildingsGenerated: number;
  overlapsDetected: number;
  overlapsCorrected: number;
  buildingsRejected: number;
  roadConflicts: number;
  waterConflicts: number;
  railwayConflicts: number;
  treeConflicts: number;
  terrainConflicts: number;
  importanceLevelCount: Record<BuildingImportanceLevel, number>;
  categoriesCount: Record<BuildingCategory, number>;
}

/** Legacy alias kept for component compatibility */
export interface ValidationReport {
  timestamp: string;
  buildingsFound: number;
  buildingsGenerated: number;
  missingBuildings: number;
  roadConflictsDetected: number;
  roadConflictsResolved: number;
  invalidGeometryCount: number;
  categoriesCount: Record<BuildingCategory, number>;
}
