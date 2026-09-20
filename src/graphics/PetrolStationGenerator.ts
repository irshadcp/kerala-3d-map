import * as THREE from 'three';

export class PetrolStationGenerator {
  private static cache: THREE.Group | null = null;

  public static createModel(): THREE.Group {
    if (this.cache) {
      return this.cache.clone(true);
    }

    const station = new THREE.Group();
    station.name = 'cartoon_petrol_station';

    // (Grey ground pad removed per user request - station sits directly on natural terrain)

    // -------------------------------------------------------------
    // 2. Large Modern Canopy Roof
    // -------------------------------------------------------------
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 5.2, 2.5);

    // Canopy main slab (White, 20m x 11m x 0.7m)
    const roofGeo = new THREE.BoxGeometry(20, 0.7, 11);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.castShadow = true;
    canopyGroup.add(roof);

    // Vibrant Red / Orange Brand Trim Stripe along canopy edge
    const trimGeo = new THREE.BoxGeometry(20.3, 0.35, 11.3);
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xef4444 }); // Amap/Shell vibrant red
    const trim = new THREE.Mesh(trimGeo, trimMat);
    canopyGroup.add(trim);

    // Yellow accent accent-line inside trim
    const accentGeo = new THREE.BoxGeometry(20.35, 0.1, 11.35);
    const accentMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const accent = new THREE.Mesh(accentGeo, accentMat);
    canopyGroup.add(accent);

    // Under-canopy warm recessed lights
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    for (const lx of [-6, 0, 6]) {
      for (const lz of [-3, 3]) {
        const fixtureGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16);
        const fixture = new THREE.Mesh(fixtureGeo, lightGlowMat);
        fixture.position.set(lx, -0.36, lz);
        canopyGroup.add(fixture);
      }
    }

    station.add(canopyGroup);

    // 4 Support Steel Columns (Pillars)
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const pillarPositions = [
      [-7, 2.6, -1.5],
      [7, 2.6, -1.5],
      [-7, 2.6, 6.5],
      [7, 2.6, 6.5],
    ];

    for (const [px, py, pz] of pillarPositions) {
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 5.2, 12);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, py, pz);
      pillar.castShadow = true;
      station.add(pillar);

      // Base column protection ring
      const baseRingGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.4, 12);
      const baseRingMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Safety yellow
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.position.set(px, 0.2, pz);
      station.add(baseRing);
    }

    // -------------------------------------------------------------
    // 3. Fuel Pump Islands (2 Islands, 4 Dispensers)
    // -------------------------------------------------------------
    for (const islandX of [-4, 4]) {
      // Raised Safety Concrete Island
      const islandGeo = new THREE.BoxGeometry(2.4, 0.35, 8.5);
      const islandMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
      const island = new THREE.Mesh(islandGeo, islandMat);
      island.position.set(islandX, 0.25, 2.5);
      station.add(island);

      // Yellow/Black safety end-bumpers
      for (const bz of [-4.25, 4.25]) {
        const bumperGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.36, 12);
        const bumperMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const bumper = new THREE.Mesh(bumperGeo, bumperMat);
        bumper.position.set(islandX, 0.25, 2.5 + bz);
        station.add(bumper);
      }

      // Two Fuel Dispensers per island
      for (const pumpZ of [-1.5, 1.5]) {
        const pumpGroup = new THREE.Group();
        pumpGroup.position.set(islandX, 0.45, 2.5 + pumpZ);

        // Main dispenser body
        const pumpBodyGeo = new THREE.BoxGeometry(1.0, 1.8, 0.7);
        const pumpBodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const pumpBody = new THREE.Mesh(pumpBodyGeo, pumpBodyMat);
        pumpBody.position.y = 0.9;
        pumpGroup.add(pumpBody);

        // Red top accent
        const pumpTopGeo = new THREE.BoxGeometry(1.02, 0.3, 0.72);
        const pumpTopMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        const pumpTop = new THREE.Mesh(pumpTopGeo, pumpTopMat);
        pumpTop.position.y = 1.7;
        pumpGroup.add(pumpTop);

        // Digital Display Screen
        const screenGeo = new THREE.PlaneGeometry(0.55, 0.4);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const screenFront = new THREE.Mesh(screenGeo, screenMat);
        screenFront.position.set(0, 1.15, 0.36);
        pumpGroup.add(screenFront);

        const screenBack = new THREE.Mesh(screenGeo, screenMat);
        screenBack.position.set(0, 1.15, -0.36);
        screenBack.rotation.y = Math.PI;
        pumpGroup.add(screenBack);

        // Hoses and nozzles on the sides
        const hoseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        for (const sideX of [-0.55, 0.55]) {
          const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8);
          const nozzle = new THREE.Mesh(nozzleGeo, hoseMat);
          nozzle.position.set(sideX, 0.8, 0);
          pumpGroup.add(nozzle);
        }

        station.add(pumpGroup);
      }
    }

    // -------------------------------------------------------------
    // 4. Convenience Store / Kiosk Building (Back of the station)
    // -------------------------------------------------------------
    const kioskGroup = new THREE.Group();
    kioskGroup.position.set(0, 0, -6.5);

    // Kiosk main building (14m wide x 3.6m tall x 5.5m deep)
    const kioskGeo = new THREE.BoxGeometry(14, 3.6, 5.5);
    const kioskMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }); // Light grey-white
    const kiosk = new THREE.Mesh(kioskGeo, kioskMat);
    kiosk.position.y = 1.8;
    kiosk.castShadow = true;
    kioskGroup.add(kiosk);

    // Shop roof parapet
    const parapetGeo = new THREE.BoxGeometry(14.3, 0.4, 5.8);
    const parapetMat = new THREE.MeshLambertMaterial({ color: 0xef4444 }); // Matching red brand trim
    const parapet = new THREE.Mesh(parapetGeo, parapetMat);
    parapet.position.y = 3.7;
    kioskGroup.add(parapet);

    // Glass storefront facade
    const glassGeo = new THREE.PlaneGeometry(8, 2.2);
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.75,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.5, 2.76);
    kioskGroup.add(glass);

    // Shop sign / banner
    const signGeo = new THREE.BoxGeometry(6, 0.8, 0.15);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x10b981 }); // Fresh emerald green "MART"
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 3.0, 2.82);
    kioskGroup.add(sign);

    station.add(kioskGroup);

    // -------------------------------------------------------------
    // 5. Roadside Brand Totem / Price Sign Tower
    // -------------------------------------------------------------
    const totemGroup = new THREE.Group();
    totemGroup.position.set(11, 0, 8); // Right front corner near the road

    // Totem pole body (6.5m tall)
    const totemGeo = new THREE.BoxGeometry(1.2, 6.5, 0.4);
    const totemMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const totem = new THREE.Mesh(totemGeo, totemMat);
    totem.position.y = 3.25;
    totemGroup.add(totem);

    // Red brand header on totem
    const totemHeadGeo = new THREE.BoxGeometry(1.3, 1.6, 0.45);
    const totemHeadMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const totemHead = new THREE.Mesh(totemHeadGeo, totemHeadMat);
    totemHead.position.y = 5.6;
    totemGroup.add(totemHead);

    // LED Fuel price display panels
    for (let pIdx = 0; pIdx < 3; pIdx++) {
      const priceGeo = new THREE.PlaneGeometry(0.9, 0.45);
      const priceMat = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // Glowing green price numbers
      const priceFront = new THREE.Mesh(priceGeo, priceMat);
      priceFront.position.set(0, 4.2 - pIdx * 0.7, 0.21);
      totemGroup.add(priceFront);

      const priceBack = new THREE.Mesh(priceGeo, priceMat);
      priceBack.position.set(0, 4.2 - pIdx * 0.7, -0.21);
      priceBack.rotation.y = Math.PI;
      totemGroup.add(priceBack);
    }

    station.add(totemGroup);

    this.cache = station;
    return station.clone(true);
  }
}
