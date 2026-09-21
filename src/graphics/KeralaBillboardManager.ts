import * as THREE from 'three';
import { GeoCoords } from '../core/geoCoords';

export interface BillboardLocation {
  id: string;
  nameMalayalam: string;
  nameEnglish: string;
  subtitleMalayalam: string;
  subtitleEnglish: string;
  lat: number;
  lng: number;
  isDistrictGate?: boolean;
}

// Comprehensive Kerala locations with prominent district gates and iconic spots
export const KERALA_BILLBOARD_LOCATIONS: BillboardLocation[] = [
  // --- 14 Major District Grand Gateways ---
  {
    id: 'gate_tvm',
    nameMalayalam: 'തിരുവനന്തപുരം',
    nameEnglish: 'THIRUVANANTHAPURAM',
    subtitleMalayalam: 'അനന്തപുരിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Capital City of Kerala',
    lat: 8.5061,
    lng: 76.9558,
    isDistrictGate: true,
  },
  {
    id: 'gate_kollam',
    nameMalayalam: 'കൊല്ലം',
    nameEnglish: 'KOLLAM',
    subtitleMalayalam: 'കശുവണ്ടി നഗരത്തിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'The Prince of Arabian Sea',
    lat: 8.8932,
    lng: 76.6141,
    isDistrictGate: true,
  },
  {
    id: 'gate_pta',
    nameMalayalam: 'പത്തനംതിട്ട',
    nameEnglish: 'PATHANAMTHITTA',
    subtitleMalayalam: 'തീർത്ഥാടന നഗരിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'The Pilgrim Capital of Kerala',
    lat: 9.2648,
    lng: 76.787,
    isDistrictGate: true,
  },
  {
    id: 'gate_alp',
    nameMalayalam: 'ആലപ്പുഴ',
    nameEnglish: 'ALAPPUZHA',
    subtitleMalayalam: 'കിഴക്കിന്റെ വെനDefaultനിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Venice of the East',
    lat: 9.4981,
    lng: 76.3388,
    isDistrictGate: true,
  },
  {
    id: 'gate_ktm',
    nameMalayalam: 'കോട്ടയം',
    nameEnglish: 'KOTTAYAM',
    subtitleMalayalam: 'അക്ഷര നഗരിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'City of Letters, Lakes & Latex',
    lat: 9.5916,
    lng: 76.5222,
    isDistrictGate: true,
  },
  {
    id: 'gate_idk',
    nameMalayalam: 'ഇടുക്കി',
    nameEnglish: 'IDUKKI',
    subtitleMalayalam: 'പ്രകൃതി സൗന്ദര്യത്തിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Spice Garden & Western Ghats',
    lat: 9.85,
    lng: 76.97,
    isDistrictGate: true,
  },
  {
    id: 'gate_ekm',
    nameMalayalam: 'എറണാകുളം - കൊച്ചി',
    nameEnglish: 'ERNAKULAM - KOCHI',
    subtitleMalayalam: 'അറബിക്കടലിന്റെ റാണിയായ കൊച്ചിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Queen of the Arabian Sea',
    lat: 9.9816,
    lng: 76.2799,
    isDistrictGate: true,
  },
  {
    id: 'gate_tsr',
    nameMalayalam: 'തൃശ്ശൂർ',
    nameEnglish: 'THRISSUR',
    subtitleMalayalam: 'സാംസ്കാരിക തലസ്ഥാനത്തിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Cultural Capital of Kerala',
    lat: 10.5276,
    lng: 76.2144,
    isDistrictGate: true,
  },
  {
    id: 'gate_pkd',
    nameMalayalam: 'പാലക്കാട്',
    nameEnglish: 'PALAKKAD',
    subtitleMalayalam: 'നെല്ലറയായ പാലക്കാടേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Granary of Kerala • Gateway to Ghats',
    lat: 10.7867,
    lng: 76.6548,
    isDistrictGate: true,
  },
  {
    id: 'gate_mpm',
    nameMalayalam: 'മലപ്പുറം',
    nameEnglish: 'MALAPPURAM',
    subtitleMalayalam: 'സ്നേഹ സംഗമ ഭൂമിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Land of Hills, Heritage & Football',
    lat: 11.051,
    lng: 76.0711,
    isDistrictGate: true,
  },
  {
    id: 'gate_kkd',
    nameMalayalam: 'കോഴിക്കോട്',
    nameEnglish: 'KOZHIKODE',
    subtitleMalayalam: 'സുഗന്ധവ്യഞ്ജന നഗരത്തിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'City of Truth, Spices & Hospitality',
    lat: 11.2588,
    lng: 75.7804,
    isDistrictGate: true,
  },
  {
    id: 'gate_wyd',
    nameMalayalam: 'വയനാട്',
    nameEnglish: 'WAYANAD',
    subtitleMalayalam: 'ഹരിത വനഭൂമിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'The Green Paradise on Hills',
    lat: 11.6854,
    lng: 76.132,
    isDistrictGate: true,
  },
  {
    id: 'gate_knr',
    nameMalayalam: 'കണ്ണൂർ',
    nameEnglish: 'KANNUR',
    subtitleMalayalam: 'തെയ്യങ്ങളുടെ നാടിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Land of Looms, Lores & Theyyam',
    lat: 11.8745,
    lng: 75.3704,
    isDistrictGate: true,
  },
  {
    id: 'gate_ksd',
    nameMalayalam: 'കാസർഗോഡ്',
    nameEnglish: 'KASARAGOD',
    subtitleMalayalam: 'സപ്തഭാഷാ സംഗമ ഭൂമിയിലേക്ക് സ്വാഗതം',
    subtitleEnglish: 'Land of Forts, Rivers & Beaches',
    lat: 12.4996,
    lng: 74.9869,
    isDistrictGate: true,
  },

  // --- Prominent Iconic Kerala Hubs ---
  {
    id: 'spot_mananchira',
    nameMalayalam: 'മാനാഞ്ചിറ സ്ക്വയർ',
    nameEnglish: 'MANANCHIRA SQUARE',
    subtitleMalayalam: 'കോഴിക്കോട് ഹൃദയഭൂമി',
    subtitleEnglish: 'Historic Heart of Kozhikode',
    lat: 11.253,
    lng: 75.779,
  },
  {
    id: 'spot_kozhikode_beach',
    nameMalayalam: 'കോഴിക്കോട് ബീച്ച്',
    nameEnglish: 'KOZHIKODE BEACH',
    subtitleMalayalam: 'സൂര്യാസ്തമയ തീരം',
    subtitleEnglish: 'Historic Spice Coast Walkway',
    lat: 11.2625,
    lng: 75.768,
  },
  {
    id: 'spot_marine_drive',
    nameMalayalam: 'മറൈൻ ഡ്രൈവ് കൊച്ചി',
    nameEnglish: 'MARINE DRIVE KOCHI',
    subtitleMalayalam: 'കൊച്ചി കായലോര നടപ്പാത',
    subtitleEnglish: 'Scenic Waterfront Promenade',
    lat: 9.9825,
    lng: 76.2755,
  },
  {
    id: 'spot_fort_kochi',
    nameMalayalam: 'ഫോർട്ട് കൊച്ചി',
    nameEnglish: 'FORT KOCHI',
    subtitleMalayalam: 'പൈതൃക തീരദേശ നഗരം',
    subtitleEnglish: 'Historic Heritage Port & Chinese Nets',
    lat: 9.9656,
    lng: 76.2421,
  },
  {
    id: 'spot_swaraj_round',
    nameMalayalam: 'സ്വരാജ് റൗണ്ട് തൃശ്ശൂർ',
    nameEnglish: 'SWARAJ ROUND THRISSUR',
    subtitleMalayalam: 'വടക്കുംനാഥ ക്ഷേത്ര നഗരി',
    subtitleEnglish: 'Heart of the Cultural Capital',
    lat: 10.5245,
    lng: 76.2135,
  },
  {
    id: 'spot_munnar',
    nameMalayalam: 'മൂന്നാർ ഹിൽ സ്റ്റേഷൻ',
    nameEnglish: 'MUNNAR HILL STATION',
    subtitleMalayalam: 'മഞ്ഞുപുതച്ച തേയിലത്തോട്ടങ്ങൾ',
    subtitleEnglish: 'Queen of Hill Stations • Western Ghats',
    lat: 10.0889,
    lng: 77.0595,
  },
  {
    id: 'spot_kowdiar',
    nameMalayalam: 'കവടിയാർ കൊട്ടാരം',
    nameEnglish: 'KOWDIAR PALACE',
    subtitleMalayalam: 'തിരുവനന്തപുരം രാജവീഥി',
    subtitleEnglish: 'Royal Avenue of Travancore',
    lat: 8.528,
    lng: 76.963,
  },
  {
    id: 'spot_kovalam',
    nameMalayalam: 'കോവളം ബീച്ച്',
    nameEnglish: 'KOVALAM BEACH',
    subtitleMalayalam: 'അന്താരാഷ്ട്ര വിനോദസഞ്ചാര കേന്ദ്രം',
    subtitleEnglish: 'World Famous Crescent Beach',
    lat: 8.402,
    lng: 76.978,
  },
  {
    id: 'spot_bekal',
    nameMalayalam: 'ബേക്കൽ കോട്ട',
    nameEnglish: 'BEKAL FORT',
    subtitleMalayalam: 'ചരിത്രപ്രസിദ്ധമായ കടൽക്കോട്ട',
    subtitleEnglish: 'Largest Historic Coastal Fort of Kerala',
    lat: 12.3925,
    lng: 75.032,
  },
  {
    id: 'spot_kottakunnu',
    nameMalayalam: 'കോട്ടക്കുന്ന് മലപ്പുറം',
    nameEnglish: 'KOTTAKUNNU MALAPPURAM',
    subtitleMalayalam: 'മലമുകളിലെ ഉദ്യാന വിസ്മയം',
    subtitleEnglish: 'Marine Drive of Malappuram on Hills',
    lat: 11.045,
    lng: 76.073,
  },
];

