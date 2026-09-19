import { BuildingCategory } from './geoTypes';

export type SignType =
  | 'ROOFTOP'
  | 'FACADE'
  | 'INSTITUTIONAL'
  | 'STANDALONE_POLE'
  | 'ROADSIDE_STREET';

export type SignPriorityTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MapPOIEntity {
  id: string;
  sourceId: string;
  name: string;
  malayalamName?: string;
  category: BuildingCategory;
  lat: number;
  lng: number;
  x: number; // Local coordinates in meters
  z: number;
  tags: Record<string, string>;
  matchedBuildingId?: string;
  signType: SignType;
  priorityTier: SignPriorityTier;
}

export interface RoadSignEntity {
  id: string;
  roadName: string;
  malayalamName?: string;
  x: number;
  z: number;
  rotationY: number;
  roadWidth: number;
  roadClass: string;
}
