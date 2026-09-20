import * as THREE from 'three';

// Simple seeded random generator
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export class SnapTreeGenerator {
  static generateTreesForChunk(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    _scene: THREE.Scene
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `chunk_${chunkX}_${chunkZ}`;

    // 8-15 trees per 150m chunk
    const treeCount = Math.floor(8 + seededRandom(chunkX * 123 + chunkZ * 456) * 8);

    // Snapchat tree geometry: slightly elongated vertical lollipop puffs
    const canopyGeoSmall = new THREE.SphereGeometry(2.4, 12, 12);
    canopyGeoSmall.scale(1, 1.35, 1);

    const canopyGeoLarge = new THREE.SphereGeometry(3.6, 12, 12);
    canopyGeoLarge.scale(1, 1.35, 1);

    // Vibrant, fresh cute green colors matching Snapchat Map
    const color1 = new THREE.Color('#8ed438'); // Bright fresh lime
    const color2 = new THREE.Color('#aee848'); // Soft yellow-lime

    const canopyMat = new THREE.MeshLambertMaterial();
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#8d6e63' });

    const trunkGeoSmall = new THREE.CylinderGeometry(0.3, 0.45, 3.2, 6);
    const trunkGeoLarge = new THREE.CylinderGeometry(0.45, 0.65, 4.2, 6);

    const shadowGeo = new THREE.CircleGeometry(1, 14);
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

      const isLarge = seededRandom(seed + 2) > 0.6;
      const col = seededRandom(seed + 3) > 0.5 ? color1 : color2;

      if (isLarge) {
        // Large: trunk 4.2m, canopy radius 3.6m * 1.35
        dummy.position.set(rx, 2.1, rz);
        dummy.updateMatrix();
        iTrunkLarge.setMatrixAt(largeIdx, dummy.matrix);

        dummy.position.set(rx, 4.2 + 3.2, rz);
        dummy.updateMatrix();
        iCanopyLarge.setMatrixAt(largeIdx, dummy.matrix);
        iCanopyLarge.setColorAt(largeIdx, col);

        largeIdx++;
      } else {
        // Small: trunk 3.2m, canopy radius 2.4m * 1.35
        dummy.position.set(rx, 1.6, rz);
        dummy.updateMatrix();
        iTrunkSmall.setMatrixAt(smallIdx, dummy.matrix);

        dummy.position.set(rx, 3.2 + 2.2, rz);
        dummy.updateMatrix();
        iCanopySmall.setMatrixAt(smallIdx, dummy.matrix);
        iCanopySmall.setColorAt(smallIdx, col);

        smallIdx++;
      }

      // Soft ground shadow
      const shadowRadius = isLarge ? 4.2 : 2.8;
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
