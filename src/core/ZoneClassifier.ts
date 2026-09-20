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

/**
 * Strict geographic Arabian Sea coastline boundary for Kerala (കടൽ).
 * Returns true ONLY if coordinates sit directly along Kerala's western ocean coastal strip.
 */
export function isKeralaOceanCoastline(lat: number, lng: number): boolean {
  if (lat < 8.1 || lat > 12.9) return false;
  let maxCoastLng: number;
  if (lat >= 12.0) {
    maxCoastLng = 75.12; // Kasaragod (Bekal, Hosdurg)
  } else if (lat >= 11.5) {
    maxCoastLng = 75.40; // Kannur, Thalassery, Muzhappilangad
  } else if (lat >= 11.0) {
    maxCoastLng = 75.82; // Kozhikode Beach, Beypore, Kappad
  } else if (lat >= 10.3) {
    maxCoastLng = 76.05; // Ponnani Port, Chavakkad, Chettuva
  } else if (lat >= 9.8) {
    maxCoastLng = 76.245; // Fort Kochi, Vypin, Cherai, Chellanam (Palarivattom is 76.315!)
  } else if (lat >= 9.2) {
    maxCoastLng = 76.34; // Alappuzha Beach, Mararikulam
  } else if (lat >= 8.8) {
    maxCoastLng = 76.60; // Kollam, Tangasseri, Neendakara
  } else {
    maxCoastLng = 77.00; // Varkala, Kovalam, Vizhinjam, Poovar
  }

  return lng <= maxCoastLng;
}

/**
 * Strict geographic backwater lake basins of Kerala (കായൽ).
 * Vembanad Lake (Alappuzha/Kumarakom/Vaikom/Aroor) and Ashtamudi Lake (Kollam).
 */
export function isKeralaBackwaterBasin(lat: number, lng: number): boolean {
  const isVembanad = lat >= 9.35 && lat <= 9.90 && lng >= 76.32 && lng <= 76.45;
  const isAshtamudi = lat >= 8.88 && lat <= 9.05 && lng >= 76.52 && lng <= 76.62;
  return isVembanad || isAshtamudi;
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
    // 1. High-Density Human Settlements (Urban Centers)
    // Urban centers take precedence: highways, commercial complexes, dense buildings
    // -------------------------------------------------------------
    if (
      context.buildingCount >= 20 ||
      (context.buildingCount >= 12 && context.hasCommercial) ||
      (context.hasHighway && context.buildingCount >= 10)
    ) {
      return 'urban';
    }

    // -------------------------------------------------------------
    // 2. Western Ghats / High Ranges (Hilly & Forest)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 3. Coastal Zone (കടൽ - Arabian Sea Shoreline)
    // ONLY along genuine Western Arabian Sea coast, near actual ocean water or sandy beach
    // -------------------------------------------------------------
    if (isKeralaOceanCoastline(lat, lng)) {
      const hasBeach = context.landcoverTypes.has('sand') || context.landcoverTypes.has('beach');
      const isNearOceanWater = context.nearestWaterDistance <= 70 && context.nearestWaterType === 'ocean';
      if (hasBeach || isNearOceanWater) {
        return 'coastal';
      }
    }

    // -------------------------------------------------------------
    // 4. Backwater Belt (കായൽ - Vembanad / Ashtamudi Lake Basins)
    // ONLY in designated backwater basins adjacent to large water
    // -------------------------------------------------------------
    if (isKeralaBackwaterBasin(lat, lng) && context.nearestWaterDistance <= 60 && context.buildingCount < 16) {
      if (context.landcoverTypes.has('wetland') || context.landcoverTypes.has('marsh')) {
        return 'wetland';
      }
      return 'backwater';
    }

    // -------------------------------------------------------------
    // 5. Agricultural & Wetland Parcels
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
    // 6. Suburban vs Rural Settlements
    // -------------------------------------------------------------
    if (context.buildingCount >= 8 || context.hasResidential || context.hasHighway) {
      return 'suburban';
    }

    // Low building density (< 8 buildings in 200m)
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
    // High density city
    if (buildingCount >= 20 || (buildingCount >= 12 && hasHighway)) {
      return 'urban';
    }
    // Coastal check (Arabian Sea coast)
    if (isKeralaOceanCoastline(lat, lng) && buildingCount < 14) {
      return 'coastal';
    }
    // Kuttanad / Backwater basin
    if (isKeralaBackwaterBasin(lat, lng) && buildingCount <= 8) {
      return 'backwater';
    }
    // Density settlements
    if (buildingCount >= 8 || (buildingCount >= 5 && hasHighway)) return 'suburban';
    return 'rural';
  }
}
