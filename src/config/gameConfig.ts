export interface LocationPreset {
  id: string;
  name: string;
  subname: string;
  malayalamName?: string;
  category?: 'hometown' | 'north_kerala' | 'central_kerala' | 'south_kerala' | 'kerala' | 'world';
  lat: number;
  lng: number;
  zoom: number;
  pitch: number;
  bearing: number;
  weather: string;
  temp: string;
  locked?: boolean;
}

/**
 * Strict geographic bounding box for Kerala:
 * Southwest: [74.70° E, 8.10° N] (Arabian Sea / Parassala border)
 * Northeast: [77.65° E, 12.85° N] (Manjeshwar / Kasaragod / Karnataka border)
 */
export const KERALA_BOUNDS: [[number, number], [number, number]] = [
  [74.70, 8.10],
  [77.65, 12.85],
];

export const LOCATION_PRESETS: LocationPreset[] = [
  // 1. Hometown & Malappuram Spots
  {
    id: 'kanniramukku',
    name: 'Kanniramukku',
    malayalamName: 'കണ്ണിരാമുക്ക്',
    subname: 'Malappuram, Kerala (Home)',
    category: 'hometown',
    lat: 10.8142,
    lng: 75.9866,
    zoom: 19.8,
    pitch: 78,
    bearing: 0,
    weather: 'Sunny',
    temp: '27°C',
  },
  {
    id: 'ayilakkad',
    name: 'Ayilakkad',
    malayalamName: 'അയിലക്കാട്',
    subname: 'Edappal, Malappuram',
    category: 'hometown',
    lat: 10.8285,
    lng: 75.9920,
    zoom: 19.8,
    pitch: 78,
    bearing: 25,
    weather: 'Sunny',
    temp: '27°C',
  },
  {
    id: 'edappal',
    name: 'Edappal',
    malayalamName: 'എടപ്പാൾ',
    subname: 'Edappal Junction & Flyover',
    category: 'hometown',
    lat: 10.7838,
    lng: 76.0078,
    zoom: 19.8,
    pitch: 78,
    bearing: 10,
    weather: 'Sunny',
    temp: '28°C',
  },
  {
    id: 'ponnani',
    name: 'Ponnani Port',
    malayalamName: 'പൊന്നാനി ഹാർബർ',
    subname: 'Historic Port & Beach',
    category: 'hometown',
    lat: 10.7725,
    lng: 75.9230,
    zoom: 19.8,
    pitch: 76,
    bearing: -20,
    weather: 'Sea Breeze',
    temp: '28°C',
  },
  {
    id: 'kottakkunnu',
    name: 'Kottakkunnu',
    malayalamName: 'കോട്ടക്കുന്ന്',
    subname: 'Malappuram Hill Garden',
    category: 'hometown',
    lat: 11.0510,
    lng: 76.0710,
    zoom: 19.8,
    pitch: 78,
    bearing: 45,
    weather: 'Clear',
    temp: '27°C',
  },
  {
    id: 'kadalundi',
    name: 'Kadalundi River',
    malayalamName: 'കടലുണ്ടി',
    subname: 'Estuary & Mangrove Forest',
    category: 'hometown',
    lat: 11.1305,
    lng: 75.8286,
    zoom: 19.2,
    pitch: 74,
    bearing: 40,
    weather: 'Breeze',
    temp: '26°C',
  },
  {
    id: 'airport',
    name: 'Calicut Int. Airport',
    malayalamName: 'കരിപ്പൂർ എയർപോർട്ട്',
    subname: 'Karipur Runway Area',
    category: 'hometown',
    lat: 11.1362,
    lng: 75.9553,
    zoom: 19.2,
    pitch: 75,
    bearing: 90,
    weather: 'Clear',
    temp: '28°C',
  },

  // 2. North Kerala (വടക്കൻ കേരളം)
  {
    id: 'kasaragod',
    name: 'Kasaragod',
    malayalamName: 'കാസർഗോഡ്',
    subname: 'Bekal Fort Beachfront',
    category: 'north_kerala',
    lat: 12.3929,
    lng: 75.0336,
    zoom: 19.8,
    pitch: 78,
    bearing: 40,
    weather: 'Sunny',
    temp: '29°C',
  },
  {
    id: 'kannur',
    name: 'Kannur',
    malayalamName: 'കണ്ണൂർ',
    subname: 'Payyambalam Beach & Fort',
    category: 'north_kerala',
    lat: 11.8745,
    lng: 75.3704,
    zoom: 19.8,
    pitch: 78,
    bearing: -10,
    weather: 'Coastline',
    temp: '28°C',
  },
  {
    id: 'wayanad',
    name: 'Wayanad',
    malayalamName: 'വയനാട്',
    subname: 'Kalpetta Valley',
    category: 'north_kerala',
    lat: 11.6103,
    lng: 76.0827,
    zoom: 19.5,
    pitch: 76,
    bearing: 30,
    weather: 'Misty',
    temp: '22°C',
  },
  {
    id: 'kozhikode',
    name: 'Kozhikode',
    malayalamName: 'കോഴിക്കോട്',
    subname: 'Beach & Mananchira Square',
    category: 'north_kerala',
    lat: 11.2588,
    lng: 75.7804,
    zoom: 19.8,
    pitch: 78,
    bearing: 20,
    weather: 'Breeze',
    temp: '28°C',
  },

  // 3. Central Kerala (മധ്യകേരളം)
  {
    id: 'malappuram',
    name: 'Malappuram Town',
    malayalamName: 'മലപ്പുറം',
    subname: 'Civil Station Area',
    category: 'central_kerala',
    lat: 11.0423,
    lng: 76.0754,
    zoom: 19.8,
    pitch: 78,
    bearing: 0,
    weather: 'Sunny',
    temp: '28°C',
  },
  {
    id: 'palakkad',
    name: 'Palakkad',
    malayalamName: 'പാലക്കാട്',
    subname: 'Tipu Sultan Fort',
    category: 'central_kerala',
    lat: 10.7867,
    lng: 76.6548,
    zoom: 19.8,
    pitch: 78,
    bearing: -20,
    weather: 'Warm',
    temp: '31°C',
  },
  {
    id: 'thrissur',
    name: 'Thrissur',
    malayalamName: 'തൃശ്ശൂർ',
    subname: 'Swaraj Round & Temple',
    category: 'central_kerala',
    lat: 10.5276,
    lng: 76.2144,
    zoom: 19.8,
    pitch: 78,
    bearing: 0,
    weather: 'Clear',
    temp: '29°C',
  },
  {
    id: 'ernakulam',
    name: 'Kochi (Marine Drive)',
    malayalamName: 'കൊച്ചി മറൈൻ ഡ്രൈവ്',
    subname: 'Waterfront & Harbor Walk',
    category: 'central_kerala',
    lat: 9.9816,
    lng: 76.2799,
    zoom: 19.8,
    pitch: 78,
    bearing: 45,
    weather: 'Breeze',
    temp: '29°C',
  },
  {
    id: 'kochi_metro',
    name: 'Edappally Metro Station',
    malayalamName: 'ഇടപ്പള്ളി മെട്രോ സ്റ്റേഷൻ',
    subname: 'Kochi Metro Line & Lulu Junction',
    category: 'central_kerala',
    lat: 10.0242,
    lng: 76.3078,
    zoom: 19.8,
    pitch: 78,
    bearing: 30,
    weather: 'Sunny',
    temp: '29°C',
  },
  {
    id: 'palarivattom_metro',
    name: 'Palarivattom Metro Station',
    malayalamName: 'പാലാരിവട്ടം മെട്രോ സ്റ്റേഷൻ',
    subname: 'Palarivattom Junction & Flyover',
    category: 'central_kerala',
    lat: 10.0076,
    lng: 76.3014,
    zoom: 19.8,
    pitch: 78,
    bearing: 190,
    weather: 'Sunny',
    temp: '29°C',
  },
  {
    id: 'ernakulam_junction',
    name: 'Ernakulam Railway Station',
    malayalamName: 'എറണാകുളം സൗത്ത് റെയിൽവേ',
    subname: 'Indian Railways Main Junction',
    category: 'central_kerala',
    lat: 9.9685,
    lng: 76.2890,
    zoom: 19.8,
    pitch: 78,
    bearing: 0,
    weather: 'Sunny',
    temp: '29°C',
  },

  // 4. South Kerala (തെക്കൻ കേരളം)
  {
    id: 'idukki',
    name: 'Idukki (Munnar)',
    malayalamName: 'ഇടുക്കി (മൂന്നാർ)',
    subname: 'Tea Gardens & Hills',
    category: 'south_kerala',
    lat: 10.0889,
    lng: 77.0595,
    zoom: 19.2,
    pitch: 74,
    bearing: 60,
    weather: 'Chilly',
    temp: '17°C',
  },
  {
    id: 'kottayam',
    name: 'Kottayam',
    malayalamName: 'കോട്ടയം',
    subname: 'Kumarakom Backwaters',
    category: 'south_kerala',
    lat: 9.5916,
    lng: 76.5222,
    zoom: 19.8,
    pitch: 78,
    bearing: 15,
    weather: 'Scenic',
    temp: '27°C',
  },
  {
    id: 'alappuzha',
    name: 'Alappuzha',
    malayalamName: 'ആലപ്പുഴ',
    subname: 'Punnamada Lake & Houseboats',
    category: 'south_kerala',
    lat: 9.4981,
    lng: 76.3388,
    zoom: 19.8,
    pitch: 78,
    bearing: -10,
    weather: 'Waterfront',
    temp: '28°C',
  },
  {
    id: 'pathanamthitta',
    name: 'Pathanamthitta',
    malayalamName: 'പത്തനംതിട്ട',
    subname: 'Pampa River Basin',
    category: 'south_kerala',
    lat: 9.2648,
    lng: 76.7870,
    zoom: 19.8,
    pitch: 78,
    bearing: 0,
    weather: 'Greenery',
    temp: '27°C',
  },
  {
    id: 'kollam',
    name: 'Kollam',
    malayalamName: 'കൊല്ലം',
    subname: 'Ashtamudi Lake & Port',
    category: 'south_kerala',
    lat: 8.8932,
    lng: 76.6141,
    zoom: 19.8,
    pitch: 78,
    bearing: -15,
    weather: 'Breeze',
    temp: '28°C',
  },
  {
    id: 'trivandrum',
    name: 'Thiruvananthapuram',
    malayalamName: 'തിരുവനന്തപുരം',
    subname: 'Secretariat & Kovalam',
    category: 'south_kerala',
    lat: 8.5241,
    lng: 76.9366,
    zoom: 19.8,
    pitch: 78,
    bearing: 10,
    weather: 'Clear',
    temp: '29°C',
  },

  // Locked Non-Kerala Locations (Locked for Kerala Exclusive Edition)
  {
    id: 'dubai',
    name: 'Dubai',
    subname: '🔒 Locked (Kerala Edition)',
    category: 'world',
    lat: 25.1972,
    lng: 55.2744,
    zoom: 19.0,
    pitch: 68,
    bearing: 45,
    weather: 'Locked',
    temp: '--',
    locked: true,
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    subname: '🔒 Locked (Kerala Edition)',
    category: 'world',
    lat: 35.6905,
    lng: 139.6995,
    zoom: 19.0,
    pitch: 68,
    bearing: -35,
    weather: 'Locked',
    temp: '--',
    locked: true,
  },
  {
    id: 'newyork',
    name: 'New York',
    subname: '🔒 Locked (Kerala Edition)',
    category: 'world',
    lat: 40.7580,
    lng: -73.9855,
    zoom: 19.0,
    pitch: 68,
    bearing: 28,
    weather: 'Locked',
    temp: '--',
    locked: true,
  },
];

