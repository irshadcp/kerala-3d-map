import * as THREE from 'three';
import { GeoCoords } from '../core/geoCoords';
import { BuildingCategory } from '../core/geoTypes';
import { MapPOIEntity } from '../core/SignageTypes';
import { mergeGroup } from './GeometryMerger';
import { PhysicalSignboardSystem } from './PhysicalSignboardSystem';
import { GAME_CONFIG } from '../config/gameConfig';

export class BuildingGenerator {
  private wallMaterials: THREE.MeshLambertMaterial[];
  private roofFloorMaterial: THREE.MeshLambertMaterial;
  private signboardSystem: PhysicalSignboardSystem;

  constructor() {
    this.wallMaterials = GAME_CONFIG.palette.buildingColors.map((color) =>
      new THREE.MeshLambertMaterial({ color })
    );
    this.roofFloorMaterial = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.palette.buildingRoof });
    this.signboardSystem = new PhysicalSignboardSystem();
  }

  public createBuildingForFootprint(
    coordinates: [number, number][],
    originLat: number,
    originLng: number,
    height = 8.8,
    seed: string | number = 0,
    category: BuildingCategory = 'HOUSE',
    buildingName?: string,
    tags: Record<string, string> = {},
    nearestRoadPoint?: { x: number; z: number; roadWidth?: number },
    elevation = 0,
    foundationDepth = 0.6,
    importanceLevel: 0 | 1 | 2 | 3 | 4 | 5 = 1
  ): THREE.Object3D {
    const localCoords: { x: number; z: number }[] = [];
    for (const [lat, lng] of coordinates) {
      const { x, z } = GeoCoords.toLocalMeters(lng, lat, originLat, originLng);
      localCoords.push({ x, z });
    }
    return this.createBuildingFromLocalPolygon(localCoords, height, seed, category, buildingName, tags, nearestRoadPoint, elevation, foundationDepth, importanceLevel);
  }

  public createBuildingFromLocalPolygon(
    localCoords: { x: number; z: number }[],
    height = 8.8,
    seed: string | number = 0,
    category: BuildingCategory = 'HOUSE',
    buildingName?: string,
    tags: Record<string, string> = {},
    nearestRoadPoint?: { x: number; z: number; roadWidth?: number },
    elevation = 0,
    _foundationDepth = 0.6,
    importanceLevel: 0 | 1 | 2 | 3 | 4 | 5 = 1,
    pois?: MapPOIEntity[]
  ): THREE.Object3D {
    if (localCoords.length < 3) return new THREE.Object3D();

    let building: THREE.Object3D | null = this.createBuildingGeometry(
      localCoords,
      height,
      seed,
      category,
      buildingName,
      tags,
      nearestRoadPoint,
      importanceLevel,
      pois
    );

    if (building) {
      building.position.y = elevation;

      // Ground plinth removed as requested: buildings sit directly on ground with exact geometry footprint

      if ((building as any).isLOD) {
        const lod = building as THREE.LOD;
        for (let i = 0; i < lod.levels.length; i++) {
          lod.levels[i].object = mergeGroup(lod.levels[i].object as THREE.Group);
        }
      } else {
        building = mergeGroup(building as THREE.Group);
      }
    }
    return building || new THREE.Object3D();
  }

  private createBuildingGeometry(
    localCoords: { x: number; z: number }[],
    height = 8.8,
    seed: string | number = 0,
    category: BuildingCategory = 'HOUSE',
    buildingName?: string,
    tags: Record<string, string> = {},
    nearestRoadPoint?: { x: number; z: number; roadWidth?: number },
    importanceLevel: 0 | 1 | 2 | 3 | 4 | 5 = 1,
    pois?: MapPOIEntity[]
  ): THREE.Object3D {
    const lod = new THREE.LOD();
    lod.name = `real-building-${seed}`;

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of localCoords) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    // Close polygon
    if (localCoords.length > 3) {
      const first = localCoords[0],
        last = localCoords[localCoords.length - 1];
      if (Math.hypot(first.x - last.x, first.z - last.z) < 0.2) {
        localCoords.pop();
      }
    }
    if (localCoords.length < 3) return lod;

    const rawCenterX = (minX + maxX) / 2;
    const rawCenterZ = (minZ + maxZ) / 2;

    // We no longer scale down to 0.90! We want exact boundaries from the clipper.
    const insetCoords = localCoords;

    // BuildingGenerator renders the exact cleanedPolygon produced by RoadBuildingCleanupSystem
    const centerX = rawCenterX;
    const centerZ = rawCenterZ;

    const pts = insetCoords.map((p) => new THREE.Vector2(p.x - rawCenterX, -(p.z - rawCenterZ)));

    const shape = new THREE.Shape(pts);
    // Lightweight, clean flat extrude without heavy bevel segments for high FPS
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
      steps: 1,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);

    const numericSeed = typeof seed === 'string' ? [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0) : seed;
    const wallMat = this.wallMaterials[Math.abs(numericSeed) % this.wallMaterials.length];

    const building = new THREE.Group();
    const lod1Group = new THREE.Group();
    const lod0Group = new THREE.Group();

    // Attach data for Raycast Inspector
    (building as any).buildingData = { id: seed, name: buildingName, category, tags, height };

    // Base mesh for all LODs
    const mainMesh = new THREE.Mesh(geometry, wallMat);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    building.add(mainMesh);

    const lod1Main = new THREE.Mesh(geometry, wallMat);
    lod1Main.castShadow = true;
    lod1Main.receiveShadow = true;
    lod1Group.add(lod1Main);

    const lod0Main = new THREE.Mesh(geometry, wallMat);
    lod0Main.castShadow = true;
    lod0Main.receiveShadow = true;
    lod0Group.add(lod0Main);

    // Roof for LOD 2 and LOD 1 only
    const roofGeo = new THREE.ShapeGeometry(shape);
    roofGeo.rotateX(-Math.PI / 2);

    const roofCapMesh = new THREE.Mesh(roofGeo, this.roofFloorMaterial);
    roofCapMesh.position.y = height + 0.02;
    building.add(roofCapMesh);

    const lod1Roof = new THREE.Mesh(roofGeo, this.roofFloorMaterial);
    lod1Roof.position.y = height + 0.02;
    lod1Group.add(lod1Roof);


    // 2. Identify the Front Facade Edge facing towards the nearest road
    let bestDist = Infinity;
    let bestMid = { x: 0, z: 0 };
    let bestNormal = { x: 0, z: 1 };
    let bestAngle = 0;
    let bestEdgeLen = 0;

    for (let i = 0; i < insetCoords.length; i++) {
      const p1 = insetCoords[i];
      const p2 = insetCoords[(i + 1) % insetCoords.length];
      const edgeDx = p2.x - p1.x;
      const edgeDz = p2.z - p1.z;
      const edgeLen = Math.hypot(edgeDx, edgeDz);
      if (edgeLen < 2.5) continue;

      const midX = (p1.x + p2.x) * 0.5;
      const midZ = (p1.z + p2.z) * 0.5;

      const dist = nearestRoadPoint
        ? Math.hypot(midX - nearestRoadPoint.x, midZ - nearestRoadPoint.z)
        : -edgeLen;

      if (dist < bestDist) {
        bestDist = dist;
        bestMid = { x: midX, z: midZ };
        bestEdgeLen = edgeLen;

        let nx = edgeDz / edgeLen;
        let nz = -edgeDx / edgeLen;
        if (nx * (midX - rawCenterX) + nz * (midZ - rawCenterZ) < 0) {
          nx = -nx;
          nz = -nz;
        }
        bestNormal = { x: nx, z: nz };
        bestAngle = Math.atan2(nx, nz);
      }
    }

    // Facade surface coordinates attached flush to the wall surface
    const fx = bestMid.x - rawCenterX + bestNormal.x * 0.08;
    const fz = bestMid.z - rawCenterZ + bestNormal.z * 0.08;

    const hasName = Boolean(buildingName && buildingName.trim().length > 0);
    const isMajorPOI =
      category === 'HOSPITAL' ||
      category === 'RAILWAY_STATION' ||
      category === 'SCHOOL' ||
      category === 'COLLEGE' ||
      category === 'GOVERNMENT' ||
      category === 'LANDMARK';
    const isIdentifiedPOI =
      isMajorPOI ||
      category === 'SHOP' ||
      category === 'SUPERMARKET' ||
      category === 'RESTAURANT' ||
      category === 'CAFE' ||
      category === 'HOTEL' ||
      category === 'RELIGIOUS';

    // 3. Environmental In-World Signage
    if (bestEdgeLen > 2.5) {
      if (pois && pois.length > 0) {
        // Handle POIs mapped to this building
        const rooftopPOIs = pois.filter((p) => p.signType === 'ROOFTOP');
        const facadePOIs = pois.filter((p) => p.signType !== 'ROOFTOP');

        // A. Rooftop sign for designated rooftop POI or tall commercial building
        if (rooftopPOIs.length > 0 || (height >= 11.0 && ['COMMERCIAL', 'OFFICE', 'HOTEL', 'HOSPITAL', 'APARTMENT'].includes(category))) {
          const roofPOI = rooftopPOIs[0] || pois[0];
          const rooftopSign = this.signboardSystem.createRooftopSign({
            name: roofPOI.name,
            category: roofPOI.category,
            malayalamName: roofPOI.malayalamName,
            tags: roofPOI.tags,
            isMajorPOI: roofPOI.priorityTier === 'HIGH',
          });
          const rx = bestMid.x - rawCenterX - bestNormal.x * 0.45;
          const rz = bestMid.z - rawCenterZ - bestNormal.z * 0.45;
          rooftopSign.position.set(rx, height, rz);
          rooftopSign.rotation.y = bestAngle;
          building.add(rooftopSign);
          lod1Group.add(rooftopSign.clone());
        }

        // B. Storefront Bays & Facade signs spaced evenly along building frontage
        const candidateFacade = facadePOIs.length > 0 ? facadePOIs : (rooftopPOIs.length > 1 ? rooftopPOIs.slice(1) : []);
        const seenFacadeNames = new Set<string>();
        const uniqueFacade: MapPOIEntity[] = [];
        for (const p of candidateFacade) {
          const key = (p.name || '').trim().toLowerCase();
          if (!key || seenFacadeNames.has(key)) continue;
          seenFacadeNames.add(key);
          uniqueFacade.push(p);
        }

        const maxFacade = Math.min(4, uniqueFacade.length);
        const tx = -bestNormal.z;
        const tz = bestNormal.x;

        // Distinct colorful shop awnings for strip-mall bays
        const AWNING_COLORS = [
          0xdc2626, // Crimson Red
          0x2563eb, // Royal Blue
          0x16a34a, // Emerald Green
          0xd97706, // Amber / Saffron
          0x7c2d12, // Warm Terracotta
        ];

        if (maxFacade > 0) {
          const usableSpan = Math.max(4.0, bestEdgeLen * 0.90);
          const bayWidth = usableSpan / maxFacade;

          for (let i = 0; i < maxFacade; i++) {
            const poi = uniqueFacade[i];
            const offset = maxFacade === 1 ? 0 : ((i + 0.5) / maxFacade - 0.5) * usableSpan;
            const px = fx + tx * offset;
            const pz = fz + tz * offset;

            // 1. Separate Physical Storefront Bay (door, window, shutter, custom colored awning)
            const sfWidth = Math.max(2.4, Math.min(3.8, bayWidth * 0.88));
            const bayAwningColor = AWNING_COLORS[i % AWNING_COLORS.length];
            const storefront = this.signboardSystem.createStorefront(
              sfWidth,
              2.7,
              true,
              bayAwningColor
            );
            storefront.position.set(px, 0, pz);
            storefront.rotation.y = bestAngle;
            building.add(storefront);

            // 2. Large Non-Clashing Signboard Mounted Cleanly Above the Bay
            const signW = Math.max(2.2, Math.min(sfWidth * 0.96, bayWidth * 0.94));
            const signH = maxFacade <= 2 ? 1.05 : 0.92;
            const signY = Math.min(height * 0.65, 3.35);

            const facadeSign = this.signboardSystem.createSignboard({
              name: poi.name,
              category: poi.category,
              malayalamName: poi.malayalamName,
              tags: poi.tags,
              isMajorPOI: poi.priorityTier === 'HIGH',
              width: signW,
              height: signH,
            });
            facadeSign.position.set(px, signY, pz);
            facadeSign.rotation.y = bestAngle;
            building.add(facadeSign);

            if (poi.priorityTier === 'HIGH') {
              lod1Group.add(facadeSign.clone());
            }
          }
        }
      } else if (hasName || isIdentifiedPOI) {
        // Fallback for buildings with name or identified category
        const signName = buildingName || category;
        const sign = this.signboardSystem.createSignboard({
          name: signName,
          category,
          tags,
          isMajorPOI,
        });

        const signY = Math.min(height * 0.65, 3.6);
        sign.position.set(fx, signY, fz);
        sign.rotation.y = bestAngle;
        building.add(sign);

        // Major POI signs remain visible in LOD 1 from distance
        if (isMajorPOI || hasName) {
          const lod1Sign = sign.clone();
          lod1Group.add(lod1Sign);
        }
      }
    }

    // 4. Physical In-World POI Facade & Rooftop Features
    // Only add generic single storefront if NO multi-bay storefronts were already added
    const hasExistingPOIShops = Boolean(pois && pois.length > 0);

    // A. Commercial Storefronts & Awnings (Single bay fallback when no POI tenants mapped)
    if (!hasExistingPOIShops && (category === 'SHOP' || category === 'SUPERMARKET')) {
      const storefront = this.signboardSystem.createStorefront(
        Math.min(3.8, bestEdgeLen * 0.75),
        2.7,
        true
      );
      storefront.position.set(fx, 0, fz);
      storefront.rotation.y = bestAngle;
      building.add(storefront);
    }

    // B. Restaurants & Cafes (Single bay fallback when no POI tenants mapped)
    if (!hasExistingPOIShops && (category === 'RESTAURANT' || category === 'CAFE')) {
      const cafeFront = this.signboardSystem.createStorefront(
        Math.min(3.6, bestEdgeLen * 0.7),
        2.6,
        true,
        0xd97706
      );
      cafeFront.position.set(fx, 0, fz);
      cafeFront.rotation.y = bestAngle;
      building.add(cafeFront);
    }

    // C. Hospital Red Cross Emblem
    if (category === 'HOSPITAL') {
      const cross = this.signboardSystem.createHospitalCross(1.6);
      cross.position.set(fx, Math.max(3.8, height - 1.2), fz);
      cross.rotation.y = bestAngle;
      building.add(cross);
      lod1Group.add(cross.clone());
    }

    // D. Police Station Entrance Porch & Warning Beacon
    const isPolice =
      category === 'GOVERNMENT' &&
      ((buildingName || '').toLowerCase().includes('police') || tags.amenity === 'police');
    if (isPolice) {
      const policeFeature = this.signboardSystem.createPoliceStationFeature(
        Math.min(5.5, bestEdgeLen * 0.8)
      );
      policeFeature.position.set(fx, 0, fz);
      policeFeature.rotation.y = bestAngle;
      building.add(policeFeature);
      lod1Group.add(policeFeature.clone());
    }

    // E. Shopping Mall Entrance Canopy
    const isMall =
      (category === 'SHOP' || category === 'SUPERMARKET') &&
      ((buildingName || '').toLowerCase().includes('mall') || tags.shop === 'mall');
    if (isMall) {
      const mallFeature = this.signboardSystem.createMallEntranceFeature(
        Math.min(14.0, bestEdgeLen * 0.85)
      );
      mallFeature.position.set(fx, 0, fz);
      mallFeature.rotation.y = bestAngle;
      building.add(mallFeature);
      lod1Group.add(mallFeature.clone());
    }

    // F. Railway Station Platforms & Nameboards
    if (category === 'RAILWAY_STATION') {
      const stFeature = this.signboardSystem.createRailwayStationFeature(
        buildingName || 'RAILWAY STATION',
        Math.min(18.0, Math.max(8.0, bestEdgeLen * 0.85))
      );
      stFeature.position.set(fx + bestNormal.x * 1.8, 0, fz + bestNormal.z * 1.8);
      stFeature.rotation.y = bestAngle;
      building.add(stFeature);
      lod1Group.add(stFeature.clone());
    }

    // E. Religious Buildings (Domes, Shikharas, Steeples)
    if (category === 'RELIGIOUS') {
      const religion = (tags.religion || '').toLowerCase();
      const bName = (buildingName || '').toLowerCase();

      if (religion === 'muslim' || bName.includes('mosque') || bName.includes('masjid') || bName.includes('juma')) {
        const dome = this.signboardSystem.createMosqueDome(Math.min(3.2, Math.max(1.8, (maxX - minX) * 0.25)));
        dome.position.set(0, height + 0.15, 0);
        building.add(dome);
        lod1Group.add(dome.clone());
      } else if (religion === 'hindu' || bName.includes('temple') || bName.includes('mandir') || bName.includes('kshetram')) {
        const shikhara = this.signboardSystem.createTempleShikhara(
          Math.min(4.5, (maxX - minX) * 0.35),
          3.8
        );
        shikhara.position.set(0, height + 0.15, 0);
        building.add(shikhara);
        lod1Group.add(shikhara.clone());
      } else {
        const steeple = this.signboardSystem.createChurchSteeple(5.4);
        steeple.position.set(0, height + 0.15, 0);
        building.add(steeple);
        lod1Group.add(steeple.clone());
      }
    }

    // F. Government Neoclassical Colonnade
    if (category === 'GOVERNMENT') {
      const colonnade = this.signboardSystem.createGovernmentColonnade(
        Math.min(5.2, bestEdgeLen * 0.75),
        3.8
      );
      colonnade.position.set(fx, 0, fz);
      colonnade.rotation.y = bestAngle;
      building.add(colonnade);
    }

    lod.position.set(centerX, 0, centerZ);

    // LOD distances: only nearby buildings get heavy storefronts & signs;
    // distant buildings transition rapidly to clean, lightweight solid 3D boxes
    const lodDistances: Record<number, [number, number, number]> = {
      5: [0, 180, 500],   // landmark
      4: [0, 120, 350],   // major POI
      3: [0, 80, 220],    // commercial / named
      2: [0, 60, 160],    // road-facing
      1: [0, 45, 120],    // residential
      0: [0, 25, 80],     // background
    };
    const [d0, d1, d2] = lodDistances[importanceLevel] ?? lodDistances[1];

    lod.addLevel(building, d0);
    lod.addLevel(lod1Group, d1);
    lod.addLevel(lod0Group, d2);

    return lod;
  }
}
