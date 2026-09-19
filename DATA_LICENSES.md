# DATA LICENSES

This project uses open geographic data. The following attribution requirements apply.

---

## OpenStreetMap (OSM)

| Field | Value |
|-------|-------|
| **Source** | OpenStreetMap |
| **URL** | https://www.openstreetmap.org |
| **Data API** | Overpass API — https://overpass-api.de |
| **License** | Open Database License (ODbL) v1.0 |
| **Attribution** | © OpenStreetMap contributors |
| **Derived data** | Yes — 3D building meshes, road corridors, water exclusion zones, railway graphs |
| **Bundled / Runtime** | Runtime fetch — data is queried at gameplay time via Overpass API |

### Required Attribution (OSM)

> Map data © [OpenStreetMap](https://www.openstreetmap.org) contributors, licensed under [ODbL](https://opendatacommons.org/licenses/odbl/).

This notice must appear in any distributed version of this product that uses OSM-derived data.

---

## OpenFreeMap (Map Tiles)

| Field | Value |
|-------|-------|
| **Source** | OpenFreeMap |
| **URL** | https://openfreemap.org |
| **License** | Based on OpenMapTiles schema (ODbL for data, BSD for schema) |
| **Attribution** | © OpenFreeMap, © OpenStreetMap contributors |
| **Bundled / Runtime** | Runtime tile fetch |

---

## Three.js

| Field | Value |
|-------|-------|
| **Source** | Three.js |
| **URL** | https://threejs.org |
| **License** | MIT License |
| **Attribution** | Not required in end product, but acknowledged here |

---

## MapLibre GL JS

| Field | Value |
|-------|-------|
| **Source** | MapLibre GL JS |
| **URL** | https://maplibre.org |
| **License** | BSD 3-Clause |
| **Attribution** | Not required in end product |

---

## Future Data Sources (Planned)

### Copernicus DEM (Elevation)

| Field | Value |
|-------|-------|
| **Source** | Copernicus Digital Elevation Model (GLO-30) |
| **Provider** | European Space Agency |
| **URL** | https://spacedata.copernicus.eu |
| **License** | Copernicus DEM — free for use, subject to acknowledgement |
| **Attribution** | Contains modified Copernicus DEM data © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 |
| **Status** | Not yet integrated. Planned for terrain Phase. |

### Overture Maps (Building Footprints)

| Field | Value |
|-------|-------|
| **Source** | Overture Maps Foundation |
| **URL** | https://overturemaps.org |
| **License** | ODbL (buildings from OSM) / CDLA-Permissive-2.0 (other data) |
| **Attribution** | © Overture Maps Foundation |
| **Status** | Not yet integrated. Planned as supplemental building footprint source. |

---

## Summary

| Source | Status | License | Attribution Required |
|--------|--------|---------|---------------------|
| OpenStreetMap | ✅ Active | ODbL | ✅ Yes |
| OpenFreeMap | ✅ Active (tiles) | ODbL | ✅ Yes |
| Three.js | ✅ Active | MIT | No |
| MapLibre GL JS | ✅ Active | BSD | No |
| Copernicus DEM | 🕐 Planned | Copernicus | ✅ Yes |
| Overture Maps | 🕐 Planned | ODbL / CDLA | ✅ Yes |
