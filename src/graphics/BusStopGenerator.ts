import * as THREE from 'three';

export class BusStopGenerator {
  private static cache: THREE.Group | null = null;

  public static createModel(): THREE.Group {
    if (this.cache) {
      return this.cache.clone(true);
    }

    const shelter = new THREE.Group();
    shelter.name = 'cartoon_bus_shelter';

    // -------------------------------------------------------------
    // 1. Sleek Modern Canopy Roof (6m wide x 2.8m deep)
    // -------------------------------------------------------------
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 3.1, 0.2);

    // Main roof slab (Cyan / Light Sky Blue accent matching modern transit)
    const roofGeo = new THREE.BoxGeometry(6.2, 0.22, 3.0);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Vibrant transit blue
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.castShadow = true;
    canopyGroup.add(roof);

    // White fascia trim along the front and sides
    const trimGeo = new THREE.BoxGeometry(6.3, 0.12, 3.1);
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    canopyGroup.add(trim);

    // Warm soft LED ceiling light strip under the shelter
    const lightGeo = new THREE.PlaneGeometry(5.0, 0.4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.rotation.x = Math.PI / 2;
    light.position.y = -0.12;
    canopyGroup.add(light);

    shelter.add(canopyGroup);

    // -------------------------------------------------------------
    // 2. Steel Support Structure & Frame (2 Rear Columns)
    // -------------------------------------------------------------
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark charcoal steel
    for (const px of [-2.7, 2.7]) {
      const columnGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.1, 12);
      const column = new THREE.Mesh(columnGeo, steelMat);
      column.position.set(px, 1.55, -1.1);
      column.castShadow = true;
      shelter.add(column);

      // Cantilever arm holding the front of the canopy
      const armGeo = new THREE.BoxGeometry(0.12, 0.14, 2.4);
      const arm = new THREE.Mesh(armGeo, steelMat);
      arm.position.set(px, 2.95, 0.0);
      shelter.add(arm);
    }

    // -------------------------------------------------------------
    // 3. Transparent Tinted Glass Windscreens (Back & Sides)
    // -------------------------------------------------------------
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    // Rear glass backboard (5.4m wide x 2.2m tall)
    const backGlassGeo = new THREE.PlaneGeometry(5.2, 2.2);
    const backGlass = new THREE.Mesh(backGlassGeo, glassMat);
    backGlass.position.set(0, 1.4, -1.1);
    shelter.add(backGlass);

    // Left side glass panel
    const sideGlassGeo = new THREE.PlaneGeometry(2.0, 2.2);
    const leftGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    leftGlass.rotation.y = Math.PI / 2;
    leftGlass.position.set(-2.7, 1.4, -0.1);
    shelter.add(leftGlass);

    // Right side glass panel
    const rightGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    rightGlass.rotation.y = Math.PI / 2;
    rightGlass.position.set(2.7, 1.4, -0.1);
    shelter.add(rightGlass);

    // Glass panel support metal frames
    const frameGeo = new THREE.BoxGeometry(5.4, 0.06, 0.06);
    const frameTop = new THREE.Mesh(frameGeo, steelMat);
    frameTop.position.set(0, 2.5, -1.1);
    shelter.add(frameTop);

    // -------------------------------------------------------------
    // 4. Passenger Waiting Bench (Warm Teak Wood)
    // -------------------------------------------------------------
    const benchGroup = new THREE.Group();
    benchGroup.position.set(0, 0, -0.7);

    // Wooden seat slab (3.6m wide x 0.5m deep x 0.08m thick)
    const seatGeo = new THREE.BoxGeometry(3.6, 0.08, 0.5);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Warm teak wood
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.y = 0.55;
    benchGroup.add(seat);

    // Wooden backrest
    const backrestGeo = new THREE.BoxGeometry(3.6, 0.35, 0.06);
    const backrest = new THREE.Mesh(backrestGeo, woodMat);
    backrest.position.set(0, 0.9, -0.22);
    benchGroup.add(backrest);

    // Metal bench legs
    for (const bx of [-1.5, 0, 1.5]) {
      const legGeo = new THREE.BoxGeometry(0.08, 0.55, 0.45);
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(bx, 0.275, 0);
      benchGroup.add(leg);
    }

    shelter.add(benchGroup);

    // -------------------------------------------------------------
    // 5. Digital Bus Arrival / Ad Poster Board
    // -------------------------------------------------------------
    const adBoardGeo = new THREE.BoxGeometry(1.6, 2.0, 0.1);
    const adBoardMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const adBoard = new THREE.Mesh(adBoardGeo, adBoardMat);
    adBoard.position.set(1.8, 1.4, -1.05);
    shelter.add(adBoard);

    const adPosterGeo = new THREE.PlaneGeometry(1.4, 1.8);
    const adPosterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // Glowing transit cyan
    const adPoster = new THREE.Mesh(adPosterGeo, adPosterMat);
    adPoster.position.set(1.8, 1.4, -0.99);
    shelter.add(adPoster);

    // -------------------------------------------------------------
    // 6. Modern Bus Stop Totem Pole Sign (Roadside)
    // -------------------------------------------------------------
    const totemGroup = new THREE.Group();
    totemGroup.position.set(3.6, 0, 1.1); // Front corner near the street

    // Slender sign pole
    const totemPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 12);
    const totemPole = new THREE.Mesh(totemPoleGeo, steelMat);
    totemPole.position.y = 1.7;
    totemGroup.add(totemPole);

    // Circular Blue Transit Badge
    const signBadgeGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24);
    const signBadgeMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const signBadge = new THREE.Mesh(signBadgeGeo, signBadgeMat);
    signBadge.rotation.x = Math.PI / 2;
    signBadge.position.y = 3.1;
    totemGroup.add(signBadge);

    // Inner White Bus Symbol Ring
    const innerRingGeo = new THREE.RingGeometry(0.25, 0.35, 24);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.set(0, 3.1, 0.05);
    totemGroup.add(innerRing);

    // Route number board
    const routeBoardGeo = new THREE.BoxGeometry(0.7, 0.4, 0.06);
    const routeBoardMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Bright bus yellow
    const routeBoard = new THREE.Mesh(routeBoardGeo, routeBoardMat);
    routeBoard.position.set(0, 2.5, 0);
    totemGroup.add(routeBoard);

    shelter.add(totemGroup);

    // Scale up for high visibility & clear prominence
    shelter.scale.set(1.45, 1.45, 1.45);

    this.cache = shelter;
    return shelter.clone(true);
  }
}
