import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Traverses a THREE.Group, extracts all Meshes, and merges their geometries
 * by material. This radically reduces draw calls (e.g. from 30 down to 3).
 *
 * The merged geometries are kept in the local space of the original group,
 * meaning you can drop the returned mergedGroup directly in place of the old group.
 */
export function mergeGroup(group: THREE.Group): THREE.Group {
  // Ensure matrices are up to date
  group.updateMatrixWorld(true);
  const inverseRootMatrix = group.matrixWorld.clone().invert();

  // Map of material UUID -> { material, geometries }
  const meshMap = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry || !mesh.material) return;

      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!mat) return;

      if (!meshMap.has(mat.uuid)) {
        meshMap.set(mat.uuid, { material: mat, geometries: [] });
      }

      // Calculate the mesh's transform relative to the root group
      const relativeMatrix = new THREE.Matrix4().multiplyMatrices(inverseRootMatrix, mesh.matrixWorld);

      // Clone geometry and apply the relative transform
      const clonedGeo = mesh.geometry.clone();
      clonedGeo.applyMatrix4(relativeMatrix);

      meshMap.get(mat.uuid)!.geometries.push(clonedGeo);
    }
  });

  const mergedGroup = new THREE.Group();
  mergedGroup.name = `${group.name}-merged`;

  // Apply original group transforms so it acts as a drop-in replacement
  mergedGroup.position.copy(group.position);
  mergedGroup.rotation.copy(group.rotation);
  mergedGroup.scale.copy(group.scale);
  
  // Copy userData (like buildingData for raycasting!)
  mergedGroup.userData = group.userData;

  for (const [_, data] of meshMap.entries()) {
    if (data.geometries.length === 0) continue;

    let mergedGeo: THREE.BufferGeometry;
    if (data.geometries.length === 1) {
      mergedGeo = data.geometries[0];
    } else {
      mergedGeo = BufferGeometryUtils.mergeGeometries(data.geometries, false);
      // Clean up intermediate cloned geometries
      for (const geo of data.geometries) {
        geo.dispose();
      }
    }

    const mergedMesh = new THREE.Mesh(mergedGeo, data.material);
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;
    
    // Attach userData to the mesh as well for raycasting intersections
    mergedMesh.userData = group.userData;
    
    mergedGroup.add(mergedMesh);
  }

  return mergedGroup;
}
