export type KeralaZoneType =
  | 'urban'
  | 'suburban'
  | 'rural'
  | 'coastal'
  | 'backwater'
  | 'paddy'
  | 'wetland'
  | 'plantation'
  | 'hilly'
  | 'forest';

export interface LocalAreaContext {
  buildingCount: number;
  hasHighway: boolean;
  hasCommercial: boolean;
  hasResidential: boolean;
  landcoverTypes: Set<string>;
  nearestWaterDistance: number;
  nearestWaterType?: string; // 'ocean' | 'lake' | 'river' | 'canal'
}

export class ZoneClassifier {
  /**
   * Classifies a real-world Kerala coordinate into one of the 10 environmental zones
   * based on geographic macro-regions, vector tile land-use, and local density.
   */
  public static classify(
    lat: number,
    lng: number,
    context: LocalAreaContext
  ): KeralaZoneType {
    // -------------------------------------------------------------
    // 1. Geographic Macro-Regions of Kerala
    // -------------------------------------------------------------
    
    // A. Western Ghats / High Ranges (Hilly & Forest)
    // Eastern boundary of Kerala: Munnar, Wayanad, Idukki, Vagamon
    const isMunnarHighlands = lat >= 9.95 && lat <= 10.25 && lng >= 76.95;
    const isWayanadHighlands = lat >= 11.5 && lat <= 11.95 && lng >= 75.95;
    const isIdukkiHighlands = lat >= 9.5 && lat <= 10.1 && lng >= 76.85;
    const isEasternGhats = lng >= 76.88 || isMunnarHighlands || isWayanadHighlands || isIdukkiHighlands;

    if (isEasternGhats) {
      if (context.landcoverTypes.has('wood') || context.landcoverTypes.has('forest') || context.buildingCount < 4) {
        return 'forest';
      }
      return 'hilly';
    }

    // B. Coastal Zone (Arabian Sea Shoreline)
    // Kerala's coastline generally lies along the westernmost edge
    const isNearOcean = context.nearestWaterType === 'ocean' || context.nearestWaterDistance <= 800;
    const hasBeach = context.landcoverTypes.has('sand') || context.landcoverTypes.has('beach');
    if (isNearOcean || hasBeach) {
      return 'coastal';
    }

    // C. Backwater Belt (കായൽ)
    // Vembanad Lake basin, Ashtamudi, Alappuzha-Kumarakom backwater corridors
    const isVembanadBasin = lat >= 9.45 && lat <= 9.92 && lng >= 76.32 && lng <= 76.48;
    const isAshtamudiBasin = lat >= 8.85 && lat <= 9.05 && lng >= 76.52 && lng <= 76.62;
    const isNearLargeWater = context.nearestWaterDistance <= 250 && (context.nearestWaterType === 'lake' || context.nearestWaterType === 'canal');

    if ((isVembanadBasin || isAshtamudiBasin) && (isNearLargeWater || context.buildingCount < 8)) {
      if (context.landcoverTypes.has('wetland') || context.landcoverTypes.has('marsh')) {
        return 'wetland';
      }
      return 'backwater';
    }

    // -------------------------------------------------------------
    // 2. Agricultural & Wetland Parcels
    // -------------------------------------------------------------
    if (context.landcoverTypes.has('wetland') || context.landcoverTypes.has('mangrove')) {
      return 'wetland';
    }

    // Paddy fields (Kuttanad, Pokkali fields, Palakkad agricultural plains)
    const isKuttanadPaddy = lat >= 9.35 && lat <= 9.65 && lng >= 76.35 && lng <= 76.55;
    if (
      context.landcoverTypes.has('farmland') ||
      context.landcoverTypes.has('paddy') ||
      (isKuttanadPaddy && context.buildingCount <= 6)
    ) {
      return 'paddy';
    }

    // Plantation (Rubber, Coconut, Arecanut, Spices)
    if (
      context.landcoverTypes.has('orchard') ||
      context.landcoverTypes.has('plantation') ||
      (lng >= 76.65 && lng < 76.88 && context.buildingCount <= 8 && !context.hasHighway)
    ) {
      return 'plantation';
    }

    // -------------------------------------------------------------
    // 3. Human Settlement Densities (Urban vs Suburban vs Rural)
    // -------------------------------------------------------------
    // High building density (> 30 buildings in 200m) or explicit commercial tag
    if (context.buildingCount >= 28 || (context.buildingCount >= 18 && context.hasCommercial)) {
      return 'urban';
    }

    // Medium building density (10 - 27 buildings in 200m) or residential colony
    if (context.buildingCount >= 9 || context.hasResidential || (context.buildingCount >= 6 && context.hasHighway)) {
      return 'suburban';
    }

    // Low building density (< 9 buildings in 200m)
    return 'rural';
  }

  /**
   * Fast localized heuristic classifier using building counts and road proximity
   * when deep polygon parsing is still loading.
   */
  public static classifyFast(
    lat: number,
    lng: number,
    buildingCount: number,
    hasHighway: boolean
  ): KeralaZoneType {
    // Eastern highlands
    if (lng >= 76.88 || (lat >= 10.0 && lat <= 10.2 && lng >= 76.95)) {
      return buildingCount < 4 ? 'forest' : 'hilly';
    }
    // Coastal check (approximate western boundary)
    if (lng <= 76.23 && lat >= 9.8 && lat <= 10.2) {
      return 'coastal';
    }
    // Kuttanad / Backwater basin
    if (lat >= 9.4 && lat <= 9.7 && lng >= 76.35 && lng <= 76.45 && buildingCount <= 6) {
      return 'paddy';
    }
    // Density-based settlements
    if (buildingCount >= 28) return 'urban';
    if (buildingCount >= 9 || (buildingCount >= 5 && hasHighway)) return 'suburban';
    return 'rural';
  }
}
