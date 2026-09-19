import * as THREE from 'three';
import { GeoCoords } from '../core/geoCoords';
import { disposeHierarchy } from './disposeUtils';

export interface WaterCraftEntity {
  group: THREE.Group;
  baseX: number;
  baseZ: number;
  heading: number;
  speed: number;
  bobPhase: number;
  patrolRadius: number;
  anchorLat: number;
  anchorLng: number;
  isAnchored: boolean;
  type: 'ship' | 'houseboat' | 'canoe' | 'motorboat';
}

export interface WaterZone {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  type: 'port' | 'river' | 'lake' | 'backwater';
}

/**
 * Manages authentic Kerala maritime watercraft:
 * 1. Port Cargo Ships & Trawlers anchored at harbors (Kochi, Ponnani, Beypore, Kollam)
 * 2. Traditional Kerala Houseboats (കെട്ടുവള്ളം - Kettuvallam) with curved thatch roofs
 * 3. Wooden Country Boats (ചെറിയ തോണി) resting on rivers and ponds
 * 4. Spatial water boundary index (isWaterAt) to prevent trees from spawning in water!
 */
export class WaterVehicleManager {
  public group: THREE.Group;
  private craftList: WaterCraftEntity[] = [];
  private activeWaterZones: { centerX: number; centerZ: number; radius: number }[] = [];
  private time = 0;

  // Cached materials
  private hullWhiteMat: THREE.MeshLambertMaterial;
  private hullDarkMat: THREE.MeshLambertMaterial;
  private hullRedMat: THREE.MeshLambertMaterial;
  private windowMat: THREE.MeshLambertMaterial;
  private teakWoodMat: THREE.MeshLambertMaterial;
  private thatchRoofMat: THREE.MeshLambertMaterial;
  private containerMats: THREE.MeshLambertMaterial[];
  private waterRippleMat: THREE.MeshBasicMaterial;

  // Comprehensive Kerala Water Hotspots (Ports, Harbors, Rivers, Lakes, Backwaters)
  public static WATER_HOTSPOTS: WaterZone[] = [
    // Ports & Harbors
    { name: 'Kochi Port & Harbor', lat: 9.9674, lng: 76.2427, radiusMeters: 1400, type: 'port' },
    { name: 'Ponnani Port & Harbor', lat: 10.7725, lng: 75.9230, radiusMeters: 900, type: 'port' },
    { name: 'Beypore Port & Chaliyar Estuary', lat: 11.1648, lng: 75.8118, radiusMeters: 1100, type: 'port' },
    { name: 'Kollam Port & Ashtamudi Inlet', lat: 8.8785, lng: 76.5680, radiusMeters: 1200, type: 'port' },

    // Rivers & Estuaries
    { name: 'Kadalundi River & Mangrove Estuary', lat: 11.1305, lng: 75.8350, radiusMeters: 750, type: 'river' },
    { name: 'Bharathappuzha (Nila River) Chamravattom', lat: 10.8280, lng: 75.9400, radiusMeters: 650, type: 'river' },
    { name: 'Periyar River Aluva', lat: 10.1085, lng: 76.3450, radiusMeters: 550, type: 'river' },
    { name: 'Pampa River Basin', lat: 9.2648, lng: 76.7870, radiusMeters: 600, type: 'river' },

    // Lakes & Backwaters
    { name: 'Alappuzha Punnamada Lake', lat: 9.4981, lng: 76.3388, radiusMeters: 1600, type: 'lake' },
    { name: 'Kumarakom Vembanad Backwaters', lat: 9.6175, lng: 76.4300, radiusMeters: 1800, type: 'backwater' },
    { name: 'Ashtamudi Lake Kollam', lat: 8.9100, lng: 76.5900, radiusMeters: 1500, type: 'lake' },
  ];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'water-vehicles';

    this.hullWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    this.hullDarkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.hullRedMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    this.windowMat = new THREE.MeshLambertMaterial({ color: 0x7dd3fc });
    this.teakWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Warm Kerala Anjili/Teak wood
    this.thatchRoofMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Golden woven bamboo/coir thatch

    this.containerMats = [
      new THREE.MeshLambertMaterial({ color: 0x2563eb }), // Blue
      new THREE.MeshLambertMaterial({ color: 0xdc2626 }), // Red
      new THREE.MeshLambertMaterial({ color: 0x16a34a }), // Green
      new THREE.MeshLambertMaterial({ color: 0xeab308 }), // Yellow
    ];

