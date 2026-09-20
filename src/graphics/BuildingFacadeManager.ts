import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';

/**
 * BuildingFacadeManager
 * Windows and doors on buildings have been completely removed per user request:
 * "ബിൽഡിംഗിലുള്ള വിൻഡോസ്, ഡോർസ് ആ സാധനങ്ങൾ നമുക്ക് എടുത്തു ഒഴിവാക്കാം. വിൻഡോസ്, ഡോർസ് കംപ്ലീറ്റ്ലി നമുക്ക് എടുത്തു ഒഴിവാക്കാം. അതാകുമ്പോൾ ബഗ് കുറച്ചു കുറയും."
 * 
 * This class is maintained as a lightweight no-op stub to preserve public interface compatibility
 * without allocating any window or door meshes, textures, or draw calls.
 */
export class BuildingFacadeManager {
  constructor(_scene: THREE.Scene) {
    // Zero window or door meshes created
  }

  public update(
    _obstacleMap: SpatialObstacleMap,
    _originLat: number,
    _originLng: number,
    _playerX: number,
    _playerZ: number,
    _force = false
  ) {
    // No-op: all windows and doors removed from buildings
  }

  public clear() {
    // No-op
  }

  public dispose() {
    // No-op
  }
}
