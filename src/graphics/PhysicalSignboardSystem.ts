import * as THREE from 'three';
import { BuildingCategory } from '../core/geoTypes';

export interface SignboardOptions {
  name: string;
  category: BuildingCategory;
  width?: number;
  height?: number;
  malayalamName?: string;
  tags?: Record<string, string>;
  isMajorPOI?: boolean;
}

export class PhysicalSignboardSystem {
  private static frameMaterial: THREE.MeshLambertMaterial;
  private static bracketMaterial: THREE.MeshLambertMaterial;
  private static shutterMaterial: THREE.MeshLambertMaterial;
  private static goldMaterial: THREE.MeshStandardMaterial;
  private static whiteMaterial: THREE.MeshLambertMaterial;
  private static redMaterial: THREE.MeshLambertMaterial;

  constructor() {
    PhysicalSignboardSystem.initMaterials();
  }

  private static initMaterials() {
    if (!this.frameMaterial) {
      this.frameMaterial = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      this.bracketMaterial = new THREE.MeshLambertMaterial({ color: 0x475569 });
      this.shutterMaterial = new THREE.MeshLambertMaterial({ color: 0x64748b });
      this.goldMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
      this.whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
      this.redMaterial = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    }
  }

  /**
   * Generates a high-contrast physical 3D signboard mesh attached to building facade.
   * Signs are properly bracketed and flush to the wall surface.
   */
  public createSignboard(options: SignboardOptions): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const { name, category, tags = {}, isMajorPOI = false } = options;

    const group = new THREE.Group();
    group.name = `signboard-${name.substring(0, 10)}`;

    const lowerName = name.toLowerCase();
    const isMall = lowerName.includes('mall') || tags.shop === 'mall';
    const width = options.width || (category === 'RAILWAY_STATION' ? 4.8 : isMall ? 5.2 : isMajorPOI ? 4.2 : 3.2);
    const height = options.height || (category === 'RAILWAY_STATION' ? 1.2 : isMall ? 1.35 : 0.9);

    // 1. Color scheme and badge based on POI category
    let bgColor = '#1e293b';
    let textColor = '#f8fafc';
    let borderColor = '#94a3b8';
    let badgeText: string = category;

    const religion = (tags.religion || '').toLowerCase();

