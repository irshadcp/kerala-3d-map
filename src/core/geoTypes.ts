export interface NormalizedBuilding {
  id: string;
  lat: number;
  lng: number;
  polygon: [number, number][];
  height: number;
  name?: string;
  source: string;
}