export const GAME_CONFIG = {
  // Initial coordinates from user's primary reference image (Kanniramukku)
  startLatitude: 10.8142,
  startLongitude: 75.9866,
  initialZoom: 21.6,
  initialPitch: 79,
  initialBearing: 0,

  // Camera settings - GTA-style intimate 3rd person & wide overview exploration
  minZoom: 11,
  maxZoom: 24,
  minPitch: 0,
  maxPitch: 84,

  // TPP Camera Configuration (GTA-style over-the-shoulder view balanced for scaled character)
  tppZoom: 21.3,
  tppPitch: 75,
  tppLookAhead: 4.6,
  tppShoulderOffset: 0.48,

  // Vehicle Camera Configuration (Auto-Rickshaw)
  vehicleZoom: 20.9,
  vehiclePitch: 74,
  vehicleLookAhead: 5.0,

  // Overview Camera Configuration (when inspecting/zooming out)
  overviewTransitionZoom: 20.0,

  // Player physics — tuned for responsive, snappy production-game feel on large real-world maps
  walkSpeed: 11.5, // meters / second (~41 km/h swift jog)
  runSpeed: 21.0, // sprint speed (~75 km/h high-speed exploration sprint)
  acceleration: 95.0, // snappy acceleration, zero sluggish delay
  damping: 28.0, // crisp deceleration, no ice-skating slide
  turnSpeed: 28.0, // instant, responsive character turning (radians / second)

  // Character dimensions
  characterScale: 1.85, // scaled up for prominent game presence across vast Kerala maps

  // Visual Palette matching Snapchat 3D Map (Bright, high-key, cheery pastel)
  palette: {
    ground: '#e2f7d8',        // fresh bright sunlit grass
    groundSubtle: '#d7f3cc',  // soft meadow
    water: '#67c2f8',         // bright tropical cyan / sky blue
    waterDeep: '#4da9f0',     // vibrant ocean blue
    roadFill: '#ffffff',      // smooth pristine Apple white
    roadOutline: '#cbd5e1',   // subtle crisp cartoon outline curb
    highwayFill: '#ffffff',   // smooth Apple highway white
    buildingColors: [
      '#ffa07a', // bright cheery pastel coral / peach
      '#fff9db', // sunny butter cream
      '#ffffff', // crisp pure white
      '#bae6fd', // sky pastel blue
      '#fbcfe8', // soft pastel rose
      '#dcfce7', // fresh pastel mint
      '#fed7aa', // warm pastel apricot
    ],
    buildingRoof: '#ffedd5',  // sunny light roof terrace
    windowBlue: '#38bdf8',    // vibrant sky blue reflective glass
    windowFrame: '#ffffff',   // crisp white window border
    doorTeak: '#92400e',      // warm golden teak wood
    treeGreen: [
      '#86efac', // vibrant lime green
      '#4ade80', // fresh leafy green
      '#a3e635', // bright sunny yellow-green
    ],
    treeTrunk: '#a16207',     // warm wood
    sunLight: '#fffdf5',      // high-key bright sunlight
    sunShadow: '#94a3b8',     // soft light blue-grey shadow
    ambientLight: '#ffffff',  // pure bright ambient fill
  },

  // Configuration for the Procedural Road-First Geometry Cleanup System
  roadBuildingCleanupConfig: {
    enabled: true,
    debugMode: false,
    roadBufferMeters: 10.0, // Aggressive clearance — ensures NO building sits on or near any road pavement
    thresholds: {
      minor: 0.01,    // < 1% overlap: Just clip the polygon
      moderate: 0.10, // 1% - 10% overlap: Clip
      severe: 0.20,   // > 20% overlap: Delete building
      extreme: 1.0,   // > 100% overlap: Delete building
    },
    minFragmentArea: 20.0, // Minimum area for a clipped building piece to survive
  },

  // City Streaming & High-Speed Highway Look-Ahead Configuration
  cityStreamingConfig: {
    cityPreloadRadius: 850,       // Full city initial coverage radius
    cityQuadrantOffset: 650,      // Preload offset for N/S/E/W quadrants
    highwayLookAheadMaxDist: 1200, // Maximum forward route lookahead at top speeds
    forwardConeHorizonChunks: 5,  // How many chunks ahead to stream along velocity (1000m)
    rearCullDistance: 220,        // Distance behind player beyond which chunks are deactivated
    rearEvictDistance: 380,       // Distance behind player beyond which cached geometry is disposed
  }
};
