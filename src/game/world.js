(function () {
  "use strict";

  function WorldBuilder(scene) {
    this.scene = scene;
    this.interactables = []; // meshes with metadata
    this.npcs = [];
    this._env = { fogBase: 0.015, lightBase: 0.85 };

    // רפרנסים לשכבות עולם, כדי לאפשר reactivity
    this._refs = {
      skybox: null,
      skyMaterial: null,
      ground: null,
      waterMaterial: null,
      lakeMesh: null,
      riverMesh: null,
    };
  }

  WorldBuilder.prototype.buildForest = async function (ui, onProgress) {
    const scene = this.scene;

    const CFG = {
      worldSize: 140,
      groundSubdiv: 64,

      // אגם
      lake: {
        center: { x: -32, z: 32 },
        radius: 14,
        waterY: 0.08,
        depth: 1.15,
      },

      // נהר (מסלול בנקודות XZ, גובה נקבע מה־waterY)
      river: {
        waterY: 0.07,
        width: 6.2,
        depth: 0.85,
        points: [
          { x: -26, z: 26 },
          { x: -44, z: 18 },
          { x: -52, z: -6 },
          { x: -44, z: -32 },
          { x: -20, z: -60 },
        ],
      },

      // הרים
      mountains: {
        ringRadius: 92,
        count: 34,
        heightMin: 16,
        heightMax: 36,
      },

      // גבעות קלות בקרקע
      terrain: {
        baseHillsAmp: 0.35,
        edgeRiseAmp: 2.2,
      },
    };

    onProgress && onProgress(0.05, "מכין תאורה ושמיים...");

    // תאורה בסיסית
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = this._env.lightBase;

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
    sun.intensity = 0.42;

    scene.clearColor = new BABYLON.Color4(0.06, 0.09, 0.10, 1);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = this._env.fogBase;
    scene.fogColor = new BABYLON.Color3(0.06, 0.09, 0.10);

    // שמיים פרוצדורליים (SkyMaterial)
    this._createSky(scene, sun);
    await _tick();

    onProgress && onProgress(0.14, "יוצר קרקע ומעצב טריין...");

    // קרקע
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: CFG.worldSize, height: CFG.worldSize, subdivisions: CFG.groundSubdiv },
      scene
    );
    ground.checkCollisions = true;
    ground.isPickable = true;

    const gMat = new BABYLON.StandardMaterial("groundMat", scene);
    gMat.diffuseColor = new BABYLON.Color3(0.07, 0.18, 0.10);
    gMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    gMat.ambientColor = new BABYLON.Color3(0.04, 0.07, 0.05);
    ground.material = gMat;

    this._refs.ground = ground;

    // Sculpting: גבעות קלות + שקע לאגם + תעלה לנהר
    _sculptTerrain(ground, CFG);
    await _tick();

    onProgress && onProgress(0.30, "מייצר אגם ונהר...");

    // מים (WaterMaterial)
    this._createWater(scene, CFG);
    await _tick();

    onProgress && onProgress(0.40, "מסמן שבילים...");
    // שביל מרכזי (מורם מעט כדי לא להיכנס בטריין בכל מקום)
    const path = BABYLON.MeshBuilder.CreateGround(
      "path",
      { width: 44, height: 6.5, subdivisions: 6 },
      scene
    );
    path.position.y = 0.03;
    path.position.z = 6;
    path.rotation.y = Math.PI * 0.15;

    const pMat = new BABYLON.StandardMaterial("pathMat", scene);
    pMat.diffuseColor = new BABYLON.Color3(0.18, 0.16, 0.12);
    pMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    path.material = pMat;

    onProgress && onProgress(0.52, "שותל עצים...");
    const tree = _makeTreePrototype(scene);
    const treeCount = 160;

    for (let i = 0; i < treeCount; i++) {
      const inst = tree.createInstance(`t${i}`);

      const r = (CFG.worldSize * 0.45) * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;

      inst.position.x = Math.cos(a) * r;
      inst.position.z = Math.sin(a) * r;

      // לא לשים עצים ב"ליבה", סביב השביל, ובתוך אזור האגם
      const nearCenter = Math.abs(inst.position.x) < 10 && Math.abs(inst.position.z) < 10;
      const nearPath = Math.abs(inst.position.z - 6) < 5 && Math.abs(inst.position.x) < 28;

      const dxL = inst.position.x - CFG.lake.center.x;
      const dzL = inst.position.z - CFG.lake.center.z;
      const inLakeArea = (dxL * dxL + dzL * dzL) < (CFG.lake.radius + 4) * (CFG.lake.radius + 4);

      if (nearCenter || nearPath || inLakeArea) {
        inst.dispose();
        continue;
      }

      inst.scaling.y = 0.9 + Math.random() * 1.2;
      inst.scaling.x = 0.8 + Math.random() * 0.8;
      inst.scaling.z = 0.8 + Math.random() * 0.8;
      inst.rotation.y = Math.random() * Math.PI * 2;

      // גובה לפי הקרקע, שהעצים לא יצופו
      inst.position.y = _sampleGroundY(scene, ground, inst.position.x, inst.position.z);
      inst.checkCollisions = true;
      inst.isPickable = false;
    }
    tree.setEnabled(false);

    await _tick();
    onProgress && onProgress(0.66, "בונה הרים ברקע...");
    _createMountains(scene, CFG);

    await _tick();
    onProgress && onProgress(0.74, "מקים נקודות עניין...");
    // סלע מרכזי, מצמידים לגובה הקרקע בנקודה (0,0)
    const altar = BABYLON.MeshBuilder.CreateBox("altar", { size: 1.4 }, scene);
    altar.position = new BABYLON.Vector3(0, 0.7, 0);
    altar.position.y = _sampleGroundY(scene, ground, 0, 0) + 0.7;
    altar.checkCollisions = true;

    const aMat = new BABYLON.StandardMaterial("altarMat", scene);
    aMat.diffuseColor = new BABYLON.Color3(0.22, 0.24, 0.26);
    aMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    altar.material = aMat;

    onProgress && onProgress(0.80, "מזמן דמויות...");
    const elderMesh = _makeNPCMesh(scene, "elderMesh");
    elderMesh.position = new BABYLON.Vector3(1, 0, -2);
    elderMesh.position.y = _sampleGroundY(scene, ground, elderMesh.position.x, elderMesh.position.z) + 0.88;
    elderMesh.checkCollisions = true;

    this.npcs.push(
      new window.ECO.NPC({
        id: "elder",
        name: "זקן היער",
        mesh: elderMesh,
        home: elderMesh.position.clone(),
      })
    );

    // לשפר מים: להוסיף אובייקטים “חשובים” להחזר
    if (this._refs.waterMaterial) {
      if (this._refs.skybox) this._refs.waterMaterial.addToRenderList(this._refs.skybox);
      this._refs.waterMaterial.addToRenderList(altar);
      this._refs.waterMaterial.addToRenderList(elderMesh);
    }

    onProgress && onProgress(0.86, "טוען סצנות...");
    const scenes = window.ECO.data.FOREST_SCENES;
    scenes.forEach((s) => {
      const trig = BABYLON.MeshBuilder.CreateSphere(`trig_${s.id}`, { diameter: 1.6 }, scene);

      const y = _sampleGroundY(scene, ground, s.position.x, s.position.z);
      trig.position = new BABYLON.Vector3(s.position.x, y + 0.9, s.position.z);
      trig.isVisible = false;
      trig.isPickable = true;

      trig.metadata = { type: "sceneTrigger", sceneId: s.id };
      this.interactables.push(trig);

      const marker = BABYLON.MeshBuilder.CreateCylinder(`mk_${s.id}`, { height: 0.4, diameter: 0.6 }, scene);
      marker.position = new BABYLON.Vector3(s.position.x, y + 0.22, s.position.z);
      marker.rotation.x = Math.PI / 2;

      const mm = new BABYLON.StandardMaterial(`mm_${s.id}`, scene);
      mm.emissiveColor = new BABYLON.Color3(0.0, 0.9, 0.6);
      mm.alpha = 0.65;
      marker.material = mm;
      marker.isPickable = false;
    });

    onProgress && onProgress(0.94, "מסיים...");
    await _tick();
    onProgress && onProgress(1.0, "מוכן.");
  };

  WorldBuilder.prototype.applyReactivity = function (score) {
    // תגובת עולם מינימלית: fog ותאורה, לפי דגש חברתי מול ביצועי
    const s = (score && score.S) || 0;
    const r = (score && score.R) || 0;

    const t = Math.max(0, Math.min(1, (s - r + 6) / 12)); // 0..1

    this.scene.fogDensity = this._env.fogBase * (0.7 + (1 - t) * 0.8);
    const hemi = this.scene.getLightByName("hemi");
    if (hemi) hemi.intensity = this._env.lightBase * (0.85 + t * 0.35);

    // צבעים עדינים
    const c = new BABYLON.Color3(0.06 + t * 0.02, 0.09 + t * 0.03, 0.10 + (1 - t) * 0.02);
    this.scene.fogColor = c;

    // תגובת שמיים, אם SkyMaterial קיים
    if (this._refs.skyMaterial) {
      // SkyMaterial מתועד עם luminance/turbidity ועוד פרמטרים citeturn10view0
      this._refs.skyMaterial.luminance = 0.9 + t * 0.8;
      this._refs.skyMaterial.turbidity = 4.0 + (1 - t) * 3.0;
    }

    // תגובת מים, אם WaterMaterial קיים
    if (this._refs.waterMaterial) {
      // WaterMaterial מתועד עם waterColor ו־colorBlendFactor citeturn8view0
      const base = new BABYLON.Color3(0.06, 0.18, 0.22);
      const warm = new BABYLON.Color3(0.10, 0.24, 0.20);
      this._refs.waterMaterial.waterColor = BABYLON.Color3.Lerp(base, warm, t);
      this._refs.waterMaterial.colorBlendFactor = 0.20 + t * 0.25;
    }
  };

  WorldBuilder.prototype._createSky = function (scene, sun) {
    if (typeof BABYLON.SkyMaterial !== "function") {
      console.warn("SkyMaterial לא נטען. בדוק שהוספת babylonjs.materials.min.js");
      return;
    }

    // SkyMaterial: יצירת skybox והצמדה citeturn10view0
    const skyMaterial = new BABYLON.SkyMaterial("skyMaterial", scene);
    skyMaterial.backFaceCulling = false;

    skyMaterial.turbidity = 4.0;
    skyMaterial.luminance = 1.0;
    skyMaterial.rayleigh = 2.0;

    // שימוש במיקום שמש, לפי הדיוק בדוק citeturn10view0
    skyMaterial.useSunPosition = true;

    const dir = sun.direction.clone().normalize();
    skyMaterial.sunPosition = dir.scale(-500).add(new BABYLON.Vector3(0, 240, 0));

    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1200.0 }, scene);
    skybox.material = skyMaterial;
    skybox.isPickable = false;
    skybox.infiniteDistance = true;

    this._refs.skybox = skybox;
    this._refs.skyMaterial = skyMaterial;
  };

  WorldBuilder.prototype._createWater = function (scene, CFG) {
    if (typeof BABYLON.WaterMaterial !== "function") {
      console.warn("WaterMaterial לא נטען. בדוק שהוספת babylonjs.materials.min.js");
      return;
    }

    // WaterMaterial דורש לפחות bumpTexture כדי להיראות טוב citeturn8view0
    const waterMaterial = new BABYLON.WaterMaterial("water_material", scene);
    waterMaterial.bumpTexture = _createNoiseBumpTexture(scene, "waterBump", 256);

    // כיוונים וגלים, לפי הפרמטרים המתועדים citeturn8view0
    waterMaterial.windForce = 22;
    waterMaterial.waveHeight = 0.55;
    waterMaterial.bumpHeight = 0.25;
    waterMaterial.windDirection = new BABYLON.Vector2(1.0, 0.6);
    waterMaterial.waterColor = new BABYLON.Color3(0.06, 0.18, 0.22);
    waterMaterial.colorBlendFactor = 0.28;
    waterMaterial.waveLength = 0.12;

    // אגם: דיסק
    const lake = BABYLON.MeshBuilder.CreateDisc(
      "lake",
      { radius: CFG.lake.radius, tessellation: 64, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      scene
    );
    lake.rotation.x = Math.PI / 2;
    lake.position.x = CFG.lake.center.x;
    lake.position.z = CFG.lake.center.z;
    lake.position.y = CFG.lake.waterY;
    lake.material = waterMaterial;
    lake.isPickable = false;
    lake.checkCollisions = false;

    // נהר: ribbon בין שתי שפות
    const river = _createRiverRibbon(scene, CFG.river.points, CFG.river.width, CFG.river.waterY);
    river.material = waterMaterial;
    river.isPickable = false;
    river.checkCollisions = false;

    this._refs.waterMaterial = waterMaterial;
    this._refs.lakeMesh = lake;
    this._refs.riverMesh = river;
  };

  function _sculptTerrain(ground, CFG) {
    const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const indices = ground.getIndices();
    const normals = new Array(positions.length);

    const half = CFG.worldSize / 2;
    const lakeX = CFG.lake.center.x;
    const lakeZ = CFG.lake.center.z;

    // הפיכת river points ל־Vector2
    const riverPts = CFG.river.points.map((p) => ({ x: p.x, z: p.z }));
    const riverHalfW = CFG.river.width * 0.5;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // בסיס: גבעות עדינות
      const hills = _fbm(x * 0.06, z * 0.06) * CFG.terrain.baseHillsAmp;

      // הרמה קלה ליד שולי העולם כדי לייצר “במה” ולהסתיר גבולות
      const rr = Math.sqrt(x * x + z * z);
      const edgeT = _clamp((rr - (half * 0.70)) / (half * 0.55), 0, 1);
      const edgeRise = edgeT * edgeT * CFG.terrain.edgeRiseAmp;

      let y = hills + edgeRise;

      // שקע לאגם
      const dx = x - lakeX;
      const dz = z - lakeZ;
      const dLake = Math.sqrt(dx * dx + dz * dz);
      if (dLake < CFG.lake.radius * 1.25) {
        const k = _clamp(1 - dLake / (CFG.lake.radius * 1.25), 0, 1);
        y -= _smoothstep(k) * CFG.lake.depth;
      }

      // תעלה לנהר: מרחק מינימלי מהפוליליין
      const dRiver = _distanceToPolyline(x, z, riverPts);
      if (dRiver < riverHalfW * 1.35) {
        const k = _clamp(1 - dRiver / (riverHalfW * 1.35), 0, 1);
        y -= _smoothstep(k) * CFG.river.depth;
      }

      positions[i + 1] = y;
    }

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    ground.refreshBoundingInfo();
  }

  function _createMountains(scene, CFG) {
    const mat = new BABYLON.StandardMaterial("mountainMat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.18, 0.20, 0.22);
    mat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    mat.ambientColor = new BABYLON.Color3(0.03, 0.03, 0.03);

    const proto = BABYLON.MeshBuilder.CreateCylinder(
      "mountainProto",
      {
        height: 26,
        diameterTop: 3.2,
        diameterBottom: 18.0,
        tessellation: 7,
      },
      scene
    );
    proto.material = mat;
    proto.isPickable = false;
    proto.checkCollisions = false;

    // פרופיל low-poly יותר
    proto.convertToFlatShadedMesh();

    const rng = _mulberry32(1337);
    for (let i = 0; i < CFG.mountains.count; i++) {
      const inst = proto.createInstance(`m_${i}`);
      const ang = (i / CFG.mountains.count) * Math.PI * 2 + (rng() - 0.5) * 0.18;

      const r = CFG.mountains.ringRadius + (rng() - 0.5) * 10;
      inst.position.x = Math.cos(ang) * r;
      inst.position.z = Math.sin(ang) * r;

      const h = CFG.mountains.heightMin + rng() * (CFG.mountains.heightMax - CFG.mountains.heightMin);
      inst.scaling.y = h / 26;

      const w = 0.8 + rng() * 1.4;
      inst.scaling.x = w;
      inst.scaling.z = w;

      inst.position.y = -1.2 + rng() * 0.6;
      inst.rotation.y = rng() * Math.PI * 2;
    }

    proto.setEnabled(false);
  }

  function _createRiverRibbon(scene, pointsXZ, width, waterY) {
    const pts = pointsXZ.map((p) => new BABYLON.Vector3(p.x, waterY, p.z));

    const left = [];
    const right = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];

      const dir = next.subtract(prev);
      dir.y = 0;
      if (dir.lengthSquared() < 0.000001) {
        dir.x = 1;
        dir.z = 0;
      } else {
        dir.normalize();
      }

      // perpendicular
      const perp = new BABYLON.Vector3(-dir.z, 0, dir.x);

      left.push(pts[i].add(perp.scale(width * 0.5)));
      right.push(pts[i].add(perp.scale(-width * 0.5)));
    }

    const ribbon = BABYLON.MeshBuilder.CreateRibbon(
      "river",
      {
        pathArray: [left, right],
        closeArray: false,
        closePath: false,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        updatable: false,
      },
      scene
    );

    return ribbon;
  }

  function _createNoiseBumpTexture(scene, name, size) {
    const tex = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, false);
    const ctx = tex.getContext();

    const img = ctx.createImageData(size, size);
    const data = img.data;

    const rng = _mulberry32(424242);
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(rng() * 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
    tex.update(false);

    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

    return tex;
  }

  function _makeTreePrototype(scene) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", { height: 3.4, diameter: 0.35 }, scene);
    trunk.position.y = 1.7;

    const crown = BABYLON.MeshBuilder.CreateSphere("crown", { diameter: 2.2, segments: 8 }, scene);
    crown.position.y = 3.1;

    const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.22, 0.14, 0.08);
    trunkMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);

    const crownMat = new BABYLON.StandardMaterial("crownMat", scene);
    crownMat.diffuseColor = new BABYLON.Color3(0.06, 0.28, 0.10);
    crownMat.specularColor = new BABYLON.Color3(0.01, 0.01, 0.01);

    trunk.material = trunkMat;
    crown.material = crownMat;

    const tree = BABYLON.Mesh.MergeMeshes([trunk, crown], true, false, undefined, false, true);
    tree.name = "treeProto";
    tree.isPickable = false;
    tree.checkCollisions = true;
    return tree;
  }

  function _makeNPCMesh(scene, name) {
    const body = BABYLON.MeshBuilder.CreateCapsule(name, { height: 1.75, radius: 0.32 }, scene);
    body.position.y = 0.88;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.20, 0.22, 0.24);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    body.material = mat;
    body.isPickable = true;
    body.metadata = { type: "npc", npcId: "elder" };
    return body;
  }

  function _sampleGroundY(scene, ground, x, z) {
    const ray = new BABYLON.Ray(new BABYLON.Vector3(x, 60, z), new BABYLON.Vector3(0, -1, 0), 120);
    const hit = scene.pickWithRay(ray, (m) => m === ground);
    if (hit && hit.hit && hit.pickedPoint) return hit.pickedPoint.y;
    return 0;
  }

  function _distanceToPolyline(x, z, pts) {
    if (!pts || pts.length < 2) return 99999;
    let best = 99999;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const d = _distancePointSegment2D(x, z, a.x, a.z, b.x, b.z);
      if (d < best) best = d;
    }
    return best;
  }

  function _distancePointSegment2D(px, pz, ax, az, bx, bz) {
    const abx = bx - ax;
    const abz = bz - az;
    const apx = px - ax;
    const apz = pz - az;

    const abLen2 = abx * abx + abz * abz;
    if (abLen2 < 1e-8) {
      const dx = px - ax;
      const dz = pz - az;
      return Math.sqrt(dx * dx + dz * dz);
    }

    let t = (apx * abx + apz * abz) / abLen2;
    t = _clamp(t, 0, 1);

    const cx = ax + abx * t;
    const cz = az + abz * t;

    const dx = px - cx;
    const dz = pz - cz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function _fbm(x, z) {
    // value noise פשוט, מספיק ל־MVP
    let v = 0;
    let amp = 0.55;
    let freq = 1.0;

    for (let i = 0; i < 4; i++) {
      v += amp * (_valueNoise(x * freq, z * freq) * 2 - 1);
      amp *= 0.5;
      freq *= 2.0;
    }
    return v;
  }

  function _valueNoise(x, z) {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;

    const v00 = _hash2(xi, zi);
    const v10 = _hash2(xi + 1, zi);
    const v01 = _hash2(xi, zi + 1);
    const v11 = _hash2(xi + 1, zi + 1);

    const u = _smoothstep(xf);
    const v = _smoothstep(zf);

    const a = v00 + (v10 - v00) * u;
    const b = v01 + (v11 - v01) * u;
    return a + (b - a) * v;
  }

  function _hash2(x, z) {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function _smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function _mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _tick() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  window.ECO = window.ECO || {};
  window.ECO.WorldBuilder = WorldBuilder;
})();