    switch (category) {
      case 'RAILWAY_STATION':
        bgColor = '#facc15'; // Authentic Indian Railways Yellow
        textColor = '#0f172a'; // Bold Black
        borderColor = '#000000';
        badgeText = 'INDIAN RAILWAYS / ഭാരതീയ റെയിൽവേ';
        break;
      case 'BUS_STOP':
        bgColor = '#1e40af';
        textColor = '#facc15';
        borderColor = '#ffffff';
        badgeText = '🚌 BUS STOP / ബസ് സ്റ്റോപ്പ്';
        break;
      case 'PARKING':
        bgColor = '#1d4ed8';
        textColor = '#ffffff';
        borderColor = '#93c5fd';
        badgeText = '🅿️ PARKING / പാർക്കിംഗ്';
        break;
      case 'HOSPITAL':
        bgColor = '#ffffff';
        textColor = '#b91c1c';
        borderColor = '#dc2626';
        badgeText = '🏥 HOSPITAL / ആശുപത്രി';
        break;
      case 'SCHOOL':
      case 'COLLEGE':
        bgColor = '#1e3a8a';
        textColor = '#fef08a';
        borderColor = '#ffffff';
        badgeText = category === 'COLLEGE' ? '🎓 COLLEGE' : '🏫 SCHOOL / വിദ്യാലയം';
        break;
      case 'RESTAURANT':
      case 'CAFE':
        if (lowerName.includes('chat') || lowerName.includes('fast food') || tags.amenity === 'fast_food') {
          bgColor = '#b45309';
          textColor = '#fef3c7';
          borderColor = '#f59e0b';
          badgeText = '🍛 SPECIAL CHATS & SNACKS / ഭക്ഷണശാല';
        } else if (category === 'CAFE' || lowerName.includes('cafe') || lowerName.includes('coffee') || lowerName.includes('boat')) {
          bgColor = '#451a03'; // Rich warm cafe espresso
          textColor = '#fef3c7';
          borderColor = '#d97706';
          badgeText = '☕ CAFE & EATERY / കഫേ';
        } else {
          bgColor = '#9a3412';
          textColor = '#fef3c7';
          borderColor = '#f59e0b';
          badgeText = '🍴 RESTAURANT / ഭക്ഷണശാല';
        }
        break;
      case 'SHOP':
      case 'SUPERMARKET':
        if (lowerName.includes('silver') || lowerName.includes('gold') || lowerName.includes('jewel') || tags.shop === 'jewelry') {
          bgColor = '#0f172a';
          textColor = '#fef08a'; // Gold accent
          borderColor = '#f59e0b';
          badgeText = '💎 JEWELLERY / സിൽവർ & ഗോൾഡ്';
        } else if (lowerName.includes('bake') || lowerName.includes('bakery') || tags.shop === 'bakery') {
          bgColor = '#78350f'; // Warm bakery brown
          textColor = '#fef3c7';
          borderColor = '#f59e0b';
          badgeText = '🥐 BAKE HOUSE / ബേക്കറി';
        } else if (
          lowerName.includes('tile') ||
          lowerName.includes('sanitary') ||
          lowerName.includes('ceramic') ||
          lowerName.includes('granite') ||
          lowerName.includes('hardware')
        ) {
          bgColor = '#1e293b';
          textColor = '#38bdf8';
          borderColor = '#0284c7';
          badgeText = '🧱 TILES & SANITARY / ടൈൽസ്';
        } else if (isMall) {
          bgColor = '#1e1b4b'; // Deep luxury purple
          textColor = '#fef08a';
          borderColor = '#ec4899';
          badgeText = '🛍️ SHOPPING MALL / മാൾ';
        } else {
          bgColor = '#065f46';
          textColor = '#ffffff';
          borderColor = '#34d399';
          badgeText = category === 'SUPERMARKET' ? '🛒 SUPERMARKET' : '🛍️ STORE / വ്യാപാരശാല';
        }
        break;
      case 'HOTEL':
        bgColor = '#312e81';
        textColor = '#e0e7ff';
        borderColor = '#a5b4fc';
        badgeText = '🏨 HOTEL & SUITES';
        break;
      case 'GOVERNMENT':
        if (lowerName.includes('police') || tags.amenity === 'police') {
          bgColor = '#0f172a'; // Kerala Police Deep Navy Blue
          textColor = '#f8fafc';
          borderColor = '#dc2626'; // Police Red band
          badgeText = lowerName.includes('rail')
            ? '👮 KERALA RAIL POLICE / റെയിൽവേ പോലീസ്'
            : '👮 KERALA POLICE / കേരള പോലീസ്';
        } else {
          bgColor = '#881337';
          textColor = '#fef08a';
          borderColor = '#fbbf24';
          badgeText = '🏛️ GOVERNMENT / സർക്കാർ കാര്യാലയം';
        }
        break;
      case 'RELIGIOUS':
        if (religion === 'muslim' || name.toLowerCase().includes('mosque') || name.toLowerCase().includes('masjid')) {
          bgColor = '#064e3b';
          textColor = '#fef08a';
          borderColor = '#10b981';
          badgeText = '🕌 MASJID / പള്ളി';
        } else if (religion === 'hindu' || name.toLowerCase().includes('temple') || name.toLowerCase().includes('kshetram')) {
          bgColor = '#9a3412';
          textColor = '#fef08a';
          borderColor = '#f59e0b';
          badgeText = '🛕 TEMPLE / ക്ഷേത്രം';
        } else {
          bgColor = '#1e3a8a';
          textColor = '#f8fafc';
          borderColor = '#e2e8f0';
          badgeText = '⛪ CHURCH / ദേവാലയം';
        }
        break;
      case 'LANDMARK':
        bgColor = '#451a03';
        textColor = '#fde68a';
        borderColor = '#d97706';
        badgeText = '⭐ HISTORIC LANDMARK';
        break;
      default:
        bgColor = '#1e293b';
        textColor = '#f8fafc';
        borderColor = '#94a3b8';
        badgeText = category;
        break;
    }

