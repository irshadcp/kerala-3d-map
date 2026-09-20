import * as THREE from 'three';

export class KeralaVillageGenerator {
  /**
   * 1. Iconic Kerala Roadside Tea Shop (ചായക്കട - Chayakada)
   * Terracotta tiled sloping roof, open counter, silver samovar, snack glass jars, wooden bench.
   */
  public static createChayakadaModel(): THREE.Group {
    const shop = new THREE.Group();
    shop.name = 'kerala_chayakada';

    // Materials
    const tileMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Terracotta tile orange-brown
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Kerala dark timber
    const lightWoodMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xfef08a }); // Light yellow painted village stall
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 }); // Samovar metal
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const snackMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b }); // Banana chips / pazham pori gold

    // Main Room Body (3.8m wide x 2.6m deep x 2.4m high)
    const wallGeo = new THREE.BoxGeometry(3.8, 2.4, 2.6);
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.set(0, 1.2, -0.2);
    shop.add(walls);

    // Front Overhanging Tiled Roof (Pitch roof)
    const roofGeo = new THREE.ConeGeometry(3.2, 1.4, 4);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(0, 2.9, -0.2);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.25, 1, 0.95);
    shop.add(roof);

    // Eaves / Roof timber rafters
    const timberRidgeGeo = new THREE.BoxGeometry(4.4, 0.12, 0.15);
    const timberRidge = new THREE.Mesh(timberRidgeGeo, woodMat);
    timberRidge.position.set(0, 2.25, 1.15);
    shop.add(timberRidge);

    // Two front wooden support posts
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6);
    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.set(-1.8, 1.1, 1.15);
    shop.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.set(1.8, 1.1, 1.15);
    shop.add(rightPost);

    // Serving Counter (Wooden bar)
    const counterGeo = new THREE.BoxGeometry(3.2, 0.9, 0.6);
    const counter = new THREE.Mesh(counterGeo, lightWoodMat);
    counter.position.set(0, 0.45, 0.9);
    shop.add(counter);

    // Authentic Silver Samovar (Tea Boiler) on counter
    const boilerGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.65, 12);
    const boiler = new THREE.Mesh(boilerGeo, silverMat);
    boiler.position.set(-1.0, 1.25, 0.9);
    shop.add(boiler);

    const boilerCapGeo = new THREE.CylinderGeometry(0.06, 0.22, 0.12, 12);
    const boilerCap = new THREE.Mesh(boilerCapGeo, silverMat);
    boilerCap.position.set(-1.0, 1.62, 0.9);
    shop.add(boilerCap);

    // Glass Snack Jars (ഭരണികൾ with snacks inside)
    for (let j = 0; j < 3; j++) {
      const jarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.28, 8);
      const jar = new THREE.Mesh(jarGeo, glassMat);
      jar.position.set(0.3 + j * 0.35, 1.05, 0.9);
      shop.add(jar);

      const snackGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.2, 6);
      const snack = new THREE.Mesh(snackGeo, snackMat);
      snack.position.set(0.3 + j * 0.35, 1.02, 0.9);
      shop.add(snack);
    }

    // Traditional Long Wooden Bench outside for customers
    const benchSeatGeo = new THREE.BoxGeometry(2.4, 0.1, 0.4);
    const benchSeat = new THREE.Mesh(benchSeatGeo, woodMat);
    benchSeat.position.set(0, 0.45, 1.75);
    shop.add(benchSeat);

    for (const bx of [-0.9, 0.9]) {
      const legGeo = new THREE.BoxGeometry(0.1, 0.45, 0.35);
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(bx, 0.22, 1.75);
      shop.add(leg);
    }

    // Name Board on top ("CHAYAKADA")
    const boardGeo = new THREE.BoxGeometry(2.2, 0.4, 0.08);
    const boardMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a }); // Kerala blue board
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 2.3, 1.15);
    shop.add(board);

    shop.scale.set(1.45, 1.45, 1.45);
    return shop;
  }

  /**
   * 2. Traditional Kerala Open Well (തുറന്ന കിണർ)
   * Stone/laterite circular wall, wooden pulley frame (കപ്പി), rope, bucket.
   */
  public static createOpenWellModel(): THREE.Group {
    const well = new THREE.Group();
    well.name = 'kerala_open_well';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c }); // Laterite grey stone
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Dark blue well water
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });

    // Outer circular wall ring
    const ringGeo = new THREE.CylinderGeometry(1.25, 1.3, 0.9, 16);
    const ring = new THREE.Mesh(ringGeo, stoneMat);
    ring.position.y = 0.45;
    well.add(ring);

    // Inner water surface
    const waterGeo = new THREE.CircleGeometry(1.15, 16);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.3;
    well.add(water);

    // Two wooden vertical upright poles
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.0, 6);
    const pole1 = new THREE.Mesh(poleGeo, timberMat);
    pole1.position.set(-1.1, 1.0, 0);
    well.add(pole1);

    const pole2 = new THREE.Mesh(poleGeo, timberMat);
    pole2.position.set(1.1, 1.0, 0);
    well.add(pole2);

    // Top crossbeam
    const crossbeamGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
    const crossbeam = new THREE.Mesh(crossbeamGeo, timberMat);
    crossbeam.position.set(0, 1.95, 0);
    crossbeam.rotation.z = Math.PI / 2;
    well.add(crossbeam);

    // Pulley wheel (കപ്പി)
    const pulleyGeo = new THREE.TorusGeometry(0.18, 0.04, 8, 12);
    const pulley = new THREE.Mesh(pulleyGeo, metalMat);
    pulley.position.set(0, 1.8, 0);
    pulley.rotation.y = Math.PI / 2;
    well.add(pulley);

    // Rope
    const ropeGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4);
    const ropeMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(0, 1.1, 0);
    well.add(rope);

    // Metal Bucket (തൊട്ടി)
    const bucketGeo = new THREE.CylinderGeometry(0.14, 0.1, 0.25, 8);
    const bucket = new THREE.Mesh(bucketGeo, metalMat);
    bucket.position.set(0, 0.55, 0);
    well.add(bucket);

    well.scale.set(1.5, 1.5, 1.5);
    return well;
  }

  /**
   * 3. Traditional Kerala Temple / Ambalam (അമ്പലം)
   * Pitched multi-tier terracotta roof, stone sanctum, brass Nilavilakku / lamp pillar.
   */
  public static createTempleModel(): THREE.Group {
    const temple = new THREE.Group();
    temple.name = 'kerala_temple';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xa8a29e }); // Stone plinth
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Carved dark timber
    const tileMat = new THREE.MeshLambertMaterial({ color: 0xc2410c }); // Terracotta orange tiles
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.3 }); // Gold/brass spire & lamp

    // Base Plinth (Chuttambalam base)
    const baseGeo = new THREE.BoxGeometry(7.0, 0.6, 7.0);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.3;
    temple.add(base);

    // Sanctum walls (Sreekovil)
    const sanctumGeo = new THREE.BoxGeometry(4.4, 2.2, 4.4);
    const sanctum = new THREE.Mesh(sanctumGeo, woodMat);
    sanctum.position.y = 1.7;
    temple.add(sanctum);

    // Multi-tier traditional flared roof (Tier 1)
    const roof1Geo = new THREE.ConeGeometry(4.2, 1.8, 4);
    const roof1 = new THREE.Mesh(roof1Geo, tileMat);
    roof1.position.y = 3.5;
    roof1.rotation.y = Math.PI / 4;
    temple.add(roof1);

    // Tier 2 (Top tier with pitch)
    const roof2Geo = new THREE.ConeGeometry(2.4, 1.4, 4);
    const roof2 = new THREE.Mesh(roof2Geo, tileMat);
    roof2.position.y = 4.6;
    roof2.rotation.y = Math.PI / 4;
    temple.add(roof2);

    // Golden Spire (താഴികക്കുടം)
    const spireGeo = new THREE.ConeGeometry(0.2, 0.7, 8);
    const spire = new THREE.Mesh(spireGeo, brassMat);
    spire.position.y = 5.65;
    temple.add(spire);

    // Front Brass Nilavilakku (വിളക്ക്) standing proudly
    const lampBaseGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.3, 8);
    const lampBase = new THREE.Mesh(lampBaseGeo, brassMat);
    lampBase.position.set(0, 0.15, 4.5);
    temple.add(lampBase);

    const lampPillarGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 8);
    const lampPillar = new THREE.Mesh(lampPillarGeo, brassMat);
    lampPillar.position.set(0, 1.05, 4.5);
    temple.add(lampPillar);

    const lampDishGeo = new THREE.CylinderGeometry(0.35, 0.15, 0.15, 8);
    const lampDish = new THREE.Mesh(lampDishGeo, brassMat);
    lampDish.position.set(0, 1.95, 4.5);
    temple.add(lampDish);

    temple.scale.set(1.35, 1.35, 1.35);
    return temple;
  }

  /**
   * 4. Traditional Kerala Christian Church (പള്ളി)
   * White stucco facade, arched bell gable, brass bell, and golden cross atop steeple.
   */
  public static createChurchModel(): THREE.Group {
    const church = new THREE.Group();
    church.name = 'kerala_church';

    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x991b1b }); // Crimson church roof
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 });

    // Main Nave
    const naveGeo = new THREE.BoxGeometry(5.2, 4.0, 7.5);
    const nave = new THREE.Mesh(naveGeo, whiteMat);
    nave.position.y = 2.0;
    church.add(nave);

    // Gable Pitch Roof
    const roofGeo = new THREE.ConeGeometry(4.2, 2.0, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 4.8, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 1.4);
    church.add(roof);

    // Front Façade Tower (Steeple)
    const towerGeo = new THREE.BoxGeometry(2.4, 6.8, 1.8);
    const tower = new THREE.Mesh(towerGeo, whiteMat);
    tower.position.set(0, 3.4, 3.8);
    church.add(tower);

    // Tower Bell Arch
    const belfryGeo = new THREE.BoxGeometry(1.2, 1.4, 0.6);
    const belfryMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const belfry = new THREE.Mesh(belfryGeo, belfryMat);
    belfry.position.set(0, 5.8, 4.2);
    church.add(belfry);

    // Cross on top
    const crossVGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
    const crossV = new THREE.Mesh(crossVGeo, goldMat);
    crossV.position.set(0, 7.4, 3.8);
    church.add(crossV);

    const crossHGeo = new THREE.BoxGeometry(0.65, 0.12, 0.12);
    const crossH = new THREE.Mesh(crossHGeo, goldMat);
    crossH.position.set(0, 7.55, 3.8);
    church.add(crossH);

    // Front Wooden Door
    const doorGeo = new THREE.BoxGeometry(1.6, 2.4, 0.1);
    const door = new THREE.Mesh(doorGeo, timberMat);
    door.position.set(0, 1.2, 4.75);
    church.add(door);

    church.scale.set(1.35, 1.35, 1.35);
    return church;
  }

  /**
   * 5. Traditional Kerala Mosque (മുസ്‌ലിം പള്ളി)
   * White & pastel mint dome, arched entrance, slender minaret tower with crescent.
   */
  public static createMosqueModel(): THREE.Group {
    const mosque = new THREE.Group();
    mosque.name = 'kerala_mosque';

    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const greenMat = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Kerala green dome
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 });

    // Main Hall
    const hallGeo = new THREE.BoxGeometry(6.0, 3.8, 6.0);
    const hall = new THREE.Mesh(hallGeo, whiteMat);
    hall.position.y = 1.9;
    mosque.add(hall);

    // Central Dome (Semi-sphere)
    const domeGeo = new THREE.SphereGeometry(1.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, greenMat);
    dome.position.set(0, 3.8, 0);
    mosque.add(dome);

    // Spire atop dome
    const spireGeo = new THREE.ConeGeometry(0.14, 0.7, 8);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.set(0, 5.9, 0);
    mosque.add(spire);

    // Corner Minaret Tower
    const minaretGeo = new THREE.CylinderGeometry(0.4, 0.45, 7.5, 10);
    const minaret = new THREE.Mesh(minaretGeo, whiteMat);
    minaret.position.set(3.0, 3.75, 3.0);
    mosque.add(minaret);

    // Minaret Balcony
    const balconyGeo = new THREE.CylinderGeometry(0.7, 0.5, 0.4, 10);
    const balcony = new THREE.Mesh(balconyGeo, greenMat);
    balcony.position.set(3.0, 6.2, 3.0);
    mosque.add(balcony);

    // Minaret Small Dome
    const minDomeGeo = new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const minDome = new THREE.Mesh(minDomeGeo, greenMat);
    minDome.position.set(3.0, 7.5, 3.0);
    mosque.add(minDome);

    // Minaret Crescent
    const cresGeo = new THREE.TorusGeometry(0.18, 0.04, 6, 12, Math.PI * 1.5);
    const cres = new THREE.Mesh(cresGeo, goldMat);
    cres.position.set(3.0, 8.2, 3.0);
    mosque.add(cres);

    mosque.scale.set(1.35, 1.35, 1.35);
    return mosque;
  }

  /**
   * 6. Traditional Kerala Small Tiled House (ചെറിയ ഓടുമേഞ്ഞ വീട്)
   * Terracotta sloped roof, front veranda (പൂമുഖം), compound wall (മതിൽ), and overhead Sintex water tank.
   */
  public static createSmallTiledHouseModel(): THREE.Group {
    const house = new THREE.Group();
    house.name = 'kerala_small_tiled_house';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xfefce8 }); // Warm whitewash cream
    const tileMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Terracotta tiles
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Dark teak timber
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c }); // Laterite stone compound wall
    const tankMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Black Sintex water tank
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    // Main House Block (Width: 6.5m, Depth: 5.5m, Height: 2.8m)
    const bodyGeo = new THREE.BoxGeometry(6.5, 2.8, 5.5);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.set(0, 1.4, -0.5);
    house.add(body);

    // Terracotta Sloped Tiled Roof (Hipped pitch roof)
    const roofGeo = new THREE.ConeGeometry(5.2, 2.0, 4);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(0, 3.8, -0.5);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.3, 1, 1.15);
    house.add(roof);

    // Front Veranda / Poomukham (പൂമുഖം / വരാന്ത)
    const verandaRoofGeo = new THREE.BoxGeometry(4.8, 0.12, 1.8);
    const verandaRoof = new THREE.Mesh(verandaRoofGeo, tileMat);
    verandaRoof.position.set(0, 2.4, 2.7);
    verandaRoof.rotation.x = 0.22;
    house.add(verandaRoof);

    // Veranda timber pillars
    for (const px of [-2.0, 2.0]) {
      const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6);
      const pillar = new THREE.Mesh(pillarGeo, woodMat);
      pillar.position.set(px, 1.1, 3.2);
      house.add(pillar);
    }

    // Front Wooden Door
    const doorGeo = new THREE.BoxGeometry(1.2, 2.0, 0.1);
    const door = new THREE.Mesh(doorGeo, woodMat);
    door.position.set(0, 1.0, 2.26);
    house.add(door);

    // Front Shuttered Windows
    for (const wx of [-1.8, 1.8]) {
      const winGeo = new THREE.BoxGeometry(1.0, 1.2, 0.1);
      const win = new THREE.Mesh(winGeo, woodMat);
      win.position.set(wx, 1.4, 2.26);
      house.add(win);
    }

    // Overhead Sintex Water Tank (വാട്ടർ ടാങ്ക്) on roof stand
    const standGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
    const stand = new THREE.Mesh(standGeo, metalMat);
    stand.position.set(2.2, 4.2, -1.8);
    house.add(stand);

    const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 12);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(2.2, 5.15, -1.8);
    house.add(tank);

    // Laterite Stone Compound Wall (മതിൽ) enclosing front yard
    const wallLGeo = new THREE.BoxGeometry(0.25, 0.9, 6.0);
    const wallL = new THREE.Mesh(wallLGeo, stoneMat);
    wallL.position.set(-3.8, 0.45, 1.2);
    house.add(wallL);

    const wallRGeo = new THREE.BoxGeometry(0.25, 0.9, 6.0);
    const wallR = new THREE.Mesh(wallRGeo, stoneMat);
    wallR.position.set(3.8, 0.45, 1.2);
    house.add(wallR);

    // Front wall with entrance gate gap
    for (const fx of [-2.4, 2.4]) {
      const wallFGeo = new THREE.BoxGeometry(2.6, 0.9, 0.25);
      const wallF = new THREE.Mesh(wallFGeo, stoneMat);
      wallF.position.set(fx, 0.45, 4.2);
      house.add(wallF);

      const gatePillarGeo = new THREE.BoxGeometry(0.4, 1.15, 0.4);
      const gatePillar = new THREE.Mesh(gatePillarGeo, stoneMat);
      gatePillar.position.set(fx > 0 ? 1.0 : -1.0, 0.58, 4.2);
      house.add(gatePillar);
    }

    house.scale.set(1.4, 1.4, 1.4);
    return house;
  }

  /**
   * 7. Traditional Kerala Farm Building & Agricultural Plot (കളപ്പുര & കൃഷിയിടം)
   * Cattle shed / barn (തൊഴുത്ത്), straw haystack (വൈക്കോൽ തുറു), plantain banana garden.
   */
  public static createFarmBuildingPlotModel(): THREE.Group {
    const farm = new THREE.Group();
    farm.name = 'kerala_farm_plot';

    const timberMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xa16207 }); // Dried thatch roof
    const hayMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Golden straw
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x451a03 }); // Dark fertile soil
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a, side: THREE.DoubleSide }); // Plantain green
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x84cc16 });

    // Farm Barn / Cattle Shed (തൊഴുത്ത് / കളപ്പുര)
    for (const px of [-2.2, 2.2]) {
      for (const pz of [-1.5, 1.5]) {
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6);
        const post = new THREE.Mesh(postGeo, timberMat);
        post.position.set(px - 2.5, 1.2, pz);
        farm.add(post);
      }
    }

    // Sloped thatched roof
    const shedRoofGeo = new THREE.ConeGeometry(3.2, 1.4, 4);
    const shedRoof = new THREE.Mesh(shedRoofGeo, thatchMat);
    shedRoof.position.set(-2.5, 2.9, 0);
    shedRoof.rotation.y = Math.PI / 4;
    shedRoof.scale.set(1.2, 1, 0.9);
    farm.add(shedRoof);

    // Traditional Kerala Haystack / Straw Stack (വൈക്കോൽ തുറു)
    const hayBaseGeo = new THREE.CylinderGeometry(1.2, 1.4, 1.8, 10);
    const hayBase = new THREE.Mesh(hayBaseGeo, hayMat);
    hayBase.position.set(-2.5, 0.9, 3.2);
    farm.add(hayBase);

    const hayConeGeo = new THREE.ConeGeometry(1.2, 1.5, 10);
    const hayCone = new THREE.Mesh(hayConeGeo, hayMat);
    hayCone.position.set(-2.5, 2.55, 3.2);
    farm.add(hayCone);

    // Agricultural Plot: Tilled furrow soil bed (പച്ചക്കറി / വാഴത്തോട്ടം)
    const soilBedGeo = new THREE.BoxGeometry(6.5, 0.08, 7.5);
    const soilBed = new THREE.Mesh(soilBedGeo, soilMat);
    soilBed.position.set(3.2, 0.04, 1.0);
    farm.add(soilBed);

    // 4 Plantain / Banana Trees (വാഴകൾ) in the plot
    const plantainPositions = [
      { x: 1.8, z: -1.5 },
      { x: 4.5, z: -1.5 },
      { x: 1.8, z: 2.5 },
      { x: 4.5, z: 2.5 },
    ];

    for (const pt of plantainPositions) {
      const stemGeo = new THREE.CylinderGeometry(0.1, 0.14, 2.0, 6);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(pt.x, 1.0, pt.z);
      farm.add(stem);

      for (let l = 0; l < 5; l++) {
        const la = (l / 5) * Math.PI * 2;
        const leafGeo = new THREE.BoxGeometry(0.35, 0.04, 1.6);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(pt.x + Math.sin(la) * 0.7, 2.1, pt.z + Math.cos(la) * 0.7);
        leaf.rotation.y = la;
        leaf.rotation.x = 0.5;
        farm.add(leaf);
      }
    }

    farm.scale.set(1.4, 1.4, 1.4);
    return farm;
  }

  /**
   * 8. Kerala Village Water Pond with Stone Steps (ഗ്രാമക്കുളം / പടവുകളുള്ള കുളം)
   * Sunken stone reservoir, cut laterite bathing steps (കൽപ്പടവുകൾ), sparkling blue water.
   */
  public static createVillagePondModel(): THREE.Group {
    const pond = new THREE.Group();
    pond.name = 'kerala_village_pond';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
    });

    // Sunken water body (width 8.5m x depth 6.5m)
    const waterGeo = new THREE.BoxGeometry(8.5, 0.1, 6.5);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, 0.08, 0);
    pond.add(water);

    // 3 Tiers of Cut Laterite Stone Steps (കൽപ്പടവുകൾ) surrounding water
    for (let tier = 0; tier < 3; tier++) {
      const stepWidth = 8.8 + tier * 0.6;
      const stepDepth = 6.8 + tier * 0.6;
      const stepH = 0.18 * (tier + 1);

      for (const sz of [-stepDepth / 2, stepDepth / 2]) {
        const edgeGeo = new THREE.BoxGeometry(stepWidth, 0.18, 0.35);
        const edge = new THREE.Mesh(edgeGeo, stoneMat);
        edge.position.set(0, stepH, sz);
        pond.add(edge);
      }

      for (const sx of [-stepWidth / 2, stepWidth / 2]) {
        const edgeGeo = new THREE.BoxGeometry(0.35, 0.18, stepDepth);
        const edge = new THREE.Mesh(edgeGeo, stoneMat);
        edge.position.set(sx, stepH, 0);
        pond.add(edge);
      }
    }

    // Outer laterite parapet border
    const parapetGeo = new THREE.BoxGeometry(11.0, 0.45, 0.3);
    const p1 = new THREE.Mesh(parapetGeo, stoneMat);
    p1.position.set(0, 0.75, 4.5);
    pond.add(p1);

    const p2 = new THREE.Mesh(parapetGeo, stoneMat);
    p2.position.set(0, 0.75, -4.5);
    pond.add(p2);

    pond.scale.set(1.4, 1.4, 1.4);
    return pond;
  }

  /**
   * 9. Small Canal Bridge / Culvert (ചെറിയ കലുങ്ക് / കനാൽ പാലം)
   * Roadside culvert parapet walls with black and white warning hazard stripes.
   */
  public static createCanalBridgeModel(roadWidth = 7.0): THREE.Group {
    const bridge = new THREE.Group();
    bridge.name = 'kerala_canal_bridge';

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const blackMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const halfW = roadWidth / 2 + 0.3;

    // Two parallel culvert parapets on left & right road edges
    for (const side of [-halfW, halfW]) {
      const wallGeo = new THREE.BoxGeometry(0.35, 0.9, 6.0);
      const wall = new THREE.Mesh(wallGeo, concreteMat);
      wall.position.set(side, 0.45, 0);
      bridge.add(wall);

      // Black and white safety stripes on top
      for (let s = -2.5; s <= 2.5; s += 0.8) {
        const isWhite = Math.round(s * 10) % 2 === 0;
        const stripeGeo = new THREE.BoxGeometry(0.38, 0.12, 0.38);
        const stripe = new THREE.Mesh(stripeGeo, isWhite ? whiteMat : blackMat);
        stripe.position.set(side, 0.95, s);
        bridge.add(stripe);
      }
    }

    bridge.scale.set(1.4, 1.4, 1.4);
    return bridge;
  }

  /**
   * 10. Kerala Arecanut Grove (കവുങ്ങിൻ തോട്ടം / അടക്ക മരങ്ങൾ)
   * Cluster of tall, ultra-slender arecanut palms with segmented ringed trunks,
   * compact crowns, and hanging orange/green arecanut bunches (അടക്കക്കുലകൾ).
   */
  public static createArecanutGroveModel(): THREE.Group {
    const grove = new THREE.Group();
    grove.name = 'kerala_arecanut_grove';

    const trunkMat1 = new THREE.MeshLambertMaterial({ color: 0x64748b }); // Slate grey-green trunk
    const ringMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark ringed node
    const nutMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Golden-orange arecanut bunch
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x3f2010 });

    // Soil Bed
    const bedGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.15, 12);
    const bed = new THREE.Mesh(bedGeo, soilMat);
    bed.position.y = 0.075;
    grove.add(bed);

    // 4 Arecanut Palms in the grove
    const palmOffsets = [
      { x: -1.2, z: -0.9, h: 7.2, lean: 0.04 },
      { x: 1.4, z: -0.8, h: 7.8, lean: -0.05 },
      { x: -0.8, z: 1.3, h: 6.8, lean: 0.03 },
      { x: 1.1, z: 1.1, h: 7.5, lean: -0.04 },
    ];

    for (const po of palmOffsets) {
      const palmGroup = new THREE.Group();
      palmGroup.position.set(po.x, 0, po.z);

      // Slender tall trunk
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, po.h, 7);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat1);
      trunk.position.y = po.h / 2;
      trunk.rotation.z = po.lean;
      palmGroup.add(trunk);

      // Segmented trunk rings (കണ്ണികൾ)
      for (let y = 1.0; y < po.h - 0.5; y += 0.8) {
        const ringGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 7);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, y, 0);
        palmGroup.add(ring);
      }

      // Crown group at top of trunk
      const crown = new THREE.Group();
      crown.position.set(po.lean * (po.h / 2), po.h, 0);

      // Hanging Arecanut Bunches (അടക്കക്കുലകൾ)
      for (const na of [-0.6, 0.6]) {
        const nutClusterGeo = new THREE.SphereGeometry(0.3, 6, 6);
        nutClusterGeo.scale(0.8, 1.2, 0.8);
        const nutCluster = new THREE.Mesh(nutClusterGeo, nutMat);
        nutCluster.position.set(Math.sin(na) * 0.25, -0.35, Math.cos(na) * 0.25);
        crown.add(nutCluster);
      }

      // Compact radiating fronds (6 fronds)
      for (let f = 0; f < 6; f++) {
        const fa = (f / 6) * Math.PI * 2;
        const frondGeo = new THREE.BoxGeometry(0.28, 0.04, 2.2);
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.rotation.y = fa;
        frond.rotation.x = 0.55;
        frond.position.set(Math.sin(fa) * 0.9, -0.15, Math.cos(fa) * 0.9);
        crown.add(frond);
      }

      palmGroup.add(crown);
      grove.add(palmGroup);
    }

    grove.scale.set(1.4, 1.4, 1.4);
    return grove;
  }

  /**
   * 11. Kerala Banana Plantation Clump (വാഴത്തോട്ടം / കുലവാഴകൾ)
   * Cluster of lush banana plants with wide arching green leaves,
   * hanging green banana bunches (വാഴക്കുല), and purple blossoms (വാഴക്കൂമ്പ്).
   */
  public static createBananaGroveModel(): THREE.Group {
    const grove = new THREE.Group();
    grove.name = 'kerala_banana_grove';

    const stemMat = new THREE.MeshLambertMaterial({ color: 0x84cc16 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a, side: THREE.DoubleSide });
    const fruitMat = new THREE.MeshLambertMaterial({ color: 0x65a30d }); // Ripe green banana bunch
    const heartMat = new THREE.MeshLambertMaterial({ color: 0x831843 }); // Deep purple/maroon blossom (വാഴക്കൂമ്പ്)
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x3f2010 });

    // Raised moist soil mound
    const moundGeo = new THREE.CylinderGeometry(3.0, 3.4, 0.18, 10);
    const mound = new THREE.Mesh(moundGeo, soilMat);
    mound.position.y = 0.09;
    grove.add(mound);

    const bananaTrees = [
      { x: 0, z: 0, scale: 1.15, hasBunch: true },
      { x: -1.3, z: -0.7, scale: 0.95, hasBunch: false },
      { x: 1.2, z: -0.6, scale: 1.0, hasBunch: true },
      { x: -0.7, z: 1.2, scale: 0.85, hasBunch: false },
      { x: 0.9, z: 1.0, scale: 0.9, hasBunch: false },
    ];

    for (const b of bananaTrees) {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0, b.z);

      const h = 2.4 * b.scale;
      const stemGeo = new THREE.CylinderGeometry(0.12 * b.scale, 0.16 * b.scale, h, 6);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = h / 2;
      bGroup.add(stem);

      // Banana Leaves (5 wide broad leaves arching outwards)
      for (let l = 0; l < 5; l++) {
        const la = (l / 5) * Math.PI * 2 + (b.x * 2);
        const leafGeo = new THREE.BoxGeometry(0.42 * b.scale, 0.04, 2.1 * b.scale);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(Math.sin(la) * 0.85 * b.scale, h + 0.1, Math.cos(la) * 0.85 * b.scale);
        leaf.rotation.y = la;
        leaf.rotation.x = 0.52;
        bGroup.add(leaf);
      }

      // Banana Bunch (വാഴക്കുല) & Flower Heart (വാഴക്കൂമ്പ്)
      if (b.hasBunch) {
        const bunchGroup = new THREE.Group();
        bunchGroup.position.set(0.35 * b.scale, h - 0.2, 0);

        // Curving stalk
        const stalkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5);
        const stalk = new THREE.Mesh(stalkGeo, stemMat);
        stalk.rotation.z = 0.6;
        bunchGroup.add(stalk);

        // Tiered bunch of green bananas
        const bunchGeo = new THREE.CylinderGeometry(0.18 * b.scale, 0.14 * b.scale, 0.6 * b.scale, 8);
        const bunch = new THREE.Mesh(bunchGeo, fruitMat);
        bunch.position.set(0.2 * b.scale, -0.3 * b.scale, 0);
        bunchGroup.add(bunch);

        // Purple banana heart / blossom (വാഴക്കൂമ്പ്)
        const heartGeo = new THREE.ConeGeometry(0.12 * b.scale, 0.3 * b.scale, 6);
        const heart = new THREE.Mesh(heartGeo, heartMat);
        heart.rotation.x = Math.PI;
        heart.position.set(0.2 * b.scale, -0.65 * b.scale, 0);
        bunchGroup.add(heart);

        bGroup.add(bunchGroup);
      }

      grove.add(bGroup);
    }

    grove.scale.set(1.4, 1.4, 1.4);
    return grove;
  }

  /**
   * 12. Sacred Grove / Miniature Forest Patch (കാവ് / കുറുങ്കാട്)
   * Protected ancient biodiversity thicket with mossy stone platform (തറ),
   * carved serpent idol (നാഗത്തറ) / stone lamp, hanging roots, and dense foliage.
   */
  public static createSacredGroveModel(): THREE.Group {
    const grove = new THREE.Group();
    grove.name = 'kerala_sacred_grove';

    const lateriteMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Weathered laterite stone
    const idolMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Granite idol
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x451a03 }); // Dark wild trunk
    const forestCanopyMat1 = new THREE.MeshLambertMaterial({ color: 0x14532d }); // Ancient deep jungle green
    const forestCanopyMat2 = new THREE.MeshLambertMaterial({ color: 0x166534 });
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x15803d });

    // Raised Circular Sacred Platform (തറ)
    const tharaGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.45, 14);
    const thara = new THREE.Mesh(tharaGeo, lateriteMat);
    thara.position.y = 0.22;
    grove.add(thara);

    // Sacred Idol Stone / Serpent Shrine (നാഗത്തറ)
    const idolGeo = new THREE.BoxGeometry(0.4, 0.7, 0.2);
    const idol = new THREE.Mesh(idolGeo, idolMat);
    idol.position.set(0, 0.8, 0);
    grove.add(idol);

    // Stone Lamp (കൽവിളക്ക്)
    const lampBaseGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 8);
    const lampBase = new THREE.Mesh(lampBaseGeo, idolMat);
    lampBase.position.set(0.8, 0.65, 0.6);
    grove.add(lampBase);

    // 2 Ancient Canopy Trees with Hanging Aerial Roots (വിഴുതുകൾ)
    const treeOffsets = [
      { x: -2.8, z: -1.5, h: 6.5 },
      { x: 2.2, z: -2.0, h: 7.0 },
    ];

    for (const to of treeOffsets) {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(to.x, 0, to.z);

      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, to.h, 7);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = to.h / 2;
      treeGroup.add(trunk);

      // Hanging aerial roots (വിഴുതുകൾ)
      for (let r = 0; r < 3; r++) {
        const ra = r * 2.0;
        const rootGeo = new THREE.CylinderGeometry(0.04, 0.04, to.h * 0.75, 4);
        const root = new THREE.Mesh(rootGeo, vineMat);
        root.position.set(Math.sin(ra) * 0.9, to.h * 0.45, Math.cos(ra) * 0.9);
        treeGroup.add(root);
      }

      // Dense multi-tier jungle canopy
      const c1Geo = new THREE.SphereGeometry(3.0, 8, 8);
      c1Geo.scale(1.2, 0.8, 1.2);
      const c1 = new THREE.Mesh(c1Geo, forestCanopyMat1);
      c1.position.y = to.h + 1.2;
      treeGroup.add(c1);

      const c2Geo = new THREE.SphereGeometry(2.2, 7, 7);
      const c2 = new THREE.Mesh(c2Geo, forestCanopyMat2);
      c2.position.set(0.8, to.h + 2.2, 0.5);
      treeGroup.add(c2);

      grove.add(treeGroup);
    }

    // Dense wild ferns & undergrowth surrounding shrine
    for (let u = 0; u < 8; u++) {
      const ua = (u / 8) * Math.PI * 2;
      const fernGeo = new THREE.SphereGeometry(0.7, 5, 5);
      fernGeo.scale(1.2, 0.5, 1.2);
      const fern = new THREE.Mesh(fernGeo, forestCanopyMat2);
      fern.position.set(Math.sin(ua) * 3.2, 0.35, Math.cos(ua) * 3.2);
      grove.add(fern);
    }

    grove.scale.set(1.4, 1.4, 1.4);
    return grove;
  }

  /**
   * 13. Kerala Paddy Field Parcel with Mud Bunds & Scarecrow (നെൽപ്പാടവും വരമ്പും നോക്കുകുത്തിയും)
   * Flooded fertile green rice field with raised earthen bunds (വരമ്പ്),
   * irrigation channel, lush rows of rice crops, and traditional scarecrow.
   */
  public static createPaddyFieldParcelModel(): THREE.Group {
    const plot = new THREE.Group();
    plot.name = 'kerala_paddy_parcel';

    const mudMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e }); // Muddy bund earth
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x047857,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    }); // Flooded paddy green
    const riceShootMat1 = new THREE.MeshLambertMaterial({ color: 0x84cc16 }); // Tender green rice shoots
    const riceShootMat2 = new THREE.MeshLambertMaterial({ color: 0x65a30d });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const clothMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Red cloth on scarecrow
    const potMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 }); // Clay pot head

    // 1. Flooded Paddy Water Surface (14m x 10m)
    const bedGeo = new THREE.BoxGeometry(14.0, 0.08, 10.0);
    const bed = new THREE.Mesh(bedGeo, waterMat);
    bed.position.y = 0.04;
    plot.add(bed);

    // 2. Outer & Dividing Mud Dikes / Bunds (വരമ്പുകൾ)
    // Left & Right outer bunds
    for (const sx of [-7.0, 7.0]) {
      const bGeo = new THREE.BoxGeometry(0.5, 0.22, 10.0);
      const bMesh = new THREE.Mesh(bGeo, mudMat);
      bMesh.position.set(sx, 0.11, 0);
      plot.add(bMesh);
    }
    // Front & Back outer bunds
    for (const sz of [-5.0, 5.0]) {
      const bGeo = new THREE.BoxGeometry(14.0, 0.22, 0.5);
      const bMesh = new THREE.Mesh(bGeo, mudMat);
      bMesh.position.set(0, 0.11, sz);
      plot.add(bMesh);
    }
    // Central dividing bund (നടുവരമ്പ്)
    const midBundGeo = new THREE.BoxGeometry(0.4, 0.2, 10.0);
    const midBund = new THREE.Mesh(midBundGeo, mudMat);
    midBund.position.set(0, 0.1, 0);
    plot.add(midBund);

    // 3. Rows of vibrant green young rice seedlings (കതിരണിയുന്ന നെൽച്ചെടികൾ)
    for (let rx = -5.5; rx <= 5.5; rx += 2.0) {
      if (Math.abs(rx) < 0.6) continue; // Leave central bund clear
      for (let rz = -3.8; rz <= 3.8; rz += 1.4) {
        const shootGeo = new THREE.ConeGeometry(0.45, 0.8, 5);
        const shootMat = (Math.round(rx + rz) % 2 === 0) ? riceShootMat1 : riceShootMat2;
        const shoot = new THREE.Mesh(shootGeo, shootMat);
        shoot.position.set(rx, 0.45, rz);
        shoot.scale.set(1.1, 1, 0.8);
        plot.add(shoot);
      }
    }

    // 4. Traditional Kerala Scarecrow (നോക്കുകുത്തി) on dividing bund
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 5);
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(0, 0.9, 1.2);
    plot.add(post);

    const crossArmGeo = new THREE.BoxGeometry(0.9, 0.04, 0.04);
    const crossArm = new THREE.Mesh(crossArmGeo, woodMat);
    crossArm.position.set(0, 1.4, 1.2);
    plot.add(crossArm);

    const shirtGeo = new THREE.ConeGeometry(0.35, 0.7, 4);
    const shirt = new THREE.Mesh(shirtGeo, clothMat);
    shirt.position.set(0, 1.15, 1.2);
    plot.add(shirt);

    const potHeadGeo = new THREE.SphereGeometry(0.16, 6, 6);
    const potHead = new THREE.Mesh(potHeadGeo, potMat);
    potHead.position.set(0, 1.6, 1.2);
    plot.add(potHead);

    plot.scale.set(1.4, 1.4, 1.4);
    return plot;
  }

  /**
   * 14. Kerala Coconut Plantation Plot (തെങ്ങിൻ തോപ്പ്)
   * Grove of 4 tall leaning coconut palms, dried coconut husks (തൊണ്ട്),
   * fallen brown coconuts, and rustic bamboo perimeter fencing.
   */
  public static createCoconutPlantationPlotModel(): THREE.Group {
    const grove = new THREE.Group();
    grove.name = 'kerala_coconut_plantation';

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x16a34a, side: THREE.DoubleSide });
    const nutMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const huskMat = new THREE.MeshLambertMaterial({ color: 0xa16207 });
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x543519 });
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0xca8a04 }); // Bamboo fence

    // Sandy-soil ground plot (12m x 9m)
    const soilGeo = new THREE.BoxGeometry(12.0, 0.1, 9.0);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.05;
    grove.add(soil);

    // 4 Leaning Coconut Palms
    const palmConfigs = [
      { x: -3.5, z: -2.2, h: 7.5, lean: 0.12, rotY: 0.4 },
      { x: 3.2, z: -2.0, h: 8.0, lean: -0.14, rotY: -0.6 },
      { x: -2.8, z: 2.2, h: 7.2, lean: 0.1, rotY: 1.2 },
      { x: 3.0, z: 2.0, h: 7.8, lean: -0.11, rotY: -1.0 },
    ];

    for (const pc of palmConfigs) {
      const palmGroup = new THREE.Group();
      palmGroup.position.set(pc.x, 0, pc.z);

      const lowerTrunkGeo = new THREE.CylinderGeometry(0.28, 0.38, pc.h * 0.55, 7);
      const lowerTrunk = new THREE.Mesh(lowerTrunkGeo, trunkMat);
      lowerTrunk.position.y = (pc.h * 0.55) / 2;
      lowerTrunk.rotation.z = pc.lean;
      palmGroup.add(lowerTrunk);

      const upperTrunkGeo = new THREE.CylinderGeometry(0.2, 0.28, pc.h * 0.5, 7);
      const upperTrunk = new THREE.Mesh(upperTrunkGeo, trunkMat);
      upperTrunk.position.set(pc.lean * 2.0, pc.h * 0.75, 0);
      upperTrunk.rotation.z = pc.lean * 1.5;
      palmGroup.add(upperTrunk);

      // Crown
      const crown = new THREE.Group();
      crown.position.set(pc.lean * 3.5, pc.h, 0);

      // Radiating fronds
      for (let f = 0; f < 7; f++) {
        const fa = (f / 7) * Math.PI * 2;
        const frondGeo = new THREE.BoxGeometry(0.38, 0.04, 3.2);
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.rotation.y = fa;
        frond.rotation.x = 0.48;
        frond.position.set(Math.sin(fa) * 1.2, -0.3, Math.cos(fa) * 1.2);
        crown.add(frond);
      }

      // Coconuts
      for (let n = 0; n < 4; n++) {
        const na = n * 1.5;
        const nutGeo = new THREE.SphereGeometry(0.22, 6, 6);
        const nut = new THREE.Mesh(nutGeo, nutMat);
        nut.position.set(Math.sin(na) * 0.3, -0.25, Math.cos(na) * 0.3);
        crown.add(nut);
      }

      palmGroup.add(crown);
      grove.add(palmGroup);
    }

    // Heaps of dry coconut husks (തൊണ്ട്) on the ground
    for (const hpos of [{ x: 0, z: -1.0 }, { x: -0.5, z: 1.2 }]) {
      const huskGeo = new THREE.SphereGeometry(0.5, 6, 6);
      huskGeo.scale(1.4, 0.6, 1.2);
      const husk = new THREE.Mesh(huskGeo, huskMat);
      husk.position.set(hpos.x, 0.25, hpos.z);
      grove.add(husk);
    }

    // Rustic bamboo perimeter fence posts
    for (let fx = -5.5; fx <= 5.5; fx += 2.5) {
      for (const fz of [-4.2, 4.2]) {
        const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5);
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(fx, 0.55, fz);
        grove.add(post);
      }
    }

    grove.scale.set(1.4, 1.4, 1.4);
    return grove;
  }

  /**
   * 15. Kerala Rubber Processing Shed & Drying Rack (റബ്ബർ പുകപ്പുര & റോളർ മെഷീൻ)
   * Open timber shed with manual rubber rolling machine, latex collection pans,
   * and drying rack with hanging amber rubber sheets (റബ്ബർ ഷീറ്റുകൾ).
   */
  public static createRubberProcessingShedModel(): THREE.Group {
    const shed = new THREE.Group();
    shed.name = 'kerala_rubber_shed';

    const timberMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x64748b }); // Corrugated tin roof
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // Cast iron roller
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
    const sheetMat = new THREE.MeshLambertMaterial({ color: 0xfde047 }); // Amber rubber sheet
    const panMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc }); // White latex pans

    // 1. Open Shed Posts (4 timber posts)
    for (const px of [-1.6, 1.6]) {
      for (const pz of [-1.2, 1.2]) {
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6);
        const post = new THREE.Mesh(postGeo, timberMat);
        post.position.set(px, 1.3, pz);
        shed.add(post);
      }
    }

    // Sloped Corrugated Metal Roof
    const roofGeo = new THREE.ConeGeometry(2.5, 0.8, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.9, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.3, 1, 1.1);
    shed.add(roof);

    // 2. Manual Rubber Roller Machine (റബ്ബർ റോളർ മെഷീൻ)
    const machineBaseGeo = new THREE.BoxGeometry(0.8, 0.8, 0.5);
    const machineBase = new THREE.Mesh(machineBaseGeo, timberMat);
    machineBase.position.set(-0.8, 0.4, 0);
    shed.add(machineBase);

    // Twin horizontal rolling cylinders
    for (const ry of [0.85, 1.05]) {
      const rollerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
      const roller = new THREE.Mesh(rollerGeo, steelMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(-0.8, ry, 0);
      shed.add(roller);
    }

    // Manual turn handle wheel
    const handleGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 12);
    const handle = new THREE.Mesh(handleGeo, metalMat);
    handle.position.set(-0.45, 0.95, 0);
    handle.rotation.y = Math.PI / 2;
    shed.add(handle);

    // 3. Wooden Drying Rack with Hanging Rubber Sheets (റബ്ബർ ഷീറ്റ് ഉണക്കൽ)
    const rackBarGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 5);
    const rackBar = new THREE.Mesh(rackBarGeo, timberMat);
    rackBar.rotation.z = Math.PI / 2;
    rackBar.position.set(0.6, 1.9, 0);
    shed.add(rackBar);

    // 4 hanging yellow/amber ribbed rubber sheets
    for (let s = 0; s < 4; s++) {
      const sx = -0.6 + s * 0.7;
      const sheetGeo = new THREE.BoxGeometry(0.45, 0.65, 0.03);
      const sheet = new THREE.Mesh(sheetGeo, sheetMat);
      sheet.position.set(sx, 1.5, 0);
      shed.add(sheet);
    }

    // Stack of shallow white latex collection dishes on the floor
    for (let p = 0; p < 3; p++) {
      const panGeo = new THREE.BoxGeometry(0.5, 0.06, 0.35);
      const pan = new THREE.Mesh(panGeo, panMat);
      pan.position.set(0.6, 0.03 + p * 0.07, 0.6);
      shed.add(pan);
    }

    shed.scale.set(1.4, 1.4, 1.4);
    return shed;
  }

  /**
   * 16. Natural Country Lotus / Water-Lily Pond (നാടൻ ആമ്പൽക്കുളം)
   * Oval natural pond with laterite stone rim, clear blue water,
   * floating green water-lily pads (ആമ്പലിലകൾ), and blooming pink lilies (ആമ്പൽ പൂക്കൾ).
   */
  public static createNaturalLotusPondModel(): THREE.Group {
    const pond = new THREE.Group();
    pond.name = 'kerala_lotus_pond';

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    const flowerMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 }); // Pink lotus/amabal

    // Oval natural water basin (diameter 8m x 6m)
    const waterGeo = new THREE.CylinderGeometry(4.0, 4.2, 0.12, 16);
    waterGeo.scale(1.2, 1, 0.9);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.06;
    pond.add(water);

    // Natural laterite stones surrounding perimeter
    const stoneCount = 14;
    for (let s = 0; s < stoneCount; s++) {
      const sa = (s / stoneCount) * Math.PI * 2;
      const sx = Math.sin(sa) * 4.4 * 1.2;
      const sz = Math.cos(sa) * 4.4 * 0.9;
      const stoneGeo = new THREE.DodecahedronGeometry(0.45, 0);
      stoneGeo.scale(1.2, 0.7, 1.1);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(sx, 0.25, sz);
      stone.rotation.set(0.2, sa, 0.1);
      pond.add(stone);
    }

    // Floating water-lily pads (ആമ്പലിലകൾ)
    const padPositions = [
      { x: -1.5, z: -1.0 },
      { x: 1.8, z: -0.8 },
      { x: -0.8, z: 1.4 },
      { x: 1.2, z: 1.1 },
      { x: 0, z: 0 },
      { x: -2.2, z: 0.4 },
    ];

    for (const pp of padPositions) {
      const padGeo = new THREE.CircleGeometry(0.45, 8);
      const pad = new THREE.Mesh(padGeo, leafMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(pp.x, 0.13, pp.z);
      pond.add(pad);

      // Pink blooming lotus flower on selected pads
      if (Math.abs(pp.x) > 0.5) {
        const flowerGeo = new THREE.ConeGeometry(0.18, 0.25, 6);
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set(pp.x, 0.25, pp.z);
        pond.add(flower);
      }
    }

    pond.scale.set(1.4, 1.4, 1.4);
    return pond;
  }

  /**
   * 17. Country Stream with Coconut Log Footbridge (തോടും തെങ്ങുപാലവും / ഇടവഴിപ്പാലം)
   * Flowing blue stream with green banks crossed by a traditional single coconut trunk log
   * footbridge (തെങ്ങുപാലം) with bamboo handrail.
   */
  public static createStreamFootbridgeModel(): THREE.Group {
    const bridge = new THREE.Group();
    bridge.name = 'kerala_stream_footbridge';

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
    });
    const bankMat = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Grassy stream banks
    const palmLogMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Coconut trunk log
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xca8a04 }); // Bamboo handrail

    // Stream Channel (width 3.6m x length 10m)
    const streamGeo = new THREE.BoxGeometry(3.6, 0.1, 10.0);
    const stream = new THREE.Mesh(streamGeo, waterMat);
    stream.position.y = 0.05;
    bridge.add(stream);

    // Left & Right Green Stream Banks
    for (const sx of [-2.4, 2.4]) {
      const bankGeo = new THREE.BoxGeometry(1.6, 0.25, 10.0);
      const bank = new THREE.Mesh(bankGeo, bankMat);
      bank.position.set(sx, 0.12, 0);
      bridge.add(bank);
    }

    // Coconut Trunk Log Footbridge (തെങ്ങുപാലം) spanning across stream
    const logGeo = new THREE.CylinderGeometry(0.2, 0.24, 4.8, 8);
    const log = new THREE.Mesh(logGeo, palmLogMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.35, 0);
    bridge.add(log);

    // Bamboo Handrail (മുളക്കൈവരി)
    for (const px of [-1.8, 0, 1.8]) {
      const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5);
      const post = new THREE.Mesh(postGeo, bambooMat);
      post.position.set(px, 0.85, 0.45);
      bridge.add(post);
    }

    const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 4.8, 5);
    const rail = new THREE.Mesh(railGeo, bambooMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 1.35, 0.45);
    bridge.add(rail);

    bridge.scale.set(1.4, 1.4, 1.4);
    return bridge;
  }

  /**
   * 18. Kerala Wetland Mangrove & Reed Thicket (ചതുപ്പും കണ്ടൽക്കാടുകളും)
   * Waterlogged marshy bed with arching mangrove stilt roots (കണ്ടൽ വേരുകൾ),
   * wild reed grass clumps, and a small wooden country canoe (തോണി).
   */
  public static createWetlandMangroveModel(): THREE.Group {
    const wetland = new THREE.Group();
    wetland.name = 'kerala_wetland_mangrove';

    const marshMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const rootMat = new THREE.MeshLambertMaterial({ color: 0x451a03 }); // Dark stilt roots
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x14532d }); // Mangrove leaves
    const reedMat = new THREE.MeshLambertMaterial({ color: 0x84cc16 });
    const boatMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });

    // Waterlogged Marsh Basin (11m x 9m)
    const basinGeo = new THREE.BoxGeometry(11.0, 0.08, 9.0);
    const basin = new THREE.Mesh(basinGeo, marshMat);
    basin.position.y = 0.04;
    wetland.add(basin);

    // Mangrove Tree with Arching Stilt Roots (കണ്ടൽ വേരുകൾ)
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.2, 7);
    const trunk = new THREE.Mesh(trunkGeo, rootMat);
    trunk.position.set(-1.5, 2.0, 0);
    wetland.add(trunk);

    // Arching stilt roots anchoring into marsh water
    for (let r = 0; r < 6; r++) {
      const ra = (r / 6) * Math.PI * 2;
      const rootCurve = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5);
      const root = new THREE.Mesh(rootCurve, rootMat);
      root.position.set(-1.5 + Math.sin(ra) * 0.7, 0.7, Math.cos(ra) * 0.7);
      root.rotation.x = Math.sin(ra) * 0.4;
      root.rotation.z = Math.cos(ra) * 0.4;
      wetland.add(root);
    }

    // Dense dome canopy
    const canopyGeo = new THREE.SphereGeometry(2.4, 8, 8);
    canopyGeo.scale(1.3, 0.75, 1.3);
    const canopy = new THREE.Mesh(canopyGeo, foliageMat);
    canopy.position.set(-1.5, 3.8, 0);
    wetland.add(canopy);

    // Wild wetland reeds & marsh grass clumps (കൈതക്കാട് / ഞാങ്ങണ)
    for (let g = 0; g < 7; g++) {
      const gx = 1.0 + (g % 3) * 1.5;
      const gz = -2.5 + Math.floor(g / 3) * 2.2;
      const reedGeo = new THREE.ConeGeometry(0.35, 1.4, 5);
      const reed = new THREE.Mesh(reedGeo, reedMat);
      reed.position.set(gx, 0.7, gz);
      wetland.add(reed);
    }

    // Small Wooden Country Canoe (ചെറിയ തോണി) moored in marsh
    const canoeGeo = new THREE.BoxGeometry(0.7, 0.25, 2.4);
    const canoe = new THREE.Mesh(canoeGeo, boatMat);
    canoe.position.set(2.4, 0.12, 1.2);
    canoe.rotation.y = 0.35;
    wetland.add(canoe);

    wetland.scale.set(1.4, 1.4, 1.4);
    return wetland;
  }

  /**
   * 19. Flat Residential Land Compound & Homestead (റെസിഡൻഷ്യൽ പ്ലോട്ട് / വീട്ടുപറമ്പ്)
   * Flat levelled green lawn, whitewashed boundary compound wall with gate pillars,
   * paved walking pathway, and tropical garden flower shrubs (ചെമ്പരത്തി / തെച്ചി).
   */
  public static createResidentialCompoundParcelModel(): THREE.Group {
    const parcel = new THREE.Group();
    parcel.name = 'kerala_residential_compound';

    const lawnMat = new THREE.MeshLambertMaterial({ color: 0x86efac }); // Levelled residential green
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }); // Whitewashed compound wall
    const copingMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c }); // Terracotta tile coping
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 }); // Paved path
    const shrubMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Red hibiscus flower

    // Levelled residential lawn (13m x 10m)
    const lawnGeo = new THREE.BoxGeometry(13.0, 0.08, 10.0);
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.y = 0.04;
    parcel.add(lawn);

    // Paved entrance walking path
    const pathGeo = new THREE.BoxGeometry(1.4, 0.09, 6.0);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(0, 0.05, 2.0);
    parcel.add(path);

    // Low whitewashed compound boundary walls (left & right)
    for (const sx of [-6.4, 6.4]) {
      const wallGeo = new THREE.BoxGeometry(0.22, 0.85, 9.8);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(sx, 0.45, 0);
      parcel.add(wall);

      // Red coping tile on top
      const copGeo = new THREE.BoxGeometry(0.28, 0.06, 9.8);
      const cop = new THREE.Mesh(copGeo, copingMat);
      cop.position.set(sx, 0.9, 0);
      parcel.add(cop);
    }

    // Front wall with entrance gate gap
    for (const fx of [-3.8, 3.8]) {
      const wallFGeo = new THREE.BoxGeometry(4.0, 0.85, 0.22);
      const wallF = new THREE.Mesh(wallFGeo, wallMat);
      wallF.position.set(fx, 0.45, 4.8);
      parcel.add(wallF);

      const gatePillarGeo = new THREE.BoxGeometry(0.45, 1.15, 0.45);
      const gatePillar = new THREE.Mesh(gatePillarGeo, wallMat);
      gatePillar.position.set(fx > 0 ? 1.6 : -1.6, 0.58, 4.8);
      parcel.add(gatePillar);
    }

    // Tropical garden flower shrubs (ചെമ്പരത്തി / തെച്ചിപ്പൂക്കൾ)
    for (const sp of [{ x: -3.0, z: 1.0 }, { x: 3.0, z: 1.0 }, { x: -3.0, z: -2.0 }, { x: 3.0, z: -2.0 }]) {
      const bushGeo = new THREE.SphereGeometry(0.6, 6, 6);
      const bush = new THREE.Mesh(bushGeo, shrubMat);
      bush.position.set(sp.x, 0.4, sp.z);
      parcel.add(bush);
    }

    parcel.scale.set(1.4, 1.4, 1.4);
    return parcel;
  }
}
