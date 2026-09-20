import { KeralaZoneType } from './ZoneClassifier';

export interface ZoneProfile {
  type: KeralaZoneType;
  nameEnglish: string;
  nameMalayalam: string;
  description: string;
  allowedAssets: Array<'petrol_station' | 'bus_stop' | 'playground'>;
  treeProfile: {
    baseDensity: number; // Trees per 150m chunk
    primarySpecies: 'coconut_palm' | 'tropical_rainforest' | 'suburban_avenue' | 'plantation_grid' | 'none';
    canopyColors: string[];
    onlyOnBunds?: boolean; // For paddy fields, only along borders
  };
  spacing: {
    petrolStation: number; // meters
    busStop: number; // meters
    playground: number; // meters
  };
}

export const ZONE_PROFILES: Record<KeralaZoneType, ZoneProfile> = {
  urban: {
    type: 'urban',
    nameEnglish: 'Urban (City Center)',
    nameMalayalam: 'നഗരം (Urban)',
    description: 'High building density, commercial avenues, multi-lane roads',
    allowedAssets: ['petrol_station', 'bus_stop', 'playground'],
    treeProfile: {
      baseDensity: 5, // Lower tree density in dense concrete city centers
      primarySpecies: 'suburban_avenue',
      canopyColors: ['#8ed438', '#aee848', '#7cb342'],
    },
    spacing: {
      petrolStation: 500,
      busStop: 220,
      playground: 700,
    },
  },

  suburban: {
    type: 'suburban',
    nameEnglish: 'Suburban (Town Outskirts)',
    nameMalayalam: 'നഗരപ്രാന്തം (Suburban)',
    description: 'Residential colonies, schools, community turf grounds, mix of shops',
    allowedAssets: ['petrol_station', 'bus_stop', 'playground'],
    treeProfile: {
      baseDensity: 10,
      primarySpecies: 'suburban_avenue',
      canopyColors: ['#8ed438', '#aee848', '#66bb6a'],
    },
    spacing: {
      petrolStation: 450,
      busStop: 250,
      playground: 550, // Optimal community sports ground frequency
    },
  },

  rural: {
    type: 'rural',
    nameEnglish: 'Rural (Village Countryside)',
    nameMalayalam: 'ഗ്രാമപ്രദേശം (Rural)',
    description: 'Winding village roads, homesteads, lush coconut courtyards',
    allowedAssets: ['petrol_station', 'bus_stop', 'playground'],
    treeProfile: {
      baseDensity: 14,
      primarySpecies: 'coconut_palm',
      canopyColors: ['#66bb6a', '#81c784', '#aee848'],
    },
    spacing: {
      petrolStation: 700,
      busStop: 380,
      playground: 750,
    },
  },

  coastal: {
    type: 'coastal',
    nameEnglish: 'Coastal (Beach & Shoreline)',
    nameMalayalam: 'തീരദേശം (Coastal)',
    description: 'Arabian sea shore, sand, sea breeze, leaning coconut groves',
    allowedAssets: ['bus_stop'], // No petrol stations or turfs on sea sand
    treeProfile: {
      baseDensity: 15,
      primarySpecies: 'coconut_palm',
      canopyColors: ['#4ade80', '#86efac', '#a3e635'],
    },
    spacing: {
      petrolStation: 1500,
      busStop: 400,
      playground: 1200,
    },
  },

  backwater: {
    type: 'backwater',
    nameEnglish: 'Backwater (Lake & Canal Corridors)',
    nameMalayalam: 'കായലോരം (Backwater)',
    description: 'Vembanad/Ashtamudi waterways, country boats, coconut fringed channels',
    allowedAssets: ['bus_stop'],
    treeProfile: {
      baseDensity: 16,
      primarySpecies: 'coconut_palm',
      canopyColors: ['#22c55e', '#4ade80', '#86efac'],
    },
    spacing: {
      petrolStation: 1500,
      busStop: 450,
      playground: 1200,
    },
  },

  paddy: {
    type: 'paddy',
    nameEnglish: 'Paddy (Agricultural Wetlands / പാടം)',
    nameMalayalam: 'പാടശേഖരം (Paddy)',
    description: 'Vast open agricultural plains, mud dikes, irrigation streams',
    allowedAssets: ['bus_stop'], // Only road edge bus stops
    treeProfile: {
      baseDensity: 3, // Very low in the field; only on dikes/bunds
      primarySpecies: 'coconut_palm',
      canopyColors: ['#84cc16', '#a3e635'],
      onlyOnBunds: true,
    },
    spacing: {
      petrolStation: 2000,
      busStop: 500,
      playground: 1500,
    },
  },

  wetland: {
    type: 'wetland',
    nameEnglish: 'Wetland (Marshes & Mangroves)',
    nameMalayalam: 'ചതുപ്പുനിലം (Wetland)',
    description: 'Waterlogged soils, mangrove roots, wild reeds',
    allowedAssets: [], // Protected ecological area: zero commercial assets
    treeProfile: {
      baseDensity: 12,
      primarySpecies: 'tropical_rainforest',
      canopyColors: ['#15803d', '#166534'],
    },
    spacing: {
      petrolStation: 3000,
      busStop: 800,
      playground: 3000,
    },
  },

  plantation: {
    type: 'plantation',
    nameEnglish: 'Plantation (Rubber & Estate Groves)',
    nameMalayalam: 'തോട്ടം (Plantation)',
    description: 'Midland rolling terrain, organized rubber & spice trees in rows',
    allowedAssets: ['bus_stop', 'petrol_station'],
    treeProfile: {
      baseDensity: 18,
      primarySpecies: 'plantation_grid',
      canopyColors: ['#16a34a', '#15803d', '#22c55e'],
    },
    spacing: {
      petrolStation: 800,
      busStop: 400,
      playground: 1000,
    },
  },

  hilly: {
    type: 'hilly',
    nameEnglish: 'Hilly (Western Ghats & Tea Estates)',
    nameMalayalam: 'മലയോരം (Hilly / Munnar)',
    description: 'Steep winding hairpins, tea estates, mist and valleys',
    allowedAssets: ['bus_stop', 'petrol_station', 'playground'],
    treeProfile: {
      baseDensity: 14,
      primarySpecies: 'tropical_rainforest',
      canopyColors: ['#15803d', '#166534', '#14532d'],
    },
    spacing: {
      petrolStation: 800,
      busStop: 350,
      playground: 800,
    },
  },

  forest: {
    type: 'forest',
    nameEnglish: 'Forest (Tropical Evergreen Jungle)',
    nameMalayalam: 'വനമേഖല (Forest)',
    description: 'Dense tropical canopy, wildlife reserves, zero human sprawl',
    allowedAssets: [], // Forest reserve: zero urban developments
    treeProfile: {
      baseDensity: 24, // Very dense canopy
      primarySpecies: 'tropical_rainforest',
      canopyColors: ['#14532d', '#166534', '#15803d'],
    },
    spacing: {
      petrolStation: 5000,
      busStop: 1500,
      playground: 5000,
    },
  },
};

export class ZoneProfileRegistry {
  public static get(type: KeralaZoneType): ZoneProfile {
    return ZONE_PROFILES[type] || ZONE_PROFILES.suburban;
  }
}
