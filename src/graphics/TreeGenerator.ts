import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';
import { KeralaZoneType } from '../core/ZoneClassifier';

// Simple seeded random generator
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export class SnapTreeGenerator {
  private static createCoconutPalmModel(color: THREE.Color, scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.name = 'kerala_coconut_palm';

    // 1. Curved Slender Trunk (Lean angle)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    
    // Lower trunk
    const lowerTrunkGeo = new THREE.CylinderGeometry(0.32 * scale, 0.44 * scale, 4.2 * scale, 7);
    const lowerTrunk = new THREE.Mesh(lowerTrunkGeo, trunkMat);
    lowerTrunk.position.set(0, 2.1 * scale, 0);
    lowerTrunk.rotation.z = 0.08; // Natural gentle lean
    palm.add(lowerTrunk);

    // Upper trunk (slightly curved further)
    const upperTrunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.32 * scale, 4.2 * scale, 7);
    const upperTrunk = new THREE.Mesh(upperTrunkGeo, trunkMat);
    upperTrunk.position.set(0.35 * scale, 5.8 * scale, 0);
    upperTrunk.rotation.z = 0.14;
    palm.add(upperTrunk);

    // 2. Radiating Palm Fronds (7 Drooping Fronds)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0.65 * scale, 7.8 * scale, 0);

    const frondMat = new THREE.MeshLambertMaterial({
      color: color,
      side: THREE.DoubleSide,
    });

    const frondCount = 7;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondGeo = new THREE.BoxGeometry(0.45 * scale, 0.06 * scale, 3.8 * scale);
      const frond = new THREE.Mesh(frondGeo, frondMat);

      frond.rotation.y = angle;
      frond.rotation.x = 0.45; // Arch downwards
      frond.position.set(Math.sin(angle) * 1.4 * scale, -0.4 * scale, Math.cos(angle) * 1.4 * scale);
      crownGroup.add(frond);
    }

    // 3. Cluster of Coconuts
    const nutGeo = new THREE.SphereGeometry(0.25 * scale, 6, 6);
    const nutMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    for (let n = 0; n < 3; n++) {
      const nut = new THREE.Mesh(nutGeo, nutMat);
      const na = n * (Math.PI * 2 / 3);
      nut.position.set(Math.sin(na) * 0.35 * scale, -0.2 * scale, Math.cos(na) * 0.35 * scale);
      crownGroup.add(nut);
    }

    palm.add(crownGroup);

    // Soft ground shadow
    const shadowGeo = new THREE.CircleGeometry(2.8 * scale, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x112200,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    palm.add(shadow);

    return palm;
  }

  /**
   * Authentic Kerala Rubber Tree (റബ്ബർ മരം)
   * Straight slender trunk with spiral tapping cut and latex collection cup (ചിരട്ട / കപ്പ്)
   */
  private static createRubberTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_rubber_tree';

    const barkMat = new THREE.MeshLambertMaterial({ color: 0x64748b }); // Greyish-brown rubber bark
    const grooveMat = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // Spiral tapping cut
    const cupMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Latex collection cup / coconut shell
    const latexMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc }); // Milky white latex
    const foliageMat1 = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Deep rubber plantation green
    const foliageMat2 = new THREE.MeshLambertMaterial({ color: 0x166534 });

    // 1. Straight Slender Trunk (5.2m tall)
    const trunkGeo = new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 5.2 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.position.set(0, 2.6 * scale, 0);
    tree.add(trunk);

    // 2. Spiral Tapping Cut (റബ്ബർ വെട്ട് പാട്)
    const cutGeo = new THREE.CylinderGeometry(0.28 * scale, 0.29 * scale, 0.25 * scale, 7, 1, true);
    const cut = new THREE.Mesh(cutGeo, grooveMat);
    cut.position.set(0, 1.6 * scale, 0);
    cut.rotation.z = 0.35;
    tree.add(cut);

    // 3. Latex Collection Cup & Spout (ചിരട്ട / കപ്പും പാലും)
    const cupGeo = new THREE.CylinderGeometry(0.12 * scale, 0.08 * scale, 0.16 * scale, 7);
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(0.3 * scale, 1.25 * scale, 0);
    tree.add(cup);

    const latexGeo = new THREE.CircleGeometry(0.1 * scale, 6);
    const latex = new THREE.Mesh(latexGeo, latexMat);
    latex.rotation.x = -Math.PI / 2;
    latex.position.set(0.3 * scale, 1.32 * scale, 0);
    tree.add(latex);

    // 4. Spreading Rubber Canopy (ഇലച്ചാർത്ത്)
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 5.2 * scale, 0);

    const mainFoliageGeo = new THREE.SphereGeometry(2.4 * scale, 8, 8);
    mainFoliageGeo.scale(1.2, 0.8, 1.2);
    const mainFoliage = new THREE.Mesh(mainFoliageGeo, foliageMat1);
    mainFoliage.position.set(0, 0.8 * scale, 0);
    canopyGroup.add(mainFoliage);

    const subFoliageGeo = new THREE.SphereGeometry(1.8 * scale, 7, 7);
    subFoliageGeo.scale(1.1, 0.7, 1.1);
    const subFoliage = new THREE.Mesh(subFoliageGeo, foliageMat2);
    subFoliage.position.set(0.6 * scale, 1.5 * scale, 0.3 * scale);
    canopyGroup.add(subFoliage);

    tree.add(canopyGroup);

    // Soft ground shadow
    const shadowGeo = new THREE.CircleGeometry(2.6 * scale, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x112200,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    return tree;
  }

  public static generateTreesForChunk(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    _scene: THREE.Scene,
    obstacleMap: SpatialObstacleMap,
    originLat?: number,
    originLng?: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `chunk_${chunkX}_${chunkZ}`;

    const centerX = chunkX * chunkSize;
    const centerZ = chunkZ * chunkSize;

    // Detect zone for this chunk
    let zone: KeralaZoneType = 'suburban';
    if (originLat !== undefined && originLng !== undefined) {
      zone = obstacleMap.getZoneAt(centerX, centerZ, originLat, originLng);
    }
    const profile = ZoneProfileRegistry.get(zone);

    // Number of trees adapted to zone density
    const seedBase = chunkX * 123 + chunkZ * 456;
    const countVar = Math.floor(seededRandom(seedBase) * 6);
    const treeCount = Math.max(1, profile.treeProfile.baseDensity + countVar);

    // If Coconut Palm zone (coastal, backwater, rural):
    if (profile.treeProfile.primarySpecies === 'coconut_palm') {
      const colors = profile.treeProfile.canopyColors.map((c) => new THREE.Color(c));

      for (let i = 0; i < treeCount; i++) {
        const seed = chunkX * 1000 + chunkZ * 100 + i;
        let rx = chunkX * chunkSize - chunkSize / 2 + seededRandom(seed) * chunkSize;
        let rz = chunkZ * chunkSize - chunkSize / 2 + seededRandom(seed + 1) * chunkSize;

        // In Paddy fields: trees only along chunk borders / field bunds (വരമ്പ്)
        if (profile.treeProfile.onlyOnBunds) {
          if (seededRandom(seed + 4) > 0.5) {
            rx = chunkX * chunkSize - chunkSize / 2 + (seededRandom(seed + 5) > 0.5 ? 8 : chunkSize - 8);
          } else {
            rz = chunkZ * chunkSize - chunkSize / 2 + (seededRandom(seed + 6) > 0.5 ? 8 : chunkSize - 8);
          }
        }

        // Strict collision check
        if (obstacleMap.isBlocked(rx, rz, 3.5)) {
          continue;
        }

        const col = colors[i % colors.length];
        const scale = (0.85 + seededRandom(seed + 2) * 0.35) * 1.35;
        const palm = this.createCoconutPalmModel(col, scale);
        palm.position.set(rx, 0, rz);
        palm.rotation.y = seededRandom(seed + 3) * Math.PI * 2;
        group.add(palm);
      }

      return group;
    }

    // If Rubber Plantation zone (റബ്ബർ തോട്ടം):
    if (profile.treeProfile.primarySpecies === 'plantation_grid') {
      const gridSpacing = 12.0;
      const half = chunkSize / 2 - 8;

      for (let ox = -half; ox <= half; ox += gridSpacing) {
        for (let oz = -half; oz <= half; oz += gridSpacing) {
          const seed = chunkX * 700 + chunkZ * 300 + Math.round(ox) * 17 + Math.round(oz);
          const rx = centerX + ox + (seededRandom(seed) - 0.5) * 2.0;
          const rz = centerZ + oz + (seededRandom(seed + 1) - 0.5) * 2.0;

          // Check obstacle clearance
          if (obstacleMap.isBlocked(rx, rz, 3.8)) {
            continue;
          }

          const scale = (0.9 + seededRandom(seed + 2) * 0.25) * 1.35;
          const rubberTree = this.createRubberTreeModel(scale);
          rubberTree.position.set(rx, 0, rz);
          rubberTree.rotation.y = seededRandom(seed + 3) * Math.PI * 2;
          group.add(rubberTree);
        }
      }

      return group;
    }

    // Default & Urban/Suburban/Forest Lollipop & Tropical Trees using InstancedMesh
    const isForest = profile.treeProfile.primarySpecies === 'tropical_rainforest';
    const canopyRadiusSmall = isForest ? 3.6 : 3.2;
    const canopyRadiusLarge = isForest ? 5.2 : 4.6;

    const canopyGeoSmall = new THREE.SphereGeometry(canopyRadiusSmall, 10, 10);
    canopyGeoSmall.scale(1, isForest ? 1.5 : 1.35, 1);

    const canopyGeoLarge = new THREE.SphereGeometry(canopyRadiusLarge, 10, 10);
    canopyGeoLarge.scale(1, isForest ? 1.55 : 1.35, 1);

    const colors = profile.treeProfile.canopyColors.map((c) => new THREE.Color(c));
    const color1 = colors[0] || new THREE.Color('#8ed438');
    const color2 = colors[1] || new THREE.Color('#aee848');

    const canopyMat = new THREE.MeshLambertMaterial();
    const trunkMat = new THREE.MeshLambertMaterial({ color: isForest ? '#5c4033' : '#8d6e63' });

    const trunkGeoSmall = new THREE.CylinderGeometry(0.35, 0.55, isForest ? 5.0 : 4.0, 6);
    const trunkGeoLarge = new THREE.CylinderGeometry(0.55, 0.8, isForest ? 6.5 : 5.4, 6);

    const shadowGeo = new THREE.CircleGeometry(1, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x224411,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    const iCanopySmall = new THREE.InstancedMesh(canopyGeoSmall, canopyMat, treeCount);
    const iCanopyLarge = new THREE.InstancedMesh(canopyGeoLarge, canopyMat, treeCount);
    const iTrunkSmall = new THREE.InstancedMesh(trunkGeoSmall, trunkMat, treeCount);
    const iTrunkLarge = new THREE.InstancedMesh(trunkGeoLarge, trunkMat, treeCount);
    const iShadow = new THREE.InstancedMesh(shadowGeo, shadowMat, treeCount);

    let smallIdx = 0;
    let largeIdx = 0;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
      const seed = chunkX * 1000 + chunkZ * 100 + i;
      const rx = chunkX * chunkSize - chunkSize / 2 + seededRandom(seed) * chunkSize;
      const rz = chunkZ * chunkSize - chunkSize / 2 + seededRandom(seed + 1) * chunkSize;

      // 4.5m clearance ensures canopy does not overlap building walls or road curbs
      if (obstacleMap.isBlocked(rx, rz, 4.5)) {
        continue;
      }

      const isLarge = seededRandom(seed + 2) > 0.55;
      const col = seededRandom(seed + 3) > 0.5 ? color1 : color2;

      if (isLarge) {
        const trunkH = isForest ? 6.5 : 5.4;
        dummy.position.set(rx, trunkH / 2, rz);
        dummy.updateMatrix();
        iTrunkLarge.setMatrixAt(largeIdx, dummy.matrix);

        dummy.position.set(rx, trunkH + 3.6, rz);
        dummy.updateMatrix();
        iCanopyLarge.setMatrixAt(largeIdx, dummy.matrix);
        iCanopyLarge.setColorAt(largeIdx, col);

        largeIdx++;
      } else {
        const trunkH = isForest ? 5.0 : 4.0;
        dummy.position.set(rx, trunkH / 2, rz);
        dummy.updateMatrix();
        iTrunkSmall.setMatrixAt(smallIdx, dummy.matrix);

        dummy.position.set(rx, trunkH + 2.6, rz);
        dummy.updateMatrix();
        iCanopySmall.setMatrixAt(smallIdx, dummy.matrix);
        iCanopySmall.setColorAt(smallIdx, col);

        smallIdx++;
      }

      const shadowRadius = isLarge ? 5.4 : 3.8;
      dummy.position.set(rx, 0.08, rz);
      dummy.rotation.x = -Math.PI / 2;
      dummy.scale.set(shadowRadius, shadowRadius, 1);
      dummy.updateMatrix();
      dummy.scale.set(1, 1, 1);
      dummy.rotation.x = 0;
      iShadow.setMatrixAt(i, dummy.matrix);
    }

    iCanopySmall.count = smallIdx;
    iTrunkSmall.count = smallIdx;
    iCanopyLarge.count = largeIdx;
    iTrunkLarge.count = largeIdx;

    if (iCanopySmall.count > 0) {
      iCanopySmall.instanceMatrix.needsUpdate = true;
      if (iCanopySmall.instanceColor) iCanopySmall.instanceColor.needsUpdate = true;
      iTrunkSmall.instanceMatrix.needsUpdate = true;
      group.add(iCanopySmall, iTrunkSmall);
    }
    if (iCanopyLarge.count > 0) {
      iCanopyLarge.instanceMatrix.needsUpdate = true;
      if (iCanopyLarge.instanceColor) iCanopyLarge.instanceColor.needsUpdate = true;
      iTrunkLarge.instanceMatrix.needsUpdate = true;
      group.add(iCanopyLarge, iTrunkLarge);
    }
    iShadow.instanceMatrix.needsUpdate = true;
    group.add(iShadow);

    return group;
  }
}
