import { RealBuildingManager } from './src/graphics/RealBuildingManager';
import { OpenStreetMapFetcher } from './src/core/OpenStreetMapFetcher';

async function test() {
  const manager = new RealBuildingManager(10.0242, 76.3078); // Edappally
  await manager.fetchRealBuildings(10.0242, 76.3078, 500);
  
  let total = 0;
  let clipped = 0;
  let rejected = 0;
  
  for (const b of manager.normalizedBuildings.values()) {
    total++;
    if (b.validationStatus === 'clipped') clipped++;
    if (b.validationStatus === 'rejected') rejected++;
  }
  
  console.log(`Total: ${total}, Clipped: ${clipped}, Rejected: ${rejected}`);
}

test().catch(console.error);
