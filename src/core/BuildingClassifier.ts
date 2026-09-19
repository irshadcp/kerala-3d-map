import { BuildingCategory, BuildingModelFamily } from './geoTypes';

export class BuildingClassifier {
  /**
   * Classifies raw OSM/Overture tags into one of the standardized BuildingCategory enums.
   */
  public static classify(tags: Record<string, string> = {}): BuildingCategory {
    const building = (tags.building || '').toLowerCase();
    const vClass = (tags.class || '').toLowerCase();
    const vSubclass = (tags.subclass || '').toLowerCase();
    const shop = (tags.shop || (vClass === 'shop' ? vSubclass || 'shop' : (vSubclass === 'supermarket' || vSubclass === 'bakery' || vSubclass === 'convenience' || vSubclass === 'clothes' || vSubclass === 'pharmacy' ? vSubclass : ''))).toLowerCase();
    const amenity = (tags.amenity || (vClass === 'amenity' ? vSubclass || 'amenity' : (vClass === 'food' ? (vSubclass === 'cafe' ? 'cafe' : 'restaurant') : ''))).toLowerCase();
    const tourism = (tags.tourism || (vClass === 'tourism' ? vSubclass || 'tourism' : (vSubclass === 'hotel' ? 'hotel' : ''))).toLowerCase();
    const office = (tags.office || (vClass === 'office' ? vSubclass || 'office' : '')).toLowerCase();
    const landuse = (tags.landuse || '').toLowerCase();
    const leisure = (tags.leisure || '').toLowerCase();
    const manMade = (tags.man_made || '').toLowerCase();
    const craft = (tags.craft || '').toLowerCase();
    const name = (tags['name:en'] || tags.name || '').toLowerCase();
    const religion = (tags.religion || '').toLowerCase();

    // 0. Transport & Transit (Railway Stations, Bus Stops, Parking)
    if (
      tags.highway === 'bus_stop' ||
      amenity === 'bus_station' ||
      tags.public_transport === 'platform' ||
      name.includes('bus stop') ||
      name.includes('bus stand')
    ) {
      return 'BUS_STOP';
    }

    if (
      amenity === 'parking' ||
      amenity === 'motorcycle_parking' ||
      tags.parking !== undefined ||
      building === 'parking' ||
      name.includes('parking')
    ) {
      return 'PARKING';
    }

    if (
      building === 'train_station' ||
      tags.railway === 'station' ||
      tags.railway === 'halt' ||
      amenity === 'railway_station' ||
      name.includes('railway station') ||
      name.includes('railway junction') ||
      (name.includes('station') && (tags.railway !== undefined || building === 'transportation'))
    ) {
      return 'RAILWAY_STATION';
    }

    // 0b. Major Landmarks & Heritage
    if (
      tags.historic !== undefined ||
      tourism === 'attraction' ||
      tourism === 'viewpoint' ||
      tags.landmark !== undefined ||
      name.includes('fort') ||
      name.includes('palace') ||
      name.includes('lighthouse') ||
      name.includes('memorial') ||
      name.includes('monument')
    ) {
      return 'LANDMARK';
    }

    // 1. Religious
    if (
      religion === 'muslim' ||
      religion === 'hindu' ||
      religion === 'christian' ||
      religion === 'buddhist' ||
      religion === 'sikh' ||
      religion === 'jewish' ||
      amenity === 'place_of_worship' ||
      building === 'mosque' ||
      building === 'temple' ||
      building === 'church' ||
      building === 'cathedral' ||
      building === 'chapel' ||
      building === 'synagogue' ||
      name.includes('mosque') ||
      name.includes('masjid') ||
      name.includes('juma') ||
      name.includes('temple') ||
      name.includes('kshetram') ||
      name.includes('mandir') ||
      name.includes('church') ||
      name.includes('cathedral')
    ) {
      return 'RELIGIOUS';
    }

    // 2. Healthcare
    if (
      amenity === 'hospital' ||
      amenity === 'clinic' ||
      amenity === 'doctors' ||
      amenity === 'pharmacy' ||
      building === 'hospital' ||
      name.includes('hospital') ||
      name.includes('clinic') ||
      name.includes('health centre') ||
      name.includes('medical')
    ) {
      return 'HOSPITAL';
    }

    // 3. Educational
    if (amenity === 'university' || building === 'university' || name.includes('university')) {
      return 'COLLEGE';
    }
    if (
      amenity === 'college' ||
      building === 'college' ||
      name.includes('college') ||
      name.includes('polytechnic') ||
      name.includes('campus')
    ) {
      return 'COLLEGE';
    }
    if (
      amenity === 'school' ||
      amenity === 'kindergarten' ||
      building === 'school' ||
      building === 'kindergarten' ||
      name.includes('school') ||
      name.includes('vidyalaya') ||
      name.includes('academy')
    ) {
      return 'SCHOOL';
    }

    // 4. Food & Dining
    if (amenity === 'restaurant' || amenity === 'fast_food' || amenity === 'food_court') {
      return 'RESTAURANT';
    }
    if (amenity === 'cafe' || amenity === 'coffee_shop' || shop === 'coffee' || shop === 'tea') {
      return 'CAFE';
    }

    // 5. Retail & Commercial Shops
    if (
      shop === 'supermarket' ||
      shop === 'convenience' ||
      shop === 'department_store' ||
      shop === 'mall' ||
      name.includes('supermarket') ||
      name.includes('hypermarket')
    ) {
      return 'SUPERMARKET';
    }
    if (
      shop !== '' ||
      craft !== '' ||
      amenity === 'marketplace' ||
      amenity === 'fuel' ||
      amenity === 'bank' ||
      building === 'retail' ||
      building === 'commercial' ||
      building === 'kiosk' ||
      name.includes('bakers') ||
      name.includes('bakery') ||
      name.includes('store') ||
      name.includes('mart') ||
      name.includes('petrol') ||
      name.includes('fuel')
    ) {
      return 'SHOP';
    }

    // 6. Hospitality
    if (
      tourism === 'hotel' ||
      tourism === 'motel' ||
      tourism === 'resort' ||
      tourism === 'guest_house' ||
      building === 'hotel' ||
      name.includes('hotel') ||
      name.includes('resort') ||
      name.includes('inn')
    ) {
      return 'HOTEL';
    }

    // 7. Civic & Government
    if (
      amenity === 'townhall' ||
      amenity === 'courthouse' ||
      amenity === 'police' ||
      amenity === 'fire_station' ||
      amenity === 'post_office' ||
      office === 'government' ||
      building === 'government' ||
      building === 'civic' ||
      building === 'public'
    ) {
      return 'GOVERNMENT';
    }

    // 8. Office
    if (office !== '' || building === 'office' || name.includes('corporate') || name.includes('office')) {
      return 'OFFICE';
    }

    // 9. Multi-family Residential
    if (
      building === 'apartments' ||
      building === 'dormitory' ||
      building === 'residential' && (tags.levels && parseInt(tags.levels, 10) > 3)
    ) {
      return 'APARTMENT';
    }

    // 10. Single-family Residential
    if (
      building === 'house' ||
      building === 'detached' ||
      building === 'semidetached_house' ||
      building === 'terrace' ||
      building === 'villa' ||
      building === 'bungalow' ||
      building === 'cabin' ||
      building === 'residential' ||
      building === 'home'
    ) {
      return 'HOUSE';
    }

    // 11. Industrial & Logistics
    if (
      building === 'industrial' ||
      building === 'manufacture' ||
      landuse === 'industrial' ||
      manMade === 'works'
    ) {
      return 'INDUSTRIAL';
    }
    if (building === 'warehouse' || building === 'storage_tank' || building === 'silo') {
      return 'WAREHOUSE';
    }
    if (
      building === 'garage' ||
      building === 'garages' ||
      building === 'carport' ||
      amenity === 'parking'
    ) {
      return 'GARAGE';
    }

    // 12. Farm
    if (building === 'farm' || building === 'barn' || building === 'cowshed' || building === 'greenhouse') {
      return 'FARM';
    }

    // 13. Public / Community
    if (
      amenity === 'community_centre' ||
      amenity === 'library' ||
      amenity === 'theatre' ||
      amenity === 'cinema' ||
      leisure === 'sports_centre'
    ) {
      return 'PUBLIC';
    }

    // 14. Unknown vs Other
    if (building === 'yes' || building === 'roof' || Object.keys(tags).length === 0) {
      return 'UNKNOWN';
    }

    return 'OTHER';
  }

