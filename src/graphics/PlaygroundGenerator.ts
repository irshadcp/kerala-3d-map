import * as THREE from 'three';

export class PlaygroundGenerator {
  private static cache: THREE.Group | null = null;

  public static createModel(): THREE.Group {
    if (this.cache) {
      return this.cache.clone(true);
    }

    const ground = new THREE.Group();
    ground.name = 'cartoon_sports_playground';

    // -------------------------------------------------------------
    // 1. Fresh Green Football Turf Surface (44m x 28m x 0.08m)
    // -------------------------------------------------------------
    const turfGeo = new THREE.BoxGeometry(44, 0.08, 28);
    const turfMat = new THREE.MeshLambertMaterial({ color: 0x22c55e }); // Fresh vibrant emerald turf
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.position.y = 0.04;
    turf.receiveShadow = true;
    ground.add(turf);

    // White Pitch Markings Material
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Outer boundary line
    const createLine = (w: number, l: number, px: number, pz: number) => {
      const lineGeo = new THREE.PlaneGeometry(w, l);
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(px, 0.09, pz);
      ground.add(lineMesh);
    };

    // Boundary rectangle (40m x 24m)
    createLine(40, 0.35, 0, -12);
    createLine(40, 0.35, 0, 12);
    createLine(0.35, 24, -20, 0);
    createLine(0.35, 24, 20, 0);

    // Center halfway line & center circle
    createLine(0.35, 24, 0, 0);

    const circleGeo = new THREE.RingGeometry(4.2, 4.55, 32);
    const circle = new THREE.Mesh(circleGeo, lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(0, 0.09, 0);
    ground.add(circle);

    // Center kickoff spot
    const spotGeo = new THREE.CircleGeometry(0.4, 16);
    const spot = new THREE.Mesh(spotGeo, lineMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.091, 0);
    ground.add(spot);

    // Penalty Boxes (Both Ends)
    for (const side of [-1, 1]) {
      const boxX = side * 16;
      // Penalty area lines (8m deep x 14m wide)
      createLine(8, 0.35, boxX, -7);
      createLine(8, 0.35, boxX, 7);
      createLine(0.35, 14, side * 12, 0);

      // Goal box (4m deep x 8m wide)
      const goalBoxX = side * 18;
      createLine(4, 0.35, goalBoxX, -4);
      createLine(4, 0.35, goalBoxX, 4);
      createLine(0.35, 8, side * 16, 0);
    }

    // -------------------------------------------------------------
    // 2. Football Goal Posts (Both Ends)
    // -------------------------------------------------------------
    const postMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });

    for (const side of [-1, 1]) {
      const goalGroup = new THREE.Group();
      goalGroup.position.set(side * 20.2, 0, 0);

      // Goal Posts (Width = 5m, Height = 2.4m)
      const postLGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8);
      const postL = new THREE.Mesh(postLGeo, postMat);
      postL.position.set(0, 1.2, -2.5);
      goalGroup.add(postL);

      const postR = new THREE.Mesh(postLGeo, postMat);
      postR.position.set(0, 1.2, 2.5);
      goalGroup.add(postR);

      // Crossbar
      const crossGeo = new THREE.CylinderGeometry(0.1, 0.1, 5.0, 8);
      const cross = new THREE.Mesh(crossGeo, postMat);
      cross.rotation.x = Math.PI / 2;
      cross.position.set(0, 2.4, 0);
      goalGroup.add(cross);

      // Goal net box behind the posts
      const netGeo = new THREE.BoxGeometry(1.8, 2.3, 5.0);
      const net = new THREE.Mesh(netGeo, netMat);
      net.position.set(side * -0.9, 1.15, 0);
      goalGroup.add(net);

      ground.add(goalGroup);
    }

    // -------------------------------------------------------------
    // 3. 4 Corner Floodlight Poles
    // -------------------------------------------------------------
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Soft glowing light head

    for (const fx of [-21.5, 21.5]) {
      for (const fz of [-13.5, 13.5]) {
        const poleGroup = new THREE.Group();
        poleGroup.position.set(fx, 0, fz);

        // Slender tall pole (6m)
        const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.2, 8);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3.1;
        poleGroup.add(pole);

        // Floodlight head bracket
        const headGeo = new THREE.BoxGeometry(1.2, 0.6, 0.5);
        const head = new THREE.Mesh(headGeo, poleMat);
        head.position.set(fx > 0 ? -0.4 : 0.4, 6.2, fz > 0 ? -0.4 : 0.4);
        head.lookAt(0, 0, 0);
        poleGroup.add(head);

        // Glowing lamp panel
        const lampGeo = new THREE.PlaneGeometry(1.0, 0.45);
        const lamp = new THREE.Mesh(lampGeo, lightGlowMat);
        lamp.position.set(0, 0, 0.26);
        head.add(lamp);

        ground.add(poleGroup);
      }
    }

    // -------------------------------------------------------------
    // 4. Team Dugout / Player Shelter (Along Sideline)
    // -------------------------------------------------------------
    for (const dx of [-6, 6]) {
      const dugoutGroup = new THREE.Group();
      dugoutGroup.position.set(dx, 0, 13.2);

      // Curved dugout canopy (Sky Blue)
      const canopyGeo = new THREE.CylinderGeometry(1.8, 1.8, 4.5, 16, 1, false, 0, Math.PI);
      const canopyMat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.rotation.z = Math.PI / 2;
      canopy.position.set(0, 1.4, 0);
      dugoutGroup.add(canopy);

      // Dugout Bench
      const benchGeo = new THREE.BoxGeometry(4.0, 0.45, 0.5);
      const benchMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(0, 0.25, 0);
      dugoutGroup.add(bench);

      ground.add(dugoutGroup);
    }

    // -------------------------------------------------------------
    // 5. Basketball Half-Court Section in the Corner
    // -------------------------------------------------------------
    const bbGroup = new THREE.Group();
    bbGroup.position.set(16, 0.05, -9);

    // Acrylic court pad (10m x 8m)
    const bbPadGeo = new THREE.BoxGeometry(9, 0.04, 7);
    const bbPadMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Ocean blue court
    const bbPad = new THREE.Mesh(bbPadGeo, bbPadMat);
    bbPad.position.y = 0.02;
    bbGroup.add(bbPad);

    // Basketball Hoop Post
    const bbPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8);
    const bbPost = new THREE.Mesh(bbPostGeo, poleMat);
    bbPost.position.set(3.8, 1.8, 0);
    bbGroup.add(bbPost);

    // Backboard (White rectangle with orange target)
    const backboardGeo = new THREE.BoxGeometry(0.1, 1.2, 1.8);
    const backboardMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const backboard = new THREE.Mesh(backboardGeo, backboardMat);
    backboard.position.set(3.4, 3.2, 0);
    bbGroup.add(backboard);

    // Orange Rim
    const rimGeo = new THREE.TorusGeometry(0.28, 0.03, 8, 16);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(3.0, 3.0, 0);
    bbGroup.add(rim);

    ground.add(bbGroup);

    // Scale up for high visibility & clear prominence
    ground.scale.set(1.25, 1.25, 1.25);

    this.cache = ground;
    return ground.clone(true);
  }
}
