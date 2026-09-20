/**
 * Geographic coordinate conversion utilities.
 * Maps real-world Latitude / Longitude into local meter-based Cartesian coordinates (X, Y, Z).
 * - +X axis points East
 * - -Z axis points North
 * - +Y axis points Up (Elevation / Altitude)
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export class GeoCoords {
  /**
   * Meters per degree of latitude at a given latitude.
   */
  static metersPerLatDegree(lat: number): number {
    const phi = lat * DEG_TO_RAD;
    return 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
  }

  /**
   * Meters per pixel at a given latitude and zoom level (Web Mercator projection).
   */
  static metersPerPixel(lat: number, zoom: number): number {
    return (156543.03392 * Math.cos(lat * DEG_TO_RAD)) / Math.pow(2, zoom);
  }

  /**
   * Meters per degree of longitude at a given latitude.
   */
  static metersPerLngDegree(lat: number): number {
    const phi = lat * DEG_TO_RAD;
    return 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi);
  }

  /**
   * Converts (lat, lng) to local meter coordinates (x, z) relative to an origin (originLat, originLng).
   * @param lat Target latitude
   * @param lng Target longitude
   * @param originLat Reference origin latitude
   * @param originLng Reference origin longitude
   * @returns { x: meters East, z: meters North (negative for Three.js forward) }
   */
  static toLocalMeters(
    lat: number,
    lng: number,
    originLat: number,
    originLng: number
  ): { x: number; z: number } {
    const mPerLat = this.metersPerLatDegree(originLat);
    const mPerLng = this.metersPerLngDegree(originLat);

    const deltaLat = lat - originLat;
    const deltaLng = lng - originLng;

    const x = deltaLng * mPerLng;
    const z = -deltaLat * mPerLat; // In 3D: North is -Z

    return { x, z };
  }

  /**
   * Converts local meter coordinates (x, z) back to geographic (lat, lng).
   */
  static toLatLng(
    x: number,
    z: number,
    originLat: number,
    originLng: number
  ): { lat: number; lng: number } {
    const mPerLat = this.metersPerLatDegree(originLat);
    const mPerLng = this.metersPerLngDegree(originLat);

    const deltaLat = -z / mPerLat;
    const deltaLng = x / mPerLng;

    return {
      lat: originLat + deltaLat,
      lng: originLng + deltaLng,
    };
  }

  /**
   * Calculates great circle distance between two points in meters (Haversine formula).
   */
  static distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * DEG_TO_RAD;
    const dLng = (lng2 - lng1) * DEG_TO_RAD;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculates bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
   */
  static calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const deltaLambda = (lng2 - lng1) * DEG_TO_RAD;

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    return ((theta * RAD_TO_DEG) + 360) % 360;
  }
}