  /**
   * Maps a categorized building to the appropriate procedural 3D model family.
   */
  public static getModelFamily(category: BuildingCategory, tags: Record<string, string> = {}): BuildingModelFamily {
    const religion = (tags.religion || '').toLowerCase();
    const name = (tags['name:en'] || tags.name || '').toLowerCase();
    const amenity = (tags.amenity || '').toLowerCase();

    if (amenity === 'fuel' || name.includes('petrol') || name.includes('fuel')) {
      return 'FuelStation';
    }

    switch (category) {
      case 'HOUSE':
        return 'ResidentialHouse';
      case 'APARTMENT':
      case 'HOTEL':
      case 'OFFICE':
      case 'GOVERNMENT':
        return 'ApartmentBlock';
      case 'SHOP':
      case 'SUPERMARKET':
      case 'RESTAURANT':
      case 'CAFE':
        return 'CommercialStore';
      case 'SCHOOL':
      case 'COLLEGE':
        return 'CivicSchool';
      case 'HOSPITAL':
        return 'CivicHospital';
      case 'RELIGIOUS':
        if (religion === 'muslim' || name.includes('mosque') || name.includes('masjid')) {
          return 'ReligiousMosque';
        }
        if (religion === 'hindu' || name.includes('temple') || name.includes('mandir')) {
          return 'ReligiousTemple';
        }
        return 'ReligiousChurch';
      case 'INDUSTRIAL':
      case 'WAREHOUSE':
      case 'GARAGE':
        return 'IndustrialWarehouse';
      case 'PUBLIC':
      case 'FARM':
      case 'OTHER':
      case 'UNKNOWN':
      default:
        return 'GenericStylized';
    }
  }