interface PlacedBillboard {
  model: THREE.Group;
  location: BillboardLocation;
  localX: number;
  localZ: number;
}

/**
 * KeralaBillboardManager
 * Generates grand 3D Welcome Billboards and Entrance Archways (സ്വാഗത കവാടങ്ങൾ)
 * for all 14 Kerala districts and landmark towns with authentic Malayalam typography.
 */
export class KeralaBillboardManager {
  private scene: THREE.Scene;
  private container = new THREE.Group();
  private billboards: PlacedBillboard[] = [];
  // Cached materials
  private graniteColumnMat: THREE.MeshLambertMaterial;
  private brassMat: THREE.MeshLambertMaterial;
  private terracottaRoofMat: THREE.MeshLambertMaterial;
  private goldEmblemMat: THREE.MeshBasicMaterial;
  private lampMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container.name = 'KeralaBillboardContainer';
    this.scene.add(this.container);

    // Dark polished Kerala granite columns
    this.graniteColumnMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b,
    });

    // Traditional Kerala brass (ഓട് / പിച്ചള) for trims and nilavilakku
    this.brassMat = new THREE.MeshLambertMaterial({
      color: 0xd97706,
    });

    // Traditional Kerala terracotta roof tile
    this.terracottaRoofMat = new THREE.MeshLambertMaterial({
      color: 0xc2410c,
    });

    this.goldEmblemMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
    });

    this.lampMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
  }

  public clear() {
    for (const b of this.billboards) {
      this.container.remove(b.model);
      b.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => {
              if ((mat as any).map) (mat as any).map.dispose();
              mat.dispose();
            });
          } else if (m.material) {
            if ((m.material as any).map) (m.material as any).map.dispose();
            m.material.dispose();
          }
        }
      });
    }
    this.billboards = [];
  }

  /**
   * Generates high-definition canvas texture with rich Malayalam typography,
   * traditional decorative borders, and Government of Kerala style emblem header.
   */
  private createMalayalamBillboardTexture(loc: BillboardLocation): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Rich Deep Royal Kerala Green Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#064e3b'); // Emerald green
    bgGrad.addColorStop(0.5, '#022c22'); // Deep forest green
    bgGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Ornate Traditional Gold Border Trim (ആനച്ചമയം / ക്ഷേത്ര ശൈലി)
    ctx.strokeStyle = '#d97706'; // Gold
    ctx.lineWidth = 18;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    ctx.strokeStyle = '#fef08a'; // Bright gold inner fillet
    ctx.lineWidth = 6;
    ctx.strokeRect(46, 46, canvas.width - 92, canvas.height - 92);

    // Corner decorative rosettes
    const drawCornerRosette = (cx: number, cy: number) => {
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawCornerRosette(46, 46);
    drawCornerRosette(canvas.width - 46, 46);
    drawCornerRosette(46, canvas.height - 46);
    drawCornerRosette(canvas.width - 46, canvas.height - 46);

    // 3. Header Ribbon: "കേരള സർക്കാർ" (Government of Kerala) & "സ്വാഗതം"
    ctx.fillStyle = 'rgba(217, 119, 6, 0.28)';
    ctx.fillRect(52, 52, canvas.width - 104, 150);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 44px "Noto Sans Malayalam", "Manjari", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('• കേരള സർക്കാർ • GOVERNMENT OF KERALA •', canvas.width / 2, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Noto Sans Malayalam", "Manjari", system-ui, sans-serif';
    ctx.fillText('സ്വാഗതം • WELCOME', canvas.width / 2, 165);

    // 4. Main Title: Bold, Glowing Malayalam District / City Name
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    // Glowing golden-white gradient text for maximum legibility in 3D
    const titleGrad = ctx.createLinearGradient(0, 320, 0, 520);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.3, '#fef08a');
    titleGrad.addColorStop(1, '#f59e0b');

    ctx.fillStyle = titleGrad;
    ctx.font = '900 120px "Noto Sans Malayalam", "Manjari", "Arial Unicode MS", sans-serif';
    ctx.fillText(loc.nameMalayalam, canvas.width / 2, 410);
    ctx.restore();

    // 5. English District Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px system-ui, -apple-system, sans-serif';
    ctx.fillText(loc.nameEnglish, canvas.width / 2, 535);

    // Decorative separator line with center star
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.18, 595);
    ctx.lineTo(canvas.width * 0.46, 595);
    ctx.moveTo(canvas.width * 0.54, 595);
    ctx.lineTo(canvas.width * 0.82, 595);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '36px sans-serif';
    ctx.fillText('★', canvas.width / 2, 595);

    // 6. Subtitles: Malayalam Tagline & English Tagline
    ctx.fillStyle = '#93c5fd'; // Soft sky blue for Malayalam tagline
    ctx.font = 'bold 50px "Noto Sans Malayalam", "Manjari", system-ui, sans-serif';
    ctx.fillText(loc.subtitleMalayalam, canvas.width / 2, 675);

    ctx.fillStyle = '#e2e8f0'; // Light slate for English subtitle
    ctx.font = 'italic 500 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(loc.subtitleEnglish, canvas.width / 2, 755);

    // 7. Bottom Clean Kerala & Safe Drive Ribbon
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(52, canvas.height - 170, canvas.width - 104, 118);

    ctx.fillStyle = '#a7f3d0'; // Mint emerald
    ctx.font = 'bold 36px "Noto Sans Malayalam", "Manjari", system-ui, sans-serif';
    ctx.fillText(
      'സുരക്ഷിതമായി ഡ്രൈവ് ചെയ്യുക • ശുചിത്വ കേരളം • ഹൃദ്യമായ സ്വാഗതം',
      canvas.width / 2,
      canvas.height - 110
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Constructs the grand 3D Architectural Welcome Gateway model.
   * Total Width: 18m, Total Height: 11.5m
   */
  private createBillboard3DModel(loc: BillboardLocation): THREE.Group {
    const root = new THREE.Group();
    root.name = `kerala_welcome_gate_${loc.id}`;

    const boardWidth = 16.0;
    const boardHeight = 8.0;
    const boardThickness = 0.5;
    const columnHeight = 11.5;
    const columnSpan = 18.0;
    const columnRadius = 0.65;

    // 1. Two Giant Polished Granite Supporting Columns (Left & Right)
    // Foundation plinth penetrates 2.5m into ground so hill slopes never cause hover!
    const colGeo = new THREE.CylinderGeometry(
      columnRadius * 0.85,
      columnRadius,
      columnHeight + 2.5,
      12
    );
    // Move origin so bottom starts 2.5m underground
    colGeo.translate(0, (columnHeight - 2.5) * 0.5, 0);

    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(colGeo, this.graniteColumnMat);
      col.position.set(side * (columnSpan * 0.5), 0, 0);
      root.add(col);

      // Decorative Brass Footing Ring (above ground)
      const ringGeo = new THREE.CylinderGeometry(
        columnRadius * 1.25,
        columnRadius * 1.35,
        0.6,
        12
      );
      const ring = new THREE.Mesh(ringGeo, this.brassMat);
      ring.position.set(side * (columnSpan * 0.5), 0.3, 0);
      root.add(ring);

      // Brass Capital Collar under crossbeam
      const capGeo = new THREE.CylinderGeometry(
        columnRadius * 1.3,
        columnRadius * 1.0,
        0.5,
        12
      );
      const cap = new THREE.Mesh(capGeo, this.brassMat);
      cap.position.set(side * (columnSpan * 0.5), columnHeight - 0.4, 0);
      root.add(cap);
    }

    // 2. Heavy Steel / Stone Overhead Cantilever Cross-Beam
    const beamGeo = new THREE.BoxGeometry(columnSpan + 1.8, 0.75, 1.2);
    const beam = new THREE.Mesh(beamGeo, this.graniteColumnMat);
    beam.position.set(0, columnHeight - 0.2, 0);
    root.add(beam);

    // 3. Giant Double-Sided Billboard Panel with Canvas Texture
    const billboardTex = this.createMalayalamBillboardTexture(loc);
    const billboardMat = new THREE.MeshBasicMaterial({
      map: billboardTex,
      side: THREE.DoubleSide,
    });

    const panelGeo = new THREE.BoxGeometry(boardWidth, boardHeight, boardThickness);
    // Face materials: sides granite, front and back canvas texture
    const panelMats = [
      this.graniteColumnMat, // Right
      this.graniteColumnMat, // Left
      this.graniteColumnMat, // Top
      this.graniteColumnMat, // Bottom
      billboardMat, // Front face (positive Z)
      billboardMat, // Back face (negative Z)
    ];
    const panel = new THREE.Mesh(panelGeo, panelMats);
    panel.position.set(0, columnHeight - 4.2, 0);
    root.add(panel);

    // 4. Traditional Kerala Sloping Terracotta Tiled Gopuram Canopy on Top
    const roofWidth = boardWidth + 2.4;
    const roofDepth = 2.4;
    const roofHeight = 1.6;

    // Sloped Roof Hipped Gable
    const roofGeo = new THREE.ConeGeometry(roofWidth * 0.52, roofHeight, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.terracottaRoofMat);
    roof.position.set(0, columnHeight + roofHeight * 0.5 + 0.1, 0);
    roof.scale.set(1.0, 1.0, roofDepth / (roofWidth * 0.52));
    root.add(roof);

    // Eaves Ridge Timber Fascia (ഇറയം)
    const eaveGeo = new THREE.BoxGeometry(roofWidth + 0.8, 0.22, roofDepth + 0.8);
    const eave = new THREE.Mesh(eaveGeo, this.terracottaRoofMat);
    eave.position.set(0, columnHeight + 0.1, 0);
    root.add(eave);

    // 5. Traditional Brass Nilavilakku / Gopuram Finials (നിലവിളക്ക് / സ്തൂപിക)
    const finialGeo = new THREE.CylinderGeometry(0.04, 0.18, 0.9, 8);
    // Center peak finial
    const centerFinial = new THREE.Mesh(finialGeo, this.brassMat);
    centerFinial.position.set(0, columnHeight + roofHeight + 0.5, 0);
    root.add(centerFinial);

    // Corner finials
    for (const side of [-1, 1]) {
      const cornerFinial = new THREE.Mesh(finialGeo, this.brassMat);
      cornerFinial.position.set(side * (roofWidth * 0.48), columnHeight + 0.55, 0);
      cornerFinial.scale.set(0.7, 0.7, 0.7);
      root.add(cornerFinial);
    }

    // 6. Overhead Spotlights (Angled downward onto billboard)
    for (const side of [-1, 1]) {
      const lampHousingGeo = new THREE.BoxGeometry(0.8, 0.35, 0.45);
      const lampHousing = new THREE.Mesh(lampHousingGeo, this.graniteColumnMat);
      lampHousing.position.set(side * (boardWidth * 0.32), columnHeight + 0.1, 1.1);
      lampHousing.rotation.x = 0.45; // Angled towards board
      root.add(lampHousing);

      const lampLensGeo = new THREE.PlaneGeometry(0.7, 0.25);
      const lampLens = new THREE.Mesh(lampLensGeo, this.lampMat);
      lampLens.position.set(side * (boardWidth * 0.32), columnHeight + 0.05, 1.25);
      lampLens.rotation.x = -0.45;
      root.add(lampLens);
    }

    return root;
  }

  /**
   * Evaluates proximity to all Kerala districts and landmark spots,
   * placing the large 3D Malayalam welcome billboards within active viewing range.
   */
  public update(
    originLat: number,
    originLng: number,
    playerLat: number,
    playerLng: number,
    getElevation?: (localX: number, localZ: number) => number
  ) {
    // View radius: 3500m (3.5km) so these massive landmarks can be seen from far away!
    const MAX_GATE_DIST = 3500;

    const neededKeys = new Set<string>();

    for (const loc of KERALA_BILLBOARD_LOCATIONS) {
      const distFromPlayer = GeoCoords.distanceMeters(playerLat, playerLng, loc.lat, loc.lng);
      if (distFromPlayer <= MAX_GATE_DIST) {
        neededKeys.add(loc.id);

        let placed = this.billboards.find((b) => b.location.id === loc.id);
        const local = GeoCoords.toLocalMeters(loc.lat, loc.lng, originLat, originLng);

        if (!placed) {
          const model = this.createBillboard3DModel(loc);
          const groundY = getElevation ? getElevation(local.x, local.z) : 0;
          model.position.set(local.x, groundY, local.z);

          this.container.add(model);
          this.billboards.push({
            model,
            location: loc,
            localX: local.x,
            localZ: local.z,
          });
        } else {
          // Re-verify elevation in case terrain just loaded or player changed origin
          placed.localX = local.x;
          placed.localZ = local.z;
          const groundY = getElevation ? getElevation(local.x, local.z) : 0;
          placed.model.position.set(local.x, groundY, local.z);
        }
      }
    }

    // Unload distant gates
    for (let i = this.billboards.length - 1; i >= 0; i--) {
      const b = this.billboards[i];
      if (!neededKeys.has(b.location.id)) {
        this.container.remove(b.model);
        b.model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.geometry?.dispose();
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => {
                if ((mat as any).map) (mat as any).map.dispose();
                mat.dispose();
              });
            } else if (m.material) {
              if ((m.material as any).map) (m.material as any).map.dispose();
              m.material.dispose();
            }
          }
        });
        this.billboards.splice(i, 1);
      }
    }
  }

  /**
   * Resnaps all currently loaded billboards to updated terrain elevation.
   */
  public refreshElevations(getElevation: (localX: number, localZ: number) => number) {
    for (const b of this.billboards) {
      const groundY = getElevation(b.localX, b.localZ);
      b.model.position.y = groundY;
    }
  }

  public dispose() {
    this.clear();
    this.scene.remove(this.container);
    this.graniteColumnMat.dispose();
    this.brassMat.dispose();
    this.terracottaRoofMat.dispose();
    this.goldEmblemMat.dispose();
    this.lampMat.dispose();
  }
}
