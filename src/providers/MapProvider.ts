import type { StyleSpecification } from 'maplibre-gl';

export interface IMapProvider {
  id: string;
  name: string;
  description: string;
  attribution: string;
  getStyle(): Promise<string | StyleSpecification>;
}

/**
 * OpenFreeMap Liberty style provider:
 * Official OpenFreeMap Liberty vector style with native 3D building extrusions.
 */
export class OpenFreeMapLibertyProvider implements IMapProvider {
  id = 'openfreemap-liberty';
  name = 'OpenFreeMap Liberty (Original 3D)';
  description = 'Original OpenFreeMap Liberty style with OSM building extrusions';
  attribution = '© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors';

  async getStyle(): Promise<string | StyleSpecification> {
    return 'https://tiles.openfreemap.org/styles/liberty';
  }
}

/**
 * OpenFreeMap vector style provider using the OpenFreeMap public infrastructure.
 */
export class OpenFreeMapProvider implements IMapProvider {
  id = 'openfreemap-bright';
  name = 'OpenFreeMap Bright';
  description = 'OpenFreeMap public vector tiles with OpenMapTiles schema';
  attribution = '© OpenFreeMap © OpenStreetMap contributors';

  async getStyle(): Promise<string | StyleSpecification> {
    return 'https://tiles.openfreemap.org/styles/bright';
  }
}

/**
 * Custom Pastel Map Provider:
 * Hand-tuned MapLibre vector style with the exact pastel green, powder blue, and soft road aesthetic.
 */
export class CustomPastelProvider implements IMapProvider {
  id = 'custom-pastel';
  name = 'Cartoon Pastel (Snapchat 3D)';
  description = 'Custom soft pastel styling with architectural doors, windows & character';
  attribution = '© OpenFreeMap © OpenStreetMap contributors';

  async getStyle(): Promise<string | StyleSpecification> {
    return '/pastel-style.json';
  }
}

/**
 * Future Self-Hosted Tile Server Provider (e.g. Martin or TileServer-GL)
 */
export class FutureSelfHostedProvider implements IMapProvider {
  id = 'self-hosted';
  name = 'Self-Hosted Provider';
  description = 'Connects to a self-hosted vector tile server';
  attribution = '© OpenStreetMap contributors';

  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8080/styles/default/style.json') {
    this.baseUrl = baseUrl;
  }

  async getStyle(): Promise<string | StyleSpecification> {
    return this.baseUrl;
  }
}

/**
 * Official OpenStreetMap Standard Provider:
 * Direct openstreetmap.org raster tiles with full 3D buildings and real POIs.
 */
export class OpenStreetMapStandardProvider implements IMapProvider {
  id = 'osm-standard';
  name = 'OpenStreetMap (Official 3D)';
  description = 'Direct official OpenStreetMap map tiles from openstreetmap.org with full 3D buildings';
  attribution = '© OpenStreetMap contributors';

  async getStyle(): Promise<string | StyleSpecification> {
    return {
      version: 8,
      sources: {
        'osm-raster': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-raster',
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    };
  }
}

/**
 * Factory and registry for map providers
 */
export class MapProviderRegistry {
  private static providers: Map<string, IMapProvider> = new Map([
    ['custom-pastel', new CustomPastelProvider()],
  ]);

  private static activeProviderId = 'custom-pastel';

  static getProvider(id = this.activeProviderId): IMapProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      return this.providers.get('custom-pastel')!;
    }
    return provider;
  }

  static getAllProviders(): IMapProvider[] {
    return Array.from(this.providers.values());
  }

  static setActiveProvider(id: string) {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
    }
  }

  static registerProvider(provider: IMapProvider) {
    this.providers.set(provider.id, provider);
  }
}