    this.waterRippleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
  }

  /**
   * Spatial query: Checks if a local coordinate (x, z) is situated inside a water body.
   * Tree generators query this to GUARANTEE zero trees are placed inside water!
   */
  public isWaterAt(x: number, z: number): boolean {
    for (const zone of this.activeWaterZones) {
      const distSq = (x - zone.centerX) ** 2 + (z - zone.centerZ) ** 2;
      if (distSq < zone.radius ** 2) {
        return true;
      }
    }
    return false;
  }

  /**
   * Replaces watercraft and indexes water zones when player teleports or moves.
   */
  public updateOrigin(originLat: number, originLng: number) {
    this.clear();
    this.activeWaterZones = [];

    // Check proximity to all known Kerala water hotspots
    for (const spot of WaterVehicleManager.WATER_HOTSPOTS) {
      const distMeters = GeoCoords.distanceMeters(originLat, originLng, spot.lat, spot.lng);

      // If within 15 km of player view
      if (distMeters < 15000) {
        const { x: zX, z: zZ } = GeoCoords.toLocalMeters(spot.lat, spot.lng, originLat, originLng);
        this.activeWaterZones.push({
          centerX: zX,
          centerZ: zZ,
          radius: spot.radiusMeters,
        });

        if (spot.type === 'port') {
          // 1. ANCHORED PORT CARGO SHIPS & HARBOR TRAWLERS
          this.createPortShip(spot.lat + 0.0015, spot.lng + 0.002, originLat, originLng, 0);
          this.createPortShip(spot.lat - 0.002, spot.lng + 0.0035, originLat, originLng, 1);
          // Also 2 traditional fishing boats at the wharf
          this.createCountryCanoe(spot.lat + 0.0008, spot.lng + 0.001, originLat, originLng, 0);
        } else if (spot.type === 'backwater' || spot.type === 'lake') {
          // 2. KERALA HOUSEBOATS (കെട്ടുവള്ളം) on backwaters & lakes
          this.createKeralaHouseboat(spot.lat, spot.lng, originLat, originLng, 0);
          this.createKeralaHouseboat(spot.lat + 0.0012, spot.lng - 0.0015, originLat, originLng, 1);
          this.createCountryCanoe(spot.lat - 0.0008, spot.lng + 0.001, originLat, originLng, 2);
        } else {
          // 3. RIVERS & ESTUARIES: Wooden Country Canoes (തോണികൾ) & small motorboat
          this.createKeralaHouseboat(spot.lat + 0.0005, spot.lng, originLat, originLng, 0);
          this.createCountryCanoe(spot.lat - 0.0006, spot.lng + 0.0008, originLat, originLng, 1);
          this.createCountryCanoe(spot.lat + 0.001, spot.lng - 0.001, originLat, originLng, 2);
        }
      }
    }

    // Default fallback: If player is near an arbitrary coast/river without preset name
    if (this.craftList.length === 0) {
      const fallbackWaterX = 140;
      const fallbackWaterZ = 180;
      this.activeWaterZones.push({
        centerX: fallbackWaterX,
        centerZ: fallbackWaterZ,
        radius: 120,
      });

      const bCoord = GeoCoords.toLatLng(fallbackWaterX, fallbackWaterZ, originLat, originLng);
      this.createCountryCanoe(bCoord.lat, bCoord.lng, originLat, originLng, 0);
    }
  }

  /**
   * 1. PORT CARGO SHIP (പോർട്ടിൽ മാത്രം ആങ്കർ ഇട്ട് കിടക്കുന്ന വലിയ ഷിപ്പുകൾ)
   * Detailed with red/dark hull, containers, cargo crane, navigation bridge, and anchor chain.
   */
  private createPortShip(lat: number, lng: number, originLat: number, originLng: number, seed = 0) {
    const { x, z } = GeoCoords.toLocalMeters(lat, lng, originLat, originLng);
    const ship = new THREE.Group();
    ship.name = `port-cargo-ship-${seed}`;

    const scale = 1.35;
    const length = 28.0 * scale;
    const width = 8.5 * scale;
    const depth = 3.8 * scale;

    // A. Main Ship Hull (Lower Red underwater section + Dark upper freeboard)
    const lowerHullGeo = new THREE.BoxGeometry(width * 0.88, depth * 0.5, length);
    const lowerHull = new THREE.Mesh(lowerHullGeo, this.hullRedMat);
    lowerHull.position.y = depth * 0.25;
    ship.add(lowerHull);

    const upperHullGeo = new THREE.BoxGeometry(width, depth * 0.5, length);
    const upperHull = new THREE.Mesh(upperHullGeo, this.hullDarkMat);
    upperHull.position.y = depth * 0.75;
    upperHull.castShadow = true;
    ship.add(upperHull);

    // Pointed Bow Nose
    const bowGeo = new THREE.ConeGeometry(width * 0.5, 5.5 * scale, 4);
    bowGeo.rotateX(Math.PI / 2);
    bowGeo.rotateY(Math.PI / 4);
    const bowMesh = new THREE.Mesh(bowGeo, this.hullDarkMat);
    bowMesh.position.set(0, depth * 0.75, length * 0.5 + 2.4 * scale);
    ship.add(bowMesh);

    // B. Superstructure & Navigation Bridge (White tower at aft/stern)
    const bridgeWidth = width * 0.8;
    const bridgeHeight = 5.2 * scale;
    const bridgeLength = 6.8 * scale;
    const bridgeZ = -length * 0.32;

    const bridgeGeo = new THREE.BoxGeometry(bridgeWidth, bridgeHeight, bridgeLength);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this.hullWhiteMat);
    bridgeMesh.position.set(0, depth + bridgeHeight * 0.5, bridgeZ);
    bridgeMesh.castShadow = true;
    ship.add(bridgeMesh);

    // Bridge Windows (panoramic sky-blue band)
    const winGeo = new THREE.BoxGeometry(bridgeWidth + 0.1, 0.8 * scale, bridgeLength * 0.7);
    const winMesh = new THREE.Mesh(winGeo, this.windowMat);
    winMesh.position.set(0, depth + bridgeHeight * 0.78, bridgeZ);
    ship.add(winMesh);

    // Smokestack Funnel (Red with dark cap)
    const funnelGeo = new THREE.CylinderGeometry(0.8 * scale, 0.9 * scale, 3.2 * scale, 12);
    const funnelMesh = new THREE.Mesh(funnelGeo, this.hullRedMat);
    funnelMesh.position.set(0, depth + bridgeHeight + 1.4 * scale, bridgeZ - 1.2 * scale);
    ship.add(funnelMesh);

    // C. Cargo Container Stacks on Forward Deck
    const containerL = 5.5 * scale;
    const containerW = 2.4 * scale;
    const containerH = 2.4 * scale;

    const stackOffsets = [
      { x: -width * 0.22, z: 2.0 * scale, c: 0 },
      { x: width * 0.22, z: 2.0 * scale, c: 1 },
      { x: -width * 0.22, z: 8.5 * scale, c: 2 },
      { x: width * 0.22, z: 8.5 * scale, c: 3 },
      { x: 0, z: 5.2 * scale, c: 0 }, // 2nd tier on top
    ];

    for (const st of stackOffsets) {
      const cGeo = new THREE.BoxGeometry(containerW, containerH, containerL);
      const cMesh = new THREE.Mesh(cGeo, this.containerMats[st.c % this.containerMats.length]);
      const posY = st.z === 5.2 * scale ? depth + containerH * 1.5 : depth + containerH * 0.5;
      cMesh.position.set(st.x, posY, st.z);
      cMesh.castShadow = true;
      ship.add(cMesh);
    }

    // D. Cargo Loading Boom Crane
    const cranePole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 6.0 * scale, 8), this.hullDarkMat);
    cranePole.position.set(0, depth + 3.0 * scale, -2.5 * scale);
    ship.add(cranePole);

    const boomArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 7.5 * scale), this.containerMats[3]);
    boomArm.rotation.x = -0.35;
    boomArm.position.set(0, depth + 5.2 * scale, 0.8 * scale);
    ship.add(boomArm);

    // E. Heavy Anchored Water Ripple Ring
    const ripGeo = new THREE.RingGeometry(length * 0.45, length * 0.65, 24);
    const ripMesh = new THREE.Mesh(ripGeo, this.waterRippleMat);
    ripMesh.rotation.x = -Math.PI / 2;
    ripMesh.position.y = 0.08;
    ship.add(ripMesh);

    ship.position.set(x, 0, z);
    ship.rotation.y = seed * 1.4;
    this.group.add(ship);

    this.craftList.push({
      group: ship,
      baseX: x,
      baseZ: z,
      heading: ship.rotation.y,
      speed: 0, // Anchored firmly at port
      bobPhase: seed * 2.0,
      patrolRadius: 0,
      anchorLat: lat,
      anchorLng: lng,
      isAnchored: true,
      type: 'ship',
    });
  }

  /**
   * 2. TRADITIONAL KERALA HOUSEBOAT (കെട്ടുവള്ളം - Kettuvallam)
   * Iconic curved bamboo thatch roof, Anjili wood hull, open sit-out front deck with lantern.
   */
  private createKeralaHouseboat(lat: number, lng: number, originLat: number, originLng: number, seed = 0) {
    const { x, z } = GeoCoords.toLocalMeters(lat, lng, originLat, originLng);
    const boat = new THREE.Group();
    boat.name = `kerala-houseboat-${seed}`;

    const length = 14.0;
    const width = 4.2;
    const height = 1.6;

    // A. Curved Wooden Hull (Dark polished Kerala Anjili/Teak wood)
    const hullGeo = new THREE.BoxGeometry(width, height, length);
    const hullMesh = new THREE.Mesh(hullGeo, this.teakWoodMat);
    hullMesh.position.y = height * 0.45;
    hullMesh.castShadow = true;
    boat.add(hullMesh);

    // Pointed Up-Curved Prow (Front) & Stern (Back)
    const prowGeo = new THREE.ConeGeometry(width * 0.52, 3.2, 4);
    prowGeo.rotateX(Math.PI / 2);
    prowGeo.rotateY(Math.PI / 4);
    const prowMesh = new THREE.Mesh(prowGeo, this.teakWoodMat);
    prowMesh.position.set(0, height * 0.65, length * 0.5 + 1.4);
    boat.add(prowMesh);

    const sternMesh = new THREE.Mesh(prowGeo, this.teakWoodMat);
    sternMesh.rotation.z = Math.PI;
    sternMesh.position.set(0, height * 0.65, -length * 0.5 - 1.4);
    boat.add(sternMesh);

    // B. Iconic Arched Bamboo Thatch Canopy (കെട്ടുവള്ളത്തിന്റെ മേൽക്കൂര)
    const roofLen = length * 0.72;
    const roofRadius = width * 0.58;
    const roofGeo = new THREE.CylinderGeometry(roofRadius, roofRadius, roofLen, 16, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateY(Math.PI / 2);

    const thatchMesh = new THREE.Mesh(roofGeo, this.thatchRoofMat);
    thatchMesh.position.set(0, height + 0.6, -0.6);
    thatchMesh.castShadow = true;
    boat.add(thatchMesh);

    // C. Traditional Wooden Pillars supporting the canopy
    for (let p = -2; p <= 2; p++) {
      const pz = p * 1.8;
      const pilGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
      const pilL = new THREE.Mesh(pilGeo, this.teakWoodMat);
      pilL.position.set(-width * 0.45, height + 0.7, pz);
      boat.add(pilL);

      const pilR = new THREE.Mesh(pilGeo, this.teakWoodMat);
      pilR.position.set(width * 0.45, height + 0.7, pz);
      boat.add(pilR);
    }

    // D. Front Open Sit-Out Verandah with deck chairs
    const deckChair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), this.thatchRoofMat);
    deckChair.position.set(-0.9, height + 0.35, length * 0.32);
    boat.add(deckChair);

    const deckChair2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), this.thatchRoofMat);
    deckChair2.position.set(0.9, height + 0.35, length * 0.32);
    boat.add(deckChair2);

    // Hanging traditional brass hurricane lamp
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfde047 })
    );
    lantern.position.set(0, height + 1.2, length * 0.3);
    boat.add(lantern);

    // E. Floating Water Ripple Ring
    const ripGeo = new THREE.RingGeometry(length * 0.4, length * 0.58, 20);
    const ripMesh = new THREE.Mesh(ripGeo, this.waterRippleMat);
    ripMesh.rotation.x = -Math.PI / 2;
    ripMesh.position.y = 0.05;
    boat.add(ripMesh);

    boat.position.set(x, 0, z);
    this.group.add(boat);

    this.craftList.push({
      group: boat,
      baseX: x,
      baseZ: z,
      heading: seed * 1.5,
      speed: 1.2 + seed * 0.4, // Gentle slow cruising or drifting
      bobPhase: seed * 1.4,
      patrolRadius: 35 + seed * 15,
      anchorLat: lat,
      anchorLng: lng,
      isAnchored: false,
      type: 'houseboat',
    });
  }

  /**
   * 3. WOODEN COUNTRY BOAT (ചെറിയ തോണി / Canoe)
   * Small traditional Kerala wooden rowing boat resting near riverbanks or ponds with oars.
   */
  private createCountryCanoe(lat: number, lng: number, originLat: number, originLng: number, seed = 0) {
    const { x, z } = GeoCoords.toLocalMeters(lat, lng, originLat, originLng);
    const canoe = new THREE.Group();
    canoe.name = `kerala-canoe-${seed}`;

    const length = 5.6;
    const width = 1.5;
    const height = 0.75;

    // Narrow tapered wooden hull
    const hullGeo = new THREE.BoxGeometry(width, height, length);
    const hullMesh = new THREE.Mesh(hullGeo, this.teakWoodMat);
    hullMesh.position.y = height * 0.45;
    hullMesh.castShadow = true;
    canoe.add(hullMesh);

    // Sharp Bow & Stern Ends
    const endGeo = new THREE.ConeGeometry(width * 0.48, 1.4, 4);
    endGeo.rotateX(Math.PI / 2);
    endGeo.rotateY(Math.PI / 4);

    const prow = new THREE.Mesh(endGeo, this.teakWoodMat);
    prow.position.set(0, height * 0.55, length * 0.5 + 0.6);
    canoe.add(prow);

    const stern = new THREE.Mesh(endGeo, this.teakWoodMat);
    stern.rotation.z = Math.PI;
    stern.position.set(0, height * 0.55, -length * 0.5 - 0.6);
    canoe.add(stern);

    // Wooden cross benches (seats)
    for (let s = -1; s <= 1; s++) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.08, 0.35), this.thatchRoofMat);
      bench.position.set(0, height * 0.7, s * 1.2);
      canoe.add(bench);
    }

    // Wooden Rowing Oar (തുഴ)
    const oarPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), this.thatchRoofMat);
    oarPole.rotation.z = 0.5;
    oarPole.position.set(width * 0.4, height + 0.3, 0.2);
    canoe.add(oarPole);

    const oarBlade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.04), this.teakWoodMat);
    oarBlade.position.set(width * 0.8, height * 0.2, 0.2);
    canoe.add(oarBlade);

    // Floating ripple
    const ripGeo = new THREE.RingGeometry(length * 0.45, length * 0.62, 16);
    const ripMesh = new THREE.Mesh(ripGeo, this.waterRippleMat);
    ripMesh.rotation.x = -Math.PI / 2;
    ripMesh.position.y = 0.04;
    canoe.add(ripMesh);

    canoe.position.set(x, 0, z);
    this.group.add(canoe);

    this.craftList.push({
      group: canoe,
      baseX: x,
      baseZ: z,
      heading: seed * 1.8,
      speed: 0.6 + seed * 0.3,
      bobPhase: seed * 2.2,
      patrolRadius: 18 + seed * 10,
      anchorLat: lat,
      anchorLng: lng,
      isAnchored: seed % 2 === 0, // Some resting/anchored, some gently drifting
      type: 'canoe',
    });
  }

  /**
   * Animates all watercraft every frame with buoyancy, roll, and gentle scenic drift.
   */
  public update(delta: number) {
    this.time += delta;

    for (let i = 0; i < this.craftList.length; i++) {
      const craft = this.craftList[i];

      if (craft.isAnchored) {
        // Anchored at harbor: Heavy gentle rocking & small buoyancy bob
        const bobY = Math.sin(this.time * 1.5 + craft.bobPhase) * 0.12;
        const rollZ = Math.cos(this.time * 1.1 + craft.bobPhase) * 0.025;
        const pitchX = Math.sin(this.time * 0.9 + craft.bobPhase) * 0.015;

        craft.group.position.y = bobY;
        craft.group.rotation.set(pitchX, craft.heading, rollZ);
      } else {
        // Floating / Drifting gently on river or lake
        const bobY = Math.sin(this.time * 2.2 + craft.bobPhase) * 0.16;
        const rollZ = Math.cos(this.time * 1.6 + craft.bobPhase) * 0.04;
        const pitchX = Math.sin(this.time * 1.2 + craft.bobPhase) * 0.02;

        const angle = this.time * 0.06 * craft.speed + craft.bobPhase;
        const targetX = craft.baseX + Math.cos(angle) * craft.patrolRadius;
        const targetZ = craft.baseZ + Math.sin(angle) * (craft.patrolRadius * 0.65);

        craft.group.position.x = targetX;
        craft.group.position.y = bobY;
        craft.group.position.z = targetZ;

        const moveHeading = -angle + Math.PI / 2;
        craft.group.rotation.set(pitchX, moveHeading, rollZ);
      }
    }
  }

  public clear() {
    for (const craft of this.craftList) {
      this.group.remove(craft.group);
      disposeHierarchy(craft.group);
    }
    this.craftList = [];
    this.activeWaterZones = [];
  }

  public destroy() {
    this.clear();
    disposeHierarchy(this.group);
  }
}