  /**
   * Computes reasonable default or estimated heights based on category and levels.
   */
  public static estimateHeight(
    category: BuildingCategory,
    tags: Record<string, string> = {},
    areaSqMeters = 100
  ): number {
    if (tags.height) {
      const parsed = parseFloat(tags.height);
      if (!isNaN(parsed) && parsed >= 2.5 && parsed <= 450) {
        return parsed;
      }
    }

    const levels = tags['building:levels'] ? parseFloat(tags['building:levels']) : undefined;
    if (levels && !isNaN(levels) && levels > 0) {
      return Math.max(3.2, levels * 3.6);
    }

    switch (category) {
      case 'APARTMENT':
      case 'HOTEL':
        return areaSqMeters > 500 ? 18.0 : 13.5;
      case 'OFFICE':
      case 'GOVERNMENT':
        return 14.0;
      case 'HOSPITAL':
        return 12.0;
      case 'COLLEGE':
      case 'SCHOOL':
        return 9.5;
      case 'RELIGIOUS':
        return 11.0;
      case 'SUPERMARKET':
        return 6.5;
      case 'SHOP':
      case 'RESTAURANT':
      case 'CAFE':
        return 6.2;
      case 'INDUSTRIAL':
      case 'WAREHOUSE':
        return 8.0;
      case 'GARAGE':
        return 3.8;
      case 'RAILWAY_STATION':
        return 7.5;
      case 'LANDMARK':
        return areaSqMeters > 500 ? 18.0 : 12.0;
      case 'HOUSE':
        return areaSqMeters > 220 ? 6.4 : 5.2;
      case 'UNKNOWN':
      case 'OTHER':
      default:
        // Height scaled gracefully with area
        return areaSqMeters > 400 ? 9.5 : areaSqMeters > 150 ? 6.8 : 5.2;
    }
  }
}