    // 2. Ultra-crisp high-resolution canvas texture rendering (1024x384) with dynamic auto-fit
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 14;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Category badge with dynamic auto-scaling
      ctx.fillStyle = borderColor;
      let badgeFontSize = 34;
      ctx.font = `bold ${badgeFontSize}px system-ui, -apple-system, sans-serif`;
      let bWidth = ctx.measureText(badgeText).width;
      while (bWidth > canvas.width - 60 && badgeFontSize > 22) {
        badgeFontSize -= 2;
        ctx.font = `bold ${badgeFontSize}px system-ui, -apple-system, sans-serif`;
        bWidth = ctx.measureText(badgeText).width;
      }
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, canvas.width / 2, 60);

      // Divider line
      ctx.beginPath();
      ctx.moveTo(40, 78);
      ctx.lineTo(canvas.width - 40, 78);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      const mlName = tags['name:ml'] || options.malayalamName;
      const cleanUpper = name.toUpperCase().trim();

      if (mlName) {
        // Prominent Malayalam script on top
        ctx.fillStyle = '#ffffff';
        let mlFontSize = 62;
        ctx.font = `bold ${mlFontSize}px system-ui, -apple-system, sans-serif`;
        let mlWidth = ctx.measureText(mlName).width;
        while (mlWidth > canvas.width - 60 && mlFontSize > 34) {
          mlFontSize -= 3;
          ctx.font = `bold ${mlFontSize}px system-ui, -apple-system, sans-serif`;
          mlWidth = ctx.measureText(mlName).width;
        }
        ctx.fillText(mlName, canvas.width / 2, 175);

        // English name below in warm gold/amber
        ctx.fillStyle = '#fef08a';
        let enFontSize = 54;
        ctx.font = `900 ${enFontSize}px system-ui, -apple-system, sans-serif`;
        let enWidth = ctx.measureText(cleanUpper).width;
        while (enWidth > canvas.width - 60 && enFontSize > 30) {
          enFontSize -= 3;
          ctx.font = `900 ${enFontSize}px system-ui, -apple-system, sans-serif`;
          enWidth = ctx.measureText(cleanUpper).width;
        }
        ctx.fillText(cleanUpper, canvas.width / 2, 265);
      } else {
        // English name only — large, bold, prominent
        ctx.fillStyle = textColor;
        let fontSize = 72;
        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        let textWidth = ctx.measureText(cleanUpper).width;

        if (textWidth > canvas.width - 60 && cleanUpper.includes(' ')) {
          const words = cleanUpper.split(' ');
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');

          ctx.font = '900 52px system-ui, -apple-system, sans-serif';
          ctx.fillText(line1, canvas.width / 2, 170);
          ctx.fillText(line2, canvas.width / 2, 245);
        } else {
          while (textWidth > canvas.width - 60 && fontSize > 32) {
            fontSize -= 4;
            ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
            textWidth = ctx.measureText(cleanUpper).width;
          }
          ctx.fillText(cleanUpper, canvas.width / 2, 210);
        }
      }

      // Bottom highlight bar
      ctx.fillStyle = borderColor;
      ctx.fillRect(50, canvas.height - 30, canvas.width - 100, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const boardMat = new THREE.MeshLambertMaterial({ map: texture });

    // 3. 3D Board geometry & flush mounting brackets
    const boardThickness = 0.08;
    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, boardThickness), boardMat);
    boardMesh.position.set(0, 0, boardThickness * 0.5);
    group.add(boardMesh);

    // Frame casing
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.06, height + 0.06, boardThickness * 0.8),
      PhysicalSignboardSystem.frameMaterial
    );
    frameMesh.position.set(0, 0, 0);
    group.add(frameMesh);

    // Wall mounting bracket legs extending backwards into the building wall
    const leg1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6),
      PhysicalSignboardSystem.bracketMaterial
    );
    leg1.rotation.x = Math.PI / 2;
    leg1.position.set(-width * 0.35, 0, -0.15);
    group.add(leg1);

    const leg2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6),
      PhysicalSignboardSystem.bracketMaterial
    );
    leg2.rotation.x = Math.PI / 2;
    leg2.position.set(width * 0.35, 0, -0.15);
    group.add(leg2);

    return group;
  }

  /**
   * Generates a realistic physical shop storefront unit with glass entrance door,
   * display window, metallic rolling shutter, and colorful shop awning canopy.
   */
  public createStorefront(width = 3.4, height = 2.8, withAwning = true, awningColor = 0xd97706): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'commercial-storefront';

    // 1. Shutter backing / recessed alcove
    const shutterGeo = new THREE.BoxGeometry(width, height, 0.06);
    const shutter = new THREE.Mesh(shutterGeo, PhysicalSignboardSystem.shutterMaterial);
    shutter.position.set(0, height * 0.5, 0.01);
    group.add(shutter);

    // 2. Glass display window pane
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
    });
    const winW = width * 0.44;
    const winH = height * 0.65;
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.02), glassMat);
    glassPane.position.set(-width * 0.23, height * 0.46, 0.04);
    group.add(glassPane);

    // Glass window frame
    const winFrameMat = PhysicalSignboardSystem.frameMaterial;
    const winBorder = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.04, winH + 0.04, 0.03), winFrameMat);
    winBorder.position.set(-width * 0.23, height * 0.46, 0.03);
    group.add(winBorder);

    // 3. Entrance door (Glass & frame)
    const doorW = width * 0.42;
    const doorH = height * 0.88;
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.03), doorMat);
    doorMesh.position.set(width * 0.23, doorH * 0.5, 0.04);

    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, doorH * 0.6, 0.04), glassMat);
    doorGlass.position.set(width * 0.23, doorH * 0.55, 0.045);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), handleMat);
    handle.position.set(width * 0.08, doorH * 0.48, 0.07);

    group.add(doorMesh, doorGlass, handle);

    // 4. Rolling shutter housing / lintel box on top
    const rollBox = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.08, 0.35, 0.2),
      PhysicalSignboardSystem.shutterMaterial
    );
    rollBox.position.set(0, height - 0.14, 0.08);

    // Door entrance outer frame
    const frameW = 0.12;
    const lPost = new THREE.Mesh(new THREE.BoxGeometry(frameW, height, 0.1), winFrameMat);
    lPost.position.set(-width * 0.5 + frameW * 0.5, height * 0.5, 0.05);
    const rPost = new THREE.Mesh(new THREE.BoxGeometry(frameW, height, 0.1), winFrameMat);
    rPost.position.set(width * 0.5 - frameW * 0.5, height * 0.5, 0.05);
    group.add(rollBox, lPost, rPost);

    // 5. Striped Fabric Shop Awning angled outwards over sidewalk
    if (withAwning) {
      const awningW = width + 0.3;
      const awningDepth = 1.15;
      const awningGeo = new THREE.BoxGeometry(awningW, 0.06, awningDepth);
      const awningMat = new THREE.MeshLambertMaterial({ color: awningColor });
      const awningMesh = new THREE.Mesh(awningGeo, awningMat);
      awningMesh.rotation.x = Math.PI * 0.15; // Slope downward
      awningMesh.position.set(0, height + 0.16, awningDepth * 0.45);
      group.add(awningMesh);
    }

    return group;
  }

  /**
   * Creates a 3D Red Cross emblem for hospital facades/roofs.
   */
  public createHospitalCross(size = 1.4): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'hospital-cross';

    const t = size * 0.25;
    const barV = new THREE.Mesh(
      new THREE.BoxGeometry(t, size, 0.12),
      PhysicalSignboardSystem.redMaterial
    );
    const barH = new THREE.Mesh(
      new THREE.BoxGeometry(size, t, 0.12),
      PhysicalSignboardSystem.redMaterial
    );

    // Circular white backing disc
    const backing = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.65, size * 0.65, 0.08, 24),
      PhysicalSignboardSystem.whiteMaterial
    );
    backing.rotation.x = Math.PI / 2;
    backing.position.z = -0.04;

    group.add(backing, barV, barH);
    return group;
  }

  /**
   * Creates an iconic Indian Railways station roof canopy and nameboard.
   */
  public createRailwayStationFeature(stationName: string, length = 12.0): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'railway-station-feature';

    // Platform tin roof canopy
    const canopyW = 4.2;
    const canopyGeo = new THREE.BoxGeometry(canopyW, 0.1, length);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 }); // Blue tin roof
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 3.8, 0);
    group.add(canopy);

    // Steel pillar supports
    const pillarCount = Math.max(2, Math.floor(length / 4.0));
    for (let i = 0; i < pillarCount; i++) {
      const zOffset = -length * 0.4 + (i / (pillarCount - 1)) * length * 0.8;
      const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), PhysicalSignboardSystem.bracketMaterial);
      pillarL.position.set(-canopyW * 0.4, 1.9, zOffset);
      const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), PhysicalSignboardSystem.bracketMaterial);
      pillarR.position.set(canopyW * 0.4, 1.9, zOffset);
      group.add(pillarL, pillarR);
    }

    // Iconic yellow station signboard mounted under canopy
    const sign = this.createSignboard({
      name: stationName,
      category: 'RAILWAY_STATION',
      width: 4.5,
      height: 1.1,
    });
    sign.position.set(0, 3.2, 0);
    group.add(sign);

    return group;
  }

  /**
   * Creates an authentic Kerala Police station entrance porch with chevron stripes,
   * police red/blue warning beacon, and security checkpoint barrier.
   */
  public createPoliceStationFeature(width = 4.8): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'police-station-feature';

    // 1. Entrance Porch Canopy
    const porchW = Math.min(width, 5.2);
    const porchDepth = 2.4;
    const porchH = 0.2;
    const porchSlab = new THREE.Mesh(
      new THREE.BoxGeometry(porchW, porchH, porchDepth),
      new THREE.MeshLambertMaterial({ color: 0x1e3a8a }) // Kerala Police Deep Blue
    );
    porchSlab.position.set(0, 3.4, porchDepth * 0.5);
    group.add(porchSlab);

    // Chevron / Red trim along the edge of the porch
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(porchW + 0.05, 0.08, 0.06),
      PhysicalSignboardSystem.redMaterial
    );
    trim.position.set(0, 3.4, porchDepth + 0.03);
    group.add(trim);

    // 2. Pillars (White concrete posts)
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.3, 8);
    const pLeft = new THREE.Mesh(pillarGeo, PhysicalSignboardSystem.whiteMaterial);
    pLeft.position.set(-porchW * 0.45, 1.65, porchDepth - 0.2);
    const pRight = new THREE.Mesh(pillarGeo, PhysicalSignboardSystem.whiteMaterial);
    pRight.position.set(porchW * 0.45, 1.65, porchDepth - 0.2);
    group.add(pLeft, pRight);

    // 3. Flashing Red & Blue Warning Light Bar on top of the porch
    const beaconBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.15, 0.2),
      PhysicalSignboardSystem.bracketMaterial
    );
    beaconBox.position.set(0, 3.55, porchDepth * 0.8);
    group.add(beaconBox);

    const redLight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redLight.position.set(-0.25, 3.65, porchDepth * 0.8);
    const blueLight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    blueLight.position.set(0.25, 3.65, porchDepth * 0.8);
    group.add(redLight, blueLight);

    return group;
  }

  /**
   * Creates a grand commercial shopping mall entrance canopy with modern glass
   * and stainless steel columns (e.g. for Lulu Mall).
   */
  public createMallEntranceFeature(width = 10.0): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'mall-entrance-feature';

    const canopyW = Math.min(width * 0.7, 12.0);
    const canopyDepth = 4.0;
    const canopyHeight = 4.5;

    // Glass cantilever canopy
    const glassSlab = new THREE.Mesh(
      new THREE.BoxGeometry(canopyW, 0.15, canopyDepth),
      new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.8,
      })
    );
    glassSlab.position.set(0, canopyHeight, canopyDepth * 0.5);
    group.add(glassSlab);

    // Polished steel frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(canopyW + 0.1, 0.2, 0.1),
      PhysicalSignboardSystem.whiteMaterial
    );
    frame.position.set(0, canopyHeight, canopyDepth + 0.05);
    group.add(frame);

    // 4 Tall entrance columns
    const colCount = 4;
    for (let i = 0; i < colCount; i++) {
      const cx = -canopyW * 0.45 + (i / (colCount - 1)) * (canopyW * 0.9);
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, canopyHeight, 8),
        PhysicalSignboardSystem.whiteMaterial
      );
      col.position.set(cx, canopyHeight * 0.5, canopyDepth - 0.3);
      group.add(col);
    }

    return group;
  }

  /**
   * Creates a Golden Dome + Crescent finial for Mosques.
   */
  public createMosqueDome(radius = 2.4): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'mosque-dome';

    const domeGeo = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeo, PhysicalSignboardSystem.goldMaterial);
    dome.position.y = 0;
    group.add(dome);

    // Crescent spire finial
    const finial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, radius * 0.8, 8),
      PhysicalSignboardSystem.goldMaterial
    );
    finial.position.y = radius + radius * 0.4;
    group.add(finial);

    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.22, 0.04, 8, 16, Math.PI * 1.5),
      PhysicalSignboardSystem.goldMaterial
    );
    crescent.position.y = radius + radius * 0.75;
    crescent.rotation.y = Math.PI / 4;
    group.add(crescent);

    return group;
  }

  /**
   * Creates a Traditional Kerala Temple Shikhara/Pyramid Roof + Kalasam finial.
   */
  public createTempleShikhara(baseWidth = 3.6, height = 3.2): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'temple-shikhara';

    const roofGeo = new THREE.ConeGeometry(baseWidth * 0.7, height, 4);
    roofGeo.rotateY(Math.PI / 4);
    const terracottaMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Terracotta tile brown
    const roof = new THREE.Mesh(roofGeo, terracottaMat);
    roof.position.y = height * 0.5;
    group.add(roof);

    // Golden Kalasam finial on apex
    const kalasam = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.75, 8),
      PhysicalSignboardSystem.goldMaterial
    );
    kalasam.position.y = height + 0.35;
    group.add(kalasam);

    return group;
  }

  /**
   * Creates a Church Spire Steeple with 3D Cross.
   */
  public createChurchSteeple(height = 5.0): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'church-steeple';

    // Tower base
    const baseGeo = new THREE.BoxGeometry(2.2, height * 0.5, 2.2);
    const baseMat = PhysicalSignboardSystem.whiteMaterial;
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = height * 0.25;
    group.add(base);

    // Slender pyramid spire
    const spireGeo = new THREE.ConeGeometry(1.4, height * 0.6, 4);
    spireGeo.rotateY(Math.PI / 4);
    const spireMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = height * 0.5 + height * 0.3;
    group.add(spire);

    // White Cross on top
    const crossBarV = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.8, 0.08),
      PhysicalSignboardSystem.goldMaterial
    );
    const crossBarH = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.08),
      PhysicalSignboardSystem.goldMaterial
    );
    crossBarH.position.y = 0.15;
    const crossGroup = new THREE.Group();
    crossGroup.add(crossBarV, crossBarH);
    crossGroup.position.y = height * 1.1 + 0.4;
    group.add(crossGroup);

    return group;
  }

  /**
   * Creates Neoclassical Entrance Colonnade pillars for Government buildings.
   */
  public createGovernmentColonnade(width = 5.0, height = 4.2): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = 'government-colonnade';

    const pillarMat = PhysicalSignboardSystem.whiteMaterial;
    const pillarRadius = 0.18;
    const pillarCount = 4;

    for (let i = 0; i < pillarCount; i++) {
      const x = -width * 0.4 + (i / (pillarCount - 1)) * width * 0.8;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(pillarRadius, pillarRadius, height, 12), pillarMat);
      pillar.position.set(x, height * 0.5, 0.6);
      group.add(pillar);
    }

    // Triangular Pediment
    const pedimentGeo = new THREE.BoxGeometry(width, 0.4, 1.2);
    const pediment = new THREE.Mesh(pedimentGeo, pillarMat);
    pediment.position.set(0, height + 0.2, 0.6);
    group.add(pediment);

    return group;
  }

  /**
   * Creates an authentic elevated Rooftop Signboard mounted on steel lattice/support trusses.
   * Placed along the parapet edge of buildings facing the road.
   */
  public createRooftopSign(options: SignboardOptions): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = `rooftop-sign-${options.name.substring(0, 10)}`;

    const width = options.width || (options.isMajorPOI ? 5.2 : 3.8);
    const height = options.height || (options.isMajorPOI ? 1.4 : 1.0);

    // 1. Signboard panel (raised ~0.45m above roof surface)
    const signGroup = this.createSignboard({
      ...options,
      width,
      height,
    });
    const panelBottom = 0.55;
    signGroup.position.set(0, panelBottom + height * 0.5, 0);
    group.add(signGroup);

    // 2. Dual vertical steel posts anchored into roof
    const postRadius = 0.05;
    const postHeight = panelBottom + height;
    const postMat = PhysicalSignboardSystem.bracketMaterial;

    const postL = new THREE.Mesh(
      new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8),
      postMat
    );
    postL.position.set(-width * 0.38, postHeight * 0.5, -0.05);

    const postR = new THREE.Mesh(
      new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8),
      postMat
    );
    postR.position.set(width * 0.38, postHeight * 0.5, -0.05);

    // 3. Diagonal steel support stays (kickers) angled back to the roof
    const kickerLen = Math.hypot(postHeight * 0.85, 0.9);
    const kickerAngle = Math.atan2(0.9, postHeight * 0.85);

    const kickerL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, kickerLen, 6),
      postMat
    );
    kickerL.rotation.x = -kickerAngle;
    kickerL.position.set(-width * 0.38, postHeight * 0.45, -0.45);

    const kickerR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, kickerLen, 6),
      postMat
    );
    kickerR.rotation.x = -kickerAngle;
    kickerR.position.set(width * 0.38, postHeight * 0.45, -0.45);

    // 4. Horizontal stiffener rail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.85, 0.05, 0.05),
      postMat
    );
    rail.position.set(0, panelBottom + height * 0.5, -0.1);

    group.add(postL, postR, kickerL, kickerR, rail);
    return group;
  }

  /**
   * Creates an official Kerala/Indian Roadside Street Name Signboard.
   * Dual-sided retroreflective green/blue panel on a metallic post.
   */
  public createRoadsideStreetSign(
    roadName: string,
    malayalamName?: string,
    roadClass = 'residential'
  ): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = `street-sign-${roadName.substring(0, 10)}`;

    const isMajor = roadClass === 'motorway' || roadClass === 'trunk' || roadClass === 'primary' || roadClass === 'secondary';
    const bgColor = isMajor ? '#15803d' : '#1e3a8a'; // State/National Green vs City Blue
    const borderColor = '#ffffff';

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

      // Clean uppercase road title
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      
      let fontSize = 36;
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
      const cleanUpper = roadName.toUpperCase().trim();
      let tw = ctx.measureText(cleanUpper).width;
      while (tw > canvas.width - 40 && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        tw = ctx.measureText(cleanUpper).width;
      }

      const hasMl = Boolean(malayalamName && malayalamName.trim().length > 0);
      if (hasMl) {
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.fillText(malayalamName!, canvas.width / 2, 48);
        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(cleanUpper, canvas.width / 2, 104);
      } else {
        ctx.fillText(cleanUpper, canvas.width / 2, 84);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const boardMat = new THREE.MeshLambertMaterial({ map: texture });

    const width = 2.2;
    const height = 0.65;
    const thickness = 0.06;

    // Double-sided sign panel
    const signGeo = new THREE.BoxGeometry(width, height, thickness);
    const signMesh = new THREE.Mesh(signGeo, boardMat);
    signMesh.position.set(0, 2.2, 0);
    group.add(signMesh);

    // Frame casing
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, height + 0.04, thickness * 0.7),
      PhysicalSignboardSystem.frameMaterial
    );
    frameMesh.position.set(0, 2.2, 0);
    group.add(frameMesh);

    // Metallic tubular pole (2.4m tall)
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.3, 12);
    const poleMesh = new THREE.Mesh(poleGeo, PhysicalSignboardSystem.bracketMaterial);
    poleMesh.position.set(0, 1.15, 0);
    group.add(poleMesh);

    // Concrete base pedestal footing at ground
    const baseGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.22, 10);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.11, 0);
    group.add(baseMesh);

    return group;
  }

  /**
   * Creates a Standalone POI Signboard on a roadside ground post
   * for entities without an associated building footprint.
   */
  public createStandalonePOISign(options: SignboardOptions): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = `standalone-poi-${options.name.substring(0, 10)}`;

    const width = options.width || 2.4;
    const height = options.height || 1.1;

    // Signboard panel elevated to 2.4m
    const signGroup = this.createSignboard({
      ...options,
      width,
      height,
    });
    signGroup.position.set(0, 2.2, 0);
    group.add(signGroup);

    // Dual vertical posts to ground
    const postMat = PhysicalSignboardSystem.bracketMaterial;
    const postHeight = 2.4;
    const postL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, postHeight, 8),
      postMat
    );
    postL.position.set(-width * 0.35, postHeight * 0.5, 0);

    const postR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, postHeight, 8),
      postMat
    );
    postR.position.set(width * 0.35, postHeight * 0.5, 0);

    // Concrete footings
    const footingGeo = new THREE.BoxGeometry(0.24, 0.2, 0.24);
    const footingMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const footL = new THREE.Mesh(footingGeo, footingMat);
    footL.position.set(-width * 0.35, 0.1, 0);
    const footR = new THREE.Mesh(footingGeo, footingMat);
    footR.position.set(width * 0.35, 0.1, 0);

    group.add(postL, postR, footL, footR);
    return group;
  }

  /**
   * Creates an authentic Indian/Kerala Highway Junction Direction Billboard
   * featuring multi-row destination names, directional arrows, Malayalam + English,
   * road number shields (e.g. NH 66), dual heavy steel columns, and illumination hood.
   */
  public createJunctionDirectionBoard(options: {
    junctionName?: string;
    malayalamJunctionName?: string;
    isNationalHighway?: boolean;
    destinations: {
      arrow: 'left' | 'straight' | 'right';
      nameEn: string;
      nameMl?: string;
      roadCode?: string;
      distanceKm?: number;
    }[];
    width?: number;
    height?: number;
  }): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = `dir-board-${(options.junctionName || 'junction').substring(0, 10)}`;

    const width = options.width || 3.8;
    const height = options.height || 2.1;
    const isHighway = options.isNationalHighway ?? true;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Retroreflective highway green or city blue
      const bgColor = isHighway ? '#15803d' : '#1e40af';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Crisp double white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 14;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
      ctx.lineWidth = 3;
      ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

      let topOffset = 36;

      // Junction Name Header banner (if provided)
      if (options.junctionName) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.fillRect(28, 28, canvas.width - 56, 76);
        ctx.fillStyle = '#fef08a'; // Warm amber-yellow
        ctx.textAlign = 'center';
        const titleText = options.malayalamJunctionName
          ? `📍 ${options.malayalamJunctionName} • ${options.junctionName.toUpperCase()}`
          : `📍 ${options.junctionName.toUpperCase()}`;
        ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
        ctx.fillText(titleText, canvas.width / 2, 76);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(28, 104);
        ctx.lineTo(canvas.width - 28, 104);
        ctx.stroke();

        topOffset = 110;
      }

      // Direction rows
      const items = options.destinations.slice(0, 3);
      const rowCount = Math.max(1, items.length);
      const rowHeight = (canvas.height - topOffset - 28) / rowCount;

      items.forEach((item, idx) => {
        const y = topOffset + idx * rowHeight;

        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(canvas.width - 40, y);
          ctx.stroke();
        }

        const centerY = y + rowHeight * 0.5;

        // Direction Arrow
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const arrowX = item.arrow === 'right' ? canvas.width - 95 : 90;
        const arrowY = centerY;

        if (item.arrow === 'left') {
          ctx.beginPath();
          ctx.moveTo(arrowX + 28, arrowY);
          ctx.lineTo(arrowX - 25, arrowY);
          ctx.lineTo(arrowX - 5, arrowY - 20);
          ctx.moveTo(arrowX - 25, arrowY);
          ctx.lineTo(arrowX - 5, arrowY + 20);
          ctx.stroke();
        } else if (item.arrow === 'right') {
          ctx.beginPath();
          ctx.moveTo(arrowX - 28, arrowY);
          ctx.lineTo(arrowX + 25, arrowY);
          ctx.lineTo(arrowX + 5, arrowY - 20);
          ctx.moveTo(arrowX + 25, arrowY);
          ctx.lineTo(arrowX + 5, arrowY + 20);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY + 25);
          ctx.lineTo(arrowX, arrowY - 25);
          ctx.lineTo(arrowX - 18, arrowY - 7);
          ctx.moveTo(arrowX, arrowY - 25);
          ctx.lineTo(arrowX + 18, arrowY - 7);
          ctx.stroke();
        }

        // Destination Texts
        const textX = item.arrow === 'right' ? 80 : 155;
        let codeOffset = 0;

        if (item.roadCode) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(textX, centerY - 26, 110, 48);
          ctx.fillStyle = '#15803d';
          ctx.font = '900 24px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.roadCode, textX + 55, centerY + 6);
          codeOffset = 125;
        }

        ctx.textAlign = 'left';
        if (item.nameMl) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
          ctx.fillText(item.nameMl, textX + codeOffset, centerY - 8);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
          ctx.fillText(item.nameEn.toUpperCase(), textX + codeOffset, centerY + 30);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 42px system-ui, -apple-system, sans-serif';
          ctx.fillText(item.nameEn.toUpperCase(), textX + codeOffset, centerY + 14);
        }

        if (item.distanceKm) {
          const distX = item.arrow === 'right' ? canvas.width - 160 : canvas.width - 90;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'right';
          ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
          ctx.fillText(`${item.distanceKm} km`, distX, centerY + 10);
        }
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const boardMat = new THREE.MeshLambertMaterial({ map: texture });

    const thickness = 0.08;
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), boardMat);
    const panelY = 2.4 + height * 0.5;
    signMesh.position.set(0, panelY, 0);
    group.add(signMesh);

    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.06, height + 0.06, thickness * 0.7),
      PhysicalSignboardSystem.frameMaterial
    );
    frameMesh.position.set(0, panelY, -0.01);
    group.add(frameMesh);

    const postHeight = panelY + height * 0.45;
    const postRadius = 0.06;
    const postMat = PhysicalSignboardSystem.bracketMaterial;
    const postOffset = width * 0.36;

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 10), postMat);
    postL.position.set(-postOffset, postHeight * 0.5, -thickness * 0.5 - 0.02);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 10), postMat);
    postR.position.set(postOffset, postHeight * 0.5, -thickness * 0.5 - 0.02);

    const footMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.32), footMat);
    footL.position.set(-postOffset, 0.12, -thickness * 0.5 - 0.02);
    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.32), footMat);
    footR.position.set(postOffset, 0.12, -thickness * 0.5 - 0.02);

    const hoodMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.05, 0.35), hoodMat);
    hood.position.set(0, panelY + height * 0.5 + 0.04, 0.12);

    group.add(postL, postR, footL, footR, hood);
    return group;
  }

  /**
   * Creates an official Kerala PWD / NHAI Junction Identification Billboard
   * placed in the corner verge of road intersections.
   */
  public createJunctionLocationBoard(options: {
    junctionName: string;
    malayalamName?: string;
    subText?: string;
    width?: number;
    height?: number;
  }): THREE.Group {
    PhysicalSignboardSystem.initMaterials();
    const group = new THREE.Group();
    group.name = `loc-board-${options.junctionName.substring(0, 10)}`;

    const width = options.width || 3.4;
    const height = options.height || 1.8;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Deep navy background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Yellow outer border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 14;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      // Amber header banner
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(20, 20, canvas.width - 40, 70);
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = '900 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('📍 ജംഗ്ഷൻ / JUNCTION', canvas.width / 2, 66);

      // Main Junction Name in Malayalam
      ctx.textAlign = 'center';
      if (options.malayalamName) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
        ctx.fillText(options.malayalamName, canvas.width / 2, 195);

        ctx.fillStyle = '#fef08a';
        ctx.font = '900 44px system-ui, -apple-system, sans-serif';
        ctx.fillText(options.junctionName.toUpperCase(), canvas.width / 2, 280);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 56px system-ui, -apple-system, sans-serif';
        ctx.fillText(options.junctionName.toUpperCase(), canvas.width / 2, 230);
      }

      // Subtitle / road info bar
      const sub = options.subText || 'ROAD INTERSECTION';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(40, canvas.height - 100, canvas.width - 80, 60);
      ctx.fillStyle = '#38bdf8'; // Sky blue text
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.fillText(sub.toUpperCase(), canvas.width / 2, canvas.height - 60);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const boardMat = new THREE.MeshLambertMaterial({ map: texture });

    const thickness = 0.08;
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), boardMat);
    const panelY = 2.2 + height * 0.5;
    signMesh.position.set(0, panelY, 0);
    group.add(signMesh);

    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.06, height + 0.06, thickness * 0.7),
      PhysicalSignboardSystem.frameMaterial
    );
    frameMesh.position.set(0, panelY, -0.01);
    group.add(frameMesh);

    const postHeight = panelY + height * 0.45;
    const postRadius = 0.055;
    const postMat = PhysicalSignboardSystem.bracketMaterial;
    const postOffset = width * 0.35;

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 10), postMat);
    postL.position.set(-postOffset, postHeight * 0.5, -thickness * 0.5 - 0.02);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 10), postMat);
    postR.position.set(postOffset, postHeight * 0.5, -thickness * 0.5 - 0.02);

    const footMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), footMat);
    footL.position.set(-postOffset, 0.12, -thickness * 0.5 - 0.02);
    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), footMat);
    footR.position.set(postOffset, 0.12, -thickness * 0.5 - 0.02);

    group.add(postL, postR, footL, footR);
    return group;
  }
}

