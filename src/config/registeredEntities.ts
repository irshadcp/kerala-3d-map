import { BuildingCategory } from '../core/geoTypes';

export interface RegisteredPOI {
  id: string;
  name: string;
  malayalamName: string;
  category: BuildingCategory;
  lat: number;
  lng: number;
  tags: Record<string, string>;
  isMajor?: boolean;
}

/**
 * Curated registry of registered shops, bakeries, cafes, malls, institutions,
 * and transit points in our system.
 * These are guaranteed to be synthesized as physical 3D roadside buildings/facilities
 * whenever the player visits their respective localities.
 */
export const REGISTERED_LOCAL_ENTITIES: RegisteredPOI[] = [
  // --- Edappal & Kanniramukku (Hometown Area) ---
  {
    id: 'reg-pooja-silver',
    name: 'Pooja Silver',
    malayalamName: 'പൂജ സിൽവർ പാലസ്',
    category: 'SHOP',
    lat: 10.7842,
    lng: 76.0084,
    tags: { shop: 'jewelry', craft: 'silversmith' },
    isMajor: false,
  },
  {
    id: 'reg-sree-silver',
    name: 'Sree Silver Shops',
    malayalamName: 'ശ്രീ സിൽവർ ഷോപ്പ്സ്',
    category: 'SHOP',
    lat: 10.7835,
    lng: 76.0072,
    tags: { shop: 'jewelry' },
    isMajor: false,
  },
  {
    id: 'reg-saimon-bake-house',
    name: 'Saimon Bake House',
    malayalamName: 'സൈമൺ ബേക്ക് ഹൗസ്',
    category: 'SHOP',
    lat: 10.8145,
    lng: 75.9870,
    tags: { shop: 'bakery' },
    isMajor: false,
  },
  {
    id: 'reg-mg-tiles',
    name: 'MG Tiles',
    malayalamName: 'എം.ജി ടൈൽസ് & സാനിറ്ററി',
    category: 'SHOP',
    lat: 10.7852,
    lng: 76.0095,
    tags: { shop: 'tiles', craft: 'tiles' },
    isMajor: false,
  },
  {
    id: 'reg-mmg',
    name: 'MMG Supermarket',
    malayalamName: 'എം.എം.ജി സൂപ്പർമാർക്കറ്റ്',
    category: 'SUPERMARKET',
    lat: 10.7830,
    lng: 76.0068,
    tags: { shop: 'supermarket' },
    isMajor: false,
  },
  {
    id: 'reg-mumbai-special-chats',
    name: 'Mumbai Special Chats',
    malayalamName: 'മുംബൈ സ്പെഷ്യൽ ചാറ്റ്സ്',
    category: 'RESTAURANT',
    lat: 10.8138,
    lng: 75.9862,
    tags: { amenity: 'fast_food', cuisine: 'indian_chats' },
    isMajor: false,
  },
  {
    id: 'reg-ck-cafe',
    name: 'CK Café',
    malayalamName: 'സി.കെ കഫേ',
    category: 'CAFE',
    lat: 10.8148,
    lng: 75.9875,
    tags: { amenity: 'cafe', cuisine: 'coffee_tea_snacks' },
    isMajor: false,
  },
  {
    id: 'reg-my-boat',
    name: 'My Boat Café',
    malayalamName: 'മൈ ബോട്ട് കഫേ',
    category: 'CAFE',
    lat: 10.7732,
    lng: 75.9238,
    tags: { amenity: 'cafe', cuisine: 'waterfront_cafe' },
    isMajor: false,
  },
  {
    id: 'reg-edappal-parking',
    name: 'Edappal Town Parking',
    malayalamName: 'എടപ്പാൾ ടൗൺ പാർക്കിംഗ്',
    category: 'PARKING',
    lat: 10.7836,
    lng: 76.0088,
    tags: { amenity: 'parking' },
    isMajor: true,
  },
  {
    id: 'reg-kanniramukku-bus-stop',
    name: 'Kanniramukku Bus Stop',
    malayalamName: 'കണ്ണിരാമുക്ക് ബസ് സ്റ്റോപ്പ്',
    category: 'BUS_STOP',
    lat: 10.8140,
    lng: 75.9868,
    tags: { highway: 'bus_stop' },
    isMajor: true,
  },

  // --- Kochi & Lulu Mall Area ---
  {
    id: 'reg-lulu-mall',
    name: 'Lulu Mall',
    malayalamName: 'ലുലു ഇന്റർനാഷണൽ ഷോപ്പിംഗ് മാൾ',
    category: 'SUPERMARKET',
    lat: 10.0278,
    lng: 76.3082,
    tags: { shop: 'mall', operator: 'Lulu Group' },
    isMajor: true,
  },
  {
    id: 'reg-kerala-rail-police',
    name: 'Kerala Rail Police',
    malayalamName: 'കേരള റെയിൽവേ പോലീസ് സ്റ്റേഷൻ',
    category: 'GOVERNMENT',
    lat: 10.0248,
    lng: 76.3085,
    tags: { amenity: 'police', operator: 'Kerala Police' },
    isMajor: true,
  },
  {
    id: 'reg-lulu-parking',
    name: 'Lulu Mall Visitor Parking',
    malayalamName: 'ലുലു മാൾ വിസിറ്റേഴ്സ് പാർക്കിംഗ്',
    category: 'PARKING',
    lat: 10.0265,
    lng: 76.3090,
    tags: { amenity: 'parking' },
    isMajor: true,
  },
  {
    id: 'reg-edappally-bus-stop',
    name: 'Edappally Toll Bus Stop',
    malayalamName: 'ഇടപ്പള്ളി ടോൾ ബസ് സ്റ്റോപ്പ്',
    category: 'BUS_STOP',
    lat: 10.0252,
    lng: 76.3075,
    tags: { highway: 'bus_stop' },
    isMajor: true,
  },
];
