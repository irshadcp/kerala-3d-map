import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

export class TreeGenerator {
  private trunkMat: THREE.MeshLambertMaterial;
  private foliageMats: THREE.MeshLambertMaterial[];
  private tuftMat: THREE.MeshLambertMaterial;
  private bushMat: THREE.MeshLambertMaterial;

  // Shared static unit geometries across ALL trees to prevent GPU memory leaks
  private static sharedTrunkGeo: THREE.CylinderGeometry;
  private static sharedFoliageGeo: THREE.SphereGeometry;
  private static sharedTuftGeo: THREE.ConeGeometry;
  private static sharedShadowGeo: THREE.CircleGeometry;
  private static sharedShadowMat: THREE.MeshBasicMaterial;

  constructor() {
    this.trunkMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.palette.treeTrunk });
    this.foliageMats = GAME_CONFIG.palette.treeGreen.map(c => new THREE.MeshLambertMaterial({ color: c }));
    this.tuftMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.palette.treeGreen[1] });
    this.bushMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.palette.treeGreen[2] });
    TreeGenerator.initSharedResources();
  }

  private static initSharedResources() {
    if (TreeGenerator.sharedTrunkGeo) return;
    TreeGenerator.sharedTrunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 1.0, 8);
    TreeGenerator.sharedTrunkGeo.translate(0, 0.5, 0);

    TreeGenerator.sharedFoliageGeo = new THREE.SphereGeometry(1.0, 8, 6);

    TreeGenerator.sharedTuftGeo = new THREE.ConeGeometry(0.22, 0.55, 4);
    TreeGenerator.sharedTuftGeo.translate(0, 0.27, 0);

    TreeGenerator.sharedShadowGeo = new THREE.CircleGeometry(1.0, 10);
    TreeGenerator.sharedShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
  }

  /**
   * Evaluates the layout of a single tree and writes transforms into arrays.
   * This allows us to pack them into InstancedMesh arrays for massive performance.
   */
  private generateTreeTransforms(x: number, y: number, z: number, scale: number, variant: number) {
    const heightScale = 0.9 + (variant % 4) * 0.08;
    const trunkHeight = 2.4 * heightScale * scale;
    
    const transforms: { geoType: string, matIndex: number, matrix: THREE.Matrix4 }[] = [];
    const dummy = new THREE.Object3D();

    // 1. Trunk
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, (variant % 2 === 0 ? 0.04 : -0.04));
    dummy.scale.set(scale, trunkHeight, scale);
    dummy.updateMatrix();
    transforms.push({ geoType: 'trunk', matIndex: 0, matrix: dummy.matrix.clone() });

    // 2. Foliage Lobes
    const foliageMatIdx = variant % this.foliageMats.length;
    const foliageBaseY = y + trunkHeight * 0.85;

    // Main Lobe
    const mainRadius = 1.35 * scale;
    dummy.position.set(x, foliageBaseY + mainRadius * 1.1, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(mainRadius, mainRadius * 1.45 * heightScale, mainRadius);
    dummy.updateMatrix();
    transforms.push({ geoType: 'foliage', matIndex: foliageMatIdx, matrix: dummy.matrix.clone() });

    // Upper Lobe
    const topRadius = 0.95 * scale;
    dummy.position.set(x, foliageBaseY + mainRadius * 1.8 * heightScale, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(topRadius, topRadius * 1.2, topRadius);
    dummy.updateMatrix();
    transforms.push({ geoType: 'foliage', matIndex: foliageMatIdx, matrix: dummy.matrix.clone() });

    // Side Lobe
    const sideRadius = 0.75 * scale;
    const sideAngle = (variant * 1.3) % (Math.PI * 2);
    dummy.position.set(
      x + Math.cos(sideAngle) * 0.55 * scale,
      foliageBaseY + mainRadius * 0.9,
      z + Math.sin(sideAngle) * 0.55 * scale
    );
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(sideRadius, sideRadius, sideRadius);
    dummy.updateMatrix();
    transforms.push({ geoType: 'foliage', matIndex: foliageMatIdx, matrix: dummy.matrix.clone() });

    // 3. Tufts
    const tuftCount = 3;
    for (let i = 0; i < tuftCount; i++) {
      const angle = (i / tuftCount) * Math.PI * 2 + (variant * 0.5);
      dummy.position.set(
        x + Math.cos(angle) * 0.45 * scale,
        y,
        z + Math.sin(angle) * 0.45 * scale
      );
      dummy.rotation.set(0.28, angle, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      transforms.push({ geoType: 'tuft', matIndex: 0, matrix: dummy.matrix.clone() });
    }

    // 4. Shadow
    dummy.position.set(x + 0.5 * scale, y + 0.02, z + 0.5 * scale);
    dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    dummy.scale.set(1.4 * scale, 1.8 * scale, 1.0);
    dummy.updateMatrix();
    transforms.push({ geoType: 'shadow', matIndex: 0, matrix: dummy.matrix.clone() });

    return transforms;
  }

  
  public createBush(scale = 1.0): THREE.Group {
    const bush = new THREE.Group();
    bush.name = 'cartoon-bush';
    const r = 0.8 * scale;
    const mesh = new THREE.Mesh(TreeGenerator.sharedFoliageGeo, this.bushMat);
    mesh.scale.set(r * 1.2, r * 0.8, r);
    mesh.position.set(0, r * 0.7, 0);
    mesh.castShadow = true;
    bush.add(mesh);
    return bush;
  }

  
  public createTree(scale = 1.0, variant = 0): THREE.Group {
    const tree = new THREE.Group();
    const t = this.generateTreeTransforms(0, 0, 0, scale, variant);
    for (const tx of t) {
      let geo, mat;
      if (tx.geoType === 'trunk') { geo = TreeGenerator.sharedTrunkGeo; mat = this.trunkMat; }
      else if (tx.geoType === 'foliage') { geo = TreeGenerator.sharedFoliageGeo; mat = this.foliageMats[tx.matIndex]; }
      else if (tx.geoType === 'tuft') { geo = TreeGenerator.sharedTuftGeo; mat = this.tuftMat; }
      else { geo = TreeGenerator.sharedShadowGeo; mat = TreeGenerator.sharedShadowMat; }
      const mesh = new THREE.Mesh(geo, mat);
      tx.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.castShadow = true;
      tree.add(mesh);
    }
    return tree;
  }

  public generateTreeCluster(
    centerX: number,
    centerZ: number,
    count: number,
    radius: number,
    minDistance = 6.0,
    waterCheck?: (x: number, z: number) => boolean,
    terrainEngine?: any
  ): THREE.Group {
    const cluster = new THREE.Group();
    cluster.name = 'instanced-tree-cluster';

    const placedPositions: { x: number; z: number }[] = [];
    const allTransforms: any[] = [];

    let attempts = 0;
    while (placedPositions.length < count && attempts < count * 8) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const x = centerX + Math.cos(angle) * dist;
      const z = centerZ + Math.sin(angle) * dist;

      if (waterCheck && waterCheck(x, z)) continue;

      const tooClose = placedPositions.some((p) => {
        const dx = p.x - x;
        const dz = p.z - z;
        return Math.sqrt(dx * dx + dz * dz) < minDistance;
      });

      if (!tooClose) {
        placedPositions.push({ x, z });
        const scale = 0.9 + Math.random() * 0.35;
        const variant = Math.floor(Math.random() * 12);
        const y = terrainEngine ? terrainEngine.getElevation(x, z) : 0;
        
        allTransforms.push(...this.generateTreeTransforms(x, y, z, scale, variant));
      }
    }

    if (allTransforms.length === 0) return cluster;

    // Group transforms by Geometry & Material
    const groups: Record<string, { geo: THREE.BufferGeometry, mat: THREE.Material, matrices: THREE.Matrix4[] }> = {
      'trunk_0': { geo: TreeGenerator.sharedTrunkGeo, mat: this.trunkMat, matrices: [] },
      'tuft_0': { geo: TreeGenerator.sharedTuftGeo, mat: this.tuftMat, matrices: [] },
      'shadow_0': { geo: TreeGenerator.sharedShadowGeo, mat: TreeGenerator.sharedShadowMat, matrices: [] },
      'foliage_0': { geo: TreeGenerator.sharedFoliageGeo, mat: this.foliageMats[0], matrices: [] },
      'foliage_1': { geo: TreeGenerator.sharedFoliageGeo, mat: this.foliageMats[1], matrices: [] },
      'foliage_2': { geo: TreeGenerator.sharedFoliageGeo, mat: this.foliageMats[2], matrices: [] },
    };

    for (const t of allTransforms) {
      const key = `${t.geoType}_${t.matIndex}`;
      if (groups[key]) groups[key].matrices.push(t.matrix);
    }

    // Build InstancedMeshes
    for (const key in groups) {
      const g = groups[key];
      if (g.matrices.length > 0) {
        const imesh = new THREE.InstancedMesh(g.geo, g.mat, g.matrices.length);
        imesh.castShadow = (key !== 'shadow_0');
        imesh.receiveShadow = (key !== 'shadow_0');
        
        for (let i = 0; i < g.matrices.length; i++) {
          imesh.setMatrixAt(i, g.matrices[i]);
        }
        imesh.instanceMatrix.needsUpdate = true;
        cluster.add(imesh);
      }
    }

    return cluster;
  }
}
